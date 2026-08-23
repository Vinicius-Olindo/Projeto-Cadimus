-- Liga lançamentos gerados automaticamente à recorrência de origem.
-- Necessário para bonificações, despesas recorrentes customizadas e idempotência por data.

ALTER TABLE lancamentos ADD COLUMN recorrencia_id INTEGER REFERENCES lancamentos_recorrentes(id);

