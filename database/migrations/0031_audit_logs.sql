-- Migration 0031: Trilhas de auditoria
-- Registra ações relevantes sem guardar credenciais ou dados financeiros em excesso.

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  acao TEXT NOT NULL,
  entidade TEXT NOT NULL,
  entidade_id INTEGER,
  carteira_id INTEGER,
  metadata TEXT,
  criado_em TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (carteira_id) REFERENCES carteiras(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_usuario ON audit_logs(usuario_id, criado_em);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entidade ON audit_logs(entidade, entidade_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_carteira ON audit_logs(carteira_id, criado_em);
