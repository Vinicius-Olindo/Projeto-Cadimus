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

function detalharErro(erro: unknown): string {
  if (erro instanceof Error) return erro.message;
  if (typeof erro === "string") return erro;
  return "";
}

/**
 * Converte erros técnicos conhecidos de rotas financeiras em respostas úteis e
 * seguras. O detalhe real continua apenas no log do backend.
 */
export function erroFinanceiro(
  erro: unknown,
  contexto: string,
  mensagemFallback: string,
  codigoFallback = "operacao_financeira_falhou",
): Response {
  console.error(`[${contexto}]`, erro);

  const detalhe = detalharErro(erro);

  if (/NOT NULL constraint failed/i.test(detalhe)) {
    return erroCliente("Dados obrigatórios ausentes.", 400, "dados_obrigatorios_ausentes");
  }

  if (/FOREIGN KEY constraint failed/i.test(detalhe)) {
    return erroCliente("Registro relacionado inválido para esta carteira.", 400, "referencia_financeira_invalida");
  }

  if (/CHECK constraint failed/i.test(detalhe)) {
    return erroCliente("Regra financeira bloqueada para esta operação.", 400, "regra_financeira_bloqueada");
  }

  if (/UNIQUE constraint failed/i.test(detalhe)) {
    return erroCliente("Já existe um registro com essas informações.", 409, "registro_duplicado");
  }

  return json({ erro: mensagemFallback, codigo: codigoFallback } satisfies RespostaErroApi, 500);
}
