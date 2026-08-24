// ==========================================
// transferencias.js - Transferências entre Carteiras
// ==========================================
import { obterUsuarioDaSessao } from "../utils/sessao.ts";
import { obterCarteirasDoUsuario } from "../utils/carteiras.ts";
import { registrarAuditoria } from "../utils/auditoria.js";
import { centavosParaReais, normalizarCentavos } from "../utils/dinheiro.ts";

function dataISOValida(valor) {
  return typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

async function calcularSaldoCarteira(env, carteiraId) {
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
    .all();

  return centavosParaReais(results[0]?.saldo_centavos || 0);
}

export async function processarTransferencias(request, env, ctx) {
  const metodo = request.method;
  const url = new URL(request.url);

  const usuarioLogado = await obterUsuarioDaSessao(request, env, ctx);
  if (!usuarioLogado) {
    return new Response(JSON.stringify({ erro: "Não autenticado." }), { status: 401 });
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
      const params = [];

      if (carteiraId) {
        if (!carteirasPermitidas.includes(Number(carteiraId))) {
          return new Response(JSON.stringify({ erro: "Acesso negado a esta carteira." }), { status: 403 });
        }
        query += ` AND (t.carteira_origem_id = ? OR t.carteira_destino_id = ?)`;
        params.push(carteiraId, carteiraId);
      } else {
        if (carteirasPermitidas.length === 0) {
          return new Response(JSON.stringify([]), { status: 200 });
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
          return new Response(JSON.stringify({ erro: "data_inicio invÃ¡lida." }), { status: 400 });
        }
        query += ` AND t.data_transferencia >= ?`;
        params.push(dataInicio);
      }

      if (dataFim) {
        if (!dataISOValida(dataFim)) {
          return new Response(JSON.stringify({ erro: "data_fim invÃ¡lida." }), { status: 400 });
        }
        query += ` AND t.data_transferencia <= ?`;
        params.push(dataFim);
      }

      query += ` ORDER BY t.data_transferencia DESC`;

      const { results } = await env.DB.prepare(query).bind(...params).all();
      return new Response(JSON.stringify(results), { status: 200 });
    } catch (erro) {
      console.error("Erro:", erro);
      return new Response(JSON.stringify({ erro: "Erro ao buscar transferências." }), { status: 500 });
    }
  }

  // 2. Criar transferência
  if (metodo === "POST") {
    try {
      const dados = await request.json();
      const idempotencyKey = typeof dados.idempotency_key === "string" ? dados.idempotency_key.trim() : "";
      if (dados.valor === undefined && dados.valor_centavos === undefined) {
        return new Response(JSON.stringify({ erro: "Valor invÃ¡lido." }), { status: 400 });
      }
      const valorCentavos = normalizarCentavos(dados.valor, dados.valor_centavos);
      const valor = centavosParaReais(valorCentavos);

      if (valorCentavos <= 0) {
        return new Response(JSON.stringify({ erro: "Valor inválido." }), { status: 400 });
      }
      if (!dados.carteira_origem_id || !dados.carteira_destino_id) {
        return new Response(JSON.stringify({ erro: "Selecione as carteiras de origem e destino." }), { status: 400 });
      }
      if (dados.carteira_origem_id === dados.carteira_destino_id) {
        return new Response(JSON.stringify({ erro: "As carteiras de origem e destino devem ser diferentes." }), { status: 400 });
      }
      if (!carteirasPermitidas.includes(Number(dados.carteira_origem_id))) {
        return new Response(JSON.stringify({ erro: "Acesso negado à carteira de origem." }), { status: 403 });
      }
      if (!carteirasPermitidas.includes(Number(dados.carteira_destino_id))) {
        return new Response(JSON.stringify({ erro: "Acesso negado à carteira de destino." }), { status: 403 });
      }

      if (idempotencyKey) {
        const { results: existente } = await env.DB.prepare(
          `SELECT id FROM transferencias WHERE idempotency_key = ? AND criado_por = ?`,
        )
          .bind(idempotencyKey, usuarioLogado.id)
          .all();

        if (existente.length > 0) {
          return new Response(JSON.stringify({ id: existente[0].id, mensagem: "Transferência já registrada.", idempotente: true }), { status: 200 });
        }
      }

      const saldo = await calcularSaldoCarteira(env, dados.carteira_origem_id);
      if (saldo < valor) {
        return new Response(JSON.stringify({ erro: "Saldo insuficiente na carteira de origem." }), { status: 400 });
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

      return new Response(JSON.stringify({ id: resultado.meta.last_row_id, mensagem: "Transferência realizada com sucesso!" }), { status: 201 });
    } catch (erro) {
      console.error("Erro:", erro);
      return new Response(JSON.stringify({ erro: "Erro ao criar transferência." }), { status: 500 });
    }
  }

  // 3. Apagar transferência
  if (metodo === "DELETE") {
    try {
      const id = url.searchParams.get("id");
      if (!id) {
        return new Response(JSON.stringify({ erro: "ID não fornecido." }), { status: 400 });
      }

      const { results: alvo } = await env.DB.prepare(
        `SELECT carteira_origem_id, carteira_destino_id, criado_por FROM transferencias WHERE id = ?`,
      ).bind(id).all();

      if (alvo.length === 0) {
        return new Response(JSON.stringify({ erro: "Transferência não encontrada." }), { status: 404 });
      }
      if (alvo[0].criado_por !== usuarioLogado.id && usuarioLogado.perfil !== "superadmin") {
        return new Response(JSON.stringify({ erro: "Só quem realizou (ou um administrador) pode excluir esta transferência." }), { status: 403 });
      }
      if (!carteirasPermitidas.includes(alvo[0].carteira_origem_id) || !carteirasPermitidas.includes(alvo[0].carteira_destino_id)) {
        return new Response(JSON.stringify({ erro: "Acesso negado a uma das carteiras." }), { status: 403 });
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

      return new Response(JSON.stringify({ mensagem: "Transferência apagada." }), { status: 200 });
    } catch (erro) {
      console.error("Erro:", erro);
      return new Response(JSON.stringify({ erro: "Erro ao apagar transferência." }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ erro: "Método não permitido." }), { status: 405 });
}
