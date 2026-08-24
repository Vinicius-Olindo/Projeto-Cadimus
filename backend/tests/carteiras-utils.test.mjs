import test from "node:test";
import assert from "node:assert/strict";

import { obterCarteirasDoUsuario } from "../src/utils/carteiras.js";

test("obterCarteirasDoUsuario retorna ids de carteiras como números inteiros", async () => {
  const env = {
    DB: {
      prepare(sql) {
        assert.match(sql, /usuarios_carteiras/);
        return {
          bind(usuarioId) {
            assert.equal(usuarioId, 7);
            return {
              async all() {
                return {
                  results: [
                    { carteira_id: 10 },
                    { carteira_id: "20" },
                    { carteira_id: "abc" },
                    { carteira_id: null },
                  ],
                };
              },
            };
          },
        };
      },
    },
  };

  assert.deepEqual(await obterCarteirasDoUsuario(env, 7), [10, 20]);
});
