// ==========================================
// orcamentos.ts - Orçamentos Mensais por Categoria
// ==========================================
import type { CadimusEnv, SqlParam, WorkerCtx } from "../types.js";
import { obterUsuarioDaSessao } from "../utils/sessao.ts";
import { obterCarteirasDoUsuario } from "../utils/carteiras.ts";
import { centavosParaReais, normalizarCentavos } from "../utils/dinheiro.ts";
import { erroCliente, erroInterno, json } from "../utils/respostas.ts";
import { normalizarId, normalizarMesReferencia } from "../domain.ts";

interface OrcamentoPayload {
  categoria?: string;
  valor?: number | string | null;
  valor_centavos?: number | string | null;
  mes?: number | string;
  ano?: number | string;
  carteira_id?: number | string;
}

interface OrcamentoComGastoRow {
  id: number;
  categoria: string;
  valor: number;
  valor_centavos?: number | null;
  total_gasto: number;
  total_gasto_centavos?: number | null;
  [key: string]: unknown;
}

interface OrcamentoAlvoRow {
  carteira_id: number;
  criado_por: number;
}

export async function processarOrcamentos(request: Request, env: CadimusEnv, ctx: WorkerCtx): Promise<Response> {
  const metodo = request.method;
  const url = new URL(request.url);

  // Toda operação exige login
  const usuarioLogado = await obterUsuarioDaSessao(request, env, ctx);
  if (!usuarioLogado) {
    return erroCliente("Não autenticado.", 401, "nao_autenticado");
  }

  // Só pode operar nas carteiras às quais tem acesso
  const carteirasPermitidas = await obterCarteirasDoUsuario(env, usuarioLogado.id);

  // ==========================================
  // 1. BUSCAR ORÇAMENTOS (GET)
  // ==========================================
  if (metodo === "GET") {
    try {
      const mes = url.searchParams.get("mes");
      const ano = url.searchParams.get("ano");
      const carteiraId = url.searchParams.get("carteira_id");
      const mesNormalizado = normalizarMesReferencia(mes);
      const carteiraIdNormalizada = normalizarId(carteiraId);

      if (!mes || !ano) {
        return erroCliente("Mês e ano são obrigatórios.", 400, "periodo_obrigatorio");
      }

      if (!mesNormalizado) {
        return erroCliente("Mês inválido.", 400, "mes_invalido");
      }

      if (carteiraId && !carteiraIdNormalizada) {
        return erroCliente("Carteira inválida.", 400, "carteira_invalida");
      }

      if (carteiraIdNormalizada && !carteirasPermitidas.includes(carteiraIdNormalizada)) {
        return erroCliente("Acesso negado a esta carteira.", 403, "carteira_acesso_negado");
      }

      let query = `
        SELECT o.*, 
               COALESCE(gasto.total_gasto, 0) AS total_gasto,
               COALESCE(gasto.total_gasto_centavos, 0) AS total_gasto_centavos
        FROM orcamentos o
        LEFT JOIN (
          SELECT
            carteira_id,
            LOWER(categoria) AS categoria_normalizada,
            SUM(COALESCE(valor_centavos, ROUND(valor * 100))) / 100.0 AS total_gasto,
            SUM(COALESCE(valor_centavos, ROUND(valor * 100))) AS total_gasto_centavos
          FROM lancamentos
          WHERE tipo = 'despesa'
            AND status = 'pago'
            AND strftime('%m', data_compra) = ?
            AND strftime('%Y', data_compra) = ?
          GROUP BY carteira_id, LOWER(categoria)
        ) gasto ON gasto.carteira_id = o.carteira_id AND gasto.categoria_normalizada = LOWER(o.categoria)
        WHERE o.mes IN (?, ?) AND o.ano = ?
      `;
      const mesLegado = String(Number(mesNormalizado));
      const params: SqlParam[] = [mesNormalizado, ano, mesNormalizado, mesLegado, ano];

      if (carteiraIdNormalizada) {
        query += ` AND o.carteira_id = ?`;
        params.push(carteiraIdNormalizada);
      } else {
        if (carteirasPermitidas.length === 0) {
          return json([]);
        }
        const placeholders = carteirasPermitidas.map(() => "?").join(",");
        query += ` AND o.carteira_id IN (${placeholders})`;
        params.push(...carteirasPermitidas);
      }

      query += ` ORDER BY o.categoria ASC`;

      const { results } = await env.DB.prepare(query).bind(...params).all<OrcamentoComGastoRow>();

      // Calcular progresso para cada orçamento
      const orcamentosComProgresso = results.map((o) => {
        const valorCentavos = o.valor_centavos ?? Math.round(o.valor * 100);
        const totalGastoCentavos = o.total_gasto_centavos ?? Math.round(o.total_gasto * 100);
        const progresso = valorCentavos > 0 ? (totalGastoCentavos / valorCentavos) * 100 : 0;
        const status = progresso >= 100 ? "estourado" : progresso >= 80 ? "alerta" : "ok";
        return {
          ...o,
          progresso: Math.min(progresso, 100),
          progresso_real: progresso,
          status,
          saldo: centavosParaReais(Math.max(valorCentavos - totalGastoCentavos, 0)),
        };
      });

      return json(orcamentosComProgresso);
    } catch (erro) {
      return erroInterno(erro, "orcamentos.listar", "Não foi possível carregar os orçamentos agora.", "orcamentos_listar_falhou");
    }
  }

  // ==========================================
  // 2. CRIAR/ATUALIZAR ORÇAMENTO (POST)
  // ==========================================
  if (metodo === "POST") {
    try {
      const dados = (await request.json()) as OrcamentoPayload;

      if (!dados.categoria || (dados.valor === undefined && dados.valor_centavos === undefined) || !dados.mes || !dados.ano || !dados.carteira_id) {
        return erroCliente("Categoria, valor, mês, ano e carteira são obrigatórios.", 400, "orcamento_campos_obrigatorios");
      }
      const mesNormalizado = normalizarMesReferencia(dados.mes);
      const carteiraIdNormalizada = normalizarId(dados.carteira_id);
      if (!mesNormalizado) {
        return erroCliente("Mês inválido.", 400, "mes_invalido");
      }
      if (!carteiraIdNormalizada) {
        return erroCliente("Carteira inválida.", 400, "carteira_invalida");
      }

      const valorCentavos = normalizarCentavos(dados.valor, dados.valor_centavos);
      const valor = centavosParaReais(valorCentavos);

      if (valorCentavos < 0) {
        return erroCliente("Valor não pode ser negativo.", 400, "valor_negativo");
      }

      if (!carteirasPermitidas.includes(carteiraIdNormalizada)) {
        return erroCliente("Acesso negado a esta carteira.", 403, "carteira_acesso_negado");
      }

      // Upsert: insere ou atualiza se já existe ( UNIQUE constraint )
      const query = `
        INSERT INTO orcamentos (categoria, valor, valor_centavos, carteira_id, mes, ano, criado_por)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(categoria, carteira_id, mes, ano)
        DO UPDATE SET valor = excluded.valor, valor_centavos = excluded.valor_centavos
      `;
      await env.DB.prepare(query)
        .bind(
          dados.categoria.toLowerCase(),
          valor,
          valorCentavos,
          carteiraIdNormalizada,
          mesNormalizado,
          dados.ano,
          usuarioLogado.id
        )
        .run();

      return json({ mensagem: "Orçamento salvo com sucesso!" }, 201);
    } catch (erro) {
      return erroInterno(erro, "orcamentos.salvar", "Não foi possível salvar este orçamento agora.", "orcamento_salvar_falhou");
    }
  }

  // ==========================================
  // 3. APAGAR ORÇAMENTO (DELETE)
  // ==========================================
  if (metodo === "DELETE") {
    try {
      const id = normalizarId(url.searchParams.get("id"));

      if (!id) {
        return erroCliente("ID não fornecido.", 400, "id_obrigatorio");
      }

      // Verificar se o orçamento existe e o usuário tem acesso
      const { results: alvo } = await env.DB.prepare(
        `SELECT carteira_id, criado_por FROM orcamentos WHERE id = ?`
      ).bind(id).all<OrcamentoAlvoRow>();

      if (alvo.length === 0) {
        return erroCliente("Orçamento não encontrado.", 404, "orcamento_nao_encontrado");
      }

      if (!carteirasPermitidas.includes(alvo[0].carteira_id)) {
        return erroCliente("Acesso negado a esta carteira.", 403, "carteira_acesso_negado");
      }

      // Só quem criou ou superadmin pode apagar
      if (alvo[0].criado_por !== usuarioLogado.id && usuarioLogado.perfil !== "superadmin") {
        return erroCliente("Só quem criou (ou um administrador) pode excluir este orçamento.", 403, "orcamento_excluir_negado");
      }

      await env.DB.prepare(`DELETE FROM orcamentos WHERE id = ?`).bind(id).run();

      return json({ mensagem: "Orçamento apagado." });
    } catch (erro) {
      return erroInterno(erro, "orcamentos.excluir", "Não foi possível apagar este orçamento agora.", "orcamento_excluir_falhou");
    }
  }

  return erroCliente("Método não permitido.", 405, "metodo_nao_permitido");
}
