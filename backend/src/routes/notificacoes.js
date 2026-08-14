import { obterUsuarioDaSessao } from "../utils/sessao.js";
import { obterCarteirasDoUsuario } from "../utils/carteiras.js";

const STATUS_VALIDOS = new Set(["nao_lida", "lida", "arquivada"]);
const SEVERIDADES_VALIDAS = new Set(["info", "sucesso", "aviso", "perigo"]);

function json(dados, status = 200) {
  return new Response(JSON.stringify(dados), { status });
}

function limparTexto(valor, limite) {
  return String(valor || "").trim().slice(0, limite);
}

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

async function usuarioPodeUsarCarteira(env, usuarioId, carteiraId) {
  if (!carteiraId) return true;
  const carteiras = await obterCarteirasDoUsuario(env, usuarioId);
  return carteiras.includes(Number(carteiraId));
}

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

export async function processarNotificacoes(request, env, ctx) {
  const usuario = await obterUsuarioDaSessao(request, env, ctx);
  if (!usuario) return json({ erro: "Nao autenticado." }, 401);

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
    const params = [usuario.id];

    if (status !== "todas") {
      if (!STATUS_VALIDOS.has(status)) return json({ erro: "Status invalido." }, 400);
      query += ` AND status = ?`;
      params.push(status);
    }

    if (carteiraId) {
      query += ` AND carteira_id = ?`;
      params.push(Number(carteiraId));
    }

    query += ` ORDER BY criado_em DESC, id DESC LIMIT ?`;
    params.push(limite);

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
  }

  if (metodo === "POST" && url.pathname.endsWith("/sincronizar")) {
    const dados = await request.json();
    const recebidas = Array.isArray(dados.notificacoes) ? dados.notificacoes : [];
    const limite = recebidas.slice(0, 50);
    let salvas = 0;

    for (const item of limite) {
      const notif = normalizarNotificacao(item, usuario.id);
      if (!(await usuarioPodeUsarCarteira(env, usuario.id, notif.carteira_id))) continue;
      await salvarNotificacao(env, notif);
      salvas++;
    }

    return json({ salvas });
  }

  if (metodo === "PATCH" && url.pathname.endsWith("/lidas")) {
    await env.DB.prepare(
      `UPDATE notificacoes
       SET status = 'lida', lida_em = COALESCE(lida_em, CURRENT_TIMESTAMP), atualizado_em = CURRENT_TIMESTAMP
       WHERE usuario_id = ? AND status = 'nao_lida'`,
    )
      .bind(usuario.id)
      .run();
    return json({ ok: true });
  }

  if (metodo === "PATCH") {
    const id = Number(url.searchParams.get("id"));
    if (!id) return json({ erro: "ID obrigatorio." }, 400);
    const dados = await request.json();
    const status = STATUS_VALIDOS.has(dados.status) ? dados.status : "lida";

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
    return json({ ok: true });
  }

  if (metodo === "DELETE") {
    const id = Number(url.searchParams.get("id"));
    if (!id) return json({ erro: "ID obrigatorio." }, 400);
    await env.DB.prepare(
      `UPDATE notificacoes
       SET status = 'arquivada', arquivada_em = COALESCE(arquivada_em, CURRENT_TIMESTAMP), atualizado_em = CURRENT_TIMESTAMP
       WHERE id = ? AND usuario_id = ?`,
    )
      .bind(id, usuario.id)
      .run();
    return json({ ok: true });
  }

  return json({ erro: "Metodo nao permitido." }, 405);
}
