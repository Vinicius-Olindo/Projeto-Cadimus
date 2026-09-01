// ==========================================
// entries-loader-ui.js - Carregamento principal de lançamentos
// ==========================================

// ==========================================
// [20] CARREGAMENTO PRINCIPAL (carregarLancamentos)
// ==========================================

function agendarAtualizacaoComplementarLancamentos(tarefa) {
  if (typeof tarefa !== "function") return;

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => Promise.resolve(tarefa()).catch((erro) => console.error("Erro em atualização complementar:", erro)), { timeout: 900 });
    return;
  }

  setTimeout(() => Promise.resolve(tarefa()).catch((erro) => console.error("Erro em atualização complementar:", erro)), 60);
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
