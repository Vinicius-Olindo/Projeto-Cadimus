import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";

function criarContextoFrontend() {
  const contexto = {
    console,
    setTimeout() {},
    clearTimeout() {},
    URL: {
      createObjectURL: () => "blob:teste",
      revokeObjectURL() {},
    },
    document: {
      addEventListener() {},
      getElementById: () => null,
      querySelectorAll: () => [],
      createElement: () => ({
        click() {},
        set href(valor) { this._href = valor; },
        set download(valor) { this._download = valor; },
      }),
      body: {
        appendChild() {},
        removeChild() {},
      },
    },
    formatadorBRL: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }),
  };

  contexto.window = contexto;
  vm.createContext(contexto);

  vm.runInContext(readFileSync(resolve("../frontend/js/money-utils.js"), "utf8"), contexto);

  contexto.valorMonetario = (registro, nomeCampo = "valor") => {
    const nomeCentavos = `${nomeCampo}_centavos`;
    if (Number.isInteger(registro?.[nomeCentavos])) {
      return contexto.CadimusMoney.centavosParaReais(registro[nomeCentavos]);
    }
    return Number(registro?.[nomeCampo]) || 0;
  };
  contexto.centavosMonetarios = (registro, nomeCampo = "valor") => {
    const nomeCentavos = `${nomeCampo}_centavos`;
    if (Number.isInteger(registro?.[nomeCentavos])) {
      return registro[nomeCentavos];
    }
    return contexto.CadimusMoney.reaisParaCentavos(contexto.valorMonetario(registro, nomeCampo), { permitirNegativo: true });
  };
  contexto.somarValoresMonetarios = (registros, nomeCampo = "valor") =>
    registros.reduce((total, registro) => total + contexto.valorMonetario(registro, nomeCampo), 0);

  vm.runInContext(readFileSync(resolve("../frontend/js/importar.js"), "utf8"), contexto);
  vm.runInContext(readFileSync(resolve("../frontend/js/exportar.js"), "utf8"), contexto);

  return contexto;
}

test("parseCSV interpreta valores brasileiros em centavos sem perder milhares", () => {
  const { parseCSV } = criarContextoFrontend();

  const resultado = parseCSV([
    "Data;Descricao;Valor",
    "14/08/2026;Salario;1.234,56",
    "15/08/2026;Aluguel;-2.500,10",
  ].join("\n"));

  assert.equal(resultado.length, 2);
  assert.deepEqual(Array.from(resultado, (item) => item.valor_centavos), [123456, 250010]);
  assert.deepEqual(Array.from(resultado, (item) => item.valor), [1234.56, 2500.1]);
  assert.deepEqual(Array.from(resultado, (item) => item.tipo), ["receita", "despesa"]);
});

test("parseOFX preserva centavos e sinal ao importar transacoes", () => {
  const { parseOFX } = criarContextoFrontend();

  const resultado = parseOFX(`
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260814120000
<TRNAMT>-123.45
<NAME>Mercado
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260815120000
<TRNAMT>2500.10
<NAME>Pagamento
</STMTTRN>
`);

  assert.equal(resultado.length, 2);
  assert.deepEqual(Array.from(resultado, (item) => item.valor_centavos), [12345, 250010]);
  assert.deepEqual(Array.from(resultado, (item) => item.valor), [123.45, 2500.1]);
  assert.deepEqual(Array.from(resultado, (item) => item.tipo), ["despesa", "receita"]);
});

test("gerarCSV exporta valor derivado de centavos e inclui coluna de centavos", () => {
  const { gerarCSV } = criarContextoFrontend();

  const csv = gerarCSV([{
    data_compra: "2026-08-14",
    tipo: "despesa",
    descricao: "Valor legado divergente",
    valor: 99.98,
    valor_centavos: 9999,
    categoria: "Casa",
    meio_pagamento: "Pix",
    status: "pago",
    carteira_nome: "Principal",
  }]);

  assert.match(csv, /Valor Centavos/);
  assert.match(csv, /99,99;9999/);
  assert.doesNotMatch(csv, /99,98;9999/);
});

test("gerarOFX exporta TRNAMT a partir de centavos canonicos", () => {
  const { gerarOFX } = criarContextoFrontend();

  const ofx = gerarOFX([{
    data_compra: "2026-08-14",
    tipo: "despesa",
    descricao: "Valor legado divergente",
    valor: 99.98,
    valor_centavos: 9999,
  }]);

  assert.match(ofx, /<TRNAMT>-99\.99<\/TRNAMT>/);
  assert.doesNotMatch(ofx, /<TRNAMT>-99\.98<\/TRNAMT>/);
});
