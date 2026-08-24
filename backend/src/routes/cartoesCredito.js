import { obterUsuarioDaSessao } from "../utils/sessao.js";
import { obterCarteirasDoUsuario } from "../utils/carteiras.js";
import { centavosParaReais, normalizarCentavos } from "../utils/dinheiro.js";

export async function processarCartoesCredito(request, env, ctx) {
  const url = new URL(request.url);
  const method = request.method;
  const usuario = await obterUsuarioDaSessao(request, env, ctx);

  if (!usuario) {
    return new Response(JSON.stringify({ erro: "Não autenticado." }), { status: 401 });
  }

  const carteirasPermitidas = await obterCarteirasDoUsuario(env, usuario.id);

  // GET /api/cartoes-credito — listar cartões das carteiras permitidas
  if (method === "GET") {
    const carteiraId = url.searchParams.get("carteira_id");

    if (carteiraId && !carteirasPermitidas.includes(Number(carteiraId))) {
      return new Response(JSON.stringify({ erro: "Acesso negado a esta carteira." }), { status: 403 });
    }
    if (carteirasPermitidas.length === 0) {
      return new Response(JSON.stringify([]), { status: 200 });
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
        COALESCE((SELECT SUM(COALESCE(df.valor_centavos, ROUND(df.valor * 100)))
          FROM despesas_fixas df
          WHERE df.cartao_credito_id = c.id AND df.ativo = 1 AND df.tipo = 'despesa'), 0)
        +
        COALESCE((SELECT SUM(COALESCE(l.valor_centavos, ROUND(l.valor * 100)))
          FROM lancamentos l
          WHERE l.cartao_credito_id = c.id
            AND l.tipo = 'despesa'
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
        COALESCE((SELECT SUM(COALESCE(df.valor_centavos, ROUND(df.valor * 100)))
          FROM despesas_fixas df
          WHERE df.cartao_credito_id = c.id AND df.ativo = 1 AND df.tipo = 'despesa'), 0)
        +
        COALESCE((SELECT SUM(COALESCE(l.valor_centavos, ROUND(l.valor * 100)))
          FROM lancamentos l
          WHERE l.cartao_credito_id = c.id
            AND l.tipo = 'despesa'
            AND l.compra_parcelada_id IS NULL
            AND l.despesa_fixa_id IS NULL
            AND strftime('%Y-%m', l.data_compra) = strftime('%Y-%m', 'now')), 0)
      ) as gasto_atual_centavos
      FROM cartoes_credito c
      WHERE c.ativo = 1`;
    const params = [];

    if (carteiraId) {
      query += ` AND c.carteira_id = ?`;
      params.push(Number(carteiraId));
    } else {
      query += ` AND c.carteira_id IN (${carteirasPermitidas.map(() => "?").join(",")})`;
      params.push(...carteirasPermitidas);
    }

    query += ` ORDER BY c.nome`;

    const { results } = await env.DB.prepare(query).bind(...params).all();
    return new Response(JSON.stringify(results), { status: 200 });
  }

  // POST /api/cartoes-credito — criar cartão
  if (method === "POST") {
    const body = await request.json();
    const { nome, bandeira, ultimos4, dia_fechamento, dia_vencimento, limite, carteira_id } = body;
    const limiteCentavos = normalizarCentavos(limite || 0, body.limite_centavos);
    const limiteNormalizado = centavosParaReais(limiteCentavos);

    if (!nome || !dia_fechamento || !dia_vencimento || !carteira_id) {
      return new Response(JSON.stringify({ erro: "Nome, dia de fechamento, dia de vencimento e carteira são obrigatórios." }), { status: 400 });
    }

    if (dia_fechamento < 1 || dia_fechamento > 31 || dia_vencimento < 1 || dia_vencimento > 31) {
      return new Response(JSON.stringify({ erro: "Dias devem estar entre 1 e 31." }), { status: 400 });
    }

    if (!carteirasPermitidas.includes(Number(carteira_id))) {
      return new Response(JSON.stringify({ erro: "Acesso negado a esta carteira." }), { status: 403 });
    }

    const { success } = await env.DB.prepare(
      `INSERT INTO cartoes_credito (nome, bandeira, ultimos4, dia_fechamento, dia_vencimento, limite, limite_centavos, carteira_id, criado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      nome,
      bandeira || "outro",
      ultimos4 || null,
      dia_fechamento,
      dia_vencimento,
      limiteNormalizado,
      limiteCentavos,
      carteira_id,
      usuario.id
    ).run();

    if (success) return new Response(JSON.stringify({ ok: true }), { status: 201 });
    return new Response(JSON.stringify({ erro: "Erro ao criar cartão." }), { status: 500 });
  }

  // PUT /api/cartoes-credito?id=X — editar cartão
  if (method === "PUT") {
    const id = Number(url.searchParams.get("id"));
    if (!id) return new Response(JSON.stringify({ erro: "ID obrigatório." }), { status: 400 });

    const { results: alvo } = await env.DB.prepare(`SELECT carteira_id FROM cartoes_credito WHERE id = ? AND ativo = 1`).bind(id).all();
    if (alvo.length === 0) return new Response(JSON.stringify({ erro: "Cartão não encontrado." }), { status: 404 });
    if (!carteirasPermitidas.includes(alvo[0].carteira_id)) {
      return new Response(JSON.stringify({ erro: "Acesso negado a esta carteira." }), { status: 403 });
    }

    const body = await request.json();
    const campos = [];
    const params = [];

    for (const [chave, valor] of Object.entries(body)) {
      if (chave === "limite" || chave === "limite_centavos") continue;

      if (["nome", "bandeira", "ultimos4", "dia_fechamento", "dia_vencimento"].includes(chave)) {
        campos.push(`${chave} = ?`);
        params.push(valor);
      }
    }

    if (body.limite !== undefined || body.limite_centavos !== undefined) {
      const limiteCentavos = normalizarCentavos(body.limite || 0, body.limite_centavos);
      campos.push("limite = ?");
      params.push(centavosParaReais(limiteCentavos));
      campos.push("limite_centavos = ?");
      params.push(limiteCentavos);
    }

    if (campos.length === 0) return new Response(JSON.stringify({ erro: "Nenhum campo para atualizar." }), { status: 400 });

    params.push(id);
    await env.DB.prepare(
      `UPDATE cartoes_credito SET ${campos.join(", ")} WHERE id = ?`
    ).bind(...params).run();

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  // DELETE /api/cartoes-credito?id=X — desativar cartão
  if (method === "DELETE") {
    const id = Number(url.searchParams.get("id"));
    if (!id) return new Response(JSON.stringify({ erro: "ID obrigatório." }), { status: 400 });

    const { results: alvo } = await env.DB.prepare(`SELECT carteira_id FROM cartoes_credito WHERE id = ? AND ativo = 1`).bind(id).all();
    if (alvo.length === 0) return new Response(JSON.stringify({ erro: "Cartão não encontrado." }), { status: 404 });
    if (!carteirasPermitidas.includes(alvo[0].carteira_id)) {
      return new Response(JSON.stringify({ erro: "Acesso negado a esta carteira." }), { status: 403 });
    }

    await env.DB.prepare(
      `UPDATE cartoes_credito SET ativo = 0 WHERE id = ?`
    ).bind(id).run();

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  return new Response(JSON.stringify({ erro: "Método não permitido." }), { status: 405 });
}
