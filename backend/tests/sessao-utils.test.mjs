import test from "node:test";
import assert from "node:assert/strict";

import { encerrarSessao, obterUsuarioDaSessao } from "../src/utils/sessao.js";

class FakeD1Sessao {
  constructor(sessao = null) {
    this.sessao = sessao;
    this.calls = [];
  }

  prepare(sql) {
    const db = this;
    return {
      bind(...args) {
        return {
          async all() {
            db.calls.push({ type: "all", sql, args });
            if (sql.includes("FROM sessoes s")) {
              return { results: db.sessao ? [db.sessao] : [] };
            }
            return { results: [] };
          },
          async run() {
            db.calls.push({ type: "run", sql, args });
            return { meta: {} };
          },
        };
      },
    };
  }
}

function requestComToken(token) {
  return new Request("https://cadimus.test/api", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

test("obterUsuarioDaSessao retorna usuário e agenda renovação/limpeza quando sessão está válida", async () => {
  const db = new FakeD1Sessao({
    id: 1,
    nome_usuario: "tester",
    perfil: "comum",
    expira_em: "2999-01-01T00:00:00.000Z",
  });
  const pendentes = [];
  const ctx = {
    waitUntil(promise) {
      pendentes.push(promise);
    },
  };

  const usuario = await obterUsuarioDaSessao(requestComToken("abc"), { DB: db }, ctx);
  await Promise.all(pendentes);

  assert.deepEqual(usuario, { id: 1, nome_usuario: "tester", perfil: "comum" });
  assert.equal(pendentes.length, 1);
  assert.ok(db.calls.some((call) => call.type === "run" && call.sql.includes("DELETE FROM sessoes WHERE expira_em")));
  assert.ok(db.calls.some((call) => call.type === "run" && call.sql.includes("UPDATE sessoes SET expira_em")));
});

test("obterUsuarioDaSessao remove sessão expirada e retorna null", async () => {
  const db = new FakeD1Sessao({
    id: 1,
    nome_usuario: "tester",
    perfil: "comum",
    expira_em: "2000-01-01T00:00:00.000Z",
  });

  const usuario = await obterUsuarioDaSessao(requestComToken("expirada"), { DB: db }, {});

  assert.equal(usuario, null);
  assert.ok(db.calls.some((call) => call.type === "run" && call.sql.includes("DELETE FROM sessoes WHERE token = ?") && call.args[0] === "expirada"));
});

test("encerrarSessao apaga somente quando existe token Bearer", async () => {
  const dbComToken = new FakeD1Sessao();
  await encerrarSessao(requestComToken("logout"), { DB: dbComToken });
  assert.ok(dbComToken.calls.some((call) => call.type === "run" && call.args[0] === "logout"));

  const dbSemToken = new FakeD1Sessao();
  await encerrarSessao(requestComToken(null), { DB: dbSemToken });
  assert.equal(dbSemToken.calls.length, 0);
});
