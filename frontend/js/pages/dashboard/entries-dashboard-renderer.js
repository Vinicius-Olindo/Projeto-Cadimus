// ==========================================
// entries-dashboard-renderer.js - Renderização do dashboard de lançamentos
// ==========================================

let atualizacaoGraficaTimer = null;

function atualizarDescricoesResumo({ totalReceitas = 0, totalDespesas = 0, totalPendente = 0, saldoCalculado = 0 } = {}) {
  const receitasDesc = document.getElementById("receitas-desc");
  const despesasDesc = document.getElementById("despesas-desc");
  const pendenteDesc = document.getElementById("pendente-desc");
  const saldoDesc = document.getElementById("saldo-desc");

  if (receitasDesc) {
    receitasDesc.textContent = totalReceitas > 0
      ? "Entradas pagas neste período."
      : "Nenhuma entrada paga no período.";
  }

  if (despesasDesc) {
    despesasDesc.textContent = totalDespesas > 0
      ? "Saídas do período, pagas e pendentes."
      : "Nenhuma saída no período.";
  }

  if (pendenteDesc) {
    pendenteDesc.textContent = totalPendente > 0
      ? "Compromissos pendentes neste período."
      : "Nenhum compromisso pendente.";
  }

  if (saldoDesc) {
    if (saldoCalculado > 0) {
      saldoDesc.textContent = "Período fechando positivo.";
    } else if (saldoCalculado < 0) {
      saldoDesc.textContent = "Período fechando negativo.";
    } else {
      saldoDesc.textContent = "Receitas menos despesas e transferências.";
    }
  }
}

function calcularResumoLancamentosLocal(lancamentos = ultimoLoteLancamentos) {
  const carteiraIdNum = Number(document.getElementById("seletor-carteira")?.value || 0);
  let totalReceitas = 0;
  let totalDespesas = 0;
  let totalPendente = 0;
  let totalTransferenciasSaida = 0;
  let totalTransferenciasEntrada = 0;
  const totaisPorCategoria = {};

  lancamentos.forEach((lancamento) => {
    const valor = valorMonetario(lancamento);

    if (lancamento.tipo === "receita") {
      if (lancamento.status !== "pago") return;
      totalReceitas += valor;
    } else {
      totalDespesas += valor;
      totaisPorCategoria[lancamento.categoria] = (totaisPorCategoria[lancamento.categoria] || 0) + valor;
      if (lancamento.status !== "pago") totalPendente += valor;
    }
  });

  ultimoLoteTransferencias.forEach((transferencia) => {
    const valor = valorMonetario(transferencia);
    if (Number(transferencia.carteira_origem_id) === carteiraIdNum) totalTransferenciasSaida += valor;
    if (Number(transferencia.carteira_destino_id) === carteiraIdNum) totalTransferenciasEntrada += valor;
  });

  return {
    totalReceitas,
    totalDespesas,
    totalPendente,
    totalTransferenciasSaida,
    totalTransferenciasEntrada,
    saldoCalculado: totalReceitas - totalDespesas - totalTransferenciasSaida + totalTransferenciasEntrada,
    totaisPorCategoria,
  };
}

function sincronizarResumoMensalDashboardComCache(resumo) {
  if (typeof atualizarResumoMensalDashboardEmCache !== "function") return;
  const carteiraId = document.getElementById("seletor-carteira")?.value;
  const campoMes = document.getElementById("filtro-mes");
  const ano = Number(campoMes?.dataset?.ano);
  const mes = Number(campoMes?.dataset?.mes);
  if (!carteiraId || !Number.isFinite(ano) || !Number.isFinite(mes)) return;

  atualizarResumoMensalDashboardEmCache(carteiraId, ano, mes, resumo);
}

function agendarAtualizacaoAnaliticaLancamentos(lancamentos, resumo, opcoes = {}) {
  const atualizarGraficosPesados = opcoes.atualizarGraficosPesados !== false;
  sincronizarResumoMensalDashboardComCache(resumo);

  agendarAtualizacaoComplementarLancamentos(() => {
    renderizarModelosLancamentoDashboard(lancamentos);
    renderizarResumoAssinaturasDashboard(lancamentos);
    renderizarAlertasRiscoFinanceiro(lancamentos, resumo);
    renderizarResumoCategorias(resumo.totaisPorCategoria);
    renderizarResumoAutores(lancamentos);
    calcularTaxaPoupanca(resumo.totalReceitas, resumo.totalDespesas);
    calcularCapacidadeGuarda(resumo);
    calcularScoreSaude(resumo.totalReceitas, resumo.totalDespesas, resumo.totaisPorCategoria);
  });

  if (!atualizarGraficosPesados) return;

  if (atualizacaoGraficaTimer) clearTimeout(atualizacaoGraficaTimer);
  atualizacaoGraficaTimer = setTimeout(() => {
    atualizacaoGraficaTimer = null;
    agendarAtualizacaoComplementarLancamentos(() => {
      if (typeof carregarComparacaoMesAnterior === "function") carregarComparacaoMesAnterior(resumo.totalDespesas);
      if (typeof carregarTendencia === "function") carregarTendencia();
      if (typeof carregarComparativo6Meses === "function") carregarComparativo6Meses();
    });
  }, 260);
}

function atualizarDashboardComLancamentosLocais(opcoes = {}) {
  const container = document.getElementById("lista-lancamentos");
  const dados = Array.isArray(ultimoLoteLancamentos) ? ultimoLoteLancamentos : [];
  const resumo = calcularResumoLancamentosLocal(dados);

  if (container) {
    container.classList.remove("lista-lancamentos-atualizando");
    container.innerHTML = "";
    if (dados.length === 0) {
      resetarPaginacaoLancamentos();
      ocultarPaginacaoLancamentos();
      container.appendChild(criarAvisoListaVazia());
    } else {
      renderizarListaLancamentos();
      popularSelectLoteCategorias();
      renderizarComparativoPeriodo();
    }
  }

  animarValorMonetario(document.getElementById("total-receitas"), resumo.totalReceitas);
  animarValorMonetario(document.getElementById("total-despesas"), resumo.totalDespesas);
  atualizarDescricoesResumo(resumo);

  const elementoPendente = document.getElementById("resumo-pendente-item");
  if (elementoPendente) {
    if (resumo.totalPendente > 0) {
      elementoPendente.style.display = "flex";
      animarValorMonetario(document.getElementById("total-pendente"), resumo.totalPendente);
    } else {
      elementoPendente.style.display = "none";
    }
  }

  const elementoSaldo = document.getElementById("saldo-total");
  if (elementoSaldo) {
    animarValorMonetario(elementoSaldo, resumo.saldoCalculado);
    elementoSaldo.style.color = resumo.saldoCalculado >= 0 ? "var(--cor-receita)" : "var(--cor-despesa)";
  }

  renderizarTelaHojeDashboard(dados, { saldoCalculado: resumo.saldoCalculado, totalPendente: resumo.totalPendente });
  renderizarCalendarioFinanceiro(dados);

  if (opcoes.atualizarAnalises !== false) {
    agendarAtualizacaoAnaliticaLancamentos(dados, resumo, opcoes);
  }

  return resumo;
}
