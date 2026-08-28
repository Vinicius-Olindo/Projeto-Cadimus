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

test("erroFinanceiro transforma campo obrigatório conhecido em erro específico", async () => {
  const resultado = await erroJson(new Error("NOT NULL constraint failed: lancamentos.descricao"));

  assert.equal(resultado.status, 400);
  assert.deepEqual(resultado.dados, {
    erro: "Informe uma descrição.",
    codigo: "descricao_obrigatoria",
  });
});

test("erroFinanceiro transforma campo obrigatório desconhecido em erro útil", async () => {
  const resultado = await erroJson(new Error("NOT NULL constraint failed: tabela.campo_novo"));

  assert.equal(resultado.status, 400);
  assert.deepEqual(resultado.dados, {
    erro: "Dados obrigatórios ausentes.",
    codigo: "dados_obrigatorios_ausentes",
  });
});

test("erroFinanceiro transforma referência inválida genérica em erro seguro", async () => {
  const resultado = await erroJson(new Error("FOREIGN KEY constraint failed"));

  assert.equal(resultado.status, 400);
  assert.deepEqual(resultado.dados, {
    erro: "Registro relacionado inválido para esta carteira.",
    codigo: "referencia_financeira_invalida",
  });
});

test("erroFinanceiro transforma referência inválida conhecida em erro específico", async () => {
  const resultado = await erroJson(new Error("FOREIGN KEY constraint failed: cartoes_credito"));

  assert.equal(resultado.status, 400);
  assert.deepEqual(resultado.dados, {
    erro: "Cartão de crédito inválido para esta carteira.",
    codigo: "cartao_credito_invalido",
  });
});

test("erroFinanceiro transforma regra financeira bloqueada em erro específico", async () => {
  const resultado = await erroJson(new Error("CHECK constraint failed: valor_centavos > 0"));

  assert.equal(resultado.status, 400);
  assert.deepEqual(resultado.dados, {
    erro: "Regra financeira bloqueada: confira os valores informados.",
    codigo: "valor_financeiro_invalido",
  });
});

test("erroFinanceiro transforma regra de frequência/data em erro específico", async () => {
  const resultado = await erroJson(new Error("CHECK constraint failed: frequencia IN ('diaria','semanal')"));

  assert.equal(resultado.status, 400);
  assert.deepEqual(resultado.dados, {
    erro: "Frequência inválida.",
    codigo: "frequencia_invalida",
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
