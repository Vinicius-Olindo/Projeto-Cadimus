// ==========================================
// entries-list-ui.js - Listagem, filtros e animações de lançamentos
// ==========================================

// ==========================================
// [14] ANIMAÇÕES
// ==========================================

// --- ANIMAÇÃO DE CONTAGEM (números "sobem" até o valor final) ---
const formatadorBRL = window.CadimusFormatadores.formatadorBRL;
const valoresAnimadosAtuais = new WeakMap();

function animarValorMonetario(elemento, valorFinal) {
  if (!elemento) return;

  const atualizarValor = (valor) => {
    const texto = formatadorBRL.format(valor);
    elemento.textContent = texto;
    elemento.title = texto;
    elemento.classList.toggle("valor-monetario-longo", texto.length >= 15);
    elemento.classList.toggle("valor-monetario-muito-longo", texto.length >= 18);
  };

  if (prefereMovimentoReduzido()) {
    atualizarValor(valorFinal);
    valoresAnimadosAtuais.set(elemento, valorFinal);
    return;
  }

  const valorInicial = valoresAnimadosAtuais.get(elemento) ?? 0;
  const duracao = 550;
  const inicioTempo = performance.now();

  function passo(agora) {
    const progresso = Math.min((agora - inicioTempo) / duracao, 1);
    const facilitado = 1 - Math.pow(1 - progresso, 3); // ease-out cúbico
    const valorAtual = valorInicial + (valorFinal - valorInicial) * facilitado;
    atualizarValor(valorAtual);
    if (progresso < 1) requestAnimationFrame(passo);
  }

  requestAnimationFrame(passo);
  valoresAnimadosAtuais.set(elemento, valorFinal);
}


// ==========================================
// [15] RENDERIZAÇÃO: Lista de Lançamentos, Grupos
// ==========================================

// --- RENDERIZA A LISTA (aplica o filtro de busca, se houver, sem afetar os totais do mês) ---
function renderizarListaLancamentos() {
  const container = document.getElementById("lista-lancamentos");
  if (!container) return;

  const termo = termoBuscaAtual.trim().toLowerCase();
  const tipoFiltro = document.getElementById("filtro-tipo")?.value || "";
  const statusFiltro = document.getElementById("filtro-status")?.value || "";
  const categoriaFiltro = document.getElementById("filtro-categoria-lancamento")?.value || "";

  const hoje = new Date();
  const filtrados = ultimoLoteLancamentos.filter((l) => {
    const camposBusca = [
      l.descricao,
      l.categoria,
      l.data_compra,
      l.status,
      l.meio_pagamento,
    ].map((valor) => String(valor || "").toLowerCase());
    if (termo && !camposBusca.some((valor) => valor.includes(termo))) return false;
    if (tipoFiltro && l.tipo !== tipoFiltro) return false;
    if (statusFiltro) {
      const dataVenc = new Date(l.data_compra + "T23:59:59");
      const atrasado = l.status !== "pago" && dataVenc < hoje;
      const statusAtual = l.status === "pago" ? "pago" : atrasado ? "atrasado" : "pendente";
      if (statusFiltro === "pendente") {
        if (l.status === "pago") return false;
      } else if (statusFiltro === "nao_atrasado") {
        if (atrasado) return false;
      } else if (statusAtual !== statusFiltro) {
        return false;
      }
    }
    if (categoriaFiltro && l.categoria !== categoriaFiltro) return false;
    return true;
  });

  container.innerHTML = "";

  if (filtrados.length === 0) {
    ocultarPaginacaoLancamentos();
    const temFiltro = termo || tipoFiltro || statusFiltro || categoriaFiltro;
    if (temFiltro) {
      container.appendChild(criarAvisoListaVazia("Nenhum lançamento encontrado com esses filtros.", "Limpar filtros", "limpar-filtros"));
    } else {
      container.appendChild(criarAvisoListaVazia());
    }
    return;
  }

  const totalPaginas = Math.ceil(filtrados.length / lancamentosPorPagina);
  paginaLancamentosAtual = Math.min(Math.max(paginaLancamentosAtual, 1), totalPaginas);
  const inicioPagina = (paginaLancamentosAtual - 1) * lancamentosPorPagina;
  const itensPagina = filtrados.slice(inicioPagina, inicioPagina + lancamentosPorPagina);

  const grupos = agruparLancamentosPorTempo(itensPagina);

  grupos.forEach((grupo) => {
    const recolhido = gruposRecolhidos.has(grupo.chave);
    const header = criarHeaderGrupoLancamentos(grupo, recolhido);
    container.appendChild(header);

    header.querySelector(".grupo-data-toggle").addEventListener("click", () => {
      if (gruposRecolhidos.has(grupo.chave)) {
        gruposRecolhidos.delete(grupo.chave);
      } else {
        gruposRecolhidos.add(grupo.chave);
      }
      renderizarListaLancamentos();
    });

    if (!recolhido) {
      if (grupo.agruparPorData) {
        grupo.datas.forEach((grupoData) => {
          container.appendChild(criarSubheaderDataLancamentos(grupoData));
          grupoData.itens.forEach((lancamento) => container.appendChild(criarLinhaLancamento(lancamento)));
        });
      } else {
        grupo.itens.forEach((lancamento) => container.appendChild(criarLinhaLancamento(lancamento)));
      }
    }
  });

  renderizarPaginacaoLancamentos(filtrados.length);
}

function limparFiltros() {
  const campoBusca = document.getElementById("busca-lancamento");
  const filtroTipo = document.getElementById("filtro-tipo");
  const filtroStatus = document.getElementById("filtro-status");
  const filtroCategoria = document.getElementById("filtro-categoria-lancamento");

  if (campoBusca) campoBusca.value = "";
  if (filtroTipo) filtroTipo.value = "";
  if (filtroStatus) filtroStatus.value = "";
  if (filtroCategoria) filtroCategoria.value = "";

  termoBuscaAtual = "";
  resetarPaginacaoLancamentos();
  renderizarListaLancamentos();
}

function filtrarLancamentosPendentes() {
  const campoBusca = document.getElementById("busca-lancamento");
  const filtroTipo = document.getElementById("filtro-tipo");
  const filtroStatus = document.getElementById("filtro-status");
  const filtroCategoria = document.getElementById("filtro-categoria-lancamento");

  if (campoBusca) campoBusca.value = "";
  if (filtroTipo) filtroTipo.value = "";
  if (filtroStatus) filtroStatus.value = "pendente";
  if (filtroCategoria) filtroCategoria.value = "";

  termoBuscaAtual = "";
  resetarPaginacaoLancamentos();
  renderizarListaLancamentos();

  document.querySelector(".lancamentos-cabecalho")?.scrollIntoView({ behavior: "smooth", block: "start" });
  mostrarToast("Mostrando compromissos a pagar", "info");
}

function limparFiltrosPeloResumo() {
  limparFiltros();
  document.querySelector(".lancamentos-cabecalho")?.scrollIntoView({ behavior: "smooth", block: "start" });
  mostrarToast("Filtros de lançamentos limpos", "info");
}

function configurarBuscaLancamentos() {
  const campo = document.getElementById("busca-lancamento");
  if (!campo) return;

  let timeoutBusca;
  campo.addEventListener("input", (evento) => {
    clearTimeout(timeoutBusca);
    timeoutBusca = setTimeout(() => {
      termoBuscaAtual = evento.target.value;
      agendarRenderizacaoListaLancamentos({ resetarPagina: true });
    }, 160);
  });

  ["filtro-tipo", "filtro-status", "filtro-categoria-lancamento"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", () => {
        agendarRenderizacaoListaLancamentos({ resetarPagina: true });
      });
    }
  });

  const containerLancamentos = document.getElementById("lista-lancamentos");
  if (containerLancamentos) {
    containerLancamentos.addEventListener("click", (e) => {
      const alvo = e.target.closest("[data-action]");
      if (!alvo) return;
      const acao = alvo.dataset.action;
      const id = Number(alvo.dataset.id);
      if (acao === "editar") editarLancamento(id);
      else if (acao === "duplicar") duplicarLancamento(id);
      else if (acao === "apagar") apagarLancamento(id);
      else if (acao === "status") alternarStatusLancamento(id, alvo.dataset.statusAtual);
      else if (acao === "novo-lancamento") abrirModalNovoLancamento();
      else if (acao === "limpar-filtros") limparFiltros();
    });
  }

  const cardPendente = document.getElementById("resumo-pendente-item");
  if (cardPendente) {
    cardPendente.addEventListener("click", filtrarLancamentosPendentes);
    cardPendente.addEventListener("keydown", (evento) => {
      if (evento.key !== "Enter" && evento.key !== " ") return;
      evento.preventDefault();
      filtrarLancamentosPendentes();
    });
  }

  const cardReceitas = document.getElementById("resumo-receitas-item");
  if (cardReceitas) {
    cardReceitas.addEventListener("click", limparFiltrosPeloResumo);
    cardReceitas.addEventListener("keydown", (evento) => {
      if (evento.key !== "Enter" && evento.key !== " ") return;
      evento.preventDefault();
      limparFiltrosPeloResumo();
    });
  }

  const paginacaoLancamentos = document.getElementById("lancamentos-paginacao");
  if (paginacaoLancamentos) {
    paginacaoLancamentos.addEventListener("click", (e) => {
      const botao = e.target.closest("button[data-pagina]");
      if (!botao || botao.disabled) return;
      irParaPaginaLancamentos(Number(botao.dataset.pagina));
    });

    paginacaoLancamentos.addEventListener("change", (e) => {
      const seletor = e.target.closest("#lancamentos-por-pagina-select");
      if (!seletor) return;
      const novoValor = Number(seletor.value);
      if (!OPCOES_LANCAMENTOS_POR_PAGINA.includes(novoValor)) return;
      lancamentosPorPagina = novoValor;
      gravarLocalStorageSeguro(CHAVE_LANCAMENTOS_POR_PAGINA, String(novoValor));
      agendarRenderizacaoListaLancamentos({ resetarPagina: true });
    });
  }
}
