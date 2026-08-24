// ==========================================
// sessao.js - Criação e validação de sessões de login
// ==========================================

// @ts-check

const DURACAO_SESSAO_MS = 30 * 60 * 1000; // 30 minutos de inatividade

/**
 * @typedef {import("../types.js").CadimusEnv} EnvComDB
 * @typedef {import("../types.js").WorkerCtx} WorkerCtx
 * @typedef {import("../types.js").UsuarioSessao} UsuarioSessao
 */

/**
 * Linha mínima retornada pela consulta de sessão.
 * @typedef {UsuarioSessao & { expira_em: string }} SessaoUsuarioRow
 */

/**
 * @param {EnvComDB} env
 * @param {number | string} usuarioId
 * @returns {Promise<string>}
 */
export async function criarSessao(env, usuarioId) {
  const token = crypto.randomUUID();
  const expiraEm = new Date(Date.now() + DURACAO_SESSAO_MS).toISOString();

  await env.DB.prepare(`INSERT INTO sessoes (token, usuario_id, expira_em) VALUES (?, ?, ?)`).bind(token, usuarioId, expiraEm).run();

  return token;
}

/**
 * Remove sessões expiradas do banco.
 * Chamado em background (ctx.waitUntil) a cada requisição autenticada —
 * não bloqueia a resposta, mas vai limpando a tabela ao longo do tempo
 * sem precisar de um job agendado separado.
 *
 * @param {EnvComDB} env
 * @returns {Promise<void>}
 */
export async function limparSessoesExpiradas(env) {
  await env.DB.prepare(`DELETE FROM sessoes WHERE expira_em < ?`).bind(new Date().toISOString()).run();
}

/**
 * @param {EnvComDB} env
 * @param {string} token
 * @returns {Promise<void>}
 */
export async function renovarSessao(env, token) {
  const expiraEm = new Date(Date.now() + DURACAO_SESSAO_MS).toISOString();
  await env.DB.prepare(`UPDATE sessoes SET expira_em = ? WHERE token = ?`).bind(expiraEm, token).run();
}

/**
 * Lê o header Authorization: Bearer <token>, valida contra o banco
 * e retorna o usuário logado (ou null se não autenticado/expirado).
 *
 * @param {Request} request
 * @param {EnvComDB} env
 * @param {WorkerCtx} [ctx]
 * @returns {Promise<UsuarioSessao | null>}
 */
export async function obterUsuarioDaSessao(request, env, ctx) {
  const cabecalho = request.headers.get("Authorization") || "";
  const token = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7).trim() : null;
  if (!token) return null;

  const query = `
    SELECT u.id, u.nome_usuario, u.perfil, s.expira_em
    FROM sessoes s
    JOIN usuarios u ON u.id = s.usuario_id
    WHERE s.token = ?
  `;
  const { results } = await env.DB.prepare(query).bind(token).all();
  if (results.length === 0) return null;

  /** @type {SessaoUsuarioRow} */
  const sessao = results[0];
  if (new Date(sessao.expira_em) < new Date()) {
    // Sessão expirada: remove e nega acesso
    await env.DB.prepare(`DELETE FROM sessoes WHERE token = ?`).bind(token).run();
    return null;
  }

  // Limpeza em background: não atrasa a resposta, mas vai varrendo registros
  // mortos a cada requisição autenticada (lazy cleanup sem job agendado)
  if (ctx?.waitUntil) {
    ctx.waitUntil(Promise.all([
      limparSessoesExpiradas(env),
      renovarSessao(env, token),
    ]));
  } else {
    await renovarSessao(env, token);
  }

  return { id: sessao.id, nome_usuario: sessao.nome_usuario, perfil: sessao.perfil };
}

/**
 * @param {Request} request
 * @param {EnvComDB} env
 * @returns {Promise<void>}
 */
export async function encerrarSessao(request, env) {
  const cabecalho = request.headers.get("Authorization") || "";
  const token = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7).trim() : null;
  if (!token) return;
  await env.DB.prepare(`DELETE FROM sessoes WHERE token = ?`).bind(token).run();
}
