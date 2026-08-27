import test from "node:test";
import assert from "node:assert/strict";

import { erroFinanceiro } from "../src/utils/respostas.ts";

async function erroJson(erro) {
  const erroOriginal = console.error;
  console.error = () => {};
  try {
    const resposta = erroFinanceiro(erro, "teste", "Falha genérica.", "falha_generica");
    return { status: resposta.status, dados: await resposta.json() };
  } finally {
    console.error = erroOriginal;
  }
}

test("erroFinanceiro transforma campo obrigatório ausente em erro útil", async () => {
  const resultado = await erroJson(new Error("NOT NULL constraint failed: lancamentos.descricao"));

  assert.equal(resultado.status, 400);
  assert.deepEqual(resultado.dados, {
    erro: "Dados obrigatórios ausentes.",
    codigo: "dados_obrigatorios_ausentes",
  });
});

test("erroFinanceiro transforma referência inválida em erro seguro", async () => {
  const resultado = await erroJson(new Error("FOREIGN KEY constraint failed"));

  assert.equal(resultado.status, 400);
  assert.deepEqual(resultado.dados, {
    erro: "Registro relacionado inválido para esta carteira.",
    codigo: "referencia_financeira_invalida",
  });
});

test("erroFinanceiro transforma regra bloqueada em erro de domínio", async () => {
  const resultado = await erroJson(new Error("CHECK constraint failed: valor_centavos > 0"));

  assert.equal(resultado.status, 400);
  assert.deepEqual(resultado.dados, {
    erro: "Regra financeira bloqueada para esta operação.",
    codigo: "regra_financeira_bloqueada",
  });
});

test("erroFinanceiro preserva fallback seguro para falha inesperada", async () => {
  const resultado = await erroJson(new Error("database temporarily unavailable"));

  assert.equal(resultado.status, 500);
  assert.deepEqual(resultado.dados, {
    erro: "Falha genérica.",
    codigo: "falha_generica",
  });
});
