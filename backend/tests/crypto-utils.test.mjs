import test from "node:test";
import assert from "node:assert/strict";

import { hashSenha, verificarSenha } from "../src/utils/crypto.js";

test("hashSenha gera hash PBKDF2 verificável", async () => {
  const hash = await hashSenha("senha-segura-123");

  assert.match(hash, /^100000:[a-f0-9]{32}:[a-f0-9]{64}$/);
  assert.equal(await verificarSenha("senha-segura-123", hash), true);
  assert.equal(await verificarSenha("senha-errada", hash), false);
});

test("verificarSenha recusa hash ausente ou formato inválido", async () => {
  assert.equal(await verificarSenha("senha", null), false);
  assert.equal(await verificarSenha("senha", ""), false);
  assert.equal(await verificarSenha("senha", "formato-invalido"), false);
  assert.equal(await verificarSenha("senha", "0:abcd:1234"), false);
});
