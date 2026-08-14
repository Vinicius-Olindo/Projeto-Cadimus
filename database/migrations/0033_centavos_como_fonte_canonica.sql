-- 0033_centavos_como_fonte_canonica.sql
-- Consolida os campos INTEGER *_centavos como fonte canônica de dinheiro.
-- Os campos REAL legados continuam existindo apenas como compatibilidade de leitura.

-- Reforça backfill para ambientes que tenham recebido dados entre as migrations.
UPDATE lancamentos
SET valor_centavos = ROUND(valor * 100)
WHERE valor_centavos IS NULL AND valor IS NOT NULL;

UPDATE despesas_fixas
SET valor_centavos = ROUND(valor * 100)
WHERE valor_centavos IS NULL AND valor IS NOT NULL;

UPDATE compras_parceladas
SET valor_parcela_centavos = ROUND(valor_parcela * 100)
WHERE valor_parcela_centavos IS NULL AND valor_parcela IS NOT NULL;

UPDATE compras_parceladas
SET valor_total_centavos = ROUND(valor_total * 100)
WHERE valor_total_centavos IS NULL AND valor_total IS NOT NULL;

UPDATE lancamentos_recorrentes
SET valor_centavos = ROUND(valor * 100)
WHERE valor_centavos IS NULL AND valor IS NOT NULL;

UPDATE metas_categoria
SET valor_limite_centavos = ROUND(valor_limite * 100)
WHERE valor_limite_centavos IS NULL AND valor_limite IS NOT NULL;

UPDATE meta_depositos
SET valor_centavos = ROUND(valor * 100)
WHERE valor_centavos IS NULL AND valor IS NOT NULL;

UPDATE planos
SET valor_alvo_centavos = ROUND(valor_alvo * 100)
WHERE valor_alvo_centavos IS NULL AND valor_alvo IS NOT NULL;

UPDATE planos
SET depositado_centavos = ROUND(depositado * 100)
WHERE depositado_centavos IS NULL AND depositado IS NOT NULL;

UPDATE plano_depositos
SET valor_centavos = ROUND(valor * 100)
WHERE valor_centavos IS NULL AND valor IS NOT NULL;

UPDATE transferencias
SET valor_centavos = ROUND(valor * 100)
WHERE valor_centavos IS NULL AND valor IS NOT NULL;

UPDATE orcamentos
SET valor_centavos = ROUND(valor * 100)
WHERE valor_centavos IS NULL AND valor IS NOT NULL;

UPDATE cartoes_credito
SET limite_centavos = ROUND(limite * 100)
WHERE limite_centavos IS NULL AND limite IS NOT NULL;

-- Normaliza campos REAL legados a partir da fonte canônica em centavos.
UPDATE lancamentos SET valor = valor_centavos / 100.0 WHERE valor_centavos IS NOT NULL;
UPDATE despesas_fixas SET valor = valor_centavos / 100.0 WHERE valor_centavos IS NOT NULL;
UPDATE compras_parceladas SET valor_parcela = valor_parcela_centavos / 100.0 WHERE valor_parcela_centavos IS NOT NULL;
UPDATE compras_parceladas SET valor_total = valor_total_centavos / 100.0 WHERE valor_total_centavos IS NOT NULL;
UPDATE lancamentos_recorrentes SET valor = valor_centavos / 100.0 WHERE valor_centavos IS NOT NULL;
UPDATE metas_categoria SET valor_limite = valor_limite_centavos / 100.0 WHERE valor_limite_centavos IS NOT NULL;
UPDATE meta_depositos SET valor = valor_centavos / 100.0 WHERE valor_centavos IS NOT NULL;
UPDATE planos SET valor_alvo = valor_alvo_centavos / 100.0 WHERE valor_alvo_centavos IS NOT NULL;
UPDATE planos SET depositado = depositado_centavos / 100.0 WHERE depositado_centavos IS NOT NULL;
UPDATE plano_depositos SET valor = valor_centavos / 100.0 WHERE valor_centavos IS NOT NULL;
UPDATE transferencias SET valor = valor_centavos / 100.0 WHERE valor_centavos IS NOT NULL;
UPDATE orcamentos SET valor = valor_centavos / 100.0 WHERE valor_centavos IS NOT NULL;
UPDATE cartoes_credito SET limite = limite_centavos / 100.0 WHERE limite_centavos IS NOT NULL;

-- Gatilhos de compatibilidade: qualquer escrita futura em centavos atualiza o REAL legado.
DROP TRIGGER IF EXISTS trg_lancamentos_centavos_para_real_insert;
CREATE TRIGGER trg_lancamentos_centavos_para_real_insert
AFTER INSERT ON lancamentos
WHEN NEW.valor_centavos IS NOT NULL
BEGIN
  UPDATE lancamentos SET valor = NEW.valor_centavos / 100.0 WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_lancamentos_centavos_para_real_update;
CREATE TRIGGER trg_lancamentos_centavos_para_real_update
AFTER UPDATE OF valor_centavos ON lancamentos
WHEN NEW.valor_centavos IS NOT NULL
BEGIN
  UPDATE lancamentos SET valor = NEW.valor_centavos / 100.0 WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_despesas_fixas_centavos_para_real_insert;
CREATE TRIGGER trg_despesas_fixas_centavos_para_real_insert
AFTER INSERT ON despesas_fixas
WHEN NEW.valor_centavos IS NOT NULL
BEGIN
  UPDATE despesas_fixas SET valor = NEW.valor_centavos / 100.0 WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_despesas_fixas_centavos_para_real_update;
CREATE TRIGGER trg_despesas_fixas_centavos_para_real_update
AFTER UPDATE OF valor_centavos ON despesas_fixas
WHEN NEW.valor_centavos IS NOT NULL
BEGIN
  UPDATE despesas_fixas SET valor = NEW.valor_centavos / 100.0 WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_compras_parceladas_parcela_centavos_para_real_insert;
CREATE TRIGGER trg_compras_parceladas_parcela_centavos_para_real_insert
AFTER INSERT ON compras_parceladas
WHEN NEW.valor_parcela_centavos IS NOT NULL
BEGIN
  UPDATE compras_parceladas SET valor_parcela = NEW.valor_parcela_centavos / 100.0 WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_compras_parceladas_parcela_centavos_para_real_update;
CREATE TRIGGER trg_compras_parceladas_parcela_centavos_para_real_update
AFTER UPDATE OF valor_parcela_centavos ON compras_parceladas
WHEN NEW.valor_parcela_centavos IS NOT NULL
BEGIN
  UPDATE compras_parceladas SET valor_parcela = NEW.valor_parcela_centavos / 100.0 WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_compras_parceladas_total_centavos_para_real_insert;
CREATE TRIGGER trg_compras_parceladas_total_centavos_para_real_insert
AFTER INSERT ON compras_parceladas
WHEN NEW.valor_total_centavos IS NOT NULL
BEGIN
  UPDATE compras_parceladas SET valor_total = NEW.valor_total_centavos / 100.0 WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_compras_parceladas_total_centavos_para_real_update;
CREATE TRIGGER trg_compras_parceladas_total_centavos_para_real_update
AFTER UPDATE OF valor_total_centavos ON compras_parceladas
WHEN NEW.valor_total_centavos IS NOT NULL
BEGIN
  UPDATE compras_parceladas SET valor_total = NEW.valor_total_centavos / 100.0 WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_lancamentos_recorrentes_centavos_para_real_insert;
CREATE TRIGGER trg_lancamentos_recorrentes_centavos_para_real_insert
AFTER INSERT ON lancamentos_recorrentes
WHEN NEW.valor_centavos IS NOT NULL
BEGIN
  UPDATE lancamentos_recorrentes SET valor = NEW.valor_centavos / 100.0 WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_lancamentos_recorrentes_centavos_para_real_update;
CREATE TRIGGER trg_lancamentos_recorrentes_centavos_para_real_update
AFTER UPDATE OF valor_centavos ON lancamentos_recorrentes
WHEN NEW.valor_centavos IS NOT NULL
BEGIN
  UPDATE lancamentos_recorrentes SET valor = NEW.valor_centavos / 100.0 WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_metas_categoria_centavos_para_real_insert;
CREATE TRIGGER trg_metas_categoria_centavos_para_real_insert
AFTER INSERT ON metas_categoria
WHEN NEW.valor_limite_centavos IS NOT NULL
BEGIN
  UPDATE metas_categoria SET valor_limite = NEW.valor_limite_centavos / 100.0 WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_metas_categoria_centavos_para_real_update;
CREATE TRIGGER trg_metas_categoria_centavos_para_real_update
AFTER UPDATE OF valor_limite_centavos ON metas_categoria
WHEN NEW.valor_limite_centavos IS NOT NULL
BEGIN
  UPDATE metas_categoria SET valor_limite = NEW.valor_limite_centavos / 100.0 WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_meta_depositos_centavos_para_real_insert;
CREATE TRIGGER trg_meta_depositos_centavos_para_real_insert
AFTER INSERT ON meta_depositos
WHEN NEW.valor_centavos IS NOT NULL
BEGIN
  UPDATE meta_depositos SET valor = NEW.valor_centavos / 100.0 WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_meta_depositos_centavos_para_real_update;
CREATE TRIGGER trg_meta_depositos_centavos_para_real_update
AFTER UPDATE OF valor_centavos ON meta_depositos
WHEN NEW.valor_centavos IS NOT NULL
BEGIN
  UPDATE meta_depositos SET valor = NEW.valor_centavos / 100.0 WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_planos_valor_alvo_centavos_para_real_insert;
CREATE TRIGGER trg_planos_valor_alvo_centavos_para_real_insert
AFTER INSERT ON planos
WHEN NEW.valor_alvo_centavos IS NOT NULL
BEGIN
  UPDATE planos SET valor_alvo = NEW.valor_alvo_centavos / 100.0 WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_planos_valor_alvo_centavos_para_real_update;
CREATE TRIGGER trg_planos_valor_alvo_centavos_para_real_update
AFTER UPDATE OF valor_alvo_centavos ON planos
WHEN NEW.valor_alvo_centavos IS NOT NULL
BEGIN
  UPDATE planos SET valor_alvo = NEW.valor_alvo_centavos / 100.0 WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_planos_depositado_centavos_para_real_insert;
CREATE TRIGGER trg_planos_depositado_centavos_para_real_insert
AFTER INSERT ON planos
WHEN NEW.depositado_centavos IS NOT NULL
BEGIN
  UPDATE planos SET depositado = NEW.depositado_centavos / 100.0 WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_planos_depositado_centavos_para_real_update;
CREATE TRIGGER trg_planos_depositado_centavos_para_real_update
AFTER UPDATE OF depositado_centavos ON planos
WHEN NEW.depositado_centavos IS NOT NULL
BEGIN
  UPDATE planos SET depositado = NEW.depositado_centavos / 100.0 WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_plano_depositos_centavos_para_real_insert;
CREATE TRIGGER trg_plano_depositos_centavos_para_real_insert
AFTER INSERT ON plano_depositos
WHEN NEW.valor_centavos IS NOT NULL
BEGIN
  UPDATE plano_depositos SET valor = NEW.valor_centavos / 100.0 WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_plano_depositos_centavos_para_real_update;
CREATE TRIGGER trg_plano_depositos_centavos_para_real_update
AFTER UPDATE OF valor_centavos ON plano_depositos
WHEN NEW.valor_centavos IS NOT NULL
BEGIN
  UPDATE plano_depositos SET valor = NEW.valor_centavos / 100.0 WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_transferencias_centavos_para_real_insert;
CREATE TRIGGER trg_transferencias_centavos_para_real_insert
AFTER INSERT ON transferencias
WHEN NEW.valor_centavos IS NOT NULL
BEGIN
  UPDATE transferencias SET valor = NEW.valor_centavos / 100.0 WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_transferencias_centavos_para_real_update;
CREATE TRIGGER trg_transferencias_centavos_para_real_update
AFTER UPDATE OF valor_centavos ON transferencias
WHEN NEW.valor_centavos IS NOT NULL
BEGIN
  UPDATE transferencias SET valor = NEW.valor_centavos / 100.0 WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_orcamentos_centavos_para_real_insert;
CREATE TRIGGER trg_orcamentos_centavos_para_real_insert
AFTER INSERT ON orcamentos
WHEN NEW.valor_centavos IS NOT NULL
BEGIN
  UPDATE orcamentos SET valor = NEW.valor_centavos / 100.0 WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_orcamentos_centavos_para_real_update;
CREATE TRIGGER trg_orcamentos_centavos_para_real_update
AFTER UPDATE OF valor_centavos ON orcamentos
WHEN NEW.valor_centavos IS NOT NULL
BEGIN
  UPDATE orcamentos SET valor = NEW.valor_centavos / 100.0 WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_cartoes_credito_centavos_para_real_insert;
CREATE TRIGGER trg_cartoes_credito_centavos_para_real_insert
AFTER INSERT ON cartoes_credito
WHEN NEW.limite_centavos IS NOT NULL
BEGIN
  UPDATE cartoes_credito SET limite = NEW.limite_centavos / 100.0 WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_cartoes_credito_centavos_para_real_update;
CREATE TRIGGER trg_cartoes_credito_centavos_para_real_update
AFTER UPDATE OF limite_centavos ON cartoes_credito
WHEN NEW.limite_centavos IS NOT NULL
BEGIN
  UPDATE cartoes_credito SET limite = NEW.limite_centavos / 100.0 WHERE id = NEW.id;
END;
