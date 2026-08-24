// ==========================================
// lancamentosRecorrentes.ts (utils) - Geração automática de lançamentos recorrentes
// ==========================================

import type { CadimusEnv, FrequenciaRecorrencia, IdEntrada, MeioPagamento, TipoLancamento } from "../types.js";
import { reaisParaCentavos, centavosParaReais } from "./dinheiro.ts";

/**
 * Recorrência como vem do banco ou dos testes.
 */
interface LancamentoRecorrenteRow {
  id: number;
  descricao: string;
  valor: number;
  valor_centavos?: number | null;
  tipo: TipoLancamento | string;
  categoria: string;
  meio_pagamento: MeioPagamento | string;
  frequencia: FrequenciaRecorrencia | string;
  dia_semana?: number | null;
  dia_mes?: number | null;
  data_inicio: string;
  data_fim?: string | null;
  carteira_id: number;
  criado_por: number;
}

function dataIso(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate();
}

function somarDias(dataStr: string, dias: number): string {
  const data = new Date(`${dataStr}T12:00:00`);
  data.setDate(data.getDate() + dias);
  return data.toISOString().slice(0, 10);
}

function ajustarInicioSemanal(rec: LancamentoRecorrenteRow): string {
  const diaSemana = Number(rec.dia_semana);
  if (!Number.isInteger(diaSemana) || diaSemana < 0 || diaSemana > 6) return rec.data_inicio;

  const data = new Date(`${rec.data_inicio}T12:00:00`);
  const delta = (diaSemana - data.getDay() + 7) % 7;
  data.setDate(data.getDate() + delta);
  return data.toISOString().slice(0, 10);
}

function diferencaMeses(inicio: string, anoAlvo: number, mesAlvo: number): number {
  const anoInicio = Number(inicio.slice(0, 4));
  const mesInicio = Number(inicio.slice(5, 7));
  return (anoAlvo - anoInicio) * 12 + (mesAlvo - mesInicio);
}

function ocorrenciaMensal(rec: LancamentoRecorrenteRow, ano: number, mes: number, intervaloMeses: number): string[] {
  const diff = diferencaMeses(rec.data_inicio, ano, mes);
  if (diff < 0 || diff % intervaloMeses !== 0) return [];

  const diaBase = rec.dia_mes || Number(rec.data_inicio.slice(8, 10)) || 1;
  const dia = Math.min(Math.max(diaBase, 1), 28);
  const data = dataIso(ano, mes, dia);

  if (data < rec.data_inicio) return [];
  if (rec.data_fim && data > rec.data_fim) return [];

  return [data];
}

function ocorrenciasPorIntervaloDeDias(
  rec: LancamentoRecorrenteRow,
  ano: number,
  mes: number,
  intervaloDias: number,
  dataInicial = rec.data_inicio,
): string[] {
  const inicioMes = dataIso(ano, mes, 1);
  const fimMes = dataIso(ano, mes, ultimoDiaDoMes(ano, mes));
  const ocorrencias: string[] = [];

  let data = dataInicial;
  while (data <= fimMes) {
    if (data >= inicioMes && (!rec.data_fim || data <= rec.data_fim)) {
      ocorrencias.push(data);
    }
    data = somarDias(data, intervaloDias);
  }

  return ocorrencias;
}

function obterOcorrenciasDoMes(rec: LancamentoRecorrenteRow, ano: number, mes: number): string[] {
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
 */
export async function gerarLancamentosRecorrentesDoMes(env: CadimusEnv, carteiraIds: IdEntrada[], ano: IdEntrada, mes: IdEntrada): Promise<void> {
  const anoNum = Number(ano);
  const mesNum = Number(mes);
  if (!anoNum || !mesNum || !carteiraIds || carteiraIds.length === 0) return;

  const { results: recorrentes } = await env.DB.prepare(
    `SELECT * FROM lancamentos_recorrentes WHERE ativo = 1 AND carteira_id IN (${carteiraIds.map(() => "?").join(",")})`,
  )
    .bind(...carteiraIds)
    .all<LancamentoRecorrenteRow>();

  if (recorrentes.length === 0) return;

  for (const recorrente of recorrentes) {
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
