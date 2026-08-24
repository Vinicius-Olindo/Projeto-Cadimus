// ==========================================
// auditoria.ts - Registro seguro de ações relevantes
// ==========================================

import type { CadimusEnv, IdEntrada } from "../types.js";

/**
 * Evento gravado no log de auditoria.
 */
export interface EventoAuditoria {
  usuarioId: IdEntrada | null | undefined;
  acao: string | null | undefined;
  entidade: string | null | undefined;
  entidadeId?: IdEntrada | null;
  carteiraId?: IdEntrada | null;
  metadata?: unknown;
}

/**
 * Registra ações relevantes sem bloquear a operação quando os campos mínimos
 * do evento não foram informados.
 */
export async function registrarAuditoria(
  env: CadimusEnv,
  { usuarioId, acao, entidade, entidadeId = null, carteiraId = null, metadata = null }: EventoAuditoria,
): Promise<void> {
  if (!usuarioId || !acao || !entidade) return;

  const metadataJson = metadata ? JSON.stringify(metadata) : null;

  await env.DB.prepare(
    `INSERT INTO audit_logs (usuario_id, acao, entidade, entidade_id, carteira_id, metadata)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(usuarioId, acao, entidade, entidadeId, carteiraId, metadataJson)
    .run();
}
