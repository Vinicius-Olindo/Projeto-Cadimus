-- Migration 0030: Idempotência para transferências
-- Evita duplicação quando o frontend reenvia a mesma transferência após retry,
-- queda de conexão ou clique duplo.

ALTER TABLE transferencias ADD COLUMN idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transferencias_idempotency_key
ON transferencias(idempotency_key)
WHERE idempotency_key IS NOT NULL;
