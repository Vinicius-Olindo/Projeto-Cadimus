// ==========================================
// comprasParceladas.js (utils) - Geração das parcelas
// ==========================================

import { centavosParaReais, reaisParaCentavos } from "./dinheiro.js";

function calcularValorParcelaCentavos(compra, numeroParcela) {
  const totalParcelas = Number(compra.total_parcelas);
  const valorTotalCentavos = Number.isInteger(compra.valor_total_centavos)
    ? compra.valor_total_centavos
    : reaisParaCentavos(compra.valor_total);

  if (!Number.isInteger(totalParcelas) || totalParcelas <= 0 || !Number.isInteger(valorTotalCentavos) || valorTotalCentavos <= 0) {
    return Number.isInteger(compra.valor_parcela_centavos)
      ? compra.valor_parcela_centavos
      : reaisParaCentavos(compra.valor_parcela);
  }

  const centavosBase = Math.floor(valorTotalCentavos / totalParcelas);
  return numeroParcela === totalParcelas
    ? valorTotalCentavos - centavosBase * (totalParcelas - 1)
    : centavosBase;
}

function calcularValorParcela(compra, numeroParcela) {
  return centavosParaReais(calcularValorParcelaCentavos(compra, numeroParcela));
}

/**
 * Gera de uma vez todas as parcelas de uma compra parcelada recém-criada.
 * Idempotente: não duplica parcelas se elas já existirem.
 */
export async function gerarTodasParcelasDaCompra(env, compraId) {
  const { results } = await env.DB.prepare(`SELECT * FROM compras_parceladas WHERE id = ?`).bind(compraId).all();
  if (results.length === 0) return;

  const compra = results[0];
  const diaSeguro = Math.min(Math.max(compra.dia_vencimento, 1), 28);

  for (let numeroParcela = 1; numeroParcela <= compra.total_parcelas; numeroParcela++) {
    const { results: existente } = await env.DB.prepare(`SELECT id FROM lancamentos WHERE compra_parcelada_id = ? AND numero_parcela = ?`)
      .bind(compra.id, numeroParcela)
      .all();

    if (existente.length > 0) continue;

    let mes = compra.mes_inicio + (numeroParcela - 1);
    let ano = compra.ano_inicio;
    while (mes > 12) {
      mes -= 12;
      ano += 1;
    }

    const dataCompra = `${ano}-${String(mes).padStart(2, "0")}-${String(diaSeguro).padStart(2, "0")}`;
    const descricaoComParcela = `${compra.descricao} (${numeroParcela}/${compra.total_parcelas})`;
    const valorCentavos = calcularValorParcelaCentavos(compra, numeroParcela);

    await env.DB.prepare(
      `INSERT INTO lancamentos
       (descricao, valor, valor_centavos, data_compra, tipo, categoria, meio_pagamento, status, carteira_id, criado_por, compra_parcelada_id, numero_parcela)
       VALUES (?, ?, ?, ?, 'despesa', ?, ?, 'pendente', ?, ?, ?, ?)`,
    )
      .bind(
        descricaoComParcela,
        centavosParaReais(valorCentavos),
        valorCentavos,
        dataCompra,
        compra.categoria,
        compra.meio_pagamento,
        compra.carteira_id,
        compra.criado_por,
        compra.id,
        numeroParcela,
      )
      .run();
  }
}

/**
 * Rede de segurança: garante que as parcelas do mês pedido existam, caso a
 * criação original tenha falhado ou seja de um registro antigo.
 */
export async function gerarLancamentosParceladosDoMes(env, carteiraIds, ano, mes) {
  const anoNum = Number(ano);
  const mesNum = Number(mes);
  if (!anoNum || !mesNum || !carteiraIds || carteiraIds.length === 0) return;

  const { results: compras } = await env.DB.prepare(
    `SELECT * FROM compras_parceladas WHERE ativo = 1 AND carteira_id IN (${carteiraIds.map(() => "?").join(",")})`,
  )
    .bind(...carteiraIds)
    .all();

  if (compras.length === 0) return;

  const chaveMes = `${anoNum}-${String(mesNum).padStart(2, "0")}`;

  for (const compra of compras) {
    const numeroParcela = (anoNum - compra.ano_inicio) * 12 + (mesNum - compra.mes_inicio) + 1;

    if (numeroParcela < 1 || numeroParcela > compra.total_parcelas) continue;

    const { results: existente } = await env.DB.prepare(`SELECT id FROM lancamentos WHERE compra_parcelada_id = ? AND numero_parcela = ?`)
      .bind(compra.id, numeroParcela)
      .all();

    if (existente.length > 0) continue;

    const diaSeguro = Math.min(Math.max(compra.dia_vencimento, 1), 28);
    const dataCompra = `${chaveMes}-${String(diaSeguro).padStart(2, "0")}`;
    const descricaoComParcela = `${compra.descricao} (${numeroParcela}/${compra.total_parcelas})`;
    const valorCentavos = calcularValorParcelaCentavos(compra, numeroParcela);

    await env.DB.prepare(
      `INSERT INTO lancamentos
       (descricao, valor, valor_centavos, data_compra, tipo, categoria, meio_pagamento, status, carteira_id, criado_por, compra_parcelada_id, numero_parcela)
       VALUES (?, ?, ?, ?, 'despesa', ?, ?, 'pendente', ?, ?, ?, ?)`,
    )
      .bind(
        descricaoComParcela,
        centavosParaReais(valorCentavos),
        valorCentavos,
        dataCompra,
        compra.categoria,
        compra.meio_pagamento,
        compra.carteira_id,
        compra.criado_por,
        compra.id,
        numeroParcela,
      )
      .run();
  }
}
