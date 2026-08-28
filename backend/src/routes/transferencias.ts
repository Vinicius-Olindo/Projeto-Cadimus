// ==========================================
// transferencias.ts - Transferências entre Carteiras
// ==========================================
import type { CadimusEnv, IdEntrada, SqlParam, WorkerCtx } from "../types.js";
import { obterUsuarioDaSessao } from "../utils/sessao.ts";
import { obterCarteirasDoUsuario } from "../utils/carteiras.ts";
import { registrarAuditoria } from "../utils/auditoria.ts";
import { centavosParaReais, normalizarCentavos, type ValorMonetarioEntrada } from "../utils/dinheiro.ts";
import { lerJsonObjeto } from "../utils/requisicao.ts";
import { erroCliente, erroInterno, json } from "../utils/respostas.ts";

interface TransferenciaPayload {
  valor?: ValorMonetarioEntrada;
  valor_centavos?: ValorMonetarioEntrada;
  data_transferencia?: string;
  carteira_origem_id?: IdEntrada;
  carteira_destino_id?: IdEntrada;
  descricao?: string;
  idempotency_key?: string;
}

interface SaldoCarteiraRow {
  saldo_centavos?: number | string | null;
}

interface TransferenciaExistenteRow {
  id: number;
}

interface TransferenciaAlvoRow {
  carteira_origem_id: number;
  carteira_destino_id: number;
  criado_por: number;
}

interface TransferenciaListagemRow {
  id: number;
  valor?: number;
  valor_centavos?: number | null;
  data_transferencia: string;
  carteira_origem_id: number;
  carteira_destino_id: number;
  descricao?: string | null;
  criado_por: number;
  idempotency_key?: string | null;
  origem_nome?: string;
  destino_nome?: string;
  criado_por_nome?: string;
}

function dataISOValida(valor: unknown): valor is string {
  return typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

async function calcularSaldoCarteira(env: CadimusEnv, carteiraId: IdEntrada): Promise<number> {
  const { results } = await env.DB.prepare(
    `SELECT
       (
         SELECT COALESCE(SUM(
           CASE
             WHEN tipo = 'receita' THEN COALESCE(valor_centavos, ROUND(valor * 100))
             ELSE -COALESCE(valor_centavos, ROUND(valor * 100))
           END
         ), 0)
         FROM lancamentos
         WHERE carteira_id = ? AND status = 'pago'
       )
       - (
         SELECT COALESCE(SUM(COALESCE(valor_centavos, ROUND(valor * 100))), 0)
         FROM transferencias
         WHERE carteira_origem_id = ?
       )
       + (
         SELECT COALESCE(SUM(COALESCE(valor_centavos, ROUND(valor * 100))), 0)
         FROM transferencias
         WHERE carteira_destino_id = ?
       ) AS saldo_centavos`,
  )
    .bind(carteiraId, carteiraId, carteiraId)
    .all<SaldoCarteiraRow>();

  return centavosParaReais(Number(results[0]?.saldo_centavos || 0));
}

export async function processarTransferencias(request: Request, env: CadimusEnv, ctx: WorkerCtx): Promise<Response> {
  const metodo = request.method;
  const url = new URL(request.url);

  const usuarioLogado = await obterUsuarioDaSessao(request, env, ctx);
  if (!usuarioLogado) {
    return erroCliente("Não autenticado.", 401, "nao_autenticado");
  }

  const carteirasPermitidas = await obterCarteirasDoUsuario(env, usuarioLogado.id);

  // 1. Buscar transferências
  if (metodo === "GET") {
    try {
      const mes = url.searchParams.get("mes");
      const ano = url.searchParams.get("ano");
      const carteiraId = url.searchParams.get("carteira_id");
      const dataInicio = url.searchParams.get("data_inicio");
      const dataFim = url.searchParams.get("data_fim");

      let query = `
        SELECT t.*,
               co.nome AS origem_nome,
               cd.nome AS destino_nome,
               COALESCE(u.nome, u.nome_usuario) AS criado_por_nome
        FROM transferencias t
        JOIN carteiras co ON co.id = t.carteira_origem_id
        JOIN carteiras cd ON cd.id = t.carteira_destino_id
        JOIN usuarios u ON u.id = t.criado_por
        WHERE 1=1
      `;
      const params: SqlParam[] = [];

      if (carteiraId) {
        if (!carteirasPermitidas.includes(Number(carteiraId))) {
          return erroCliente("Acesso negado a esta carteira.", 403, "carteira_acesso_negado");
        }
        query += ` AND (t.carteira_origem_id = ? OR t.carteira_destino_id = ?)`;
        params.push(carteiraId, carteiraId);
      } else {
        if (carteirasPermitidas.length === 0) {
          return json([]);
        }
        const placeholders = carteirasPermitidas.map(() => "?").join(",");
        query += ` AND (t.carteira_origem_id IN (${placeholders}) OR t.carteira_destino_id IN (${placeholders}))`;
        params.push(...carteirasPermitidas, ...carteirasPermitidas);
      }

      if (mes && ano) {
        query += ` AND strftime('%m', t.data_transferencia) = ? AND strftime('%Y', t.data_transferencia) = ?`;
        params.push(mes.padStart(2, "0"), ano);
      }

      if (dataInicio) {
        if (!dataISOValida(dataInicio)) {
          return erroCliente("data_inicio inválida.", 400, "data_inicio_invalida");
        }
        query += ` AND t.data_transferencia >= ?`;
        params.push(dataInicio);
      }

      if (dataFim) {
        if (!dataISOValida(dataFim)) {
          return erroCliente("data_fim inválida.", 400, "data_fim_invalida");
        }
        query += ` AND t.data_transferencia <= ?`;
        params.push(dataFim);
      }

      query += ` ORDER BY t.data_transferencia DESC`;

      const { results } = await env.DB.prepare(query).bind(...params).all<TransferenciaListagemRow>();
      return json(results);
    } catch (erro) {
      return erroInterno(erro, "transferencias.listar", "Não foi possível carregar as transferências agora.", "transferencias_listar_falhou");
    }
  }

  // 2. Criar transferência
  if (metodo === "POST") {
    try {
      const dados = await lerJsonObjeto<TransferenciaPayload>(request);
      if (!dados) {
        return erroCliente("Envie um corpo JSON válido.", 400, "corpo_json_invalido");
      }
      const idempotencyKey = typeof dados.idempotency_key === "string" ? dados.idempotency_key.trim() : "";
      if (dados.valor === undefined && dados.valor_centavos === undefined) {
        return erroCliente("Informe um valor válido.", 400, "valor_obrigatorio");
      }
      const valorCentavos = normalizarCentavos(dados.valor, dados.valor_centavos);
      const valor = centavosParaReais(valorCentavos);

      if (valorCentavos <= 0) {
        return erroCliente("Informe um valor maior que zero.", 400, "valor_invalido");
      }
      if (!dados.carteira_origem_id || !dados.carteira_destino_id) {
        return erroCliente("Selecione as carteiras de origem e destino.", 400, "carteiras_obrigatorias");
      }
      if (dados.carteira_origem_id === dados.carteira_destino_id) {
        return erroCliente("As carteiras de origem e destino devem ser diferentes.", 400, "carteiras_iguais");
      }
      if (!carteirasPermitidas.includes(Number(dados.carteira_origem_id))) {
        return erroCliente("Acesso negado à carteira de origem.", 403, "carteira_origem_acesso_negado");
      }
      if (!carteirasPermitidas.includes(Number(dados.carteira_destino_id))) {
        return erroCliente("Acesso negado à carteira de destino.", 403, "carteira_destino_acesso_negado");
      }

      if (idempotencyKey) {
        const { results: existente } = await env.DB.prepare(
          `SELECT id FROM transferencias WHERE idempotency_key = ? AND criado_por = ?`,
        )
          .bind(idempotencyKey, usuarioLogado.id)
          .all<TransferenciaExistenteRow>();

        if (existente.length > 0) {
          return json({ id: existente[0].id, mensagem: "Transferência já registrada.", idempotente: true });
        }
      }

      const saldo = await calcularSaldoCarteira(env, dados.carteira_origem_id);
      if (saldo < valor) {
        return erroCliente("Saldo insuficiente na carteira de origem.", 400, "saldo_insuficiente");
      }

      const resultado = await env.DB.prepare(
        `INSERT INTO transferencias
         (valor, valor_centavos, data_transferencia, carteira_origem_id, carteira_destino_id, descricao, criado_por, idempotency_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          valor,
          valorCentavos,
          dados.data_transferencia || new Date().toISOString().split("T")[0],
          dados.carteira_origem_id,
          dados.carteira_destino_id,
          dados.descricao || "",
          usuarioLogado.id,
          idempotencyKey || null,
        )
        .run();

      await registrarAuditoria(env, {
        usuarioId: usuarioLogado.id,
        acao: "transferencia.criada",
        entidade: "transferencia",
        entidadeId: resultado.meta?.last_row_id || null,
        carteiraId: Number(dados.carteira_origem_id),
        metadata: {
          carteira_destino_id: Number(dados.carteira_destino_id),
        },
      });

      return json({ id: resultado.meta?.last_row_id ?? null, mensagem: "Transferência realizada com sucesso!" }, 201);
    } catch (erro) {
      return erroInterno(erro, "transferencias.criar", "Não foi possível criar esta transferência agora.", "transferencia_criar_falhou");
    }
  }

  // 3. Apagar transferência
  if (metodo === "DELETE") {
    try {
      const id = url.searchParams.get("id");
      if (!id) {
        return erroCliente("ID não fornecido.", 400, "id_obrigatorio");
      }

      const { results: alvo } = await env.DB.prepare(
        `SELECT carteira_origem_id, carteira_destino_id, criado_por FROM transferencias WHERE id = ?`,
      ).bind(id).all<TransferenciaAlvoRow>();

      if (alvo.length === 0) {
        return erroCliente("Transferência não encontrada.", 404, "transferencia_nao_encontrada");
      }
      if (alvo[0].criado_por !== usuarioLogado.id && usuarioLogado.perfil !== "superadmin") {
        return erroCliente("Só quem realizou (ou um administrador) pode excluir esta transferência.", 403, "transferencia_exclusao_negada");
      }
      if (!carteirasPermitidas.includes(alvo[0].carteira_origem_id) || !carteirasPermitidas.includes(alvo[0].carteira_destino_id)) {
        return erroCliente("Acesso negado a uma das carteiras.", 403, "carteiras_acesso_negado");
      }

      await env.DB.prepare(`DELETE FROM transferencias WHERE id = ?`).bind(id).run();

      await registrarAuditoria(env, {
        usuarioId: usuarioLogado.id,
        acao: "transferencia.excluida",
        entidade: "transferencia",
        entidadeId: Number(id),
        carteiraId: alvo[0].carteira_origem_id,
        metadata: {
          carteira_destino_id: alvo[0].carteira_destino_id,
        },
      });

      return json({ mensagem: "Transferência apagada." });
    } catch (erro) {
      return erroInterno(erro, "transferencias.excluir", "Não foi possível apagar esta transferência agora.", "transferencia_excluir_falhou");
    }
  }

  return erroCliente("Método não permitido.", 405, "metodo_nao_permitido");
}
