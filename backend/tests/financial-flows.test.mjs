import test from "node:test";
import assert from "node:assert/strict";

import { calcularValorParcelaCentavos, gerarTodasParcelasDaCompra } from "../src/utils/comprasParceladas.ts";
import { gerarLancamentosFixosDoMes } from "../src/utils/despesasFixas.ts";
import { gerarLancamentosRecorrentesDoMes } from "../src/utils/lancamentosRecorrentes.ts";
import { processarLancamentos } from "../src/routes/lancamentos.ts";
import { processarOrcamentos } from "../src/routes/orcamentos.ts";
import { processarTransferencias } from "../src/routes/transferencias.ts";
import { processarCarteiras } from "../src/routes/carteiras.js";
import { processarPlanos, processarPlanoDepositos } from "../src/routes/planos.js";
import { processarMetas, processarMetaDepositos } from "../src/routes/metas.js";
import { processarCartoesCredito } from "../src/routes/cartoesCredito.ts";
import { processarComprasParceladas } from "../src/routes/comprasParceladas.ts";
import { processarLancamentosRecorrentes } from "../src/routes/lancamentosRecorrentes.ts";
import worker from "../src/index.js";

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
          valor_centavos: args[2],
          data_compra: args[3],
          numero_parcela: args[9],
        });
        return { meta: { last_row_id: lancamentos.length } };
      },
    },
  ]);

  await gerarTodasParcelasDaCompra({ DB: db }, 7);

  assert.deepEqual(lancamentos.map((l) => l.valor), [333.33, 333.33, 333.34]);
  assert.deepEqual(lancamentos.map((l) => l.valor_centavos), [33333, 33333, 33334]);
  assert.equal(lancamentos.reduce((soma, item) => soma + Math.round(item.valor * 100), 0), 100000);
  assert.deepEqual(lancamentos.map((l) => l.data_compra), ["2026-11-10", "2026-12-10", "2027-01-10"]);
});

test("calcularValorParcelaCentavos joga sobra de centavos na última parcela", () => {
  const compra = {
    id: 1,
    descricao: "Teste",
    valor_total_centavos: 100000,
    total_parcelas: 3,
    dia_vencimento: 10,
    mes_inicio: 8,
    ano_inicio: 2026,
    categoria: "Teste",
    meio_pagamento: "Credito",
    carteira_id: 10,
    criado_por: 1,
  };

  assert.deepEqual(
    [1, 2, 3].map((numeroParcela) => calcularValorParcelaCentavos(compra, numeroParcela)),
    [33333, 33333, 33334],
  );
});

test("criação de compra parcelada retorna erro claro quando valor é inválido", async () => {
  const inserts = [];
  const db = new FakeD1(handlersAutenticados([
    {
      type: "run",
      match: "INSERT INTO compras_parceladas",
      reply: ({ args }) => {
        inserts.push(args);
        return { meta: { last_row_id: inserts.length } };
      },
    },
  ]));

  const res = await processarComprasParceladas(
    request("POST", "https://cadimus.test/api/compras-parceladas", {
      carteira_id: 10,
      descricao: "Compra teste",
      valor_total: "abc",
      dia_vencimento: 10,
      total_parcelas: 2,
      ano_inicio: 2026,
      mes_inicio: 8,
      categoria: "Casa",
      meio_pagamento: "Credito",
    }),
    { DB: db },
    { waitUntil() {} },
  );

  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), {
    erro: "Informe o valor total da compra.",
    codigo: "valor_total_invalido",
  });
  assert.equal(inserts.length, 0);
});

test("despesas fixas geradas usam centavos como fonte do valor", async () => {
  const lancamentos = [];
  const db = new FakeD1([
    {
      type: "all",
      match: "SELECT * FROM despesas_fixas WHERE ativo = 1",
      reply: () => [{
        id: 3,
        descricao: "Internet",
        valor: 99.98,
        valor_centavos: 9999,
        tipo: "despesa",
        categoria: "Casa",
        meio_pagamento: "Debito",
        dia_vencimento: 5,
        carteira_id: 10,
        criado_por: 1,
        criado_em: "2026-08-01T00:00:00.000Z",
      }],
    },
    {
      type: "all",
      match: "SELECT id FROM lancamentos WHERE despesa_fixa_id = ?",
      reply: () => [],
    },
    {
      type: "run",
      match: "INSERT INTO lancamentos",
      reply: ({ args }) => {
        lancamentos.push({ valor: args[1], valor_centavos: args[2] });
        return { meta: { last_row_id: lancamentos.length } };
      },
    },
  ]);

  await gerarLancamentosFixosDoMes({ DB: db }, [10], "2026", "08");

  assert.deepEqual(lancamentos, [{ valor: 99.99, valor_centavos: 9999 }]);
});

test("despesas fixas geradas preservam vínculo com cartão de crédito", async () => {
  const lancamentos = [];
  const db = new FakeD1([
    {
      type: "all",
      match: "SELECT * FROM despesas_fixas WHERE ativo = 1",
      reply: () => [{
        id: 4,
        descricao: "Assinatura",
        valor: 29.9,
        valor_centavos: 2990,
        tipo: "despesa",
        categoria: "Serviços",
        meio_pagamento: "Credito",
        dia_vencimento: 31,
        carteira_id: 10,
        criado_por: 1,
        criado_em: "2026-08-01T00:00:00.000Z",
        cartao_credito_id: 55,
      }],
    },
    {
      type: "all",
      match: "SELECT id FROM lancamentos WHERE despesa_fixa_id = ?",
      reply: () => [],
    },
    {
      type: "run",
      match: "INSERT INTO lancamentos",
      reply: ({ args }) => {
        lancamentos.push({
          data_compra: args[3],
          despesa_fixa_id: args[9],
          cartao_credito_id: args[10],
        });
        return { meta: { last_row_id: lancamentos.length } };
      },
    },
  ]);

  await gerarLancamentosFixosDoMes({ DB: db }, [10], "2026", "08");

  assert.deepEqual(lancamentos, [{
    data_compra: "2026-08-28",
    despesa_fixa_id: 4,
    cartao_credito_id: 55,
  }]);
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
        lancamentos.push({ valor_centavos: args[2], data_compra: args[3], recorrencia_id: args[9] });
        return { meta: { last_row_id: lancamentos.length } };
      },
    },
  ]);

  await gerarLancamentosRecorrentesDoMes({ DB: db }, [10], "2026", "08");
  await gerarLancamentosRecorrentesDoMes({ DB: db }, [10], "2026", "08");

  assert.deepEqual(lancamentos.map((l) => l.data_compra), ["2026-08-03", "2026-08-10", "2026-08-17", "2026-08-24", "2026-08-31"]);
  assert.deepEqual(lancamentos.map((l) => l.valor_centavos), [5000, 5000, 5000, 5000, 5000]);
});

test("recorrências diárias geram bonificações de receita no mês", async () => {
  const lancamentos = [];
  const db = new FakeD1([
    {
      type: "all",
      match: "SELECT * FROM lancamentos_recorrentes WHERE ativo = 1",
      reply: () => [{
        id: 8,
        descricao: "Bonificação diária",
        valor: 20,
        valor_centavos: 2000,
        tipo: "receita",
        categoria: "Bonificação",
        meio_pagamento: "Pix",
        frequencia: "diaria",
        dia_semana: null,
        dia_mes: null,
        data_inicio: "2026-08-29",
        data_fim: "2026-09-02",
        carteira_id: 10,
        criado_por: 1,
      }],
    },
    {
      type: "all",
      match: "SELECT id FROM lancamentos WHERE recorrencia_id = ? AND data_compra = ?",
      reply: () => [],
    },
    {
      type: "run",
      match: "INSERT INTO lancamentos",
      reply: ({ args }) => {
        lancamentos.push({ descricao: args[0], valor_centavos: args[2], data_compra: args[3], tipo: args[4], categoria: args[5] });
        return { meta: { last_row_id: lancamentos.length } };
      },
    },
  ]);

  await gerarLancamentosRecorrentesDoMes({ DB: db }, [10], "2026", "08");

  assert.deepEqual(lancamentos.map((l) => l.data_compra), ["2026-08-29", "2026-08-30", "2026-08-31"]);
  assert.deepEqual(lancamentos.map((l) => l.valor_centavos), [2000, 2000, 2000]);
  assert.ok(lancamentos.every((l) => l.tipo === "receita" && l.categoria === "Bonificação"));
});

test("recorrências mensais respeitam data de início, fim e dia do mês seguro", async () => {
  const lancamentos = [];
  const db = new FakeD1([
    {
      type: "all",
      match: "SELECT * FROM lancamentos_recorrentes WHERE ativo = 1",
      reply: () => [{
        id: 9,
        descricao: "Academia",
        valor: 120,
        valor_centavos: 12000,
        tipo: "despesa",
        categoria: "Saúde",
        meio_pagamento: "Pix",
        frequencia: "mensal",
        dia_semana: null,
        dia_mes: 31,
        data_inicio: "2026-08-15",
        data_fim: "2026-09-30",
        carteira_id: 10,
        criado_por: 1,
      }],
    },
    {
      type: "all",
      match: "SELECT id FROM lancamentos WHERE recorrencia_id = ? AND data_compra = ?",
      reply: () => [],
    },
    {
      type: "run",
      match: "INSERT INTO lancamentos",
      reply: ({ args }) => {
        lancamentos.push({ data_compra: args[3], valor_centavos: args[2], recorrencia_id: args[9] });
        return { meta: { last_row_id: lancamentos.length } };
      },
    },
  ]);

  await gerarLancamentosRecorrentesDoMes({ DB: db }, [10], "2026", "07");
  await gerarLancamentosRecorrentesDoMes({ DB: db }, [10], "2026", "08");
  await gerarLancamentosRecorrentesDoMes({ DB: db }, [10], "2026", "10");

  assert.deepEqual(lancamentos, [{
    data_compra: "2026-08-28",
    valor_centavos: 12000,
    recorrencia_id: 9,
  }]);
});

test("cadastro de bonificação recorrente força receita na rota", async () => {
  let insertArgs;
  const db = new FakeD1(handlersAutenticados([
    {
      type: "run",
      match: "INSERT INTO lancamentos_recorrentes",
      reply: ({ args }) => {
        insertArgs = args;
        return { meta: { last_row_id: 77 } };
      },
    },
  ]));

  const res = await processarLancamentosRecorrentes(
    request("POST", "https://cadimus.test/api/lancamentos-recorrentes", {
      carteira_id: 10,
      descricao: "Bonificação semanal",
      valor: 100,
      valor_centavos: 10000,
      tipo: "despesa",
      categoria: "Bonificação",
      meio_pagamento: "pix",
      frequencia: "semanal",
      dia_semana: 5,
      dia_mes: null,
      data_inicio: "2026-08-21",
      data_fim: null,
    }),
    { DB: db },
    {},
  );

  assert.equal(res.status, 201);
  assert.equal(insertArgs[4], "receita");
  assert.equal(insertArgs[5], "Bonificação");
  assert.equal(insertArgs[8], 5);
  assert.equal(insertArgs[9], null);
});

test("worker roteia lançamentos recorrentes antes de lançamentos comuns", async () => {
  let insertRecorrente = false;
  const db = new FakeD1(handlersAutenticados([
    {
      type: "run",
      match: "INSERT INTO lancamentos_recorrentes",
      reply: () => {
        insertRecorrente = true;
        return { meta: { last_row_id: 88 } };
      },
    },
  ]));

  const res = await worker.fetch(
    request("POST", "https://cadimus.test/api/lancamentos-recorrentes", {
      carteira_id: 10,
      descricao: "Bonificação semanal",
      valor: 100,
      valor_centavos: 10000,
      tipo: "receita",
      categoria: "Bonificação",
      meio_pagamento: "pix",
      frequencia: "semanal",
      dia_semana: 5,
      data_inicio: "2026-08-21",
      data_fim: null,
    }),
    { DB: db, FRONTEND_URL: "*" },
    {},
  );

  assert.equal(res.status, 201);
  assert.equal(insertRecorrente, true);
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

test("criação de lançamento retorna erro claro quando descrição está ausente", async () => {
  const inserts = [];
  const db = new FakeD1(handlersAutenticados([
    {
      type: "run",
      match: "INSERT INTO lancamentos",
      reply: ({ args }) => {
        inserts.push(args);
        return { meta: { last_row_id: inserts.length } };
      },
    },
  ]));

  const res = await processarLancamentos(
    request("POST", "https://cadimus.test/api/lancamentos", {
      descricao: "   ",
      valor_centavos: 1000,
      data_compra: "2026-08-14",
      tipo: "despesa",
      categoria: "Casa",
      meio_pagamento: "Pix",
      status: "pago",
      carteira_id: 10,
    }),
    { DB: db },
    { waitUntil() {} },
  );

  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), {
    erro: "Informe uma descrição para o lançamento.",
    codigo: "descricao_obrigatoria",
  });
  assert.equal(inserts.length, 0);
});

test("criação de lançamento retorna erro claro quando valor é inválido", async () => {
  const inserts = [];
  const db = new FakeD1(handlersAutenticados([
    {
      type: "all",
      match: "SELECT id FROM categorias WHERE LOWER(nome) = LOWER(?)",
      reply: () => [{ id: 1 }],
    },
    {
      type: "run",
      match: "INSERT INTO lancamentos",
      reply: ({ args }) => {
        inserts.push(args);
        return { meta: { last_row_id: inserts.length } };
      },
    },
  ]));

  const res = await processarLancamentos(
    request("POST", "https://cadimus.test/api/lancamentos", {
      descricao: "Conta teste",
      valor: "abc",
      data_compra: "2026-08-14",
      tipo: "despesa",
      categoria: "Casa",
      meio_pagamento: "Pix",
      status: "pago",
      carteira_id: 10,
    }),
    { DB: db },
    { waitUntil() {} },
  );

  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), {
    erro: "Informe um valor válido.",
    codigo: "valor_invalido",
  });
  assert.equal(inserts.length, 0);
});

test("membro de carteira compartilhada pode excluir lançamento criado por outro usuário", async () => {
  let deletouLancamento = false;
  const auditLogs = [];
  const db = new FakeD1([
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
    {
      type: "all",
      match: "SELECT carteira_id, criado_por FROM lancamentos WHERE id = ?",
      reply: () => [{ carteira_id: 10, criado_por: 2 }],
    },
    {
      type: "all",
      match: "SELECT tipo FROM carteiras WHERE id = ?",
      reply: () => [{ tipo: "compartilhada" }],
    },
    {
      type: "run",
      match: "DELETE FROM lancamentos WHERE id = ?",
      reply: () => {
        deletouLancamento = true;
        return { meta: { changes: 1 } };
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
  ]);

  const res = await processarLancamentos(
    request("DELETE", "https://cadimus.test/api/lancamentos?id=77"),
    { DB: db },
    { waitUntil() {} },
  );

  assert.equal(res.status, 200);
  assert.equal(deletouLancamento, true);
  assert.equal(auditLogs.length, 1);
});

test("criação de transferência faz escrita dupla em reais e centavos", async () => {
  let insertTransferencia;
  const db = new FakeD1(handlersAutenticados([
    {
      type: "all",
      match: "AS saldo_centavos",
      reply: () => [{ saldo_centavos: 100000 }],
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
  assert.equal(insertOrcamento.args[4], "08");
});

test("membro de carteira compartilhada nao pode excluir a carteira", async () => {
  const db = new FakeD1(handlersAutenticados([
    {
      type: "all",
      match: "SELECT papel FROM usuarios_carteiras WHERE usuario_id = ? AND carteira_id = ?",
      reply: () => [{ papel: "membro" }],
    },
    {
      type: "run",
      match: /^DELETE /,
      reply: () => {
        throw new Error("DELETE nao deveria ser executado por membro.");
      },
    },
  ]));

  const res = await processarCarteiras(
    request("DELETE", "https://cadimus.test/api/carteiras?id=10"),
    { DB: db },
    { waitUntil() {} },
  );

  assert.equal(res.status, 403);
});

test("exclusao de carteira limpa registros financeiros dependentes conhecidos", async () => {
  const deletes = [];
  const db = new FakeD1(handlersAutenticados([
    {
      type: "all",
      match: "SELECT papel FROM usuarios_carteiras WHERE usuario_id = ? AND carteira_id = ?",
      reply: () => [{ papel: "admin" }],
    },
    {
      type: "all",
      match: "SELECT COUNT(*) AS total FROM usuarios_carteiras WHERE usuario_id = ?",
      reply: () => [{ total: 2 }],
    },
    {
      type: "run",
      match: "INSERT INTO audit_logs",
      reply: () => ({ meta: { last_row_id: 1 } }),
    },
    {
      type: "run",
      match: /^DELETE /,
      reply: ({ sql }) => {
        deletes.push(sql);
        return { meta: {} };
      },
    },
  ]));

  const res = await processarCarteiras(
    request("DELETE", "https://cadimus.test/api/carteiras?id=10"),
    { DB: db },
    { waitUntil() {} },
  );

  assert.equal(res.status, 200);
  assert.ok(deletes.some((sql) => sql.includes("DELETE FROM transferencias")));
  assert.ok(deletes.some((sql) => sql.includes("DELETE FROM orcamentos")));
  assert.ok(deletes.some((sql) => sql.includes("DELETE FROM cartoes_credito")));
  assert.ok(deletes.some((sql) => sql.includes("DELETE FROM lancamentos_recorrentes")));
  assert.ok(deletes.some((sql) => sql.includes("DELETE FROM despesas_fixas")));
  assert.ok(deletes.some((sql) => sql.includes("DELETE FROM compras_parceladas")));
  assert.ok(deletes.some((sql) => sql.includes("DELETE FROM metas_categoria")));
  assert.ok(deletes.some((sql) => sql.includes("DELETE FROM lancamentos")));
  assert.ok(deletes.some((sql) => sql.includes("DELETE FROM usuarios_carteiras")));
  assert.ok(deletes.some((sql) => sql.includes("DELETE FROM carteiras")));
});

test("usuario nao pode atualizar plano de outro usuario", async () => {
  const updates = [];
  const db = new FakeD1(handlersAutenticados([
    {
      type: "all",
      match: "SELECT usuario_id FROM planos WHERE id = ?",
      reply: () => [{ usuario_id: 2 }],
    },
    {
      type: "run",
      match: /^UPDATE planos/,
      reply: ({ args }) => {
        updates.push(args);
        return { meta: {} };
      },
    },
  ]));

  const res = await processarPlanos(
    request("PUT", "https://cadimus.test/api/planos", {
      id: 50,
      nome: "Plano indevido",
    }),
    { DB: db },
    { waitUntil() {} },
  );

  assert.equal(res.status, 403);
  assert.equal(updates.length, 0);
});

test("deposito em plano exige dono do plano e nao grava em plano alheio", async () => {
  const inserts = [];
  const db = new FakeD1(handlersAutenticados([
    {
      type: "all",
      match: "SELECT usuario_id FROM planos WHERE id = ?",
      reply: () => [{ usuario_id: 2 }],
    },
    {
      type: "run",
      match: "INSERT INTO plano_depositos",
      reply: ({ args }) => {
        inserts.push(args);
        return { meta: { last_row_id: inserts.length } };
      },
    },
  ]));

  const res = await processarPlanoDepositos(
    request("POST", "https://cadimus.test/api/planos-depositos", {
      plano_id: 50,
      valor_centavos: 10000,
      descricao: "Depósito indevido",
    }),
    { DB: db },
    { waitUntil() {} },
  );

  assert.equal(res.status, 403);
  assert.equal(inserts.length, 0);
});

test("deposito em meta fora das carteiras permitidas e bloqueado", async () => {
  const inserts = [];
  const db = new FakeD1(handlersAutenticados([
    {
      type: "all",
      match: "SELECT carteira_id FROM metas_categoria WHERE id = ?",
      reply: () => [{ carteira_id: 99 }],
    },
    {
      type: "run",
      match: "INSERT INTO meta_depositos",
      reply: ({ args }) => {
        inserts.push(args);
        return { meta: { last_row_id: inserts.length } };
      },
    },
  ]));

  const res = await processarMetaDepositos(
    request("POST", "https://cadimus.test/api/metas-depositos", {
      meta_id: 70,
      valor_centavos: 10000,
      descricao: "Depósito indevido",
    }),
    { DB: db },
    { waitUntil() {} },
  );

  assert.equal(res.status, 403);
  assert.equal(inserts.length, 0);
});

test("cartao de credito nao pode ser criado em carteira sem acesso", async () => {
  const inserts = [];
  const db = new FakeD1(handlersAutenticados([
    {
      type: "run",
      match: "INSERT INTO cartoes_credito",
      reply: ({ args }) => {
        inserts.push(args);
        return { meta: { last_row_id: inserts.length } };
      },
    },
  ]));

  const res = await processarCartoesCredito(
    request("POST", "https://cadimus.test/api/cartoes-credito", {
      nome: "Cartão indevido",
      dia_fechamento: 10,
      dia_vencimento: 20,
      limite_centavos: 100000,
      carteira_id: 99,
    }),
    { DB: db },
    { waitUntil() {} },
  );

  assert.equal(res.status, 403);
  assert.equal(inserts.length, 0);
});

test("listagem de cartoes considera apenas despesas em aberto no limite usado", async () => {
  const db = new FakeD1(handlersAutenticados([
    {
      type: "all",
      match: "SELECT c.*",
      reply: () => [],
    },
  ]));

  const res = await processarCartoesCredito(
    request("GET", "https://cadimus.test/api/cartoes-credito?carteira_id=10"),
    { DB: db },
    { waitUntil() {} },
  );

  assert.equal(res.status, 200);

  const consultaCartoes = db.calls.find((call) => call.type === "all" && call.sql.includes("SELECT c.*"));
  assert.ok(consultaCartoes);
  assert.match(consultaCartoes.sql, /lp\.status != 'pago'/);
  assert.match(consultaCartoes.sql, /lf\.status != 'pago'/);
  assert.match(consultaCartoes.sql, /l\.status != 'pago'/);
  assert.match(consultaCartoes.sql, /INNER JOIN despesas_fixas df ON df\.id = lf\.despesa_fixa_id/);
});

test("orcamento em carteira permitida nao pode ser excluido por usuario que nao criou", async () => {
  const deletes = [];
  const db = new FakeD1([
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
    {
      type: "all",
      match: "SELECT carteira_id, criado_por FROM orcamentos WHERE id = ?",
      reply: () => [{ carteira_id: 10, criado_por: 2 }],
    },
    {
      type: "run",
      match: "DELETE FROM orcamentos WHERE id = ?",
      reply: ({ args }) => {
        deletes.push(args);
        return { meta: {} };
      },
    },
  ]);

  const res = await processarOrcamentos(
    request("DELETE", "https://cadimus.test/api/orcamentos?id=90"),
    { DB: db },
    { waitUntil() {} },
  );

  assert.equal(res.status, 403);
  assert.equal(deletes.length, 0);
});

test("meta criada grava valor em reais e centavos e registra auditoria da carteira", async () => {
  let insertMeta;
  let auditLog;
  const db = new FakeD1(handlersAutenticados([
    {
      type: "run",
      match: "INSERT INTO metas_categoria",
      reply: ({ sql, args }) => {
        insertMeta = { sql, args };
        return { meta: { last_row_id: 101 } };
      },
    },
    {
      type: "all",
      match: "SELECT id FROM metas_categoria WHERE carteira_id = ?",
      reply: () => [{ id: 101 }],
    },
    {
      type: "run",
      match: "INSERT INTO audit_logs",
      reply: ({ args }) => {
        auditLog = args;
        return { meta: { last_row_id: 1 } };
      },
    },
  ]));

  const res = await processarMetas(
    request("POST", "https://cadimus.test/api/metas", {
      categoria: "Reserva",
      valor_limite_centavos: 12345,
      data_limite: "2026-12-31",
      carteira_id: 10,
    }),
    { DB: db },
    { waitUntil() {} },
  );

  assert.equal(res.status, 200);
  assert.match(insertMeta.sql, /valor_limite_centavos/);
  assert.equal(insertMeta.args[2], 123.45);
  assert.equal(insertMeta.args[3], 12345);
  assert.equal(auditLog[1], "meta.salva");
  assert.equal(auditLog[4], 10);
});
