// ==========================================
// planos.js - Planos financeiros (viagem, compra, reserva, etc.)
// ==========================================
import { obterUsuarioDaSessao } from "../utils/sessao.js";
import { centavosParaReais, normalizarCentavos } from "../utils/dinheiro.ts";

export async function processarPlanos(request, env, ctx) {
  const metodo = request.method;
  const url = new URL(request.url);

  const usuarioLogado = await obterUsuarioDaSessao(request, env, ctx);
  if (!usuarioLogado) {
    return new Response(JSON.stringify({ erro: "Não autenticado." }), { status: 401 });
  }

  // ==========================================
  // LISTAR
  // ==========================================
  if (metodo === "GET") {
    try {
      const planoId = url.searchParams.get("id");
      const statusFiltro = url.searchParams.get("status");
      const tipoFiltro = url.searchParams.get("tipo"); // "meus" ou "compartilhados"

      let query = `SELECT p.*, u.nome AS criado_por_nome FROM planos p LEFT JOIN usuarios u ON p.usuario_id = u.id WHERE 1=1`;
      let params = [];

      if (tipoFiltro === "compartilhados") {
        query += ` AND p.compartilhado = 1 AND p.usuario_id != ?`;
        params.push(usuarioLogado.id);
      } else {
        query += ` AND p.usuario_id = ?`;
        params.push(usuarioLogado.id);
      }

      if (statusFiltro) {
        query += ` AND p.status = ?`;
        params.push(statusFiltro);
      }

      if (planoId) {
        query += ` AND p.id = ?`;
        params.push(planoId);
      }

      query += ` ORDER BY 
        CASE p.prioridade WHEN 'alta' THEN 0 WHEN 'media' THEN 1 WHEN 'baixa' THEN 2 END,
        p.data_limite ASC NULLS LAST,
        p.criado_em DESC`;

      const { results } = await env.DB.prepare(query).bind(...params).all();

      const planoIds = results.map((p) => p.id);
      let depositosMap = {};

      if (planoIds.length > 0) {
        const placeholders = planoIds.map(() => "?").join(",");
        const { results: depositosResults } = await env.DB.prepare(
          `SELECT
             plano_id,
             COALESCE(SUM(COALESCE(valor_centavos, ROUND(valor * 100))), 0) / 100.0 AS total,
             COALESCE(SUM(COALESCE(valor_centavos, ROUND(valor * 100))), 0) AS total_centavos
           FROM plano_depositos
           WHERE plano_id IN (${placeholders})
           GROUP BY plano_id`
        ).bind(...planoIds).all();
        depositosMap = Object.fromEntries(depositosResults.map((d) => [d.plano_id, d]));
      }

      const agora = new Date();
      const planosComProgresso = results.map((plano) => {
        const valorAlvoCentavos = plano.valor_alvo_centavos ?? Math.round(plano.valor_alvo * 100);
        const depositadoCentavos = depositosMap[plano.id]?.total_centavos ?? Math.round((depositosMap[plano.id]?.total || 0) * 100);
        const depositado = centavosParaReais(depositadoCentavos);
        const faltaCentavos = Math.max(0, valorAlvoCentavos - depositadoCentavos);
        const falta = centavosParaReais(faltaCentavos);
        let parcela_mensal = null;
        let meses_restantes = null;

        if (plano.data_limite && faltaCentavos > 0) {
          const dataLimite = new Date(plano.data_limite + "T23:59:59");
          const diffMs = dataLimite - agora;
          meses_restantes = Math.max(1, Math.ceil(diffMs / (30 * 24 * 60 * 60 * 1000)));
          parcela_mensal = centavosParaReais(Math.ceil(faltaCentavos / meses_restantes));
        }

        return {
          ...plano,
          depositado,
          depositado_centavos: depositadoCentavos,
          falta,
          falta_centavos: faltaCentavos,
          parcela_mensal,
          parcela_mensal_centavos: parcela_mensal === null ? null : Math.ceil(faltaCentavos / meses_restantes),
          meses_restantes,
          percentual: valorAlvoCentavos > 0 ? Math.min(100, Math.round((depositadoCentavos / valorAlvoCentavos) * 100)) : 0,
        };
      });

      return new Response(JSON.stringify(planosComProgresso), { status: 200 });
    } catch (erro) {
      console.error("Erro:", erro);
      return new Response(JSON.stringify({ erro: "Erro ao buscar planos." }), { status: 500 });
    }
  }

  // ==========================================
  // CRIAR
  // ==========================================
  if (metodo === "POST") {
    try {
      const dados = await request.json();
      const nome = (dados.nome || "").trim();
      const descricao = (dados.descricao || "").trim();
      if (dados.valor_alvo === undefined && dados.valor_alvo_centavos === undefined) {
        return new Response(JSON.stringify({ erro: "Informe um valor alvo vÃ¡lido." }), { status: 400 });
      }
      const valorAlvoCentavos = normalizarCentavos(dados.valor_alvo, dados.valor_alvo_centavos);
      const valorAlvo = centavosParaReais(valorAlvoCentavos);
      const dataLimite = dados.data_limite || null;
      const prioridade = dados.prioridade || "media";
      const icone = dados.icone || "🎯";
      const cor = dados.cor || "#6366f1";
      const compartilhado = dados.compartilhado ? 1 : 0;

      if (!nome) {
        return new Response(JSON.stringify({ erro: "Nome do plano é obrigatório." }), { status: 400 });
      }
      if (valorAlvoCentavos <= 0) {
        return new Response(JSON.stringify({ erro: "Informe um valor alvo válido." }), { status: 400 });
      }

      const resultado = await env.DB.prepare(
        `INSERT INTO planos (usuario_id, nome, descricao, valor_alvo, valor_alvo_centavos, data_limite, prioridade, icone, cor, compartilhado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(usuarioLogado.id, nome, descricao, valorAlvo, valorAlvoCentavos, dataLimite, prioridade, icone, cor, compartilhado)
        .run();

      return new Response(JSON.stringify({ mensagem: "Plano criado!", id: resultado.meta?.last_row_id }), { status: 201 });
    } catch (erro) {
      console.error("Erro:", erro);
      return new Response(JSON.stringify({ erro: "Erro ao criar plano." }), { status: 500 });
    }
  }

  // ==========================================
  // ATUALIZAR
  // ==========================================
  if (metodo === "PUT") {
    try {
      const dados = await request.json();
      const id = dados.id;
      if (!id) {
        return new Response(JSON.stringify({ erro: "ID não fornecido." }), { status: 400 });
      }

      const { results: alvo } = await env.DB.prepare(`SELECT usuario_id FROM planos WHERE id = ?`).bind(id).all();
      if (alvo.length === 0) {
        return new Response(JSON.stringify({ erro: "Plano não encontrado." }), { status: 404 });
      }
      if (alvo[0].usuario_id !== usuarioLogado.id) {
        return new Response(JSON.stringify({ erro: "Acesso negado." }), { status: 403 });
      }

      const campos = [];
      const valores = [];

      if (dados.nome !== undefined) { campos.push("nome = ?"); valores.push(dados.nome.trim()); }
      if (dados.descricao !== undefined) { campos.push("descricao = ?"); valores.push(dados.descricao.trim()); }
      if (dados.valor_alvo !== undefined || dados.valor_alvo_centavos !== undefined) {
        const valorAlvoCentavos = normalizarCentavos(dados.valor_alvo, dados.valor_alvo_centavos);
        if (valorAlvoCentavos <= 0) return new Response(JSON.stringify({ erro: "Valor alvo invÃ¡lido." }), { status: 400 });
        campos.push("valor_alvo = ?"); valores.push(centavosParaReais(valorAlvoCentavos));
        campos.push("valor_alvo_centavos = ?"); valores.push(valorAlvoCentavos);
      }
      if (dados.data_limite !== undefined) { campos.push("data_limite = ?"); valores.push(dados.data_limite || null); }
      if (dados.prioridade !== undefined) { campos.push("prioridade = ?"); valores.push(dados.prioridade); }
      if (dados.status !== undefined) { campos.push("status = ?"); valores.push(dados.status); }
      if (dados.icone !== undefined) { campos.push("icone = ?"); valores.push(dados.icone); }
      if (dados.cor !== undefined) { campos.push("cor = ?"); valores.push(dados.cor); }
      if (dados.compartilhado !== undefined) { campos.push("compartilhado = ?"); valores.push(dados.compartilhado ? 1 : 0); }

      if (campos.length === 0) {
        return new Response(JSON.stringify({ erro: "Nenhum campo para atualizar." }), { status: 400 });
      }

      campos.push("atualizado_em = datetime('now')");
      valores.push(id);

      await env.DB.prepare(`UPDATE planos SET ${campos.join(", ")} WHERE id = ?`).bind(...valores).run();

      return new Response(JSON.stringify({ mensagem: "Plano atualizado!" }), { status: 200 });
    } catch (erro) {
      console.error("Erro:", erro);
      return new Response(JSON.stringify({ erro: "Erro ao atualizar plano." }), { status: 500 });
    }
  }

  // ==========================================
  // EXCLUIR
  // ==========================================
  if (metodo === "DELETE") {
    try {
      const id = url.searchParams.get("id");
      if (!id) {
        return new Response(JSON.stringify({ erro: "ID não fornecido." }), { status: 400 });
      }

      const { results: alvo } = await env.DB.prepare(`SELECT usuario_id FROM planos WHERE id = ?`).bind(id).all();
      if (alvo.length === 0) {
        return new Response(JSON.stringify({ erro: "Plano não encontrado." }), { status: 404 });
      }
      if (alvo[0].usuario_id !== usuarioLogado.id) {
        return new Response(JSON.stringify({ erro: "Acesso negado." }), { status: 403 });
      }

      await env.DB.prepare(`DELETE FROM plano_depositos WHERE plano_id = ?`).bind(id).run();
      await env.DB.prepare(`DELETE FROM planos WHERE id = ?`).bind(id).run();

      return new Response(JSON.stringify({ mensagem: "Plano removido." }), { status: 200 });
    } catch (erro) {
      console.error("Erro:", erro);
      return new Response(JSON.stringify({ erro: "Erro ao remover plano." }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ erro: "Método não permitido." }), { status: 405 });
}

// ==========================================
// processarPlanoDepositos - CRUD de depósitos em planos
// ==========================================
export async function processarPlanoDepositos(request, env, ctx) {
  const metodo = request.method;
  const url = new URL(request.url);

  const usuarioLogado = await obterUsuarioDaSessao(request, env, ctx);
  if (!usuarioLogado) {
    return new Response(JSON.stringify({ erro: "Não autenticado." }), { status: 401 });
  }

  // ==========================================
  // LISTAR DEPÓSITOS
  // ==========================================
  if (metodo === "GET") {
    try {
      const planoId = url.searchParams.get("plano_id");
      if (!planoId) {
        return new Response(JSON.stringify({ erro: "plano_id não fornecido." }), { status: 400 });
      }

      const { results: plano } = await env.DB.prepare(`SELECT usuario_id FROM planos WHERE id = ?`).bind(planoId).all();
      if (plano.length === 0 || plano[0].usuario_id !== usuarioLogado.id) {
        return new Response(JSON.stringify({ erro: "Acesso negado." }), { status: 403 });
      }

      const { results } = await env.DB.prepare(
        `SELECT * FROM plano_depositos WHERE plano_id = ? ORDER BY criado_em DESC`
      ).bind(planoId).all();

      return new Response(JSON.stringify(results), { status: 200 });
    } catch (erro) {
      console.error("Erro:", erro);
      return new Response(JSON.stringify({ erro: "Erro ao buscar depósitos." }), { status: 500 });
    }
  }

  // ==========================================
  // CRIAR DEPÓSITO
  // ==========================================
  if (metodo === "POST") {
    try {
      const dados = await request.json();
      const planoId = dados.plano_id;
      if (dados.valor === undefined && dados.valor_centavos === undefined) {
        return new Response(JSON.stringify({ erro: "Informe um valor vÃ¡lido." }), { status: 400 });
      }
      const valorCentavos = normalizarCentavos(dados.valor, dados.valor_centavos);
      const valor = centavosParaReais(valorCentavos);
      const descricao = (dados.descricao || "").trim();

      if (!planoId) {
        return new Response(JSON.stringify({ erro: "plano_id não fornecido." }), { status: 400 });
      }
      if (valorCentavos <= 0) {
        return new Response(JSON.stringify({ erro: "Informe um valor válido." }), { status: 400 });
      }

      const { results: plano } = await env.DB.prepare(`SELECT usuario_id FROM planos WHERE id = ?`).bind(planoId).all();
      if (plano.length === 0 || plano[0].usuario_id !== usuarioLogado.id) {
        return new Response(JSON.stringify({ erro: "Acesso negado." }), { status: 403 });
      }

      await env.DB.prepare(
        `INSERT INTO plano_depositos (plano_id, valor, valor_centavos, descricao) VALUES (?, ?, ?, ?)`
      ).bind(planoId, valor, valorCentavos, descricao).run();

      return new Response(JSON.stringify({ mensagem: "Depósito registrado!" }), { status: 201 });
    } catch (erro) {
      console.error("Erro:", erro);
      return new Response(JSON.stringify({ erro: "Erro ao registrar depósito." }), { status: 500 });
    }
  }

  // ==========================================
  // EXCLUIR DEPÓSITO
  // ==========================================
  if (metodo === "DELETE") {
    try {
      const id = url.searchParams.get("id");
      if (!id) {
        return new Response(JSON.stringify({ erro: "ID não fornecido." }), { status: 400 });
      }

      const { results: dep } = await env.DB.prepare(
        `SELECT pd.id, p.usuario_id FROM plano_depositos pd JOIN planos p ON pd.plano_id = p.id WHERE pd.id = ?`
      ).bind(id).all();

      if (dep.length === 0 || dep[0].usuario_id !== usuarioLogado.id) {
        return new Response(JSON.stringify({ erro: "Acesso negado." }), { status: 403 });
      }

      await env.DB.prepare(`DELETE FROM plano_depositos WHERE id = ?`).bind(id).run();

      return new Response(JSON.stringify({ mensagem: "Depósito removido." }), { status: 200 });
    } catch (erro) {
      console.error("Erro:", erro);
      return new Response(JSON.stringify({ erro: "Erro ao remover depósito." }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ erro: "Método não permitido." }), { status: 405 });
}
