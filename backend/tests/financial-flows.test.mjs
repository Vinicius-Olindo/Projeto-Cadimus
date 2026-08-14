import test from "node:test";
import assert from "node:assert/strict";

import { gerarTodasParcelasDaCompra } from "../src/utils/comprasParceladas.js";
import { gerarLancamentosRecorrentesDoMes } from "../src/utils/lancamentosRecorrentes.js";
import { processarLancamentos } from "../src/routes/lancamentos.js";
import { processarOrcamentos } from "../src/routes/orcamentos.js";
import { processarTransferencias } from "../src/routes/transferencias.js";

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
            const value = handler ? await handler({ sql, args, db }) : [];
            return { results: value };
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
        const value = handler ? await handler({ sql, args: [], db }) : [];
        return { results: value };
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

function handlersAutenticados(extraHandlers = []) {
  return [
    {
      type: "all",
      match: "FROM sessoes s",
      reply: () => [{ id: 1, nome_usuario: "tester", perfil: "superadmin", expira_em: "2999-01-01T00:00:00.000Z" }],
    },
    {
      type: "run",
      match: "DELETE FROM sessoes WHERE expira_em",
      reply: () => ({ meta: {} }),
    },
    {
      type: "all",
      match: "SELECT carteira_id FROM usuarios_carteiras WHERE usuario_id = ?",
      reply: () => [{ carteira_id: 10 }, { carteira_id: 20 }],
    },
    ...extraHandlers,
  ];
}

test("compras parceladas distribuem centavos e preservam o total", async () => {
  const lancamentos = [];
  const db = new FakeD1([
    {
      type: "all",
      match: "SELECT * FROM compras_parceladas WHERE id = ?",
      reply: () => [{
        id: 7,
        descricao: "Notebook",
        valor_total: 1000,
        valor_parcela: 333.33,
        total_parcelas: 3,
        dia_vencimento: 10,
        mes_inicio: 11,
        ano_inicio: 2026,
        categoria: "Tecnologia",
        meio_pagamento: "Cartão",
        carteira_id: 10,
        criado_por: 1,
      }],
    },
    {
      type: "all",
      match: "SELECT id FROM lancamentos WHERE compra_parcelada_id = ? AND numero_parcela = ?",
      reply: () => [],
    },
    {
      type: "run",
      match: "INSERT INTO lancamentos",
      reply: ({ args }) => {
        lancamentos.push({
          descricao: args[0],
          valor: args[1],
          data_compra: args[2],
          numero_parcela: args[8],
        });
        return { meta: { last_row_id: lancamentos.length } };
      },
    },
  ]);

  await gerarTodasParcelasDaCompra({ DB: db }, 7);

  assert.deepEqual(lancamentos.map((l) => l.valor), [333.33, 333.33, 333.34]);
  assert.equal(lancamentos.reduce((soma, item) => soma + Math.round(item.valor * 100), 0), 100000);
  assert.deepEqual(lancamentos.map((l) => l.data_compra), ["2026-11-10", "2026-12-10", "2027-01-10"]);
});

test("recorrências semanais geram ocorrências do mês sem duplicar", async () => {
  const lancamentos = [];
  const db = new FakeD1([
    {
      type: "all",
      match: "SELECT * FROM lancamentos_recorrentes WHERE ativo = 1",
      reply: () => [{
        id: 5,
        descricao: "Aula",
        valor: 50,
        tipo: "despesa",
        categoria: "Educação",
        meio_pagamento: "Pix",
        frequencia: "semanal",
        dia_semana: 1,
        data_inicio: "2026-08-03",
        data_fim: null,
        carteira_id: 10,
        criado_por: 1,
      }],
    },
    {
      type: "all",
      match: "SELECT id FROM lancamentos WHERE recorrencia_id = ? AND data_compra = ?",
      reply: ({ args }) => lancamentos.some((l) => l.recorrencia_id === args[0] && l.data_compra === args[1]) ? [{ id: 99 }] : [],
    },
    {
      type: "run",
      match: "INSERT INTO lancamentos",
      reply: ({ args }) => {
        lancamentos.push({ data_compra: args[2], recorrencia_id: args[8] });
        return { meta: { last_row_id: lancamentos.length } };
      },
    },
  ]);

  await gerarLancamentosRecorrentesDoMes({ DB: db }, [10], "2026", "08");
  await gerarLancamentosRecorrentesDoMes({ DB: db }, [10], "2026", "08");

  assert.deepEqual(lancamentos.map((l) => l.data_compra), ["2026-08-03", "2026-08-10", "2026-08-17", "2026-08-24", "2026-08-31"]);
});

test("relatório de lançamentos respeita data_inicio, data_fim, categoria, tipo e status", async () => {
  let consultaFinal;
  const db = new FakeD1(handlersAutenticados([
    {
      type: "all",
      match: "FROM lancamentos l",
      reply: ({ sql, args }) => {
        consultaFinal = { sql, args };
        return [];
      },
    },
  ]));

  const res = await processarLancamentos(
    request("GET", "https://cadimus.test/api/lancamentos?carteira_id=10&data_inicio=2026-08-01&data_fim=2026-08-31&categoria=Casa&tipo=despesa&status=pago&despesa_fixa_id=1"),
    { DB: db },
    { waitUntil() {} },
  );

  assert.equal(res.status, 200);
  assert.match(consultaFinal.sql, /l\.data_compra >= \?/);
  assert.match(consultaFinal.sql, /l\.data_compra <= \?/);
  assert.match(consultaFinal.sql, /LOWER\(l\.categoria\) = LOWER\(\?\)/);
  assert.match(consultaFinal.sql, /l\.tipo = \?/);
  assert.match(consultaFinal.sql, /l\.status = \?/);
  assert.deepEqual(consultaFinal.args, ["10", "2026-08-01", "2026-08-31", "Casa", "despesa", "pago", "1"]);
});

test("transferência com idempotency_key repetida não cria novo registro", async () => {
  const inserts = [];
  const db = new FakeD1(handlersAutenticados([
    {
      type: "all",
      match: "SELECT id FROM transferencias WHERE idempotency_key = ? AND criado_por = ?",
      reply: () => [{ id: 123 }],
    },
    {
      type: "run",
      match: "INSERT INTO transferencias",
      reply: ({ args }) => {
        inserts.push(args);
        return { meta: { last_row_id: 999 } };
      },
    },
  ]));

  const res = await processarTransferencias(
    request("POST", "https://cadimus.test/api/transferencias", {
      valor: 10,
      data_transferencia: "2026-08-14",
      carteira_origem_id: 10,
      carteira_destino_id: 20,
      idempotency_key: "abc",
    }),
    { DB: db },
    { waitUntil() {} },
  );

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { id: 123, mensagem: "Transferência já registrada.", idempotente: true });
  assert.equal(inserts.length, 0);
});

test("criação de lançamento faz escrita dupla em reais e centavos", async () => {
  let insertLancamento;
  const auditLogs = [];
  const db = new FakeD1(handlersAutenticados([
    {
      type: "all",
      match: "SELECT id FROM categorias WHERE LOWER(nome) = LOWER(?)",
      reply: () => [{ id: 1 }],
    },
    {
      type: "run",
      match: "INSERT INTO lancamentos",
      reply: ({ sql, args }) => {
        insertLancamento = { sql, args };
        return { meta: { last_row_id: 77 } };
      },
    },
    {
      type: "run",
      match: "INSERT INTO audit_logs",
      reply: ({ args }) => {
        auditLogs.push(args);
        return { meta: { last_row_id: auditLogs.length } };
      },
    },
  ]));

  const res = await processarLancamentos(
    request("POST", "https://cadimus.test/api/lancamentos", {
      descricao: "Mercado",
      valor_centavos: 12345,
      data_compra: "2026-08-14",
      tipo: "despesa",
      categoria: "Casa",
      meio_pagamento: "Pix",
      status: "pago",
      carteira_id: 10,
      nota: "",
    }),
    { DB: db },
    { waitUntil() {} },
  );

  assert.equal(res.status, 201);
  assert.match(insertLancamento.sql, /valor_centavos/);
  assert.equal(insertLancamento.args[1], 123.45);
  assert.equal(insertLancamento.args[2], 12345);
  assert.equal(auditLogs.length, 1);
});

test("criação de transferência faz escrita dupla em reais e centavos", async () => {
  let insertTransferencia;
  const db = new FakeD1(handlersAutenticados([
    {
      type: "all",
      match: "AS saldo",
      reply: () => [{ saldo: 1000 }],
    },
    {
      type: "run",
      match: "INSERT INTO transferencias",
      reply: ({ sql, args }) => {
        insertTransferencia = { sql, args };
        return { meta: { last_row_id: 88 } };
      },
    },
    {
      type: "run",
      match: "INSERT INTO audit_logs",
      reply: () => ({ meta: { last_row_id: 1 } }),
    },
  ]));

  const res = await processarTransferencias(
    request("POST", "https://cadimus.test/api/transferencias", {
      valor_centavos: 25050,
      data_transferencia: "2026-08-14",
      carteira_origem_id: 10,
      carteira_destino_id: 20,
      descricao: "Reserva",
    }),
    { DB: db },
    { waitUntil() {} },
  );

  assert.equal(res.status, 201);
  assert.match(insertTransferencia.sql, /valor_centavos/);
  assert.equal(insertTransferencia.args[0], 250.5);
  assert.equal(insertTransferencia.args[1], 25050);
});

test("criação de orçamento faz escrita dupla em reais e centavos", async () => {
  let insertOrcamento;
  const db = new FakeD1(handlersAutenticados([
    {
      type: "run",
      match: "INSERT INTO orcamentos",
      reply: ({ sql, args }) => {
        insertOrcamento = { sql, args };
        return { meta: { last_row_id: 99 } };
      },
    },
  ]));

  const res = await processarOrcamentos(
    request("POST", "https://cadimus.test/api/orcamentos", {
      categoria: "Casa",
      valor_centavos: 150000,
      mes: 8,
      ano: 2026,
      carteira_id: 10,
    }),
    { DB: db },
    { waitUntil() {} },
  );

  assert.equal(res.status, 201);
  assert.match(insertOrcamento.sql, /valor_centavos/);
  assert.equal(insertOrcamento.args[1], 1500);
  assert.equal(insertOrcamento.args[2], 150000);
});
