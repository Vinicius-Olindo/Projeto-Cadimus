// @ts-check

/**
 * Entrada aceita para IDs de cartão vindos de forms, JSON ou banco.
 * @typedef {number | string | null | undefined} CartaoCreditoIdEntrada
 */

/**
 * Payload mínimo usado para decidir vínculo com cartão.
 * @typedef {object} DadosPagamento
 * @property {string} [tipo]
 * @property {string} [meio_pagamento]
 */

/**
 * Ambiente mínimo esperado pelas rotas utilitárias.
 * @typedef {object} EnvComDB
 * @property {{ prepare: (query: string) => { bind: (...values: unknown[]) => { all: () => Promise<{ results: unknown[] }> } } }} DB
 */

/**
 * Normaliza o ID do cartão para inteiro positivo ou `null`.
 *
 * @param {CartaoCreditoIdEntrada} valor
 * @returns {number | null}
 */
export function normalizarCartaoCreditoId(valor) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

/**
 * Cartão só pode ser vinculado quando o lançamento não é receita
 * e o meio de pagamento é crédito.
 *
 * @param {DadosPagamento | null | undefined} dados
 * @returns {boolean}
 */
export function deveVincularCartaoCredito(dados) {
  return dados?.tipo !== "receita" && String(dados?.meio_pagamento || "").toLowerCase() === "credito";
}

/**
 * Garante que o cartão informado existe, está ativo e pertence à carteira.
 *
 * @param {EnvComDB} env
 * @param {CartaoCreditoIdEntrada} cartaoId
 * @param {number | string} carteiraId
 * @returns {Promise<number | false | null>}
 */
export async function validarCartaoCreditoDaCarteira(env, cartaoId, carteiraId) {
  const id = normalizarCartaoCreditoId(cartaoId);
  if (!id) return null;

  const { results } = await env.DB.prepare(
    `SELECT id FROM cartoes_credito WHERE id = ? AND carteira_id = ? AND ativo = 1`
  )
    .bind(id, Number(carteiraId))
    .all();

  return results.length > 0 ? id : false;
}
