import test from "node:test";
import assert from "node:assert/strict";

import {
  deveVincularCartaoCredito,
  normalizarCartaoCreditoId,
  validarCartaoCreditoDaCarteira,
} from "../src/utils/cartoesCredito.ts";

test("normalizarCartaoCreditoId aceita apenas inteiro positivo", () => {
  assert.equal(normalizarCartaoCreditoId(1), 1);
  assert.equal(normalizarCartaoCreditoId("2"), 2);
  assert.equal(normalizarCartaoCreditoId(0), null);
  assert.equal(normalizarCartaoCreditoId("-1"), null);
  assert.equal(normalizarCartaoCreditoId("abc"), null);
  assert.equal(normalizarCartaoCreditoId(null), null);
});

test("deveVincularCartaoCredito somente para crédito que não seja receita", () => {
  assert.equal(deveVincularCartaoCredito({ tipo: "despesa", meio_pagamento: "credito" }), true);
  assert.equal(deveVincularCartaoCredito({ tipo: "despesa", meio_pagamento: "Credito" }), true);
  assert.equal(deveVincularCartaoCredito({ tipo: "receita", meio_pagamento: "credito" }), false);
  assert.equal(deveVincularCartaoCredito({ tipo: "despesa", meio_pagamento: "pix" }), false);
  assert.equal(deveVincularCartaoCredito(null), false);
});

test("validarCartaoCreditoDaCarteira retorna id apenas quando o cartão pertence à carteira", async () => {
  const chamadas = [];
  const env = {
    DB: {
      prepare(query) {
        chamadas.push(query);
        return {
          bind(cartaoId, carteiraId) {
            return {
              async all() {
                return {
                  results: cartaoId === 10 && carteiraId === 5 ? [{ id: 10 }] : [],
                };
              },
            };
          },
        };
      },
    },
  };

  assert.equal(await validarCartaoCreditoDaCarteira(env, 10, 5), 10);
  assert.equal(await validarCartaoCreditoDaCarteira(env, 10, 6), false);
  assert.equal(await validarCartaoCreditoDaCarteira(env, null, 5), null);
  assert.equal(chamadas.length, 2);
});
