// ==========================================
// entries-loader-ui.js - Carregamento principal de lançamentos
// ==========================================

// ==========================================
// [20] CARREGAMENTO PRINCIPAL (carregarLancamentos)
// ==========================================

// --- COMUNICAÇÃO COM A API (BUSCA FILTRADA) ---
let ultimaRequisicaoLancamentos = 0;
let ultimoLoteLancamentos = [];
let ultimoLoteTransferencias = [];
let termoBuscaAtual = "";
let recargaMutacaoEmAndamento = null;
let recargaMutacaoTimer = null;
let recargaMutacaoPendente = false;

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

function agendarAtualizacaoPlanejamentoAposMutacao() {
  if (typeof atualizarPlanejamentoVisivel !== "function") return;

  agendarAtualizacaoComplementarLancamentos(() => atualizarPlanejamentoVisivel());
}

async function executarRecargaLancamentosAposMutacao() {
  invalidarCachesDashboardFinanceiro();
  await carregarLancamentos({ manterConteudoAtual: true });
  agendarAtualizacaoPlanejamentoAposMutacao();
}

function recarregarLancamentosAposMutacao() {
  if (recargaMutacaoEmAndamento) {
    recargaMutacaoPendente = true;
    return Promise.resolve();
  }

  recargaMutacaoEmAndamento = new Promise((resolver, rejeitar) => {
    if (recargaMutacaoTimer) clearTimeout(recargaMutacaoTimer);

    recargaMutacaoTimer = setTimeout(() => {
      recargaMutacaoTimer = null;
      executarRecargaLancamentosAposMutacao()
        .then(resolver)
        .catch(rejeitar)
        .finally(() => {
          recargaMutacaoEmAndamento = null;
          if (recargaMutacaoPendente) {
            recargaMutacaoPendente = false;
            recarregarLancamentosAposMutacao();
          }
        });
    }, 80);
  });

  recargaMutacaoEmAndamento.catch((erro) => {
    console.error("Erro ao recarregar dados após alteração:", erro);
  });

  return Promise.resolve();
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
    const despesaNaoPaga = lancamento.tipo === "despesa" && lancamento.status !== "pago";

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

function atualizarDashboardComLancamentosLocais() {
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
  renderizarModelosLancamentoDashboard(dados);
  renderizarResumoAssinaturasDashboard(dados);
  renderizarAlertasRiscoFinanceiro(dados, resumo);
  renderizarResumoCategorias(resumo.totaisPorCategoria);
  renderizarResumoAutores(dados);
  calcularTaxaPoupanca(resumo.totalReceitas, resumo.totalDespesas);
  calcularCapacidadeGuarda(resumo);
  calcularScoreSaude(resumo.totalReceitas, resumo.totalDespesas, resumo.totaisPorCategoria);
}

function aplicarLancamentoAtualizadoLocalmente(lancamento, opcoes = {}) {
  if (!lancamento?.id || !lancamentoPertenceAoPeriodoAtual(lancamento)) {
    recarregarLancamentosAposMutacao();
    return false;
  }

  const indice = ultimoLoteLancamentos.findIndex((item) => String(item.id) === String(lancamento.id));
  if (indice >= 0) {
    ultimoLoteLancamentos[indice] = { ...ultimoLoteLancamentos[indice], ...lancamento };
  } else {
    ultimoLoteLancamentos.unshift(lancamento);
  }

  ordenarLancamentosLocais();
  if (opcoes.resetarPagina) resetarPaginacaoLancamentos();
  atualizarDashboardComLancamentosLocais();
  recarregarLancamentosAposMutacao();
  return true;
}

function removerLancamentoLocalmente(id) {
  const quantidadeAntes = ultimoLoteLancamentos.length;
  ultimoLoteLancamentos = ultimoLoteLancamentos.filter((item) => String(item.id) !== String(id));
  if (ultimoLoteLancamentos.length === quantidadeAntes) {
    recarregarLancamentosAposMutacao();
    return false;
  }

  atualizarDashboardComLancamentosLocais();
  recarregarLancamentosAposMutacao();
  return true;
}

async function carregarLancamentos(opcoes = {}) {
  const container = document.getElementById("lista-lancamentos");
  if (!container) return;

  const carteiraId = document.getElementById("seletor-carteira").value;
  if (!carteiraId) return; // carteiras ainda carregando

  popularSelectFiltroCategorias();

  // Marca esta chamada como "a mais recente". Se outra começar antes dela terminar,
  // esta vira obsoleta e seu resultado é descartado (evita sobrescrever a tela com dado velho).
  const idDestaRequisicao = ++ultimaRequisicaoLancamentos;
  const manterConteudoAtual = Boolean(opcoes.manterConteudoAtual && container.childElementCount > 0);

  container.classList.toggle("lista-lancamentos-atualizando", manterConteudoAtual);
  if (!manterConteudoAtual) {
    container.innerHTML = "";
    container.appendChild(criarFeedbackCarregamento());
    ocultarPaginacaoLancamentos();
  }

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
    ultimoLoteTransferencias = Array.isArray(transferencias) ? transferencias : [];

    if (idDestaRequisicao !== ultimaRequisicaoLancamentos) return;

    container.classList.remove("lista-lancamentos-atualizando");
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
    container.classList.remove("lista-lancamentos-atualizando");
    container.innerHTML = '<p style="color: var(--cor-despesa); padding: 1rem;">Erro ao carregar os dados.</p>';
    ocultarPaginacaoLancamentos();
  } finally {
    if (idDestaRequisicao === ultimaRequisicaoLancamentos) {
      container.classList.remove("lista-lancamentos-atualizando");
    }
  }
}
