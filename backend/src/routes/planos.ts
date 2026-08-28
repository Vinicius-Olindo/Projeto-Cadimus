// ==========================================
// planos.ts - Planos financeiros (viagem, compra, reserva, etc.)
// ==========================================
import type { CadimusEnv, SqlParam, WorkerCtx } from "../types.js";
import { obterUsuarioDaSessao } from "../utils/sessao.ts";
import { centavosParaReais, normalizarCentavos, type ValorMonetarioEntrada } from "../utils/dinheiro.ts";
import { campoCentavosObrigatorio, campoTexto, lerJsonObjeto } from "../utils/requisicao.ts";
import { erroCliente, erroInterno, json } from "../utils/respostas.ts";

interface PlanoPayload {
  id?: number | string;
  nome?: string;
  descricao?: string;
  valor_alvo?: ValorMonetarioEntrada;
  valor_alvo_centavos?: ValorMonetarioEntrada;
  data_limite?: string | null;
  prioridade?: string;
  status?: string;
  icone?: string;
  cor?: string;
  compartilhado?: boolean | number;
}

interface PlanoDepositoPayload {
  plano_id?: number | string;
  valor?: ValorMonetarioEntrada;
  valor_centavos?: ValorMonetarioEntrada;
  descricao?: string;
}

interface PlanoRow {
  id: number;
  usuario_id: number;
  nome: string;
  descricao?: string | null;
  valor_alvo: number;
  valor_alvo_centavos?: number | null;
  data_limite?: string | null;
  prioridade?: string | null;
  status?: string | null;
  icone?: string | null;
  cor?: string | null;
  compartilhado?: number | boolean | null;
  criado_em?: string;
  atualizado_em?: string | null;
  criado_por_nome?: string | null;
}

interface DepositoResumoRow {
  plano_id: number;
  total?: number | null;
  total_centavos?: number | string | null;
}

interface PlanoComProgresso extends PlanoRow {
  depositado: number;
  depositado_centavos: number;
  falta: number;
  falta_centavos: number;
  parcela_mensal: number | null;
  parcela_mensal_centavos: number | null;
  meses_restantes: number | null;
  percentual: number;
}

interface PlanoDonoRow {
  usuario_id: number;
}

interface PlanoDepositoRow {
  id: number;
  plano_id: number;
  valor?: number;
  valor_centavos?: number | null;
  descricao?: string | null;
  criado_em?: string;
}

interface DepositoDonoRow {
  id: number;
  usuario_id: number;
}

export async function processarPlanos(request: Request, env: CadimusEnv, ctx: WorkerCtx): Promise<Response> {
  const metodo = request.method;
  const url = new URL(request.url);

  const usuarioLogado = await obterUsuarioDaSessao(request, env, ctx);
  if (!usuarioLogado) {
    return erroCliente("Não autenticado.", 401, "nao_autenticado");
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
      const params: SqlParam[] = [];

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

      const { results } = await env.DB.prepare(query).bind(...params).all<PlanoRow>();

      const planoIds = results.map((p) => p.id);
      let depositosMap: Record<number, DepositoResumoRow> = {};

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
        ).bind(...planoIds).all<DepositoResumoRow>();
        depositosMap = Object.fromEntries(depositosResults.map((d) => [d.plano_id, d]));
      }

      const agora = new Date();
      const planosComProgresso: PlanoComProgresso[] = results.map((plano) => {
        const valorAlvoCentavos = plano.valor_alvo_centavos ?? Math.round(plano.valor_alvo * 100);
        const depositadoCentavos = Number(depositosMap[plano.id]?.total_centavos ?? Math.round((depositosMap[plano.id]?.total || 0) * 100));
        const depositado = centavosParaReais(depositadoCentavos);
        const faltaCentavos = Math.max(0, valorAlvoCentavos - depositadoCentavos);
        const falta = centavosParaReais(faltaCentavos);
        let parcela_mensal: number | null = null;
        let parcelaMensalCentavos: number | null = null;
        let meses_restantes: number | null = null;

        if (plano.data_limite && faltaCentavos > 0) {
          const dataLimite = new Date(plano.data_limite + "T23:59:59");
          const diffMs = dataLimite.getTime() - agora.getTime();
          meses_restantes = Math.max(1, Math.ceil(diffMs / (30 * 24 * 60 * 60 * 1000)));
          parcelaMensalCentavos = Math.ceil(faltaCentavos / meses_restantes);
          parcela_mensal = centavosParaReais(parcelaMensalCentavos);
        }

        return {
          ...plano,
          depositado,
          depositado_centavos: depositadoCentavos,
          falta,
          falta_centavos: faltaCentavos,
          parcela_mensal,
          parcela_mensal_centavos: parcelaMensalCentavos,
          meses_restantes,
          percentual: valorAlvoCentavos > 0 ? Math.min(100, Math.round((depositadoCentavos / valorAlvoCentavos) * 100)) : 0,
        };
      });

      return json(planosComProgresso);
    } catch (erro) {
      return erroInterno(erro, "planos.listar", "Não foi possível carregar os planos agora.", "planos_listar_falhou");
    }
  }

  // ==========================================
  // CRIAR
  // ==========================================
  if (metodo === "POST") {
    try {
      const dados = await lerJsonObjeto<PlanoPayload>(request);
      if (!dados) {
        return erroCliente("Envie um corpo JSON válido.", 400, "corpo_json_invalido");
      }
      const payload = dados as Record<string, unknown>;
      const nomeValidado = campoTexto(payload, "nome", {
        obrigatorio: true,
        mensagemObrigatorio: "Nome do plano é obrigatório.",
        codigoObrigatorio: "nome_obrigatorio",
      });
      if (!nomeValidado.ok) return erroCliente(nomeValidado.erro.mensagem, nomeValidado.erro.status, nomeValidado.erro.codigo);
      const nome = nomeValidado.valor;
      const descricao = (dados.descricao || "").trim();
      const valorValidado = campoCentavosObrigatorio(
        payload,
        "valor_alvo",
        "valor_alvo_centavos",
        "Informe um valor alvo válido.",
        "valor_alvo_obrigatorio",
        "Informe um valor alvo válido.",
        "valor_alvo_invalido",
      );
      if (!valorValidado.ok) return erroCliente(valorValidado.erro.mensagem, valorValidado.erro.status, valorValidado.erro.codigo);
      const valorAlvoCentavos = valorValidado.valor;
      const valorAlvo = centavosParaReais(valorAlvoCentavos);
      const dataLimite = dados.data_limite || null;
      const prioridade = dados.prioridade || "media";
      const icone = dados.icone || "🎯";
      const cor = dados.cor || "#6366f1";
      const compartilhado = dados.compartilhado ? 1 : 0;

      const resultado = await env.DB.prepare(
        `INSERT INTO planos (usuario_id, nome, descricao, valor_alvo, valor_alvo_centavos, data_limite, prioridade, icone, cor, compartilhado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(usuarioLogado.id, nome, descricao, valorAlvo, valorAlvoCentavos, dataLimite, prioridade, icone, cor, compartilhado)
        .run();

      return json({ mensagem: "Plano criado!", id: resultado.meta?.last_row_id ?? null }, 201);
    } catch (erro) {
      return erroInterno(erro, "planos.criar", "Não foi possível criar este plano agora.", "plano_criar_falhou");
    }
  }

  // ==========================================
  // ATUALIZAR
  // ==========================================
  if (metodo === "PUT") {
    try {
      const dados = await lerJsonObjeto<PlanoPayload>(request);
      if (!dados) {
        return erroCliente("Envie um corpo JSON válido.", 400, "corpo_json_invalido");
      }
      const id = dados.id;
      if (!id) {
        return erroCliente("ID não fornecido.", 400, "id_obrigatorio");
      }

      const { results: alvo } = await env.DB.prepare(`SELECT usuario_id FROM planos WHERE id = ?`).bind(id).all<PlanoDonoRow>();
      if (alvo.length === 0) {
        return erroCliente("Plano não encontrado.", 404, "plano_nao_encontrado");
      }
      if (alvo[0].usuario_id !== usuarioLogado.id) {
        return erroCliente("Acesso negado.", 403, "acesso_negado");
      }

      const campos: string[] = [];
      const valores: SqlParam[] = [];

      if (dados.nome !== undefined) { campos.push("nome = ?"); valores.push(dados.nome.trim()); }
      if (dados.descricao !== undefined) { campos.push("descricao = ?"); valores.push(dados.descricao.trim()); }
      if (dados.valor_alvo !== undefined || dados.valor_alvo_centavos !== undefined) {
        const valorAlvoCentavos = normalizarCentavos(dados.valor_alvo, dados.valor_alvo_centavos);
        if (valorAlvoCentavos <= 0) return erroCliente("Valor alvo inválido.", 400, "valor_alvo_invalido");
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
        return erroCliente("Nenhum campo para atualizar.", 400, "sem_campos_para_atualizar");
      }

      campos.push("atualizado_em = datetime('now')");
      valores.push(id);

      await env.DB.prepare(`UPDATE planos SET ${campos.join(", ")} WHERE id = ?`).bind(...valores).run();

      return json({ mensagem: "Plano atualizado!" });
    } catch (erro) {
      return erroInterno(erro, "planos.atualizar", "Não foi possível atualizar este plano agora.", "plano_atualizar_falhou");
    }
  }

  // ==========================================
  // EXCLUIR
  // ==========================================
  if (metodo === "DELETE") {
    try {
      const id = url.searchParams.get("id");
      if (!id) {
        return erroCliente("ID não fornecido.", 400, "id_obrigatorio");
      }

      const { results: alvo } = await env.DB.prepare(`SELECT usuario_id FROM planos WHERE id = ?`).bind(id).all<PlanoDonoRow>();
      if (alvo.length === 0) {
        return erroCliente("Plano não encontrado.", 404, "plano_nao_encontrado");
      }
      if (alvo[0].usuario_id !== usuarioLogado.id) {
        return erroCliente("Acesso negado.", 403, "acesso_negado");
      }

      await env.DB.prepare(`DELETE FROM plano_depositos WHERE plano_id = ?`).bind(id).run();
      await env.DB.prepare(`DELETE FROM planos WHERE id = ?`).bind(id).run();

      return json({ mensagem: "Plano removido." });
    } catch (erro) {
      return erroInterno(erro, "planos.excluir", "Não foi possível remover este plano agora.", "plano_excluir_falhou");
    }
  }

  return erroCliente("Método não permitido.", 405, "metodo_nao_permitido");
}

// ==========================================
// processarPlanoDepositos - CRUD de depósitos em planos
// ==========================================
export async function processarPlanoDepositos(request: Request, env: CadimusEnv, ctx: WorkerCtx): Promise<Response> {
  const metodo = request.method;
  const url = new URL(request.url);

  const usuarioLogado = await obterUsuarioDaSessao(request, env, ctx);
  if (!usuarioLogado) {
    return erroCliente("Não autenticado.", 401, "nao_autenticado");
  }

  // ==========================================
  // LISTAR DEPÓSITOS
  // ==========================================
  if (metodo === "GET") {
    try {
      const planoId = url.searchParams.get("plano_id");
      if (!planoId) {
        return erroCliente("plano_id não fornecido.", 400, "plano_id_obrigatorio");
      }

      const { results: plano } = await env.DB.prepare(`SELECT usuario_id FROM planos WHERE id = ?`).bind(planoId).all<PlanoDonoRow>();
      if (plano.length === 0 || plano[0].usuario_id !== usuarioLogado.id) {
        return erroCliente("Acesso negado.", 403, "acesso_negado");
      }

      const { results } = await env.DB.prepare(
        `SELECT * FROM plano_depositos WHERE plano_id = ? ORDER BY criado_em DESC`
      ).bind(planoId).all<PlanoDepositoRow>();

      return json(results);
    } catch (erro) {
      return erroInterno(erro, "planoDepositos.listar", "Não foi possível carregar os depósitos agora.", "depositos_listar_falhou");
    }
  }

  // ==========================================
  // CRIAR DEPÓSITO
  // ==========================================
  if (metodo === "POST") {
    try {
      const dados = await lerJsonObjeto<PlanoDepositoPayload>(request);
      if (!dados) {
        return erroCliente("Envie um corpo JSON válido.", 400, "corpo_json_invalido");
      }
      const planoId = dados.plano_id;
      const payload = dados as Record<string, unknown>;
      const valorValidado = campoCentavosObrigatorio(
        payload,
        "valor",
        "valor_centavos",
        "Informe um valor válido.",
        "valor_obrigatorio",
        "Informe um valor válido.",
        "valor_invalido",
      );
      if (!valorValidado.ok) return erroCliente(valorValidado.erro.mensagem, valorValidado.erro.status, valorValidado.erro.codigo);
      const valorCentavos = valorValidado.valor;
      const valor = centavosParaReais(valorCentavos);
      const descricao = (dados.descricao || "").trim();

      if (!planoId) {
        return erroCliente("plano_id não fornecido.", 400, "plano_id_obrigatorio");
      }
      const { results: plano } = await env.DB.prepare(`SELECT usuario_id FROM planos WHERE id = ?`).bind(planoId).all<PlanoDonoRow>();
      if (plano.length === 0 || plano[0].usuario_id !== usuarioLogado.id) {
        return erroCliente("Acesso negado.", 403, "acesso_negado");
      }

      await env.DB.prepare(
        `INSERT INTO plano_depositos (plano_id, valor, valor_centavos, descricao) VALUES (?, ?, ?, ?)`
      ).bind(planoId, valor, valorCentavos, descricao).run();

      return json({ mensagem: "Depósito registrado!" }, 201);
    } catch (erro) {
      return erroInterno(erro, "planoDepositos.criar", "Não foi possível registrar este depósito agora.", "deposito_criar_falhou");
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

      const { results: dep } = await env.DB.prepare(
        `SELECT pd.id, p.usuario_id FROM plano_depositos pd JOIN planos p ON pd.plano_id = p.id WHERE pd.id = ?`
      ).bind(id).all<DepositoDonoRow>();

      if (dep.length === 0 || dep[0].usuario_id !== usuarioLogado.id) {
        return erroCliente("Acesso negado.", 403, "acesso_negado");
      }

      await env.DB.prepare(`DELETE FROM plano_depositos WHERE id = ?`).bind(id).run();

      return json({ mensagem: "Depósito removido." });
    } catch (erro) {
      return erroInterno(erro, "planoDepositos.excluir", "Não foi possível remover este depósito agora.", "deposito_excluir_falhou");
    }
  }

  return erroCliente("Método não permitido.", 405, "metodo_nao_permitido");
}
