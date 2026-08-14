import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve("../database/migrations/0032_valores_centavos_inteiros.sql"),
  "utf8",
);

test("migration 0032 adiciona colunas de centavos para todos os campos monetários críticos", () => {
  const colunasEsperadas = [
    "lancamentos ADD COLUMN valor_centavos INTEGER",
    "despesas_fixas ADD COLUMN valor_centavos INTEGER",
    "compras_parceladas ADD COLUMN valor_parcela_centavos INTEGER",
    "compras_parceladas ADD COLUMN valor_total_centavos INTEGER",
    "lancamentos_recorrentes ADD COLUMN valor_centavos INTEGER",
    "metas_categoria ADD COLUMN valor_limite_centavos INTEGER",
    "meta_depositos ADD COLUMN valor_centavos INTEGER",
    "planos ADD COLUMN valor_alvo_centavos INTEGER",
    "planos ADD COLUMN depositado_centavos INTEGER",
    "plano_depositos ADD COLUMN valor_centavos INTEGER",
    "transferencias ADD COLUMN valor_centavos INTEGER",
    "orcamentos ADD COLUMN valor_centavos INTEGER",
    "cartoes_credito ADD COLUMN limite_centavos INTEGER",
  ];

  for (const coluna of colunasEsperadas) {
    assert.match(migration, new RegExp(coluna.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("migration 0032 faz backfill arredondado a partir dos campos legados REAL", () => {
  const backfillsEsperados = [
    "SET valor_centavos = ROUND(valor * 100)",
    "SET valor_parcela_centavos = ROUND(valor_parcela * 100)",
    "SET valor_total_centavos = ROUND(valor_total * 100)",
    "SET valor_limite_centavos = ROUND(valor_limite * 100)",
    "SET valor_alvo_centavos = ROUND(valor_alvo * 100)",
    "SET depositado_centavos = ROUND(depositado * 100)",
    "SET limite_centavos = ROUND(limite * 100)",
  ];

  for (const trecho of backfillsEsperados) {
    assert.match(migration, new RegExp(trecho.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
