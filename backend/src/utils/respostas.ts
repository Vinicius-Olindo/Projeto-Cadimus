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

type ErroTraduzido = {
  mensagem: string;
  codigo: string;
  status?: number;
};

function traduzirCampoObrigatorio(detalhe: string): ErroTraduzido | null {
  const mapaCampos: Array<[RegExp, ErroTraduzido]> = [
    [/\.carteira_id\b/i, { mensagem: "Carteira inválida ou não informada.", codigo: "carteira_invalida" }],
    [/\.cartao_credito_id\b/i, { mensagem: "Cartão de crédito inválido para esta carteira.", codigo: "cartao_credito_invalido" }],
    [/\.descricao\b/i, { mensagem: "Informe uma descrição.", codigo: "descricao_obrigatoria" }],
    [/\.categoria\b/i, { mensagem: "Escolha uma categoria.", codigo: "categoria_obrigatoria" }],
    [/\.meio_pagamento\b/i, { mensagem: "Escolha um meio de pagamento.", codigo: "meio_pagamento_obrigatorio" }],
    [/\.data_compra\b|\.data_inicio\b/i, { mensagem: "Informe uma data válida.", codigo: "data_obrigatoria" }],
    [/\.frequencia\b/i, { mensagem: "Frequência inválida.", codigo: "frequencia_invalida" }],
    [/\.valor\b|\.valor_centavos\b|\.valor_total\b|\.valor_total_centavos\b|\.limite\b|\.limite_centavos\b/i, {
      mensagem: "Informe um valor válido.",
      codigo: "valor_invalido",
    }],
  ];

  return mapaCampos.find(([padrao]) => padrao.test(detalhe))?.[1] ?? null;
}

function traduzirRegraBloqueada(detalhe: string): ErroTraduzido | null {
  const mapaRegras: Array<[RegExp, ErroTraduzido]> = [
    [/status/i, { mensagem: "Status inválido.", codigo: "status_invalido" }],
    [/\btipo\b/i, { mensagem: "Tipo inválido.", codigo: "tipo_invalido" }],
    [/frequencia/i, { mensagem: "Frequência inválida.", codigo: "frequencia_invalida" }],
    [/dia_|data_/i, { mensagem: "Data ou frequência inválida.", codigo: "data_frequencia_invalida" }],
    [/cartao_credito|cartoes_credito/i, { mensagem: "Cartão de crédito inválido para esta carteira.", codigo: "cartao_credito_invalido" }],
    [/valor|centavos|limite/i, { mensagem: "Regra financeira bloqueada: confira os valores informados.", codigo: "valor_financeiro_invalido" }],
  ];

  return mapaRegras.find(([padrao]) => padrao.test(detalhe))?.[1] ?? null;
}

function traduzirReferenciaInvalida(detalhe: string): ErroTraduzido | null {
  const mapaReferencias: Array<[RegExp, ErroTraduzido]> = [
    [/cartao_credito|cartoes_credito/i, { mensagem: "Cartão de crédito inválido para esta carteira.", codigo: "cartao_credito_invalido" }],
    [/carteira|carteiras/i, { mensagem: "Carteira inválida ou sem acesso.", codigo: "carteira_invalida" }],
    [/categoria|categorias/i, { mensagem: "Categoria inválida. Escolha uma categoria existente.", codigo: "categoria_invalida" }],
    [/usuario|usuarios|criado_por/i, { mensagem: "Usuário inválido para esta operação.", codigo: "usuario_invalido" }],
  ];

  return mapaReferencias.find(([padrao]) => padrao.test(detalhe))?.[1] ?? null;
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
    const campoObrigatorio = traduzirCampoObrigatorio(detalhe);
    if (campoObrigatorio) {
      return erroCliente(campoObrigatorio.mensagem, campoObrigatorio.status ?? 400, campoObrigatorio.codigo);
    }

    return erroCliente("Dados obrigatórios ausentes.", 400, "dados_obrigatorios_ausentes");
  }

  if (/FOREIGN KEY constraint failed/i.test(detalhe)) {
    const referenciaInvalida = traduzirReferenciaInvalida(detalhe);
    if (referenciaInvalida) {
      return erroCliente(referenciaInvalida.mensagem, referenciaInvalida.status ?? 400, referenciaInvalida.codigo);
    }

    return erroCliente("Registro relacionado inválido para esta carteira.", 400, "referencia_financeira_invalida");
  }

  if (/CHECK constraint failed/i.test(detalhe)) {
    const regraBloqueada = traduzirRegraBloqueada(detalhe);
    if (regraBloqueada) {
      return erroCliente(regraBloqueada.mensagem, regraBloqueada.status ?? 400, regraBloqueada.codigo);
    }

    return erroCliente("Regra financeira bloqueada para esta operação.", 400, "regra_financeira_bloqueada");
  }

  if (/UNIQUE constraint failed/i.test(detalhe)) {
    return erroCliente("Já existe um registro com essas informações.", 409, "registro_duplicado");
  }

  return json({ erro: mensagemFallback, codigo: codigoFallback } satisfies RespostaErroApi, 500);
}
