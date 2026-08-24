import test from "node:test";
import assert from "node:assert/strict";

import { registrarAuditoria } from "../src/utils/auditoria.ts";

class FakeD1Auditoria {
  constructor() {
    this.calls = [];
  }

  prepare(sql) {
    const db = this;
    return {
      bind(...args) {
        return {
          async run() {
            db.calls.push({ sql, args });
            return { meta: { last_row_id: db.calls.length } };
          },
        };
      },
    };
  }
}

test("registrarAuditoria serializa metadata e preserva ids opcionais", async () => {
  const db = new FakeD1Auditoria();

  await registrarAuditoria({ DB: db }, {
    usuarioId: 1,
    acao: "lancamento.criado",
    entidade: "lancamento",
    entidadeId: 77,
    carteiraId: 10,
    metadata: { valor_centavos: 12345, origem: "teste" },
  });

  assert.equal(db.calls.length, 1);
  assert.match(db.calls[0].sql, /INSERT INTO audit_logs/);
  assert.deepEqual(db.calls[0].args, [
    1,
    "lancamento.criado",
    "lancamento",
    77,
    10,
    JSON.stringify({ valor_centavos: 12345, origem: "teste" }),
  ]);
});

test("registrarAuditoria ignora evento sem campos mínimos", async () => {
  const db = new FakeD1Auditoria();

  await registrarAuditoria({ DB: db }, { usuarioId: null, acao: "x", entidade: "y" });
  await registrarAuditoria({ DB: db }, { usuarioId: 1, acao: "", entidade: "y" });
  await registrarAuditoria({ DB: db }, { usuarioId: 1, acao: "x", entidade: null });

  assert.equal(db.calls.length, 0);
});
