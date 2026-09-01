// ==========================================
// entries-state.js - Estado e cache dos lançamentos
// ==========================================

let ultimaRequisicaoLancamentos = 0;
let ultimoLoteLancamentos = [];
let ultimoLoteTransferencias = [];
let termoBuscaAtual = "";

const cachePeriodoLancamentos = new Map();
const LIMITE_CACHE_PERIODO_LANCAMENTOS = 8;

function obterChavePeriodoLancamentos(carteiraId, filtrosLancamentos = {}) {
  return [
    carteiraId || "sem-carteira",
    filtrosLancamentos.ano || "todos-anos",
    filtrosLancamentos.mes || "todos-meses",
  ].join(":");
}

function gravarCachePeriodoLancamentos(chave, lancamentos, transferencias) {
  if (!chave) return;
  cachePeriodoLancamentos.set(chave, {
    lancamentos: Array.isArray(lancamentos) ? [...lancamentos] : [],
    transferencias: Array.isArray(transferencias) ? [...transferencias] : [],
  });

  while (cachePeriodoLancamentos.size > LIMITE_CACHE_PERIODO_LANCAMENTOS) {
    const primeiraChave = cachePeriodoLancamentos.keys().next().value;
    cachePeriodoLancamentos.delete(primeiraChave);
  }
}

function atualizarCachePeriodoAtualLancamentos() {
  const carteiraId = document.getElementById("seletor-carteira")?.value;
  const inputMes = document.getElementById("filtro-mes")?.value || "";
  const filtros = {};

  if (inputMes) {
    const [ano, mes] = inputMes.split("-");
    filtros.ano = ano;
    filtros.mes = mes;
  }

  gravarCachePeriodoLancamentos(
    obterChavePeriodoLancamentos(carteiraId, filtros),
    ultimoLoteLancamentos,
    ultimoLoteTransferencias,
  );
}

function lancamentoPertenceAoPeriodoAtual(lancamento) {
  const inputMes = document.getElementById("filtro-mes")?.value || "";
  if (!inputMes) return true;
  return String(lancamento?.data_compra || "").startsWith(inputMes);
}

function ordenarLancamentosLocais() {
  ultimoLoteLancamentos.sort((a, b) => {
    const dataA = String(a?.data_compra || "");
    const dataB = String(b?.data_compra || "");
    const comparacaoData = dataB.localeCompare(dataA);
    if (comparacaoData !== 0) return comparacaoData;
    return Number(b?.id || 0) - Number(a?.id || 0);
  });
}
