// ==========================================
// respostas.ts - Respostas JSON padronizadas para rotas
// ==========================================

import type { RespostaErroApi } from "../types.js";

export function json(dados: unknown, status = 200): Response {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export function erroCliente(mensagem: string, status = 400, codigo = "erro_validacao"): Response {
  return json({ erro: mensagem, codigo } satisfies RespostaErroApi, status);
}

/**
 * Resposta para falhas inesperadas. O detalhe fica no log; o cliente recebe
 * uma mensagem segura, com código estável para debug/telemetria.
 */
export function erroInterno(erro: unknown, contexto: string, mensagem: string, codigo = "erro_interno"): Response {
  console.error(`[${contexto}]`, erro);
  return json({ erro: mensagem, codigo } satisfies RespostaErroApi, 500);
}
