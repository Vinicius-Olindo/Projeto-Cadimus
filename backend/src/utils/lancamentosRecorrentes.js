// ==========================================
// lancamentosRecorrentes.js (utils) - Geração automática de lançamentos recorrentes
// ==========================================

// @ts-check

import { reaisParaCentavos, centavosParaReais } from "./dinheiro.js";

/**
 * Recorrência como vem do banco ou dos testes.
 * @typedef {object} LancamentoRecorrente
 * @property {number} id
 * @property {string} descricao
 * @property {number} valor
 * @property {number} [valor_centavos]
 * @property {"receita" | "despesa" | string} tipo
 * @property {string} categoria
 * @property {string} meio_pagamento
 * @property {"diaria" | "semanal" | "quinzenal" | "mensal" | "trimestral" | "anual" | string} frequencia
 * @property {number | null} [dia_semana]
 * @property {number | null} [dia_mes]
 * @property {string} data_inicio
 * @property {string | null} [data_fim]
 * @property {number} carteira_id
 * @property {number} criado_por
 */

/**
 * Ambiente mínimo esperado pelo utilitário.
 * @typedef {object} EnvComDB
 * @property {{ prepare: (query: string) => { bind: (...values: unknown[]) => { all: () => Promise<{ results: unknown[] }>, run: () => Promise<unknown> } } }} DB
 */

/**
 * @param {number} ano
 * @param {number} mes
 * @param {number} dia
 * @returns {string}
 */
function dataIso(ano, mes, dia) {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/**
 * @param {number} ano
 * @param {number} mes
 * @returns {number}
 */
function ultimoDiaDoMes(ano, mes) {
  return new Date(ano, mes, 0).getDate();
}

/**
 * @param {string} dataStr
 * @param {number} dias
 * @returns {string}
 */
function somarDias(dataStr, dias) {
  const data = new Date(`${dataStr}T12:00:00`);
  data.setDate(data.getDate() + dias);
  return data.toISOString().slice(0, 10);
}

/**
 * @param {LancamentoRecorrente} rec
 * @returns {string}
 */
function ajustarInicioSemanal(rec) {
  const diaSemana = Number(rec.dia_semana);
  if (!Number.isInteger(diaSemana) || diaSemana < 0 || diaSemana > 6) return rec.data_inicio;

  const data = new Date(`${rec.data_inicio}T12:00:00`);
  const delta = (diaSemana - data.getDay() + 7) % 7;
  data.setDate(data.getDate() + delta);
  return data.toISOString().slice(0, 10);
}

/**
 * @param {string} inicio
 * @param {number} anoAlvo
 * @param {number} mesAlvo
 * @returns {number}
 */
function diferencaMeses(inicio, anoAlvo, mesAlvo) {
  const anoInicio = Number(inicio.slice(0, 4));
  const mesInicio = Number(inicio.slice(5, 7));
  return (anoAlvo - anoInicio) * 12 + (mesAlvo - mesInicio);
}

/**
 * @param {LancamentoRecorrente} rec
 * @param {number} ano
 * @param {number} mes
 * @param {number} intervaloMeses
 * @returns {string[]}
 */
function ocorrenciaMensal(rec, ano, mes, intervaloMeses) {
  const diff = diferencaMeses(rec.data_inicio, ano, mes);
  if (diff < 0 || diff % intervaloMeses !== 0) return [];

  const diaBase = rec.dia_mes || Number(rec.data_inicio.slice(8, 10)) || 1;
  const dia = Math.min(Math.max(diaBase, 1), 28);
  const data = dataIso(ano, mes, dia);

  if (data < rec.data_inicio) return [];
  if (rec.data_fim && data > rec.data_fim) return [];

  return [data];
}

/**
 * @param {LancamentoRecorrente} rec
 * @param {number} ano
 * @param {number} mes
 * @param {number} intervaloDias
 * @param {string} [dataInicial]
 * @returns {string[]}
 */
function ocorrenciasPorIntervaloDeDias(rec, ano, mes, intervaloDias, dataInicial = rec.data_inicio) {
  const inicioMes = dataIso(ano, mes, 1);
  const fimMes = dataIso(ano, mes, ultimoDiaDoMes(ano, mes));
  /** @type {string[]} */
  const ocorrencias = [];

  let data = dataInicial;
  while (data <= fimMes) {
    if (data >= inicioMes && (!rec.data_fim || data <= rec.data_fim)) {
      ocorrencias.push(data);
    }
    data = somarDias(data, intervaloDias);
  }

  return ocorrencias;
}

/**
 * @param {LancamentoRecorrente} rec
 * @param {number} ano
 * @param {number} mes
 * @returns {string[]}
 */
function obterOcorrenciasDoMes(rec, ano, mes) {
  if (rec.data_inicio > dataIso(ano, mes, ultimoDiaDoMes(ano, mes))) return [];
  if (rec.data_fim && rec.data_fim < dataIso(ano, mes, 1)) return [];

  switch (rec.frequencia) {
    case "diaria":
      return ocorrenciasPorIntervaloDeDias(rec, ano, mes, 1);
    case "semanal":
      return ocorrenciasPorIntervaloDeDias(rec, ano, mes, 7, ajustarInicioSemanal(rec));
    case "quinzenal":
      return ocorrenciasPorIntervaloDeDias(rec, ano, mes, 14);
    case "mensal":
      return ocorrenciaMensal(rec, ano, mes, 1);
    case "trimestral":
      return ocorrenciaMensal(rec, ano, mes, 3);
    case "anual":
      return ocorrenciaMensal(rec, ano, mes, 12);
    default:
      return [];
  }
}

/**
 * Para cada recorrência ativa, garante que todos os lançamentos esperados do
 * mês consultado existam. A idempotência é por recorrência + data exata.
 *
 * @param {EnvComDB} env
 * @param {Array<number | string>} carteiraIds
 * @param {number | string} ano
 * @param {number | string} mes
 * @returns {Promise<void>}
 */
export async function gerarLancamentosRecorrentesDoMes(env, carteiraIds, ano, mes) {
  const anoNum = Number(ano);
  const mesNum = Number(mes);
  if (!anoNum || !mesNum || !carteiraIds || carteiraIds.length === 0) return;

  const { results: recorrentes } = await env.DB.prepare(
    `SELECT * FROM lancamentos_recorrentes WHERE ativo = 1 AND carteira_id IN (${carteiraIds.map(() => "?").join(",")})`,
  )
    .bind(...carteiraIds)
    .all();

  if (recorrentes.length === 0) return;

  for (const rec of recorrentes) {
    /** @type {LancamentoRecorrente} */
    // @ts-expect-error Resultado do D1 é dinâmico e validado pelo uso dos campos abaixo.
    const recorrente = rec;
    const ocorrencias = obterOcorrenciasDoMes(recorrente, anoNum, mesNum);
    if (ocorrencias.length === 0) continue;

    for (const dataCompra of ocorrencias) {
      const { results: existente } = await env.DB.prepare(
        `SELECT id FROM lancamentos WHERE recorrencia_id = ? AND data_compra = ?`,
      )
        .bind(recorrente.id, dataCompra)
        .all();

      if (existente.length > 0) continue;

      const valorCentavos = recorrente.valor_centavos ?? reaisParaCentavos(recorrente.valor);

      await env.DB.prepare(
        `INSERT INTO lancamentos (descricao, valor, valor_centavos, data_compra, tipo, categoria, meio_pagamento, status, carteira_id, criado_por, recorrencia_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pendente', ?, ?, ?)`,
      )
        .bind(
          recorrente.descricao,
          centavosParaReais(valorCentavos),
          valorCentavos,
          dataCompra,
          recorrente.tipo,
          recorrente.categoria,
          recorrente.meio_pagamento,
          recorrente.carteira_id,
          recorrente.criado_por,
          recorrente.id,
        )
        .run();
    }
  }
}
