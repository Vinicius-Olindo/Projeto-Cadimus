import test from "node:test";
import assert from "node:assert/strict";

import {
  centavosParaReais,
  normalizarCentavos,
  reaisParaCentavos,
  somarCentavos,
} from "../src/utils/dinheiro.js";

test("reaisParaCentavos aceita números e strings decimais", () => {
  assert.equal(reaisParaCentavos(10.5), 1050);
  assert.equal(reaisParaCentavos("10.50"), 1050);
  assert.equal(reaisParaCentavos("10,50"), 1050);
  assert.equal(reaisParaCentavos("0.1"), 10);
  assert.equal(reaisParaCentavos("0.2"), 20);
});

test("reaisParaCentavos aceita formato brasileiro com moeda e milhar", () => {
  assert.equal(reaisParaCentavos("R$ 1.234,56"), 123456);
  assert.equal(reaisParaCentavos("1.000,00"), 100000);
  assert.equal(reaisParaCentavos("333,34"), 33334);
});

test("normalizarCentavos prioriza centavos inteiros quando enviados", () => {
  assert.equal(normalizarCentavos("999,99", 1050), 1050);
  assert.equal(normalizarCentavos(null, "1050"), 1050);
});

test("conversões recusam valores inválidos e centavos fracionários", () => {
  assert.throws(() => reaisParaCentavos("abc"), /inválido/);
  assert.throws(() => reaisParaCentavos(Number.NaN), /inválido/);
  assert.throws(() => normalizarCentavos(null, 10.5), /inteiro/);
  assert.throws(() => centavosParaReais(10.5), /inteiro/);
});

test("valores negativos só passam quando explicitamente permitidos", () => {
  assert.throws(() => reaisParaCentavos("-1,00"), /negativo/);
  assert.equal(reaisParaCentavos("-1,00", { permitirNegativo: true }), -100);
  assert.equal(normalizarCentavos(null, -100, { permitirNegativo: true }), -100);
});

test("somarCentavos soma apenas inteiros e preserva centavos", () => {
  assert.equal(somarCentavos([10, 20, 30]), 60);
  assert.equal(centavosParaReais(somarCentavos([33333, 33333, 33334])), 1000);
  assert.throws(() => somarCentavos([10, 20.5]), /inteiros/);
});
