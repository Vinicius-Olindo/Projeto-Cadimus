-- Migration 0032: Valores monetários em centavos inteiros
-- Fase 2 da migração: adiciona colunas novas sem remover os campos REAL antigos.
-- A aplicação continuará compatível enquanto backend/frontend passam por escrita dupla.

-- Lançamentos centrais
ALTER TABLE lancamentos ADD COLUMN valor_centavos INTEGER;
UPDATE lancamentos
SET valor_centavos = ROUND(valor * 100)
WHERE valor IS NOT NULL AND valor_centavos IS NULL;

-- Despesas/receitas fixas
ALTER TABLE despesas_fixas ADD COLUMN valor_centavos INTEGER;
UPDATE despesas_fixas
SET valor_centavos = ROUND(valor * 100)
WHERE valor IS NOT NULL AND valor_centavos IS NULL;

-- Compras parceladas
ALTER TABLE compras_parceladas ADD COLUMN valor_parcela_centavos INTEGER;
UPDATE compras_parceladas
SET valor_parcela_centavos = ROUND(valor_parcela * 100)
WHERE valor_parcela IS NOT NULL AND valor_parcela_centavos IS NULL;

ALTER TABLE compras_parceladas ADD COLUMN valor_total_centavos INTEGER;
UPDATE compras_parceladas
SET valor_total_centavos = ROUND(valor_total * 100)
WHERE valor_total IS NOT NULL AND valor_total_centavos IS NULL;

-- Lançamentos recorrentes
ALTER TABLE lancamentos_recorrentes ADD COLUMN valor_centavos INTEGER;
UPDATE lancamentos_recorrentes
SET valor_centavos = ROUND(valor * 100)
WHERE valor IS NOT NULL AND valor_centavos IS NULL;

-- Metas e depósitos
ALTER TABLE metas_categoria ADD COLUMN valor_limite_centavos INTEGER;
UPDATE metas_categoria
SET valor_limite_centavos = ROUND(valor_limite * 100)
WHERE valor_limite IS NOT NULL AND valor_limite_centavos IS NULL;

ALTER TABLE meta_depositos ADD COLUMN valor_centavos INTEGER;
UPDATE meta_depositos
SET valor_centavos = ROUND(valor * 100)
WHERE valor IS NOT NULL AND valor_centavos IS NULL;

-- Planos financeiros
ALTER TABLE planos ADD COLUMN valor_alvo_centavos INTEGER;
UPDATE planos
SET valor_alvo_centavos = ROUND(valor_alvo * 100)
WHERE valor_alvo IS NOT NULL AND valor_alvo_centavos IS NULL;

ALTER TABLE planos ADD COLUMN depositado_centavos INTEGER;
UPDATE planos
SET depositado_centavos = ROUND(depositado * 100)
WHERE depositado IS NOT NULL AND depositado_centavos IS NULL;

ALTER TABLE plano_depositos ADD COLUMN valor_centavos INTEGER;
UPDATE plano_depositos
SET valor_centavos = ROUND(valor * 100)
WHERE valor IS NOT NULL AND valor_centavos IS NULL;

-- Transferências
ALTER TABLE transferencias ADD COLUMN valor_centavos INTEGER;
UPDATE transferencias
SET valor_centavos = ROUND(valor * 100)
WHERE valor IS NOT NULL AND valor_centavos IS NULL;

-- Orçamentos
ALTER TABLE orcamentos ADD COLUMN valor_centavos INTEGER;
UPDATE orcamentos
SET valor_centavos = ROUND(valor * 100)
WHERE valor IS NOT NULL AND valor_centavos IS NULL;

-- Cartões de crédito
ALTER TABLE cartoes_credito ADD COLUMN limite_centavos INTEGER;
UPDATE cartoes_credito
SET limite_centavos = ROUND(limite * 100)
WHERE limite IS NOT NULL AND limite_centavos IS NULL;
