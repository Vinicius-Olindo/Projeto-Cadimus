// ==========================================
// auditoria.js - Registro seguro de ações relevantes
// ==========================================

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
