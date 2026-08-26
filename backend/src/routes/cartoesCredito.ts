import { obterUsuarioDaSessao } from "../utils/sessao.ts";
import { obterCarteirasDoUsuario } from "../utils/carteiras.ts";
import { centavosParaReais, normalizarCentavos } from "../utils/dinheiro.ts";
import { erroCliente, erroInterno, json } from "../utils/respostas.ts";
import { isBandeiraCartao, normalizarId } from "../domain.ts";
import type { BandeiraCartao, CadimusEnv, SqlParam, WorkerCtx } from "../types.js";

interface CartaoCreditoPayload {
  nome?: string;
  bandeira?: BandeiraCartao | string | null;
  ultimos4?: string | null;
  dia_fechamento?: number | string;
  dia_vencimento?: number | string;
  limite?: number | string | null;
  limite_centavos?: number | string | null;
  carteira_id?: number | string;
}

interface CartaoCreditoAlvoRow {
  carteira_id: number;
}

export async function processarCartoesCredito(request: Request, env: CadimusEnv, ctx: WorkerCtx): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  const usuario = await obterUsuarioDaSessao(request, env, ctx);

  if (!usuario) {
    return erroCliente("Não autenticado.", 401, "nao_autenticado");
  }

  const carteirasPermitidas = await obterCarteirasDoUsuario(env, usuario.id);

  // GET /api/cartoes-credito — listar cartões das carteiras permitidas
  if (method === "GET") {
    const carteiraId = url.searchParams.get("carteira_id");
    const carteiraIdNormalizada = normalizarId(carteiraId);

    if (carteiraId && !carteiraIdNormalizada) {
      return erroCliente("Carteira inválida.", 400, "carteira_invalida");
    }

    if (carteiraIdNormalizada && !carteirasPermitidas.includes(carteiraIdNormalizada)) {
      return erroCliente("Acesso negado a esta carteira.", 403, "carteira_acesso_negado");
    }
    if (carteirasPermitidas.length === 0) {
      return json([]);
    }

    let query = `SELECT c.*,
      (SELECT COUNT(*) FROM lancamentos lp
       INNER JOIN compras_parceladas cp ON cp.id = lp.compra_parcelada_id
       WHERE cp.cartao_credito_id = c.id
         AND cp.ativo = 1
         AND lp.tipo = 'despesa'
         AND lp.status != 'pago') as parcelas_ativas,
      (
        COALESCE((SELECT SUM(COALESCE(lp.valor_centavos, ROUND(lp.valor * 100)))
          FROM lancamentos lp
          INNER JOIN compras_parceladas cp ON cp.id = lp.compra_parcelada_id
          WHERE cp.cartao_credito_id = c.id
            AND cp.ativo = 1
            AND lp.tipo = 'despesa'
            AND lp.status != 'pago'), 0)
        +
        COALESCE((SELECT SUM(COALESCE(lf.valor_centavos, ROUND(lf.valor * 100)))
          FROM lancamentos lf
          INNER JOIN despesas_fixas df ON df.id = lf.despesa_fixa_id
          WHERE df.cartao_credito_id = c.id
            AND df.ativo = 1
            AND lf.tipo = 'despesa'
            AND lf.status != 'pago'
            AND strftime('%Y-%m', lf.data_compra) = strftime('%Y-%m', 'now')), 0)
        +
        COALESCE((SELECT SUM(COALESCE(l.valor_centavos, ROUND(l.valor * 100)))
          FROM lancamentos l
          WHERE l.cartao_credito_id = c.id
            AND l.tipo = 'despesa'
            AND l.status != 'pago'
            AND l.compra_parcelada_id IS NULL
            AND l.despesa_fixa_id IS NULL
            AND strftime('%Y-%m', l.data_compra) = strftime('%Y-%m', 'now')), 0)
      ) / 100.0 as gasto_atual,
      (
        COALESCE((SELECT SUM(COALESCE(lp.valor_centavos, ROUND(lp.valor * 100)))
          FROM lancamentos lp
          INNER JOIN compras_parceladas cp ON cp.id = lp.compra_parcelada_id
          WHERE cp.cartao_credito_id = c.id
            AND cp.ativo = 1
            AND lp.tipo = 'despesa'
            AND lp.status != 'pago'), 0)
        +
        COALESCE((SELECT SUM(COALESCE(lf.valor_centavos, ROUND(lf.valor * 100)))
          FROM lancamentos lf
          INNER JOIN despesas_fixas df ON df.id = lf.despesa_fixa_id
          WHERE df.cartao_credito_id = c.id
            AND df.ativo = 1
            AND lf.tipo = 'despesa'
            AND lf.status != 'pago'
            AND strftime('%Y-%m', lf.data_compra) = strftime('%Y-%m', 'now')), 0)
        +
        COALESCE((SELECT SUM(COALESCE(l.valor_centavos, ROUND(l.valor * 100)))
          FROM lancamentos l
          WHERE l.cartao_credito_id = c.id
            AND l.tipo = 'despesa'
            AND l.status != 'pago'
            AND l.compra_parcelada_id IS NULL
            AND l.despesa_fixa_id IS NULL
            AND strftime('%Y-%m', l.data_compra) = strftime('%Y-%m', 'now')), 0)
      ) as gasto_atual_centavos
      FROM cartoes_credito c
      WHERE c.ativo = 1`;
    const params: SqlParam[] = [];

    if (carteiraIdNormalizada) {
      query += ` AND c.carteira_id = ?`;
      params.push(carteiraIdNormalizada);
    } else {
      query += ` AND c.carteira_id IN (${carteirasPermitidas.map(() => "?").join(",")})`;
      params.push(...carteirasPermitidas);
    }

    query += ` ORDER BY c.nome`;

    try {
      const { results } = await env.DB.prepare(query).bind(...params).all();
      return json(results);
    } catch (erro) {
      return erroInterno(erro, "cartoesCredito.listar", "Não foi possível carregar os cartões agora.", "cartoes_listar_falhou");
    }
  }

  // POST /api/cartoes-credito — criar cartão
  if (method === "POST") {
    const body = (await request.json()) as CartaoCreditoPayload;
    const { nome, bandeira, ultimos4, dia_fechamento, dia_vencimento, limite, carteira_id } = body;
    const limiteCentavos = normalizarCentavos(limite || 0, body.limite_centavos);
    const limiteNormalizado = centavosParaReais(limiteCentavos);
    const diaFechamento = Number(dia_fechamento);
    const diaVencimento = Number(dia_vencimento);
    const carteiraIdNormalizada = normalizarId(carteira_id);
    const bandeiraNormalizada = bandeira ? String(bandeira).toLowerCase() : "outro";

    if (!nome || !diaFechamento || !diaVencimento || !carteiraIdNormalizada) {
      return erroCliente("Nome, dia de fechamento, dia de vencimento e carteira são obrigatórios.", 400, "cartao_campos_obrigatorios");
    }

    if (!isBandeiraCartao(bandeiraNormalizada)) {
      return erroCliente("Bandeira de cartão inválida.", 400, "cartao_bandeira_invalida");
    }

    if (diaFechamento < 1 || diaFechamento > 31 || diaVencimento < 1 || diaVencimento > 31) {
      return erroCliente("Dias devem estar entre 1 e 31.", 400, "cartao_dias_invalidos");
    }

    if (!carteirasPermitidas.includes(carteiraIdNormalizada)) {
      return erroCliente("Acesso negado a esta carteira.", 403, "carteira_acesso_negado");
    }

    try {
      const { success } = await env.DB.prepare(
        `INSERT INTO cartoes_credito (nome, bandeira, ultimos4, dia_fechamento, dia_vencimento, limite, limite_centavos, carteira_id, criado_por)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        nome,
        bandeiraNormalizada,
        ultimos4 || null,
        diaFechamento,
        diaVencimento,
        limiteNormalizado,
        limiteCentavos,
        carteiraIdNormalizada,
        usuario.id
      ).run();

      if (success) return json({ ok: true }, 201);
      return erroInterno(new Error("D1 retornou success=false ao criar cartão"), "cartoesCredito.criar", "Não foi possível criar este cartão agora.", "cartao_criar_falhou");
    } catch (erro) {
      return erroInterno(erro, "cartoesCredito.criar", "Não foi possível criar este cartão agora.", "cartao_criar_falhou");
    }
  }

  // PUT /api/cartoes-credito?id=X — editar cartão
  if (method === "PUT") {
    const id = normalizarId(url.searchParams.get("id"));
    if (!id) return erroCliente("ID obrigatório.", 400, "id_obrigatorio");

    let alvo: CartaoCreditoAlvoRow[];
    try {
      ({ results: alvo } = await env.DB.prepare(`SELECT carteira_id FROM cartoes_credito WHERE id = ? AND ativo = 1`).bind(id).all<CartaoCreditoAlvoRow>());
    } catch (erro) {
      return erroInterno(erro, "cartoesCredito.buscarParaEditar", "Não foi possível carregar este cartão agora.", "cartao_buscar_falhou");
    }
    if (alvo.length === 0) return erroCliente("Cartão não encontrado.", 404, "cartao_nao_encontrado");
    if (!carteirasPermitidas.includes(alvo[0].carteira_id)) {
      return erroCliente("Acesso negado a esta carteira.", 403, "carteira_acesso_negado");
    }

    const body = (await request.json()) as Partial<CartaoCreditoPayload>;
    const campos: string[] = [];
    const params: SqlParam[] = [];

    for (const [chave, valor] of Object.entries(body)) {
      if (chave === "limite" || chave === "limite_centavos") continue;

      if (["nome", "bandeira", "ultimos4", "dia_fechamento", "dia_vencimento"].includes(chave)) {
        if (chave === "bandeira" && valor && !isBandeiraCartao(String(valor).toLowerCase())) {
          return erroCliente("Bandeira de cartão inválida.", 400, "cartao_bandeira_invalida");
        }
        campos.push(`${chave} = ?`);
        params.push(chave === "bandeira" && valor ? String(valor).toLowerCase() : valor);
      }
    }

    if (body.limite !== undefined || body.limite_centavos !== undefined) {
      const limiteCentavos = normalizarCentavos(body.limite || 0, body.limite_centavos);
      campos.push("limite = ?");
      params.push(centavosParaReais(limiteCentavos));
      campos.push("limite_centavos = ?");
      params.push(limiteCentavos);
    }

    if (campos.length === 0) return erroCliente("Nenhum campo para atualizar.", 400, "cartao_sem_campos");

    params.push(id);
    try {
      await env.DB.prepare(
        `UPDATE cartoes_credito SET ${campos.join(", ")} WHERE id = ?`
      ).bind(...params).run();
    } catch (erro) {
      return erroInterno(erro, "cartoesCredito.atualizar", "Não foi possível atualizar este cartão agora.", "cartao_atualizar_falhou");
    }

    return json({ ok: true });
  }

  // DELETE /api/cartoes-credito?id=X — desativar cartão
  if (method === "DELETE") {
    const id = normalizarId(url.searchParams.get("id"));
    if (!id) return erroCliente("ID obrigatório.", 400, "id_obrigatorio");

    let alvo: CartaoCreditoAlvoRow[];
    try {
      ({ results: alvo } = await env.DB.prepare(`SELECT carteira_id FROM cartoes_credito WHERE id = ? AND ativo = 1`).bind(id).all<CartaoCreditoAlvoRow>());
    } catch (erro) {
      return erroInterno(erro, "cartoesCredito.buscarParaExcluir", "Não foi possível carregar este cartão agora.", "cartao_buscar_falhou");
    }
    if (alvo.length === 0) return erroCliente("Cartão não encontrado.", 404, "cartao_nao_encontrado");
    if (!carteirasPermitidas.includes(alvo[0].carteira_id)) {
      return erroCliente("Acesso negado a esta carteira.", 403, "carteira_acesso_negado");
    }

    try {
      await env.DB.prepare(
        `UPDATE cartoes_credito SET ativo = 0 WHERE id = ?`
      ).bind(id).run();
    } catch (erro) {
      return erroInterno(erro, "cartoesCredito.excluir", "Não foi possível excluir este cartão agora.", "cartao_excluir_falhou");
    }

    return json({ ok: true });
  }

  return erroCliente("Método não permitido.", 405, "metodo_nao_permitido");
}
