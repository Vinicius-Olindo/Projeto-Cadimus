import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve("../database/migrations/0032_valores_centavos_inteiros.sql"),
  "utf8",
);

const canonicalMigration = readFileSync(
  resolve("../database/migrations/0033_centavos_como_fonte_canonica.sql"),
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

test("migration 0033 sincroniza campos REAL legados a partir dos centavos canonicos", () => {
  const sincronizacoesEsperadas = [
    "UPDATE lancamentos SET valor = valor_centavos / 100.0",
    "UPDATE despesas_fixas SET valor = valor_centavos / 100.0",
    "UPDATE compras_parceladas SET valor_parcela = valor_parcela_centavos / 100.0",
    "UPDATE compras_parceladas SET valor_total = valor_total_centavos / 100.0",
    "UPDATE lancamentos_recorrentes SET valor = valor_centavos / 100.0",
    "UPDATE metas_categoria SET valor_limite = valor_limite_centavos / 100.0",
    "UPDATE meta_depositos SET valor = valor_centavos / 100.0",
    "UPDATE planos SET valor_alvo = valor_alvo_centavos / 100.0",
    "UPDATE planos SET depositado = depositado_centavos / 100.0",
    "UPDATE plano_depositos SET valor = valor_centavos / 100.0",
    "UPDATE transferencias SET valor = valor_centavos / 100.0",
    "UPDATE orcamentos SET valor = valor_centavos / 100.0",
    "UPDATE cartoes_credito SET limite = limite_centavos / 100.0",
  ];

  for (const trecho of sincronizacoesEsperadas) {
    assert.match(canonicalMigration, new RegExp(trecho.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("migration 0033 cria gatilhos para manter compatibilidade REAL apos escrita em centavos", () => {
  const gatilhosEsperados = [
    "AFTER INSERT ON lancamentos",
    "AFTER UPDATE OF valor_centavos ON lancamentos",
    "AFTER INSERT ON despesas_fixas",
    "AFTER UPDATE OF valor_centavos ON despesas_fixas",
    "AFTER INSERT ON compras_parceladas",
    "AFTER UPDATE OF valor_parcela_centavos ON compras_parceladas",
    "AFTER UPDATE OF valor_total_centavos ON compras_parceladas",
    "AFTER INSERT ON lancamentos_recorrentes",
    "AFTER UPDATE OF valor_centavos ON lancamentos_recorrentes",
    "AFTER INSERT ON metas_categoria",
    "AFTER UPDATE OF valor_limite_centavos ON metas_categoria",
    "AFTER INSERT ON meta_depositos",
    "AFTER UPDATE OF valor_centavos ON meta_depositos",
    "AFTER INSERT ON planos",
    "AFTER UPDATE OF valor_alvo_centavos ON planos",
    "AFTER UPDATE OF depositado_centavos ON planos",
    "AFTER INSERT ON plano_depositos",
    "AFTER UPDATE OF valor_centavos ON plano_depositos",
    "AFTER INSERT ON transferencias",
    "AFTER UPDATE OF valor_centavos ON transferencias",
    "AFTER INSERT ON orcamentos",
    "AFTER UPDATE OF valor_centavos ON orcamentos",
    "AFTER INSERT ON cartoes_credito",
    "AFTER UPDATE OF limite_centavos ON cartoes_credito",
  ];

  for (const gatilho of gatilhosEsperados) {
    assert.match(canonicalMigration, new RegExp(gatilho.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
