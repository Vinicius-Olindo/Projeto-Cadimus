import { obterUsuarioDaSessao } from "../utils/sessao.js";
import { obterCarteirasDoUsuario } from "../utils/carteiras.js";
import { erroCliente, erroInterno, json as responderJson } from "../utils/respostas.ts";

const STATUS_VALIDOS = new Set(["nao_lida", "lida", "arquivada"]);
const SEVERIDADES_VALIDAS = new Set(["info", "sucesso", "aviso", "perigo"]);

/** @param {unknown} dados @param {number} [status] */
function json(dados, status = 200) {
  return responderJson(dados, status);
}

/** @param {unknown} valor @param {number} limite */
function limparTexto(valor, limite) {
  return String(valor || "").trim().slice(0, limite);
}

/**
 * @param {any} item
 * @param {number} usuarioId
 */
function normalizarNotificacao(item, usuarioId) {
  const tipo = limparTexto(item.tipo, 60) || "sistema";
  const titulo = limparTexto(item.titulo || item.descricao, 140);
  const mensagem = limparTexto(item.mensagem || item.texto, 500);
  const status = STATUS_VALIDOS.has(item.status) ? item.status : "nao_lida";
  const severidade = SEVERIDADES_VALIDAS.has(item.severidade) ? item.severidade : item.atrasado ? "perigo" : "aviso";
  const chaveUnica = limparTexto(item.chave_unica || item.chave, 180) || null;

  if (!titulo || !mensagem) {
    throw new TypeError("Notificacao precisa de titulo e mensagem.");
  }

  return {
    usuario_id: usuarioId,
    carteira_id: item.carteira_id === null || item.carteira_id === undefined ? null : Number(item.carteira_id),
    tipo,
    titulo,
    mensagem,
    status,
    severidade,
    entidade: item.entidade ? limparTexto(item.entidade, 80) : null,
    entidade_id: item.entidade_id === null || item.entidade_id === undefined ? null : Number(item.entidade_id),
    chave_unica: chaveUnica,
    url_acao: item.url_acao ? limparTexto(item.url_acao, 240) : null,
    data_evento: item.data_evento ? limparTexto(item.data_evento, 40) : null,
  };
}

/**
 * @param {import("../types.js").CadimusEnv} env
 * @param {number} usuarioId
 * @param {number|string|null|undefined} carteiraId
 */
async function usuarioPodeUsarCarteira(env, usuarioId, carteiraId) {
  if (!carteiraId) return true;
  const carteiras = await obterCarteirasDoUsuario(env, usuarioId);
  return carteiras.includes(Number(carteiraId));
}

/**
 * @param {import("../types.js").CadimusEnv} env
 * @param {any} notificacao
 */
async function salvarNotificacao(env, notificacao) {
  await env.DB.prepare(
    `INSERT INTO notificacoes
      (usuario_id, carteira_id, tipo, titulo, mensagem, status, severidade, entidade, entidade_id, chave_unica, url_acao, data_evento)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(usuario_id, chave_unica) DO UPDATE SET
       carteira_id = excluded.carteira_id,
       tipo = excluded.tipo,
       titulo = excluded.titulo,
       mensagem = excluded.mensagem,
       severidade = excluded.severidade,
       entidade = excluded.entidade,
       entidade_id = excluded.entidade_id,
       url_acao = excluded.url_acao,
       data_evento = excluded.data_evento,
       atualizado_em = CURRENT_TIMESTAMP`,
  )
    .bind(
      notificacao.usuario_id,
      notificacao.carteira_id,
      notificacao.tipo,
      notificacao.titulo,
      notificacao.mensagem,
      notificacao.status,
      notificacao.severidade,
      notificacao.entidade,
      notificacao.entidade_id,
      notificacao.chave_unica,
      notificacao.url_acao,
      notificacao.data_evento,
    )
    .run();
}

/** @param {Date} data */
function inicioDoDia(data) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

/** @param {Date} data */
function formatarDataChave(data) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

/** @param {Date} data */
function formatarDataIso(data) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

/** @param {Date} dataEvento @param {Date} dataReferencia */
function diferencaDias(dataEvento, dataReferencia) {
  return Math.round((inicioDoDia(dataEvento).getTime() - inicioDoDia(dataReferencia).getTime()) / 86400000);
}

/** @param {Date} dataEvento @param {Date} dataReferencia @param {number} [janelaDias] */
function avisoPorData(dataEvento, dataReferencia, janelaDias = 3) {
  const diff = diferencaDias(dataEvento, dataReferencia);
  if (diff === 0) return { texto: "Vence hoje", severidade: "aviso", urgencia: 1 };
  if (diff > 0 && diff <= janelaDias) return { texto: `Vence em ${diff} dia${diff > 1 ? "s" : ""}`, severidade: "aviso", urgencia: 2 };
  if (diff < 0 && diff >= -janelaDias) return { texto: `Venceu ha ${Math.abs(diff)} dia${Math.abs(diff) > 1 ? "s" : ""}`, severidade: "perigo", urgencia: 0 };
  return null;
}

/** @param {Date} dataReferencia @param {number|string} dia */
function dataDoMesPorDia(dataReferencia, dia) {
  const diaSeguro = Math.min(Math.max(Number(dia) || 1, 1), 28);
  return new Date(dataReferencia.getFullYear(), dataReferencia.getMonth(), diaSeguro);
}

/** @param {number|string|null|undefined} centavos */
function reaisDeCentavos(centavos) {
  return (Number(centavos) || 0) / 100;
}

/** @param {number|string|null|undefined} valor */
function moeda(valor) {
  return reaisDeCentavos(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * @param {import("../types.js").CadimusEnv} env
 * @param {number} usuarioId
 * @param {number[]} carteirasPermitidas
 * @param {Date} [dataReferencia]
 */
async function gerarNotificacoesAutomaticas(env, usuarioId, carteirasPermitidas, dataReferencia = new Date()) {
  if (!carteirasPermitidas.length) return 0;

  const placeholders = carteirasPermitidas.map(() => "?").join(",");
  const chaveMes = formatarDataChave(dataReferencia);
  const chaveDia = formatarDataIso(dataReferencia);
  const notificacoes = [];

  const { results: despesasFixas } = await env.DB.prepare(
    `SELECT * FROM despesas_fixas WHERE ativo = 1 AND carteira_id IN (${placeholders})`,
  )
    .bind(...carteirasPermitidas)
    .all();

  for (const fixa of despesasFixas) {
    const dataEvento = dataDoMesPorDia(dataReferencia, fixa.dia_vencimento);
    const aviso = avisoPorData(dataEvento, dataReferencia);
    if (!aviso) continue;
    const valorCentavos = fixa.valor_centavos ?? Math.round((Number(fixa.valor) || 0) * 100);
    notificacoes.push({
      usuario_id: usuarioId,
      carteira_id: fixa.carteira_id,
      tipo: "fixa",
      titulo: fixa.descricao,
      mensagem: `${aviso.texto} · ${moeda(valorCentavos)}`,
      status: "nao_lida",
      severidade: aviso.severidade,
      entidade: "despesa_fixa",
      entidade_id: fixa.id,
      chave_unica: `despesa_fixa:${fixa.id}:vencimento:${chaveMes}:lembrete:${chaveDia}`,
      url_acao: null,
      data_evento: formatarDataIso(dataEvento),
    });
  }

  const { results: comprasParceladas } = await env.DB.prepare(
    `SELECT * FROM compras_parceladas WHERE ativo = 1 AND carteira_id IN (${placeholders})`,
  )
    .bind(...carteirasPermitidas)
    .all();

  for (const compra of comprasParceladas) {
    const dataEvento = dataDoMesPorDia(dataReferencia, compra.dia_vencimento);
    const aviso = avisoPorData(dataEvento, dataReferencia);
    if (!aviso) continue;
    const valorCentavos = compra.valor_parcela_centavos ?? Math.round((Number(compra.valor_parcela) || 0) * 100);
    notificacoes.push({
      usuario_id: usuarioId,
      carteira_id: compra.carteira_id,
      tipo: "parcelada",
      titulo: compra.descricao,
      mensagem: `${aviso.texto} · ${moeda(valorCentavos)}`,
      status: "nao_lida",
      severidade: aviso.severidade,
      entidade: "compra_parcelada",
      entidade_id: compra.id,
      chave_unica: `compra_parcelada:${compra.id}:vencimento:${chaveMes}:lembrete:${chaveDia}`,
      url_acao: null,
      data_evento: formatarDataIso(dataEvento),
    });
  }

  const { results: lancamentos } = await env.DB.prepare(
    `SELECT * FROM lancamentos WHERE status != 'pago' AND carteira_id IN (${placeholders})`,
  )
    .bind(...carteirasPermitidas)
    .all();

  for (const lancamento of lancamentos) {
    if (!lancamento.data_compra) continue;
    const dataEvento = new Date(`${lancamento.data_compra}T12:00:00`);
    const aviso = avisoPorData(dataEvento, dataReferencia);
    if (!aviso) continue;
    const valorCentavos = lancamento.valor_centavos ?? Math.round((Number(lancamento.valor) || 0) * 100);
    notificacoes.push({
      usuario_id: usuarioId,
      carteira_id: lancamento.carteira_id,
      tipo: "lancamento",
      titulo: lancamento.descricao,
      mensagem: `${aviso.texto} · ${moeda(valorCentavos)}`,
      status: "nao_lida",
      severidade: aviso.severidade,
      entidade: "lancamento",
      entidade_id: lancamento.id,
      chave_unica: `lancamento:${lancamento.id}:vencimento:${lancamento.data_compra}:lembrete:${chaveDia}`,
      url_acao: null,
      data_evento: lancamento.data_compra,
    });
  }

  const { results: metas } = await env.DB.prepare(
    `SELECT m.*,
       COALESCE((SELECT SUM(COALESCE(md.valor_centavos, ROUND(md.valor * 100))) FROM meta_depositos md WHERE md.meta_id = m.id), 0) AS depositado_centavos
     FROM metas_categoria m
     WHERE m.data_limite IS NOT NULL AND m.carteira_id IN (${placeholders})`,
  )
    .bind(...carteirasPermitidas)
    .all();

  for (const meta of metas) {
    const valorLimiteCentavos = meta.valor_limite_centavos ?? Math.round((Number(meta.valor_limite) || 0) * 100);
    const faltaCentavos = Math.max(0, valorLimiteCentavos - (Number(meta.depositado_centavos) || 0));
    if (faltaCentavos <= 0) continue;

    const dataEvento = new Date(`${meta.data_limite}T12:00:00`);
    const diff = diferencaDias(dataEvento, dataReferencia);
    let aviso = null;
    if (diff < 0) aviso = { texto: `Meta passou do prazo. Faltava ${moeda(faltaCentavos)}`, severidade: "perigo" };
    else if (diff <= 7) aviso = { texto: `Meta vence em ${diff} dia${diff !== 1 ? "s" : ""}. Falta ${moeda(faltaCentavos)}`, severidade: "aviso" };
    if (!aviso) continue;

    notificacoes.push({
      usuario_id: usuarioId,
      carteira_id: meta.carteira_id,
      tipo: "meta",
      titulo: `Meta: ${meta.categoria}`,
      mensagem: aviso.texto,
      status: "nao_lida",
      severidade: aviso.severidade,
      entidade: "meta",
      entidade_id: meta.id,
      chave_unica: `meta:${meta.id}:prazo:${meta.data_limite}:lembrete:${chaveDia}`,
      url_acao: null,
      data_evento: meta.data_limite,
    });
  }

  for (const notificacao of notificacoes) {
    await salvarNotificacao(env, notificacao);
  }

  return notificacoes.length;
}

/**
 * @param {Request} request
 * @param {import("../types.js").CadimusEnv} env
 * @param {import("../types.js").WorkerCtx} ctx
 */
export async function processarNotificacoes(request, env, ctx) {
  const usuario = await obterUsuarioDaSessao(request, env, ctx);
  if (!usuario) return erroCliente("Não autenticado.", 401, "nao_autenticado");

  const url = new URL(request.url);
  const metodo = request.method;

  if (metodo === "GET") {
    const status = url.searchParams.get("status") || "nao_lida";
    const limite = Math.min(Math.max(Number(url.searchParams.get("limite")) || 50, 1), 100);
    const carteiraId = url.searchParams.get("carteira_id");

    if (carteiraId && !(await usuarioPodeUsarCarteira(env, usuario.id, carteiraId))) {
      return json({ erro: "Acesso negado a esta carteira." }, 403);
    }

    let query = `SELECT * FROM notificacoes WHERE usuario_id = ?`;
    const params = /** @type {import("../types.js").SqlParam[]} */ ([usuario.id]);

    if (status !== "todas") {
      if (!STATUS_VALIDOS.has(status)) return erroCliente("Status inválido.", 400, "status_invalido");
      query += ` AND status = ?`;
      params.push(status);
    }

    if (carteiraId) {
      query += ` AND carteira_id = ?`;
      params.push(Number(carteiraId));
    }

    query += ` ORDER BY criado_em DESC, id DESC LIMIT ?`;
    params.push(limite);

    try {
      const { results } = await env.DB.prepare(query).bind(...params).all();
      const { results: resumo } = await env.DB.prepare(
        `SELECT
           SUM(CASE WHEN status = 'nao_lida' THEN 1 ELSE 0 END) AS nao_lidas,
           COUNT(*) AS total
         FROM notificacoes
         WHERE usuario_id = ?`,
      )
        .bind(usuario.id)
        .all();

      return json({ notificacoes: results, resumo: resumo[0] || { nao_lidas: 0, total: 0 } });
    } catch (erro) {
      return erroInterno(erro, "notificacoes.listar", "Não foi possível carregar as notificações agora.", "notificacoes_listar_falhou");
    }
  }

  if (metodo === "POST" && url.pathname.endsWith("/gerar")) {
    const carteirasPermitidas = await obterCarteirasDoUsuario(env, usuario.id);
    let dataReferencia = new Date();
    try {
      const dados = await request.json();
      if (dados?.data_referencia) dataReferencia = new Date(`${dados.data_referencia}T12:00:00`);
    } catch {
      // Corpo opcional.
    }
    try {
      const geradas = await gerarNotificacoesAutomaticas(env, usuario.id, carteirasPermitidas, dataReferencia);
      return json({ geradas });
    } catch (erro) {
      return erroInterno(erro, "notificacoes.gerar", "Não foi possível atualizar as notificações agora.", "notificacoes_gerar_falhou");
    }
  }

  if (metodo === "POST" && url.pathname.endsWith("/sincronizar")) {
    const dados = await request.json();
    const recebidas = Array.isArray(dados.notificacoes) ? dados.notificacoes : [];
    const limite = recebidas.slice(0, 50);
    let salvas = 0;

    for (const item of limite) {
      const notif = normalizarNotificacao(item, usuario.id);
      if (!(await usuarioPodeUsarCarteira(env, usuario.id, notif.carteira_id))) continue;
      try {
        await salvarNotificacao(env, notif);
      } catch (erro) {
        return erroInterno(erro, "notificacoes.sincronizar", "Não foi possível sincronizar as notificações agora.", "notificacoes_sincronizar_falhou");
      }
      salvas++;
    }

    return json({ salvas });
  }

  if (metodo === "PATCH" && url.pathname.endsWith("/lidas")) {
    try {
      await env.DB.prepare(
        `UPDATE notificacoes
         SET status = 'lida', lida_em = COALESCE(lida_em, CURRENT_TIMESTAMP), atualizado_em = CURRENT_TIMESTAMP
         WHERE usuario_id = ? AND status = 'nao_lida'`,
      )
        .bind(usuario.id)
        .run();
    } catch (erro) {
      return erroInterno(erro, "notificacoes.marcarTodasLidas", "Não foi possível marcar as notificações como lidas agora.", "notificacoes_lidas_falhou");
    }
    return json({ ok: true });
  }

  if (metodo === "PATCH") {
    const id = Number(url.searchParams.get("id"));
    if (!id) return erroCliente("ID obrigatório.", 400, "id_obrigatorio");
    const dados = await request.json();
    const status = STATUS_VALIDOS.has(dados.status) ? dados.status : "lida";

    try {
      await env.DB.prepare(
        `UPDATE notificacoes
         SET status = ?,
             lida_em = CASE WHEN ? = 'lida' THEN COALESCE(lida_em, CURRENT_TIMESTAMP) ELSE lida_em END,
             arquivada_em = CASE WHEN ? = 'arquivada' THEN COALESCE(arquivada_em, CURRENT_TIMESTAMP) ELSE arquivada_em END,
             atualizado_em = CURRENT_TIMESTAMP
         WHERE id = ? AND usuario_id = ?`,
      )
        .bind(status, status, status, id, usuario.id)
        .run();
    } catch (erro) {
      return erroInterno(erro, "notificacoes.atualizar", "Não foi possível atualizar esta notificação agora.", "notificacao_atualizar_falhou");
    }
    return json({ ok: true });
  }

  if (metodo === "DELETE") {
    const id = Number(url.searchParams.get("id"));
    if (!id) return erroCliente("ID obrigatório.", 400, "id_obrigatorio");
    try {
      await env.DB.prepare(
        `UPDATE notificacoes
         SET status = 'arquivada', arquivada_em = COALESCE(arquivada_em, CURRENT_TIMESTAMP), atualizado_em = CURRENT_TIMESTAMP
         WHERE id = ? AND usuario_id = ?`,
      )
        .bind(id, usuario.id)
        .run();
    } catch (erro) {
      return erroInterno(erro, "notificacoes.arquivar", "Não foi possível arquivar esta notificação agora.", "notificacao_arquivar_falhou");
    }
    return json({ ok: true });
  }

  return erroCliente("Método não permitido.", 405, "metodo_nao_permitido");
}
