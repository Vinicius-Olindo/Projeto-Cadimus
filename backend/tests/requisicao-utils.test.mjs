import test from "node:test";
import assert from "node:assert/strict";

import {
  campoCentavosObrigatorio,
  campoDataISOObrigatoria,
  campoTexto,
  lerJsonObjeto,
} from "../src/utils/requisicao.ts";

test("lerJsonObjeto aceita apenas corpos JSON que sejam objeto plano", async () => {
  const objeto = await lerJsonObjeto(new Request("https://cadimus.test", {
    method: "POST",
    body: JSON.stringify({ nome: "Mercado" }),
  }));
  const lista = await lerJsonObjeto(new Request("https://cadimus.test", {
    method: "POST",
    body: JSON.stringify(["Mercado"]),
  }));
  const textoInvalido = await lerJsonObjeto(new Request("https://cadimus.test", {
    method: "POST",
    body: "não é json",
  }));

  assert.deepEqual(objeto, { nome: "Mercado" });
  assert.equal(lista, null);
  assert.equal(textoInvalido, null);
});

test("campoTexto normaliza espaços e retorna erro quando obrigatório está ausente", () => {
  const valido = campoTexto({ descricao: "  Energia  " }, "descricao", { obrigatorio: true });
  const invalido = campoTexto({ descricao: "   " }, "descricao", {
    obrigatorio: true,
    mensagemObrigatorio: "Informe uma descrição.",
    codigoObrigatorio: "descricao_obrigatoria",
  });

  assert.deepEqual(valido, { ok: true, valor: "Energia" });
  assert.equal(invalido.ok, false);
  if (!invalido.ok) {
    assert.equal(invalido.erro.codigo, "descricao_obrigatoria");
  }
});

test("campoDataISOObrigatoria valida formato ISO e data parseável", () => {
  const valido = campoDataISOObrigatoria({ data_compra: "2026-08-28" }, "data_compra");
  const invalido = campoDataISOObrigatoria({ data_compra: "28/08/2026" }, "data_compra", "Data inválida.", "data_invalida");

  assert.deepEqual(valido, { ok: true, valor: "2026-08-28" });
  assert.equal(invalido.ok, false);
  if (!invalido.ok) {
    assert.equal(invalido.erro.codigo, "data_invalida");
  }
});

test("campoCentavosObrigatorio prioriza centavos inteiros e recusa valores soltos", () => {
  const porCentavos = campoCentavosObrigatorio(
    { valor: "99,99", valor_centavos: 12345 },
    "valor",
    "valor_centavos",
    "Valor obrigatório.",
    "valor_obrigatorio",
    "Valor inválido.",
    "valor_invalido",
  );
  const ausente = campoCentavosObrigatorio(
    {},
    "valor",
    "valor_centavos",
    "Valor obrigatório.",
    "valor_obrigatorio",
    "Valor inválido.",
    "valor_invalido",
  );
  const fracionado = campoCentavosObrigatorio(
    { valor_centavos: 12.34 },
    "valor",
    "valor_centavos",
    "Valor obrigatório.",
    "valor_obrigatorio",
    "Valor inválido.",
    "valor_invalido",
  );

  assert.deepEqual(porCentavos, { ok: true, valor: 12345 });
  assert.equal(ausente.ok, false);
  assert.equal(fracionado.ok, false);
});
