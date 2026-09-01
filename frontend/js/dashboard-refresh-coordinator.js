// ==========================================
// dashboard-refresh-coordinator.js - Atualizações inteligentes do dashboard
// ==========================================

let recargaMutacaoEmAndamento = null;
let recargaMutacaoTimer = null;
let recargaMutacaoPendente = false;
let recargaMutacaoEntidades = new Set();
let atualizacaoPaineisTimer = null;
let atualizacaoPaineisLancamentos = [];
let atualizacaoPaineisEntidades = new Set();

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

document.addEventListener("cadimus:dashboard-visao-alterada", () => {
  atualizarPaineisComplementaresLancamentos(ultimoLoteLancamentos);
});
