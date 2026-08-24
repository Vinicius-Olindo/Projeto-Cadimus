// ==========================================
// comprasParceladas.ts (utils) - Geração das parcelas
// ==========================================

import type { CadimusEnv, IdEntrada, MeioPagamento } from "../types.js";
import { centavosParaReais, reaisParaCentavos } from "./dinheiro.ts";

/**
 * Compra parcelada como vem do banco ou dos testes.
 */
export interface CompraParcelada {
  id: number;
  descricao: string;
  total_parcelas: number;
  valor_total?: number;
  valor_total_centavos?: number | null;
  valor_parcela?: number;
  valor_parcela_centavos?: number | null;
  dia_vencimento: number;
  mes_inicio: number;
  ano_inicio: number;
  categoria: string;
  meio_pagamento: MeioPagamento | string;
  carteira_id: number;
  criado_por: number;
  cartao_credito_id?: number | null;
}

/**
 * Calcula a parcela em centavos preservando exatamente o total.
 * Se houver sobra de centavos, ela fica na última parcela.
 */
export function calcularValorParcelaCentavos(compra: CompraParcelada, numeroParcela: number): number {
  const totalParcelas = Number(compra.total_parcelas);
  const valorTotalCentavos = Number.isInteger(compra.valor_total_centavos)
    ? compra.valor_total_centavos
    : compra.valor_total !== undefined
      ? reaisParaCentavos(compra.valor_total)
      : null;
  const valorTotalCentavosValido = typeof valorTotalCentavos === "number" && Number.isInteger(valorTotalCentavos)
    ? valorTotalCentavos
    : null;

  if (!Number.isInteger(totalParcelas) || totalParcelas <= 0 || valorTotalCentavosValido === null || valorTotalCentavosValido <= 0) {
    const valorParcelaCentavos = compra.valor_parcela_centavos;
    return typeof valorParcelaCentavos === "number" && Number.isInteger(valorParcelaCentavos)
      ? valorParcelaCentavos
      : reaisParaCentavos(compra.valor_parcela);
  }

  const centavosBase = Math.floor(valorTotalCentavosValido / totalParcelas);
  return numeroParcela === totalParcelas
    ? valorTotalCentavosValido - centavosBase * (totalParcelas - 1)
    : centavosBase;
}

/**
 * Gera de uma vez todas as parcelas de uma compra parcelada recém-criada.
 * Idempotente: não duplica parcelas se elas já existirem.
 */
export async function gerarTodasParcelasDaCompra(env: CadimusEnv, compraId: IdEntrada): Promise<void> {
  const { results } = await env.DB.prepare(`SELECT * FROM compras_parceladas WHERE id = ?`).bind(compraId).all<CompraParcelada>();
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
       (descricao, valor, valor_centavos, data_compra, tipo, categoria, meio_pagamento, status, carteira_id, criado_por, compra_parcelada_id, numero_parcela, cartao_credito_id)
       VALUES (?, ?, ?, ?, 'despesa', ?, ?, 'pendente', ?, ?, ?, ?, ?)`,
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
        compra.cartao_credito_id || null,
      )
      .run();
  }
}

/**
 * Rede de segurança: garante que as parcelas do mês pedido existam, caso a
 * criação original tenha falhado ou seja de um registro antigo.
 */
export async function gerarLancamentosParceladosDoMes(env: CadimusEnv, carteiraIds: IdEntrada[], ano: IdEntrada, mes: IdEntrada): Promise<void> {
  const anoNum = Number(ano);
  const mesNum = Number(mes);
  if (!anoNum || !mesNum || !carteiraIds || carteiraIds.length === 0) return;

  const { results: compras } = await env.DB.prepare(
    `SELECT * FROM compras_parceladas WHERE ativo = 1 AND carteira_id IN (${carteiraIds.map(() => "?").join(",")})`,
  )
    .bind(...carteiraIds)
    .all<CompraParcelada>();

  if (compras.length === 0) return;

  const chaveMes = `${anoNum}-${String(mesNum).padStart(2, "0")}`;

  for (const compraParcelada of compras) {
    const numeroParcela = (anoNum - compraParcelada.ano_inicio) * 12 + (mesNum - compraParcelada.mes_inicio) + 1;

    if (numeroParcela < 1 || numeroParcela > compraParcelada.total_parcelas) continue;

    const { results: existente } = await env.DB.prepare(`SELECT id FROM lancamentos WHERE compra_parcelada_id = ? AND numero_parcela = ?`)
      .bind(compraParcelada.id, numeroParcela)
      .all();

    if (existente.length > 0) continue;

    const diaSeguro = Math.min(Math.max(compraParcelada.dia_vencimento, 1), 28);
    const dataCompra = `${chaveMes}-${String(diaSeguro).padStart(2, "0")}`;
    const descricaoComParcela = `${compraParcelada.descricao} (${numeroParcela}/${compraParcelada.total_parcelas})`;
    const valorCentavos = calcularValorParcelaCentavos(compraParcelada, numeroParcela);

    await env.DB.prepare(
      `INSERT INTO lancamentos
       (descricao, valor, valor_centavos, data_compra, tipo, categoria, meio_pagamento, status, carteira_id, criado_por, compra_parcelada_id, numero_parcela, cartao_credito_id)
       VALUES (?, ?, ?, ?, 'despesa', ?, ?, 'pendente', ?, ?, ?, ?, ?)`,
    )
      .bind(
        descricaoComParcela,
        centavosParaReais(valorCentavos),
        valorCentavos,
        dataCompra,
        compraParcelada.categoria,
        compraParcelada.meio_pagamento,
        compraParcelada.carteira_id,
        compraParcelada.criado_por,
        compraParcelada.id,
        numeroParcela,
        compraParcelada.cartao_credito_id || null,
      )
      .run();
  }
}
