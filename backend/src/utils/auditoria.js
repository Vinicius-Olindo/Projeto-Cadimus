// ==========================================
// auditoria.js - Registro seguro de ações relevantes
// ==========================================

// @ts-check

/**
 * Evento gravado no log de auditoria.
 * @typedef {object} EventoAuditoria
 * @property {number | string | null | undefined} usuarioId
 * @property {string | null | undefined} acao
 * @property {string | null | undefined} entidade
 * @property {number | string | null} [entidadeId]
 * @property {number | string | null} [carteiraId]
 * @property {unknown} [metadata]
 */

/**
 * Ambiente mínimo esperado pelo utilitário.
 * @typedef {object} EnvComDB
 * @property {{ prepare: (query: string) => { bind: (...values: unknown[]) => { run: () => Promise<unknown> } } }} DB
 */

/**
 * Registra ações relevantes sem bloquear a operação quando os campos mínimos
 * do evento não foram informados.
 *
 * @param {EnvComDB} env
 * @param {EventoAuditoria} evento
 * @returns {Promise<void>}
 */
export async function registrarAuditoria(env, { usuarioId, acao, entidade, entidadeId = null, carteiraId = null, metadata = null }) {
  if (!usuarioId || !acao || !entidade) return;

  const metadataJson = metadata ? JSON.stringify(metadata) : null;

  await env.DB.prepare(
    `INSERT INTO audit_logs (usuario_id, acao, entidade, entidade_id, carteira_id, metadata)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(usuarioId, acao, entidade, entidadeId, carteiraId, metadataJson)
    .run();
}
