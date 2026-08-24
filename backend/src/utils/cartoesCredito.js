export function normalizarCartaoCreditoId(valor) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

export function deveVincularCartaoCredito(dados) {
  return dados?.tipo !== "receita" && String(dados?.meio_pagamento || "").toLowerCase() === "credito";
}

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
