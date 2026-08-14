// ==========================================
// lancamentosRecorrentes.js (utils) - Geração automática de lançamentos recorrentes
// ==========================================
import { reaisParaCentavos, centavosParaReais } from "./dinheiro.js";

function dataIso(ano, mes, dia) {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function ultimoDiaDoMes(ano, mes) {
  return new Date(ano, mes, 0).getDate();
}

function somarDias(dataStr, dias) {
  const data = new Date(`${dataStr}T12:00:00`);
  data.setDate(data.getDate() + dias);
  return data.toISOString().slice(0, 10);
}

function ajustarInicioSemanal(rec) {
  const diaSemana = Number(rec.dia_semana);
  if (!Number.isInteger(diaSemana) || diaSemana < 0 || diaSemana > 6) return rec.data_inicio;

  const data = new Date(`${rec.data_inicio}T12:00:00`);
  const delta = (diaSemana - data.getDay() + 7) % 7;
  data.setDate(data.getDate() + delta);
  return data.toISOString().slice(0, 10);
}

function diferencaMeses(inicio, anoAlvo, mesAlvo) {
  const anoInicio = Number(inicio.slice(0, 4));
  const mesInicio = Number(inicio.slice(5, 7));
  return (anoAlvo - anoInicio) * 12 + (mesAlvo - mesInicio);
}

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

function ocorrenciasPorIntervaloDeDias(rec, ano, mes, intervaloDias, dataInicial = rec.data_inicio) {
  const inicioMes = dataIso(ano, mes, 1);
  const fimMes = dataIso(ano, mes, ultimoDiaDoMes(ano, mes));
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

function obterOcorrenciasDoMes(rec, ano, mes) {
  if (rec.data_inicio > dataIso(ano, mes, ultimoDiaDoMes(ano, mes))) return [];
  if (rec.data_fim && rec.data_fim < dataIso(ano, mes, 1)) return [];

  switch (rec.frequencia) {
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
    const ocorrencias = obterOcorrenciasDoMes(rec, anoNum, mesNum);
    if (ocorrencias.length === 0) continue;

    for (const dataCompra of ocorrencias) {
      const { results: existente } = await env.DB.prepare(
        `SELECT id FROM lancamentos WHERE recorrencia_id = ? AND data_compra = ?`,
      )
        .bind(rec.id, dataCompra)
        .all();

      if (existente.length > 0) continue;

      const valorCentavos = rec.valor_centavos ?? reaisParaCentavos(rec.valor);

      await env.DB.prepare(
        `INSERT INTO lancamentos (descricao, valor, valor_centavos, data_compra, tipo, categoria, meio_pagamento, status, carteira_id, criado_por, recorrencia_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pendente', ?, ?, ?)`,
      )
        .bind(rec.descricao, centavosParaReais(valorCentavos), valorCentavos, dataCompra, rec.tipo, rec.categoria, rec.meio_pagamento, rec.carteira_id, rec.criado_por, rec.id)
        .run();
    }
  }
}
