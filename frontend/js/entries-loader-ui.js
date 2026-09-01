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
let recargaMutacaoEntidades = new Set();
let atualizacaoGraficaTimer = null;
let atualizacaoPaineisTimer = null;
let atualizacaoPaineisLancamentos = [];
let atualizacaoPaineisEntidades = new Set();
const cachePeriodoLancamentos = new Map();
const LIMITE_CACHE_PERIODO_LANCAMENTOS = 8;
const ENTIDADES_DASHBOARD_COMPLETAS = [
  "despesas-fixas",
  "compras-parceladas",
  "bonificacoes",
  "orcamentos",
  "metas",
  "cartoes",
];

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

function agendarAtualizacaoComplementarLancamentos(tarefa) {
  if (typeof tarefa !== "function") return;

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => Promise.resolve(tarefa()).catch((erro) => console.error("Erro em atualização complementar:", erro)), { timeout: 900 });
    return;
  }

  setTimeout(() => Promise.resolve(tarefa()).catch((erro) => console.error("Erro em atualização complementar:", erro)), 60);
}

function cardDashboardEstaVisivel(id) {
  const card = document.getElementById(id);
  if (!card) return false;
  return !card.classList.contains("dashboard-visao-oculto") && !card.classList.contains("dashboard-card-oculto-usuario");
}

function executarAtualizacaoPaineisDashboard(entidades, lancamentos = []) {
  if (entidades.has("despesas-fixas") && cardDashboardEstaVisivel("card-despesas-fixas") && typeof carregarPainelDespesasFixas === "function") {
    carregarPainelDespesasFixas();
  }
  if (entidades.has("compras-parceladas") && cardDashboardEstaVisivel("card-compras-parceladas") && typeof carregarPainelComprasParceladas === "function") {
    carregarPainelComprasParceladas();
  }
  if (entidades.has("bonificacoes") && cardDashboardEstaVisivel("card-bonificacoes") && typeof carregarPainelBonificacoes === "function") {
    carregarPainelBonificacoes(lancamentos);
  }
  if (entidades.has("orcamentos") && cardDashboardEstaVisivel("card-orcamentos") && typeof carregarOrcamentos === "function") {
    carregarOrcamentos();
  }
  if (entidades.has("metas") && cardDashboardEstaVisivel("card-metas-mes-dashboard") && typeof carregarMetas === "function") {
    carregarMetas();
  }
  if (entidades.has("cartoes") && cardDashboardEstaVisivel("card-cartoes-credito") && typeof carregarCartoesCredito === "function") {
    carregarCartoesCredito();
  }
}

function agendarAtualizacaoPaineisDashboard(entidades = ENTIDADES_DASHBOARD_COMPLETAS, lancamentos = ultimoLoteLancamentos) {
  atualizacaoPaineisLancamentos = Array.isArray(lancamentos) ? lancamentos : [];
  const listaEntidades = Array.isArray(entidades) ? entidades : [entidades];
  listaEntidades.filter(Boolean).forEach((entidade) => atualizacaoPaineisEntidades.add(entidade));
  if (atualizacaoPaineisTimer) clearTimeout(atualizacaoPaineisTimer);

  atualizacaoPaineisTimer = setTimeout(() => {
    atualizacaoPaineisTimer = null;
    const entidadesPendentes = new Set(atualizacaoPaineisEntidades);
    atualizacaoPaineisEntidades.clear();
    agendarAtualizacaoComplementarLancamentos(() => {
      executarAtualizacaoPaineisDashboard(entidadesPendentes, atualizacaoPaineisLancamentos);
    });
  }, 140);
}

function atualizarPaineisComplementaresLancamentos(lancamentos = []) {
  agendarAtualizacaoPaineisDashboard(ENTIDADES_DASHBOARD_COMPLETAS, lancamentos);
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

async function executarRecargaLancamentosAposMutacao(opcoes = {}) {
  await carregarLancamentos({
    manterConteudoAtual: true,
    atualizarGraficosPesados: false,
    entidadesAfetadas: opcoes.entidadesAfetadas,
  });
  agendarAtualizacaoPlanejamentoAposMutacao();
}

function recarregarLancamentosAposMutacao(opcoes = {}) {
  const entidades = Array.isArray(opcoes.entidadesAfetadas) ? opcoes.entidadesAfetadas : [];
  entidades.filter(Boolean).forEach((entidade) => recargaMutacaoEntidades.add(entidade));

  if (recargaMutacaoEmAndamento) {
    recargaMutacaoPendente = true;
    return Promise.resolve();
  }

  recargaMutacaoEmAndamento = new Promise((resolver, rejeitar) => {
    if (recargaMutacaoTimer) clearTimeout(recargaMutacaoTimer);

    recargaMutacaoTimer = setTimeout(() => {
      recargaMutacaoTimer = null;
      const entidadesDaRecarga = [...recargaMutacaoEntidades];
      recargaMutacaoEntidades.clear();
      executarRecargaLancamentosAposMutacao({
        ...opcoes,
        entidadesAfetadas: entidadesDaRecarga.length ? entidadesDaRecarga : opcoes.entidadesAfetadas,
      })
        .then(resolver)
        .catch(rejeitar)
        .finally(() => {
          recargaMutacaoEmAndamento = null;
          if (recargaMutacaoPendente) {
            recargaMutacaoPendente = false;
            recarregarLancamentosAposMutacao(opcoes);
          }
        });
    }, 80);
  });

  recargaMutacaoEmAndamento.catch((erro) => {
    console.error("Erro ao recarregar dados após alteração:", erro);
  });

  return Promise.resolve();
}

function entidadesAfetadasPorLancamento(lancamento = {}) {
  const entidades = new Set(["bonificacoes", "orcamentos", "metas"]);
  if (lancamento.despesa_fixa_id) entidades.add("despesas-fixas");
  if (lancamento.compra_parcelada_id) entidades.add("compras-parceladas");
  if (lancamento.cartao_credito_id) entidades.add("cartoes");
  return [...entidades];
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

function aplicarLancamentoAtualizadoLocalmente(lancamento, opcoes = {}) {
  if (!lancamento?.id || !lancamentoPertenceAoPeriodoAtual(lancamento)) {
    if (opcoes.recarregarQuandoForaDoPeriodo !== false) recarregarLancamentosAposMutacao();
    return false;
  }

  const indice = ultimoLoteLancamentos.findIndex((item) => String(item.id) === String(lancamento.id));
  const lancamentoAnterior = indice >= 0 ? ultimoLoteLancamentos[indice] : null;
  if (indice >= 0) {
    ultimoLoteLancamentos[indice] = { ...ultimoLoteLancamentos[indice], ...lancamento };
  } else {
    ultimoLoteLancamentos.unshift(lancamento);
  }

  ordenarLancamentosLocais();
  if (opcoes.resetarPagina) resetarPaginacaoLancamentos();
  atualizarDashboardComLancamentosLocais({ atualizarAnalises: false });
  atualizarCachePeriodoAtualLancamentos();
  if (opcoes.atualizarComplementos !== false) {
    agendarAtualizacaoPaineisDashboard([
      ...entidadesAfetadasPorLancamento(lancamento),
      ...entidadesAfetadasPorLancamento(lancamentoAnterior || {}),
    ]);
    agendarAtualizacaoPlanejamentoAposMutacao();
  }
  return true;
}

function removerLancamentoLocalmente(id, opcoes = {}) {
  const lancamentoRemovido = ultimoLoteLancamentos.find((item) => String(item.id) === String(id));
  const quantidadeAntes = ultimoLoteLancamentos.length;
  ultimoLoteLancamentos = ultimoLoteLancamentos.filter((item) => String(item.id) !== String(id));
  if (ultimoLoteLancamentos.length === quantidadeAntes) {
    if (opcoes.recarregarQuandoNaoEncontrar !== false) recarregarLancamentosAposMutacao();
    return false;
  }

  atualizarDashboardComLancamentosLocais({ atualizarAnalises: false });
  atualizarCachePeriodoAtualLancamentos();
  if (opcoes.atualizarComplementos !== false) {
    agendarAtualizacaoPaineisDashboard(entidadesAfetadasPorLancamento(lancamentoRemovido || {}));
    agendarAtualizacaoPlanejamentoAposMutacao();
  }
  return true;
}

function atualizarDashboardAposMudanca(opcoes = {}) {
  const {
    tipo = "lancamento",
    acao = "salvar",
    lancamento = null,
    id = null,
    entidadesAfetadas = [],
    resetarPagina = false,
    recarregarLista = false,
    atualizarPlanejamento = true,
  } = opcoes;

  invalidarCachesDashboardFinanceiro();

  if (recarregarLista) {
    recarregarLancamentosAposMutacao({ entidadesAfetadas });
    return true;
  }

  if (tipo === "lancamento") {
    const idLancamento = acao === "excluir" ? id : lancamento?.id;
    const lancamentoAnterior = ultimoLoteLancamentos.find((item) => String(item.id) === String(idLancamento));
    const atualizado = acao === "excluir"
      ? removerLancamentoLocalmente(id, { atualizarComplementos: false })
      : aplicarLancamentoAtualizadoLocalmente(lancamento, { resetarPagina, atualizarComplementos: false });

    if (!atualizado) return false;

    const entidadesLancamento = [
      ...entidadesAfetadasPorLancamento(lancamentoAnterior || {}),
      ...entidadesAfetadasPorLancamento(lancamento || {}),
    ];
    agendarAtualizacaoPaineisDashboard([...entidadesLancamento, ...entidadesAfetadas]);
    if (atualizarPlanejamento) agendarAtualizacaoPlanejamentoAposMutacao();
    return true;
  }

  agendarAtualizacaoPaineisDashboard(entidadesAfetadas);
  if (atualizarPlanejamento) agendarAtualizacaoPlanejamentoAposMutacao();
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

    const chaveCachePeriodo = obterChavePeriodoLancamentos(carteiraId, filtrosLancamentos);
    const periodoEmCache = cachePeriodoLancamentos.get(chaveCachePeriodo);
    if (periodoEmCache && !opcoes.ignorarCache) {
      ultimoLoteLancamentos = [...periodoEmCache.lancamentos];
      ultimoLoteTransferencias = [...periodoEmCache.transferencias];
      resetarPaginacaoLancamentos();
      atualizarDashboardComLancamentosLocais({ atualizarAnalises: false });
      container.classList.add("lista-lancamentos-atualizando");
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
    gravarCachePeriodoLancamentos(chaveCachePeriodo, dados, ultimoLoteTransferencias);

    if (idDestaRequisicao !== ultimaRequisicaoLancamentos) return;

    container.classList.remove("lista-lancamentos-atualizando");
    container.innerHTML = "";

    if (dados.length === 0) {
      ultimoLoteLancamentos = [];
      resetarPaginacaoLancamentos();
      const resumoVazio = atualizarDashboardComLancamentosLocais({ atualizarAnalises: false });
      agendarAtualizacaoPaineisDashboard(opcoes.entidadesAfetadas || ENTIDADES_DASHBOARD_COMPLETAS, []);
      agendarAtualizacaoAnaliticaLancamentos([], resumoVazio, {
        atualizarGraficosPesados: opcoes.atualizarGraficosPesados !== false,
      });
      return;
    }

    ultimoLoteLancamentos = dados;
    resetarPaginacaoLancamentos();
    const resumo = atualizarDashboardComLancamentosLocais({ atualizarAnalises: false });
    agendarAtualizacaoPaineisDashboard(opcoes.entidadesAfetadas || ENTIDADES_DASHBOARD_COMPLETAS, dados);
    agendarAtualizacaoAnaliticaLancamentos(dados, resumo, {
      atualizarGraficosPesados: opcoes.atualizarGraficosPesados !== false,
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

document.addEventListener("cadimus:dashboard-visao-alterada", () => {
  atualizarPaineisComplementaresLancamentos(ultimoLoteLancamentos);
});
