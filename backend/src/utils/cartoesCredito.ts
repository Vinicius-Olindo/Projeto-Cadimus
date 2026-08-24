import type { CadimusEnv, IdEntrada, MeioPagamento, TipoLancamento } from "../types.js";

/**
 * Entrada aceita para IDs de cartão vindos de forms, JSON ou banco.
 */
export type CartaoCreditoIdEntrada = IdEntrada | null | undefined;

/**
 * Payload mínimo usado para decidir vínculo com cartão.
 */
export interface DadosPagamento {
  tipo?: TipoLancamento | string;
  meio_pagamento?: MeioPagamento | string;
}

/**
 * Normaliza o ID do cartão para inteiro positivo ou `null`.
 */
export function normalizarCartaoCreditoId(valor: CartaoCreditoIdEntrada): number | null {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

/**
 * Cartão só pode ser vinculado quando o lançamento não é receita
 * e o meio de pagamento é crédito.
 */
export function deveVincularCartaoCredito(dados: DadosPagamento | null | undefined): boolean {
  return dados?.tipo !== "receita" && String(dados?.meio_pagamento || "").toLowerCase() === "credito";
}

/**
 * Garante que o cartão informado existe, está ativo e pertence à carteira.
 */
export async function validarCartaoCreditoDaCarteira(
  env: CadimusEnv,
  cartaoId: CartaoCreditoIdEntrada,
  carteiraId: number | string,
): Promise<number | false | null> {
  const id = normalizarCartaoCreditoId(cartaoId);
  if (!id) return null;

  const { results } = await env.DB.prepare(
    `SELECT id FROM cartoes_credito WHERE id = ? AND carteira_id = ? AND ativo = 1`,
  )
    .bind(id, Number(carteiraId))
    .all();

  return results.length > 0 ? id : false;
}
