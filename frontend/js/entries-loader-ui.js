// ==========================================
// entries-loader-ui.js - Carregamento principal de lançamentos
// ==========================================

// ==========================================
// [20] CARREGAMENTO PRINCIPAL (carregarLancamentos)
// ==========================================

// --- COMUNICAÇÃO COM A API (BUSCA FILTRADA) ---
let ultimaRequisicaoLancamentos = 0;
let ultimoLoteLancamentos = [];
let termoBuscaAtual = "";

function agendarAtualizacaoComplementarLancamentos(tarefa) {
  if (typeof tarefa !== "function") return;

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => Promise.resolve(tarefa()).catch((erro) => console.error("Erro em atualização complementar:", erro)), { timeout: 900 });
    return;
  }

  setTimeout(() => Promise.resolve(tarefa()).catch((erro) => console.error("Erro em atualização complementar:", erro)), 60);
}

function atualizarPaineisComplementaresLancamentos(lancamentos = []) {
  agendarAtualizacaoComplementarLancamentos(() => {
    if (typeof carregarPainelDespesasFixas === "function") carregarPainelDespesasFixas();
    if (typeof carregarPainelComprasParceladas === "function") carregarPainelComprasParceladas();
    if (typeof carregarOrcamentos === "function") carregarOrcamentos();
    if (typeof carregarMetas === "function") carregarMetas();
    if (typeof carregarCartoesCredito === "function") carregarCartoesCredito();
  });

  if (typeof carregarPainelBonificacoes === "function") {
    agendarAtualizacaoComplementarLancamentos(() => carregarPainelBonificacoes(lancamentos));
  }
}

function invalidarCachesDashboardFinanceiro() {
  if (typeof cacheTendencia !== "undefined" && cacheTendencia?.clear) cacheTendencia.clear();
  if (typeof cacheComparativo6 !== "undefined" && cacheComparativo6?.clear) cacheComparativo6.clear();
  if (typeof cacheResumoMensalDashboard !== "undefined" && cacheResumoMensalDashboard?.clear) cacheResumoMensalDashboard.clear();
}

async function recarregarLancamentosAposMutacao() {
  invalidarCachesDashboardFinanceiro();
  await carregarLancamentos();
  if (typeof atualizarPlanejamentoVisivel === "function") {
    await atualizarPlanejamentoVisivel();
  }
}

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
      ? "Saídas pagas neste período."
      : "Nenhuma saída paga no período.";
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

async function carregarLancamentos() {
  const container = document.getElementById("lista-lancamentos");
  if (!container) return;

  const carteiraId = document.getElementById("seletor-carteira").value;
  if (!carteiraId) return; // carteiras ainda carregando

  popularSelectFiltroCategorias();

  // Marca esta chamada como "a mais recente". Se outra começar antes dela terminar,
  // esta vira obsoleta e seu resultado é descartado (evita sobrescrever a tela com dado velho).
  const idDestaRequisicao = ++ultimaRequisicaoLancamentos;

  container.innerHTML = "";
  container.appendChild(criarFeedbackCarregamento());
  ocultarPaginacaoLancamentos();

  try {
    const inputMes = document.getElementById("filtro-mes").value;

    const filtrosLancamentos = { carteira_id: carteiraId };
    const filtrosTransferencias = { carteira_id: carteiraId };

    if (inputMes) {
      const [ano, mes] = inputMes.split("-");
      filtrosLancamentos.mes = mes;
      filtrosLancamentos.ano = ano;
      filtrosTransferencias.mes = mes;
      filtrosTransferencias.ano = ano;
    }

    const [resposta, respostaTransferencias] = await Promise.all([
      CadimusEntriesApi.listarResposta(filtrosLancamentos),
      CadimusWalletsApi.listarTransferencias(filtrosTransferencias),
    ]);

    // Chegou uma requisição mais nova enquanto esperávamos? Descarta esta resposta.
    if (idDestaRequisicao !== ultimaRequisicaoLancamentos) return;

    if (tratarSessaoExpirada(resposta) || tratarSessaoExpirada(respostaTransferencias)) return;
    const dados = await resposta.json();
    const transferencias = await respostaTransferencias.json();

    if (idDestaRequisicao !== ultimaRequisicaoLancamentos) return;

    container.innerHTML = "";

    if (dados.length === 0) {
      ultimoLoteLancamentos = [];
      resetarPaginacaoLancamentos();
      ocultarPaginacaoLancamentos();
      container.appendChild(criarAvisoListaVazia());
      animarValorMonetario(document.getElementById("total-receitas"), 0);
      animarValorMonetario(document.getElementById("total-despesas"), 0);
      animarValorMonetario(document.getElementById("saldo-total"), 0);
      atualizarDescricoesResumo();
      document.getElementById("saldo-total").style.color = "var(--cor-texto)";
      renderizarTelaHojeDashboard([], { saldoCalculado: 0, totalPendente: 0 });
      renderizarCalendarioFinanceiro([]);
      renderizarModelosLancamentoDashboard([]);
      renderizarResumoAssinaturasDashboard([]);
      renderizarAlertasRiscoFinanceiro([], { saldoCalculado: 0, totalReceitas: 0, totalDespesas: 0, totalPendente: 0 });
      document.getElementById("resumo-categorias").style.display = "none";
      document.getElementById("resumo-pendente-item").style.display = "none";
      renderizarResumoAutores([]);
      document.getElementById("card-poupanca").style.display = "none";
      document.getElementById("card-guarda").style.display = "none";
      atualizarPaineisComplementaresLancamentos([]);
      agendarAtualizacaoComplementarLancamentos(() => {
        if (typeof carregarComparacaoMesAnterior === "function") carregarComparacaoMesAnterior(0);
        if (typeof carregarTendencia === "function") carregarTendencia();
        if (typeof carregarComparativo6Meses === "function") carregarComparativo6Meses();
      });
      return;
    }

    ultimoLoteLancamentos = dados;
    resetarPaginacaoLancamentos();

    let totalReceitas = 0;
    let totalDespesas = 0;
    let totalPendente = 0;
    let totalTransferenciasSaida = 0;
    let totalTransferenciasEntrada = 0;
    const totaisPorCategoria = {};

    dados.forEach((lancamento) => {
      const valor = valorMonetario(lancamento);
      const despesaNaoPaga = lancamento.tipo === "despesa" && lancamento.status !== "pago";

      // Despesa não paga é compromisso em aberto — entra em "A pagar",
      // mas não conta no saldo, nas despesas pagas nem nas categorias.
      if (despesaNaoPaga) {
        totalPendente += valor;
        return;
      }

      if (lancamento.tipo === "receita") {
        totalReceitas += valor;
      } else {
        totalDespesas += valor;
        totaisPorCategoria[lancamento.categoria] = (totaisPorCategoria[lancamento.categoria] || 0) + valor;
      }
    });

    // Calcular transferências (saída e entrada)
    const carteiraIdNum = Number(carteiraId);
    transferencias.forEach((t) => {
      const valor = valorMonetario(t);
      if (t.carteira_origem_id === carteiraIdNum) {
        totalTransferenciasSaida += valor;
      }
      if (t.carteira_destino_id === carteiraIdNum) {
        totalTransferenciasEntrada += valor;
      }
    });

    renderizarListaLancamentos();
    popularSelectLoteCategorias();
    renderizarComparativoPeriodo();

    // Saldo = Receitas - Despesas - Transferências Saída + Transferências Entrada
    const saldoCalculado = totalReceitas - totalDespesas - totalTransferenciasSaida + totalTransferenciasEntrada;

    animarValorMonetario(document.getElementById("total-receitas"), totalReceitas);
    animarValorMonetario(document.getElementById("total-despesas"), totalDespesas);
    atualizarDescricoesResumo({ totalReceitas, totalDespesas, totalPendente, saldoCalculado });

    const elementoPendente = document.getElementById("resumo-pendente-item");
    if (elementoPendente) {
      if (totalPendente > 0) {
        elementoPendente.style.display = "flex";
        animarValorMonetario(document.getElementById("total-pendente"), totalPendente);
      } else {
        elementoPendente.style.display = "none";
      }
    }

    const elementoSaldo = document.getElementById("saldo-total");
    if (elementoSaldo) {
      animarValorMonetario(elementoSaldo, saldoCalculado);
      elementoSaldo.style.color = saldoCalculado >= 0 ? "var(--cor-receita)" : "var(--cor-despesa)";
    }

    renderizarTelaHojeDashboard(dados, { saldoCalculado, totalPendente });
    renderizarCalendarioFinanceiro(dados);
    renderizarModelosLancamentoDashboard(dados);
    renderizarResumoAssinaturasDashboard(dados);
    renderizarAlertasRiscoFinanceiro(dados, { saldoCalculado, totalReceitas, totalDespesas, totalPendente });
    renderizarResumoCategorias(totaisPorCategoria);
    renderizarResumoAutores(dados);
    calcularTaxaPoupanca(totalReceitas, totalDespesas);
    calcularCapacidadeGuarda({
      saldoCalculado,
      totalPendente,
      totalReceitas,
      totalDespesas,
      totalTransferenciasEntrada,
      totalTransferenciasSaida,
    });
    calcularScoreSaude(totalReceitas, totalDespesas, totaisPorCategoria);
    atualizarPaineisComplementaresLancamentos(dados);
    agendarAtualizacaoComplementarLancamentos(() => {
      if (typeof carregarComparacaoMesAnterior === "function") carregarComparacaoMesAnterior(totalDespesas);
      if (typeof carregarTendencia === "function") carregarTendencia();
      if (typeof carregarComparativo6Meses === "function") carregarComparativo6Meses();
    });
  } catch (erro) {
    if (idDestaRequisicao !== ultimaRequisicaoLancamentos) return;
    console.error("Erro:", erro);
    container.innerHTML = '<p style="color: var(--cor-despesa); padding: 1rem;">Erro ao carregar os dados.</p>';
    ocultarPaginacaoLancamentos();
  }
}
