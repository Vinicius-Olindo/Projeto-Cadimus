// ==========================================
// despesasFixas.js (utils) - Geração automática de lançamentos recorrentes
// ==========================================

// @ts-check

/**
 * Para cada despesa fixa ativa nas carteiras informadas, garante que exista
 * um lançamento para o mês/ano pedido. Não duplica (verifica por despesa_fixa_id)
 * e nunca gera lançamento pra um mês que ainda não começou.
 */
import { centavosParaReais, reaisParaCentavos } from "./dinheiro.ts";

/**
 * Despesa fixa como vem do banco ou dos testes.
 * @typedef {object} DespesaFixa
 * @property {number} id
 * @property {string} descricao
 * @property {number} valor
 * @property {number} [valor_centavos]
 * @property {"receita" | "despesa" | string} tipo
 * @property {string} categoria
 * @property {string} meio_pagamento
 * @property {number} dia_vencimento
 * @property {number} carteira_id
 * @property {number} criado_por
 * @property {string} criado_em
 * @property {number | null} [cartao_credito_id]
 */

/**
 * Ambiente mínimo esperado pelo utilitário.
 * @typedef {object} EnvComDB
 * @property {{ prepare: (query: string) => { bind: (...values: unknown[]) => { all: () => Promise<{ results: unknown[] }>, run: () => Promise<unknown> } } }} DB
 */

/**
 * Garante os lançamentos mensais das despesas fixas ativas para as carteiras
 * informadas, sem duplicar lançamentos já existentes.
 *
 * @param {EnvComDB} env
 * @param {Array<number | string>} carteiraIds
 * @param {number | string} ano
 * @param {number | string} mes
 * @returns {Promise<void>}
 */
export async function gerarLancamentosFixosDoMes(env, carteiraIds, ano, mes) {
  const anoNum = Number(ano);
  const mesNum = Number(mes);
  if (!anoNum || !mesNum || !carteiraIds || carteiraIds.length === 0) return;

  const { results: fixas } = await env.DB.prepare(
    `SELECT * FROM despesas_fixas WHERE ativo = 1 AND carteira_id IN (${carteiraIds.map(() => "?").join(",")})`,
  )
    .bind(...carteiraIds)
    .all();

  if (fixas.length === 0) return;

  const chaveMes = `${anoNum}-${String(mesNum).padStart(2, "0")}`;

  for (const fixa of fixas) {
    /** @type {DespesaFixa} */
    // @ts-expect-error Resultado do D1 é dinâmico e validado pelo uso dos campos abaixo.
    const despesaFixa = fixa;

    // Nunca gera retroativo: se a regra foi criada em agosto, não pode aparecer em julho
    const mesCriacao = String(despesaFixa.criado_em).slice(0, 7);
    if (chaveMes < mesCriacao) continue;

    const { results: existente } = await env.DB.prepare(`SELECT id FROM lancamentos WHERE despesa_fixa_id = ? AND strftime('%Y-%m', data_compra) = ?`)
      .bind(despesaFixa.id, chaveMes)
      .all();

    if (existente.length > 0) continue;

    // Trava entre 1 e 28 (a validação no cadastro já garante isso, aqui é só uma segunda camada de segurança)
    const diaSeguro = Math.min(Math.max(despesaFixa.dia_vencimento, 1), 28);
    const dataCompra = `${chaveMes}-${String(diaSeguro).padStart(2, "0")}`;
    const valorCentavos = despesaFixa.valor_centavos ?? reaisParaCentavos(despesaFixa.valor);
    const valor = centavosParaReais(valorCentavos);

    await env.DB.prepare(
      `INSERT INTO lancamentos (descricao, valor, valor_centavos, data_compra, tipo, categoria, meio_pagamento, status, carteira_id, criado_por, despesa_fixa_id, cartao_credito_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pendente', ?, ?, ?, ?)`,
    )
      .bind(
        despesaFixa.descricao,
        valor,
        valorCentavos,
        dataCompra,
        despesaFixa.tipo,
        despesaFixa.categoria,
        despesaFixa.meio_pagamento,
        despesaFixa.carteira_id,
        despesaFixa.criado_por,
        despesaFixa.id,
        despesaFixa.cartao_credito_id || null,
      )
      .run();
  }
}
