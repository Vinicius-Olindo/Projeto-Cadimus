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

test("gerar notificacoes automaticas cria alertas de vencimentos e metas das carteiras permitidas", async () => {
  const inserts = [];
  const db = new FakeD1(handlersBase([
    {
      type: "all",
      match: "SELECT * FROM despesas_fixas WHERE ativo = 1",
      reply: () => [{
        id: 11,
        carteira_id: 10,
        descricao: "Internet",
        dia_vencimento: 14,
        valor_centavos: 9990,
      }],
    },
    {
      type: "all",
      match: "SELECT * FROM compras_parceladas WHERE ativo = 1",
      reply: () => [{
        id: 12,
        carteira_id: 10,
        descricao: "Notebook",
        dia_vencimento: 16,
        valor_parcela_centavos: 33333,
      }],
    },
    {
      type: "all",
      match: "SELECT * FROM lancamentos WHERE status != 'pago'",
      reply: () => [{
        id: 13,
        carteira_id: 10,
        descricao: "Mercado",
        data_compra: "2026-08-13",
        valor_centavos: 12345,
      }],
    },
    {
      type: "all",
      match: "FROM metas_categoria m",
      reply: () => [{
        id: 14,
        carteira_id: 10,
        categoria: "Reserva",
        data_limite: "2026-08-20",
        valor_limite_centavos: 100000,
        depositado_centavos: 25000,
      }],
    },
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
    request("POST", "https://cadimus.test/api/notificacoes/gerar", {
      data_referencia: "2026-08-14",
    }),
    { DB: db },
    { waitUntil() {} },
  );

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { geradas: 4 });
  assert.deepEqual(inserts.map((args) => args[2]), ["fixa", "parcelada", "lancamento", "meta"]);
  assert.ok(inserts.every((args) => args[0] === 1));
  assert.ok(inserts.every((args) => args[1] === 10));
  assert.ok(inserts.some((args) => args[9] === "despesa_fixa:11:vencimento:2026-08"));
  assert.ok(inserts.some((args) => args[9] === "meta:14:prazo:2026-08-20"));
});
