import test from "node:test";
import assert from "node:assert/strict";

import { processarLimpezaDados } from "../src/routes/manutencao.ts";
import { hashSenha } from "../src/utils/crypto.ts";

class FakeDBManutencao {
  constructor({ senhaHash }) {
    this.senhaHash = senhaHash;
    this.runs = [];
  }

  prepare(sql) {
    const db = this;
    return {
      bind(...args) {
        return {
          async all() {
            if (/FROM sessoes/i.test(sql)) {
              return {
                results: [{
                  id: 1,
                  nome_usuario: "admin",
                  perfil: "superadmin",
                  expira_em: new Date(Date.now() + 60_000).toISOString(),
                }],
              };
            }

            return { results: [] };
          },
          async first() {
            if (/SELECT senha_hash FROM usuarios/i.test(sql)) {
              return { senha_hash: db.senhaHash };
            }

            return null;
          },
          async run() {
            db.runs.push({ sql, args });
            return { success: true };
          },
        };
      },
      async run() {
        db.runs.push({ sql, args: [] });
        return { success: true };
      },
    };
  }
}

function requestLimpeza(corpo) {
  return new Request("https://api.cadimus.test/api/admin/zerar-dados", {
    method: "POST",
    headers: {
      Authorization: "Bearer token-teste",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(corpo),
  });
}

const ctxBackground = { waitUntil() {} };

test("processarLimpezaDados recusa senha incorreta sem apagar dados", async () => {
  const env = { DB: new FakeDBManutencao({ senhaHash: await hashSenha("senha-correta") }) };

  const resposta = await processarLimpezaDados(
    requestLimpeza({ confirmacao: "APAGAR TUDO", senha: "senha-errada" }),
    env,
    ctxBackground,
  );
  const corpo = await resposta.json();

  assert.equal(resposta.status, 403);
  assert.equal(corpo.codigo, "senha_incorreta");
  assert.equal(env.DB.runs.filter((call) => /DELETE FROM (lancamentos|despesas_fixas|compras_parceladas|metas_categoria|categorias)/i.test(call.sql)).length, 0);
});

test("processarLimpezaDados apaga dados financeiros quando frase e senha estao corretas", async () => {
  const env = { DB: new FakeDBManutencao({ senhaHash: await hashSenha("senha-correta") }) };

  const resposta = await processarLimpezaDados(
    requestLimpeza({ confirmacao: "APAGAR TUDO", senha: "senha-correta" }),
    env,
    ctxBackground,
  );
  const corpo = await resposta.json();

  assert.equal(resposta.status, 200);
  assert.match(corpo.mensagem, /dados financeiros foram apagados/i);
  assert.equal(env.DB.runs.filter((call) => /DELETE FROM (lancamentos|despesas_fixas|compras_parceladas|metas_categoria|categorias)/i.test(call.sql)).length, 5);
  assert.equal(env.DB.runs.filter((call) => /INSERT INTO categorias/i.test(call.sql)).length, 9);
});
