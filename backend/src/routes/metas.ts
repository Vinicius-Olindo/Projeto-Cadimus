// ==========================================
// metas.ts - Metas (orçamento) por categoria + depósitos
// ==========================================
import type { CadimusEnv, IdEntrada, SqlParam, WorkerCtx } from "../types.js";
import { obterUsuarioDaSessao } from "../utils/sessao.ts";
import { obterCarteirasDoUsuario } from "../utils/carteiras.ts";
import { registrarAuditoria } from "../utils/auditoria.ts";
import { centavosParaReais, normalizarCentavos, type ValorMonetarioEntrada } from "../utils/dinheiro.ts";
import { erroCliente, erroInterno, json } from "../utils/respostas.ts";

interface MetaPayload {
  carteira_id?: IdEntrada;
  categoria?: string;
  valor_limite?: ValorMonetarioEntrada;
  valor_limite_centavos?: ValorMonetarioEntrada;
  data_limite?: string | null;
}

interface MetaDepositoPayload {
  meta_id?: IdEntrada;
  valor?: ValorMonetarioEntrada;
  valor_centavos?: ValorMonetarioEntrada;
  descricao?: string;
}

interface MetaCategoriaRow {
  id: number;
  carteira_id: number;
  categoria: string;
  valor_limite: number;
  valor_limite_centavos?: number | null;
  data_limite?: string | null;
  criado_por?: number | null;
}

interface DepositoResumoRow {
  meta_id: number;
  total?: number | null;
  total_centavos?: number | string | null;
}

interface MetaComProgresso extends MetaCategoriaRow {
  total_depositado: number;
  total_depositado_centavos: number;
  falta: number;
  falta_centavos: number;
  guarda_semanal: number | null;
  guarda_semanal_centavos: number | null;
  semanas_restantes: number | null;
}

interface MetaIdRow {
  id: number;
}

interface MetaCarteiraRow {
  carteira_id: number;
}

interface MetaDepositoListagemRow {
  id: number;
  meta_id: number;
  valor?: number;
  valor_centavos?: number | null;
  descricao?: string | null;
  criado_por: number;
  criado_por_nome?: string;
  criado_em?: string;
}

interface DepositoAlvoRow {
  meta_id: number;
  carteira_id: number;
}

export async function processarMetas(request: Request, env: CadimusEnv, ctx: WorkerCtx): Promise<Response> {
  const metodo = request.method;
  const url = new URL(request.url);

  const usuarioLogado = await obterUsuarioDaSessao(request, env, ctx);
  if (!usuarioLogado) {
    return erroCliente("Não autenticado.", 401, "nao_autenticado");
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
        return erroCliente("Acesso negado a esta carteira.", 403, "carteira_acesso_negado");
      }
      if (carteirasPermitidas.length === 0) {
        return json([]);
      }

      let query = `SELECT * FROM metas_categoria WHERE 1=1`;
      const params: SqlParam[] = [];

      if (carteiraId) {
        query += ` AND carteira_id = ?`;
        params.push(carteiraId);
      } else {
        query += ` AND carteira_id IN (${carteirasPermitidas.map(() => "?").join(",")})`;
        params.push(...carteirasPermitidas);
      }

      const { results } = await env.DB.prepare(query)
        .bind(...params)
        .all<MetaCategoriaRow>();

      const metaIds = results.map((m) => m.id);
      let depositosMap: Record<number, DepositoResumoRow> = {};

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
        ).bind(...metaIds).all<DepositoResumoRow>();
        depositosMap = Object.fromEntries(depositosResults.map((d) => [d.meta_id, d]));
      }

      const agora = new Date();
      const metasComProgresso = results.map((meta) => {
        const valorLimiteCentavos = meta.valor_limite_centavos ?? Math.round(meta.valor_limite * 100);
        const totalDepositadoCentavos = Number(depositosMap[meta.id]?.total_centavos ?? Math.round((depositosMap[meta.id]?.total || 0) * 100));
        const totalDepositado = centavosParaReais(totalDepositadoCentavos);
        const faltaCentavos = Math.max(0, valorLimiteCentavos - totalDepositadoCentavos);
        const falta = centavosParaReais(faltaCentavos);
        let guarda_semanal: number | null = null;
        let guardaSemanalCentavos: number | null = null;
        let semanas_restantes: number | null = null;

        if (meta.data_limite && faltaCentavos > 0) {
          const dataLimite = new Date(meta.data_limite + "T23:59:59");
          const diffMs = dataLimite.getTime() - agora.getTime();
          semanas_restantes = Math.max(1, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)));
          guardaSemanalCentavos = Math.ceil(faltaCentavos / semanas_restantes);
          guarda_semanal = centavosParaReais(guardaSemanalCentavos);
        }

        return {
          ...meta,
          total_depositado: totalDepositado,
          total_depositado_centavos: totalDepositadoCentavos,
          falta,
          falta_centavos: faltaCentavos,
          guarda_semanal,
          guarda_semanal_centavos: guardaSemanalCentavos,
          semanas_restantes,
        };
      });

      if (metaId) {
        const metasFiltradas = metasComProgresso.filter((m) => m.id === Number(metaId));
        return json(metasFiltradas);
      }

      return json(metasComProgresso);
    } catch (erro) {
      return erroInterno(erro, "metas.listar", "Não foi possível carregar as metas agora.", "metas_listar_falhou");
    }
  }

  // ==========================================
  // CRIAR OU ATUALIZAR (upsert por carteira + categoria)
  // ==========================================
  if (metodo === "POST") {
    try {
      const dados = await request.json() as MetaPayload;

      if (!carteirasPermitidas.includes(Number(dados.carteira_id))) {
        return erroCliente("Acesso negado a esta carteira.", 403, "carteira_acesso_negado");
      }

      const categoria = (dados.categoria || "").trim();
      if (dados.valor_limite === undefined && dados.valor_limite_centavos === undefined) {
        return erroCliente("Informe um valor de meta válido.", 400, "valor_meta_obrigatorio");
      }
      const valorLimiteCentavos = normalizarCentavos(dados.valor_limite, dados.valor_limite_centavos);
      const valorLimite = centavosParaReais(valorLimiteCentavos);
      const dataLimite = dados.data_limite || null;

      if (!categoria) {
        return erroCliente("Categoria não informada.", 400, "categoria_obrigatoria");
      }
      if (valorLimiteCentavos <= 0) {
        return erroCliente("Informe um valor de meta válido.", 400, "valor_meta_invalido");
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
        .all<MetaIdRow>();

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

      return json({ mensagem: "Meta salva com sucesso!" });
    } catch (erro) {
      return erroInterno(erro, "metas.salvar", "Não foi possível salvar esta meta agora.", "meta_salvar_falhou");
    }
  }

  // ==========================================
  // EXCLUIR (remove o limite e seus depósitos)
  // ==========================================
  if (metodo === "DELETE") {
    try {
      const id = url.searchParams.get("id");
      if (!id) {
        return erroCliente("ID não fornecido.", 400, "id_obrigatorio");
      }

      const { results: alvo } = await env.DB.prepare(`SELECT carteira_id FROM metas_categoria WHERE id = ?`).bind(id).all<MetaCarteiraRow>();
      if (alvo.length === 0) {
        return erroCliente("Meta não encontrada.", 404, "meta_nao_encontrada");
      }
      if (!carteirasPermitidas.includes(alvo[0].carteira_id)) {
        return erroCliente("Acesso negado a esta carteira.", 403, "carteira_acesso_negado");
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

      return json({ mensagem: "Meta removida." });
    } catch (erro) {
      return erroInterno(erro, "metas.excluir", "Não foi possível remover esta meta agora.", "meta_excluir_falhou");
    }
  }

  return erroCliente("Método não permitido.", 405, "metodo_nao_permitido");
}

// ==========================================
// processarMetaDepositos - CRUD de depósitos em metas
// ==========================================
export async function processarMetaDepositos(request: Request, env: CadimusEnv, ctx: WorkerCtx): Promise<Response> {
  const metodo = request.method;
  const url = new URL(request.url);

  const usuarioLogado = await obterUsuarioDaSessao(request, env, ctx);
  if (!usuarioLogado) {
    return erroCliente("Não autenticado.", 401, "nao_autenticado");
  }

  const carteirasPermitidas = await obterCarteirasDoUsuario(env, usuarioLogado.id);

  // ==========================================
  // LISTAR DEPÓSITOS
  // ==========================================
  if (metodo === "GET") {
    try {
      const metaId = url.searchParams.get("meta_id");
      if (!metaId) {
        return erroCliente("meta_id não fornecido.", 400, "meta_id_obrigatorio");
      }

      const { results: meta } = await env.DB.prepare(`SELECT carteira_id FROM metas_categoria WHERE id = ?`).bind(metaId).all<MetaCarteiraRow>();
      if (meta.length === 0) {
        return erroCliente("Meta não encontrada.", 404, "meta_nao_encontrada");
      }
      if (!carteirasPermitidas.includes(meta[0].carteira_id)) {
        return erroCliente("Acesso negado.", 403, "acesso_negado");
      }

      const { results } = await env.DB.prepare(
        `SELECT d.*, COALESCE(u.nome, u.nome_usuario) AS criado_por_nome
         FROM meta_depositos d
         JOIN usuarios u ON u.id = d.criado_por
         WHERE d.meta_id = ?
         ORDER BY d.criado_em DESC`,
      )
        .bind(metaId)
        .all<MetaDepositoListagemRow>();

      return json(results);
    } catch (erro) {
      return erroInterno(erro, "metaDepositos.listar", "Não foi possível carregar os depósitos agora.", "depositos_listar_falhou");
    }
  }

  // ==========================================
  // CRIAR DEPÓSITO
  // ==========================================
  if (metodo === "POST") {
    try {
      const dados = await request.json() as MetaDepositoPayload;
      const metaId = dados.meta_id;
      if (dados.valor === undefined && dados.valor_centavos === undefined) {
        return erroCliente("Informe um valor válido.", 400, "valor_obrigatorio");
      }
      const valorCentavos = normalizarCentavos(dados.valor, dados.valor_centavos);
      const valor = centavosParaReais(valorCentavos);
      const descricao = (dados.descricao || "").trim();

      if (!metaId) {
        return erroCliente("meta_id não fornecido.", 400, "meta_id_obrigatorio");
      }
      if (valorCentavos <= 0) {
        return erroCliente("Informe um valor válido.", 400, "valor_invalido");
      }

      const { results: meta } = await env.DB.prepare(`SELECT carteira_id FROM metas_categoria WHERE id = ?`).bind(metaId).all<MetaCarteiraRow>();
      if (meta.length === 0) {
        return erroCliente("Meta não encontrada.", 404, "meta_nao_encontrada");
      }
      if (!carteirasPermitidas.includes(meta[0].carteira_id)) {
        return erroCliente("Acesso negado.", 403, "acesso_negado");
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

      return json({ id: resultado.meta?.last_row_id ?? null, mensagem: "Depósito registrado!" }, 201);
    } catch (erro) {
      return erroInterno(erro, "metaDepositos.criar", "Não foi possível registrar este depósito agora.", "deposito_criar_falhou");
    }
  }

  // ==========================================
  // EXCLUIR DEPÓSITO
  // ==========================================
  if (metodo === "DELETE") {
    try {
      const id = url.searchParams.get("id");
      if (!id) {
        return erroCliente("ID não fornecido.", 400, "id_obrigatorio");
      }

      const { results: deposito } = await env.DB.prepare(
        `SELECT d.meta_id, m.carteira_id FROM meta_depositos d JOIN metas_categoria m ON m.id = d.meta_id WHERE d.id = ?`,
      )
        .bind(id)
        .all<DepositoAlvoRow>();

      if (deposito.length === 0) {
        return erroCliente("Depósito não encontrado.", 404, "deposito_nao_encontrado");
      }
      if (!carteirasPermitidas.includes(deposito[0].carteira_id)) {
        return erroCliente("Acesso negado.", 403, "acesso_negado");
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

      return json({ mensagem: "Depósito removido." });
    } catch (erro) {
      return erroInterno(erro, "metaDepositos.excluir", "Não foi possível remover este depósito agora.", "deposito_excluir_falhou");
    }
  }

  return erroCliente("Método não permitido.", 405, "metodo_nao_permitido");
}
