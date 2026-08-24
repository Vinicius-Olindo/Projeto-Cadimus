import test from "node:test";
import assert from "node:assert/strict";

import { enviarEmail, templateRecuperacaoSenha } from "../src/utils/email.ts";

test("enviarEmail não chama provedor quando RESEND_API_KEY não está configurada", async () => {
  const fetchOriginal = globalThis.fetch;
  const consoleErrorOriginal = console.error;
  let chamado = false;
  globalThis.fetch = async () => {
    chamado = true;
    return new Response("", { status: 200 });
  };
  console.error = () => {};

  try {
    const resultado = await enviarEmail({}, {
      para: "teste@cadimus.local",
      assunto: "Teste",
      html: "<p>Teste</p>",
    });

    assert.deepEqual(resultado, { ok: false, motivo: "email_nao_configurado" });
    assert.equal(chamado, false);
  } finally {
    globalThis.fetch = fetchOriginal;
    console.error = consoleErrorOriginal;
  }
});

test("enviarEmail monta payload esperado para Resend", async () => {
  const fetchOriginal = globalThis.fetch;
  let requisicao;
  globalThis.fetch = async (url, init) => {
    requisicao = { url, init };
    return new Response("{}", { status: 200 });
  };

  try {
    const resultado = await enviarEmail({
      RESEND_API_KEY: "re_teste",
      EMAIL_REMETENTE: "Cadimus <noreply@cadimus.local>",
    }, {
      para: "usuario@cadimus.local",
      assunto: "Recuperação",
      html: "<p>Olá</p>",
    });

    assert.deepEqual(resultado, { ok: true });
    assert.equal(requisicao.url, "https://api.resend.com/emails");
    assert.equal(requisicao.init.method, "POST");
    assert.equal(requisicao.init.headers.Authorization, "Bearer re_teste");
    assert.deepEqual(JSON.parse(requisicao.init.body), {
      from: "Cadimus <noreply@cadimus.local>",
      to: ["usuario@cadimus.local"],
      subject: "Recuperação",
      html: "<p>Olá</p>",
    });
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});

test("enviarEmail retorna falha padronizada quando Resend rejeita", async () => {
  const fetchOriginal = globalThis.fetch;
  const consoleErrorOriginal = console.error;
  globalThis.fetch = async () => new Response("erro", { status: 500 });
  console.error = () => {};

  try {
    assert.deepEqual(await enviarEmail({
      RESEND_API_KEY: "re_teste",
    }, {
      para: "usuario@cadimus.local",
      assunto: "Teste",
      html: "<p>Teste</p>",
    }), { ok: false, motivo: "falha_no_envio" });
  } finally {
    globalThis.fetch = fetchOriginal;
    console.error = consoleErrorOriginal;
  }
});

test("templateRecuperacaoSenha inclui link de redefinição", () => {
  const html = templateRecuperacaoSenha("https://cadimus.test/redefinir?token=abc");

  assert.match(html, /Recuperação de senha/);
  assert.match(html, /https:\/\/cadimus\.test\/redefinir\?token=abc/);
  assert.match(html, /30 minutos/);
});
