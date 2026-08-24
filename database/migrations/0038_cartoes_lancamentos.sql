-- Liga cartões de crédito a lançamentos comuns e despesas fixas.
-- Compras parceladas já possuem cartao_credito_id desde a migration 0028.
ALTER TABLE lancamentos ADD COLUMN cartao_credito_id INTEGER REFERENCES cartoes_credito(id);
ALTER TABLE despesas_fixas ADD COLUMN cartao_credito_id INTEGER REFERENCES cartoes_credito(id);

CREATE INDEX IF NOT EXISTS idx_lancamentos_cartao_credito ON lancamentos(cartao_credito_id);
CREATE INDEX IF NOT EXISTS idx_despesas_fixas_cartao_credito ON despesas_fixas(cartao_credito_id);
