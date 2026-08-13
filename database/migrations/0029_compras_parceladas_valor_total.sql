-- Migration 0029: Valor total original da compra parcelada
-- Permite gerar parcelas com distribuição correta de centavos, preservando o
-- total exato informado pelo usuário.

ALTER TABLE compras_parceladas ADD COLUMN valor_total REAL;
