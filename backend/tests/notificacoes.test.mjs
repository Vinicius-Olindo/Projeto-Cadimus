import test from "node:test";
import assert from "node:assert/strict";

import { processarNotificacoes } from "../src/routes/notificacoes.js";

class FakeD1 {
  constructor(handlers = []) {
    this.handlers = handlers;
    this.calls = [];
  }

  prepare(sql) {
    const db = this;
    return {
      bind(...args) {
        return {
          async all() {
            db.calls.push({ type: "all", sql, args });
            const handler = db.findHandler(sql, "all");
            return { results: handler ? await handler({ sql, args, db }) : [] };
          },
          async run() {
            db.calls.push({ type: "run", sql, args });
            const handler = db.findHandler(sql, "run");
            const value = handler ? await handler({ sql, args, db }) : {};
            return { meta: value.meta || {} };
          },
        };
      },
      async all() {
        db.calls.push({ type: "all", sql, args: [] });
        const handler = db.findHandler(sql, "all");
        return { results: handler ? await handler({ sql, args: [], db }) : [] };
      },
      async run() {
        db.calls.push({ type: "run", sql, args: [] });
        const handler = db.findHandler(sql, "run");
        const value = handler ? await handler({ sql, args: [], db }) : {};
        return { meta: value.meta || {} };
      },
    };
  }

  findHandler(sql, type) {
    return this.handlers.find((handler) => {
      const typeMatches = !handler.type || handler.type === type;
      const sqlMatches = typeof handler.match === "string" ? sql.includes(handler.match) : handler.match.test(sql);
      return typeMatches && sqlMatches;
    })?.reply;
  }
}

function request(method, url, body = null) {
  return new Request(url, {
    method,
    headers: { Authorization: "Bearer teste", ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : null,
  });
}

function handlersBase(extra = []) {
  return [
    {
      type: "all",
      match: "FROM sessoes s",
      reply: () => [{ id: 1, nome_usuario: "tester", perfil: "comum", expira_em: "2999-01-01T00:00:00.000Z" }],
    },
    {
      type: "run",
      match: "DELETE FROM sessoes WHERE expira_em",
      reply: () => ({ meta: {} }),
    },
    {
      type: "all",
      match: "SELECT carteira_id FROM usuarios_carteiras WHERE usuario_id = ?",
      reply: () => [{ carteira_id: 10 }],
    },
    ...extra,
  ];
}

test("sincronizar notificacoes persiste apenas carteiras permitidas", async () => {
  const inserts = [];
  const db = new FakeD1(handlersBase([
    {
      type: "run",
      match: "INSERT INTO notificacoes",
      reply: ({ args }) => {
        inserts.push(args);
        return { meta: { last_row_id: inserts.length } };
      },
    },
  ]));

  const res = await processarNotificacoes(
    request("POST", "https://cadimus.test/api/notificacoes/sincronizar", {
      notificacoes: [
        {
          tipo: "fixa",
          titulo: "Internet",
          mensagem: "Vence hoje",
          carteira_id: 10,
          chave_unica: "fixa:1:2026-08",
        },
        {
          tipo: "fixa",
          titulo: "Fora",
          mensagem: "Nao deveria salvar",
          carteira_id: 99,
          chave_unica: "fixa:99:2026-08",
        },
      ],
    }),
    { DB: db },
    { waitUntil() {} },
  );

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { salvas: 1 });
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0][1], 10);
  assert.equal(inserts[0][3], "Internet");
});

test("listar notificacoes retorna itens e resumo do usuario", async () => {
  const db = new FakeD1(handlersBase([
    {
      type: "all",
      match: "SELECT * FROM notificacoes WHERE usuario_id = ?",
      reply: ({ args }) => {
        assert.deepEqual(args, [1, "nao_lida", 50]);
        return [{ id: 7, titulo: "Conta", mensagem: "Vence hoje", status: "nao_lida" }];
      },
    },
    {
      type: "all",
      match: "SUM(CASE WHEN status = 'nao_lida'",
      reply: () => [{ nao_lidas: 1, total: 3 }],
    },
  ]));

  const res = await processarNotificacoes(
    request("GET", "https://cadimus.test/api/notificacoes"),
    { DB: db },
    { waitUntil() {} },
  );

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), {
    notificacoes: [{ id: 7, titulo: "Conta", mensagem: "Vence hoje", status: "nao_lida" }],
    resumo: { nao_lidas: 1, total: 3 },
  });
});

test("marcar notificacoes como lidas altera apenas notificacoes do usuario", async () => {
  let updateArgs;
  const db = new FakeD1(handlersBase([
    {
      type: "run",
      match: "SET status = 'lida'",
      reply: ({ args }) => {
        updateArgs = args;
        return { meta: {} };
      },
    },
  ]));

  const res = await processarNotificacoes(
    request("PATCH", "https://cadimus.test/api/notificacoes/lidas"),
    { DB: db },
    { waitUntil() {} },
  );

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.deepEqual(updateArgs, [1]);
});
