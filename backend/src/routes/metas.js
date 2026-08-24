// ==========================================
// metas.js - Metas (orçamento) por categoria + depósitos
// ==========================================
import { obterUsuarioDaSessao } from "../utils/sessao.ts";
import { obterCarteirasDoUsuario } from "../utils/carteiras.ts";
import { registrarAuditoria } from "../utils/auditoria.js";
import { centavosParaReais, normalizarCentavos } from "../utils/dinheiro.ts";

export async function processarMetas(request, env, ctx) {
  const metodo = request.method;
  const url = new URL(request.url);

  const usuarioLogado = await obterUsuarioDaSessao(request, env, ctx);
  if (!usuarioLogado) {
    return new Response(JSON.stringify({ erro: "Não autenticado." }), { status: 401 });
  }

  const carteirasPermitidas = await obterCarteirasDoUsuario(env, usuarioLogado.id);

  // ==========================================
  // LISTAR
  // ==========================================
  if (metodo === "GET") {
    try {
      const carteiraId = url.searchParams.get("carteira_id");
      const metaId = url.searchParams.get("meta_id");

      if (carteiraId && !carteirasPermitidas.includes(Number(carteiraId))) {
        return new Response(JSON.stringify({ erro: "Acesso negado a esta carteira." }), { status: 403 });
      }
      if (carteirasPermitidas.length === 0) {
        return new Response(JSON.stringify([]), { status: 200 });
      }

      let query = `SELECT * FROM metas_categoria WHERE 1=1`;
      let params = [];

      if (carteiraId) {
        query += ` AND carteira_id = ?`;
        params.push(carteiraId);
      } else {
        query += ` AND carteira_id IN (${carteirasPermitidas.map(() => "?").join(",")})`;
        params.push(...carteirasPermitidas);
      }

      const { results } = await env.DB.prepare(query)
        .bind(...params)
        .all();

      const metaIds = results.map((m) => m.id);
      let depositosMap = {};

      if (metaIds.length > 0) {
        const placeholders = metaIds.map(() => "?").join(",");
        const { results: depositosResults } = await env.DB.prepare(
          `SELECT
             meta_id,
             COALESCE(SUM(COALESCE(valor_centavos, ROUND(valor * 100))), 0) / 100.0 AS total,
             COALESCE(SUM(COALESCE(valor_centavos, ROUND(valor * 100))), 0) AS total_centavos
           FROM meta_depositos
           WHERE meta_id IN (${placeholders})
           GROUP BY meta_id`
        ).bind(...metaIds).all();
        depositosMap = Object.fromEntries(depositosResults.map((d) => [d.meta_id, d]));
      }

      const agora = new Date();
      const metasComProgresso = results.map((meta) => {
        const valorLimiteCentavos = meta.valor_limite_centavos ?? Math.round(meta.valor_limite * 100);
        const totalDepositadoCentavos = depositosMap[meta.id]?.total_centavos ?? Math.round((depositosMap[meta.id]?.total || 0) * 100);
        const totalDepositado = centavosParaReais(totalDepositadoCentavos);
        const faltaCentavos = Math.max(0, valorLimiteCentavos - totalDepositadoCentavos);
        const falta = centavosParaReais(faltaCentavos);
        let guarda_semanal = null;
        let semanas_restantes = null;

        if (meta.data_limite && faltaCentavos > 0) {
          const dataLimite = new Date(meta.data_limite + "T23:59:59");
          const diffMs = dataLimite - agora;
          semanas_restantes = Math.max(1, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)));
          guarda_semanal = centavosParaReais(Math.ceil(faltaCentavos / semanas_restantes));
        }

        return {
          ...meta,
          total_depositado: totalDepositado,
          total_depositado_centavos: totalDepositadoCentavos,
          falta,
          falta_centavos: faltaCentavos,
          guarda_semanal,
          guarda_semanal_centavos: guarda_semanal === null ? null : Math.ceil(faltaCentavos / semanas_restantes),
          semanas_restantes,
        };
      });

      if (metaId) {
        const metasFiltradas = metasComProgresso.filter((m) => m.id === Number(metaId));
        return new Response(JSON.stringify(metasFiltradas), { status: 200 });
      }

      return new Response(JSON.stringify(metasComProgresso), { status: 200 });
    } catch (erro) {
      console.error("Erro:", erro);
      return new Response(JSON.stringify({ erro: "Erro ao buscar metas." }), { status: 500 });
    }
  }

  // ==========================================
  // CRIAR OU ATUALIZAR (upsert por carteira + categoria)
  // ==========================================
  if (metodo === "POST") {
    try {
      const dados = await request.json();

      if (!carteirasPermitidas.includes(Number(dados.carteira_id))) {
        return new Response(JSON.stringify({ erro: "Acesso negado a esta carteira." }), { status: 403 });
      }

      const categoria = (dados.categoria || "").trim();
      if (dados.valor_limite === undefined && dados.valor_limite_centavos === undefined) {
        return new Response(JSON.stringify({ erro: "Informe um valor de meta vÃ¡lido." }), { status: 400 });
      }
      const valorLimiteCentavos = normalizarCentavos(dados.valor_limite, dados.valor_limite_centavos);
      const valorLimite = centavosParaReais(valorLimiteCentavos);
      const dataLimite = dados.data_limite || null;

      if (!categoria) {
        return new Response(JSON.stringify({ erro: "Categoria não informada." }), { status: 400 });
      }
      if (valorLimiteCentavos <= 0) {
        return new Response(JSON.stringify({ erro: "Informe um valor de meta válido." }), { status: 400 });
      }

      const resultado = await env.DB.prepare(
        `INSERT INTO metas_categoria (carteira_id, categoria, valor_limite, valor_limite_centavos, data_limite, criado_por)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(carteira_id, categoria) DO UPDATE SET valor_limite = excluded.valor_limite, valor_limite_centavos = excluded.valor_limite_centavos, data_limite = excluded.data_limite`,
      )
        .bind(dados.carteira_id, categoria, valorLimite, valorLimiteCentavos, dataLimite, usuarioLogado.id)
        .run();

      const { results: metaSalva } = await env.DB.prepare(
        `SELECT id FROM metas_categoria WHERE carteira_id = ? AND LOWER(categoria) = LOWER(?)`,
      )
        .bind(dados.carteira_id, categoria)
        .all();

      await registrarAuditoria(env, {
        usuarioId: usuarioLogado.id,
        acao: "meta.salva",
        entidade: "meta",
        entidadeId: metaSalva[0]?.id || resultado.meta?.last_row_id || null,
        carteiraId: Number(dados.carteira_id),
        metadata: {
          categoria,
          tem_data_limite: Boolean(dataLimite),
        },
      });

      return new Response(JSON.stringify({ mensagem: "Meta salva com sucesso!" }), { status: 200 });
    } catch (erro) {
      console.error("Erro:", erro);
      return new Response(JSON.stringify({ erro: "Erro ao salvar meta." }), { status: 500 });
    }
  }

  // ==========================================
  // EXCLUIR (remove o limite e seus depósitos)
  // ==========================================
  if (metodo === "DELETE") {
    try {
      const id = url.searchParams.get("id");
      if (!id) {
        return new Response(JSON.stringify({ erro: "ID não fornecido." }), { status: 400 });
      }

      const { results: alvo } = await env.DB.prepare(`SELECT carteira_id FROM metas_categoria WHERE id = ?`).bind(id).all();
      if (alvo.length === 0) {
        return new Response(JSON.stringify({ erro: "Meta não encontrada." }), { status: 404 });
      }
      if (!carteirasPermitidas.includes(alvo[0].carteira_id)) {
        return new Response(JSON.stringify({ erro: "Acesso negado a esta carteira." }), { status: 403 });
      }

      await registrarAuditoria(env, {
        usuarioId: usuarioLogado.id,
        acao: "meta.excluida",
        entidade: "meta",
        entidadeId: Number(id),
        carteiraId: alvo[0].carteira_id,
      });

      await env.DB.prepare(`DELETE FROM meta_depositos WHERE meta_id = ?`).bind(id).run();
      await env.DB.prepare(`DELETE FROM metas_categoria WHERE id = ?`).bind(id).run();

      return new Response(JSON.stringify({ mensagem: "Meta removida." }), { status: 200 });
    } catch (erro) {
      console.error("Erro:", erro);
      return new Response(JSON.stringify({ erro: "Erro ao remover meta." }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ erro: "Método não permitido." }), { status: 405 });
}

// ==========================================
// processarMetaDepositos - CRUD de depósitos em metas
// ==========================================
export async function processarMetaDepositos(request, env, ctx) {
  const metodo = request.method;
  const url = new URL(request.url);

  const usuarioLogado = await obterUsuarioDaSessao(request, env, ctx);
  if (!usuarioLogado) {
    return new Response(JSON.stringify({ erro: "Não autenticado." }), { status: 401 });
  }

  const carteirasPermitidas = await obterCarteirasDoUsuario(env, usuarioLogado.id);

  // ==========================================
  // LISTAR DEPÓSITOS
  // ==========================================
  if (metodo === "GET") {
    try {
      const metaId = url.searchParams.get("meta_id");
      if (!metaId) {
        return new Response(JSON.stringify({ erro: "meta_id não fornecido." }), { status: 400 });
      }

      const { results: meta } = await env.DB.prepare(`SELECT carteira_id FROM metas_categoria WHERE id = ?`).bind(metaId).all();
      if (meta.length === 0) {
        return new Response(JSON.stringify({ erro: "Meta não encontrada." }), { status: 404 });
      }
      if (!carteirasPermitidas.includes(meta[0].carteira_id)) {
        return new Response(JSON.stringify({ erro: "Acesso negado." }), { status: 403 });
      }

      const { results } = await env.DB.prepare(
        `SELECT d.*, COALESCE(u.nome, u.nome_usuario) AS criado_por_nome
         FROM meta_depositos d
         JOIN usuarios u ON u.id = d.criado_por
         WHERE d.meta_id = ?
         ORDER BY d.criado_em DESC`,
      )
        .bind(metaId)
        .all();

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
      const metaId = dados.meta_id;
      if (dados.valor === undefined && dados.valor_centavos === undefined) {
        return new Response(JSON.stringify({ erro: "Informe um valor vÃ¡lido." }), { status: 400 });
      }
      const valorCentavos = normalizarCentavos(dados.valor, dados.valor_centavos);
      const valor = centavosParaReais(valorCentavos);
      const descricao = (dados.descricao || "").trim();

      if (!metaId) {
        return new Response(JSON.stringify({ erro: "meta_id não fornecido." }), { status: 400 });
      }
      if (valorCentavos <= 0) {
        return new Response(JSON.stringify({ erro: "Informe um valor válido." }), { status: 400 });
      }

      const { results: meta } = await env.DB.prepare(`SELECT carteira_id FROM metas_categoria WHERE id = ?`).bind(metaId).all();
      if (meta.length === 0) {
        return new Response(JSON.stringify({ erro: "Meta não encontrada." }), { status: 404 });
      }
      if (!carteirasPermitidas.includes(meta[0].carteira_id)) {
        return new Response(JSON.stringify({ erro: "Acesso negado." }), { status: 403 });
      }

      const resultado = await env.DB.prepare(
        `INSERT INTO meta_depositos (meta_id, valor, valor_centavos, descricao, criado_por) VALUES (?, ?, ?, ?, ?)`,
      )
        .bind(metaId, valor, valorCentavos, descricao, usuarioLogado.id)
        .run();

      await registrarAuditoria(env, {
        usuarioId: usuarioLogado.id,
        acao: "meta_deposito.criado",
        entidade: "meta_deposito",
        entidadeId: resultado.meta?.last_row_id || null,
        carteiraId: meta[0].carteira_id,
        metadata: {
          meta_id: Number(metaId),
          tem_descricao: Boolean(descricao),
        },
      });

      return new Response(JSON.stringify({ id: resultado.meta.last_row_id, mensagem: "Depósito registrado!" }), { status: 201 });
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

      const { results: deposito } = await env.DB.prepare(
        `SELECT d.meta_id, m.carteira_id FROM meta_depositos d JOIN metas_categoria m ON m.id = d.meta_id WHERE d.id = ?`,
      )
        .bind(id)
        .all();

      if (deposito.length === 0) {
        return new Response(JSON.stringify({ erro: "Depósito não encontrado." }), { status: 404 });
      }
      if (!carteirasPermitidas.includes(deposito[0].carteira_id)) {
        return new Response(JSON.stringify({ erro: "Acesso negado." }), { status: 403 });
      }

      await env.DB.prepare(`DELETE FROM meta_depositos WHERE id = ?`).bind(id).run();

      await registrarAuditoria(env, {
        usuarioId: usuarioLogado.id,
        acao: "meta_deposito.excluido",
        entidade: "meta_deposito",
        entidadeId: Number(id),
        carteiraId: deposito[0].carteira_id,
        metadata: {
          meta_id: deposito[0].meta_id,
        },
      });

      return new Response(JSON.stringify({ mensagem: "Depósito removido." }), { status: 200 });
    } catch (erro) {
      console.error("Erro:", erro);
      return new Response(JSON.stringify({ erro: "Erro ao remover depósito." }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ erro: "Método não permitido." }), { status: 405 });
}
