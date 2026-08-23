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


function obterGrupoData(dataStr) {
  const data = new Date(dataStr + "T12:00:00");
  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);
  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);

  if (data.toDateString() === hoje.toDateString()) return "Hoje";
  if (data.toDateString() === ontem.toDateString()) return "Ontem";

  return data.toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).replace(".", "");
}

// ==========================================
// [15] RENDERIZAÇÃO: Lista de Lançamentos, Grupos
// ==========================================

// --- RENDERIZA A LISTA (aplica o filtro de busca, se houver, sem afetar os totais do mês) ---
let gruposRecolhidos = new Set();
let paginaLancamentosAtual = 1;
const OPCOES_LANCAMENTOS_POR_PAGINA = [10, 20, 30, 50];
const CHAVE_LANCAMENTOS_POR_PAGINA = "cadimus_lancamentos_por_pagina";
let lancamentosPorPagina = obterPreferenciaLancamentosPorPagina();

function obterPreferenciaLancamentosPorPagina() {
  const salvo = Number(lerLocalStorageSeguro(CHAVE_LANCAMENTOS_POR_PAGINA));
  return OPCOES_LANCAMENTOS_POR_PAGINA.includes(salvo) ? salvo : 20;
}

function ocultarPaginacaoLancamentos() {
  const paginacao = document.getElementById("lancamentos-paginacao");
  if (paginacao) paginacao.innerHTML = "";
}

function renderizarSeletorLancamentosPorPagina() {
  return `
    <label class="lancamentos-por-pagina">
      <span>Por página</span>
      <select id="lancamentos-por-pagina-select" aria-label="Lançamentos por página">
        ${OPCOES_LANCAMENTOS_POR_PAGINA.map((opcao) => `<option value="${opcao}" ${opcao === lancamentosPorPagina ? "selected" : ""}>${opcao}</option>`).join("")}
      </select>
    </label>
  `;
}

function renderizarPaginacaoLancamentos(totalItens) {
  const paginacao = document.getElementById("lancamentos-paginacao");
  if (!paginacao) return;

  const totalPaginas = Math.ceil(totalItens / lancamentosPorPagina);
  if (totalItens <= 0) {
    paginacao.innerHTML = "";
    return;
  }

  paginaLancamentosAtual = Math.min(Math.max(paginaLancamentosAtual, 1), totalPaginas);
  const inicio = (paginaLancamentosAtual - 1) * lancamentosPorPagina + 1;
  const fim = Math.min(paginaLancamentosAtual * lancamentosPorPagina, totalItens);

  const botoes = [];
  if (totalPaginas > 1) {
    for (let pagina = 1; pagina <= totalPaginas; pagina++) {
      if (totalPaginas > 7 && pagina > 3 && pagina < totalPaginas - 1 && Math.abs(pagina - paginaLancamentosAtual) > 1) {
        if (pagina === 4 || pagina === totalPaginas - 2) botoes.push('<button type="button" disabled>…</button>');
        continue;
      }
      botoes.push(`<button type="button" class="${pagina === paginaLancamentosAtual ? "ativo" : ""}" data-pagina="${pagina}" aria-label="Ir para página ${pagina}">${pagina}</button>`);
    }
  }

  paginacao.innerHTML = `
    <div class="lancamentos-paginacao-info">Mostrando ${inicio}-${fim} de ${totalItens}</div>
    <div class="lancamentos-paginacao-controles">
      ${renderizarSeletorLancamentosPorPagina()}
      ${totalPaginas > 1 ? `
        <div class="lancamentos-paginacao-botoes">
          <button type="button" data-pagina="${paginaLancamentosAtual - 1}" ${paginaLancamentosAtual <= 1 ? "disabled" : ""} aria-label="Página anterior">‹</button>
          ${botoes.join("")}
          <button type="button" data-pagina="${paginaLancamentosAtual + 1}" ${paginaLancamentosAtual >= totalPaginas ? "disabled" : ""} aria-label="Próxima página">›</button>
        </div>
      ` : ""}
    </div>
  `;
}

function irParaPaginaLancamentos(pagina) {
  paginaLancamentosAtual = pagina;
  renderizarListaLancamentos();
  document.getElementById("lista-lancamentos")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetarPaginacaoLancamentos() {
  paginaLancamentosAtual = 1;
}

function renderizarListaLancamentos() {
  const container = document.getElementById("lista-lancamentos");
  if (!container) return;

  const termo = termoBuscaAtual.trim().toLowerCase();
  const tipoFiltro = document.getElementById("filtro-tipo")?.value || "";
  const statusFiltro = document.getElementById("filtro-status")?.value || "";
  const categoriaFiltro = document.getElementById("filtro-categoria-lancamento")?.value || "";

  const hoje = new Date();
  const filtrados = ultimoLoteLancamentos.filter((l) => {
    if (termo && !l.descricao.toLowerCase().includes(termo) && !l.categoria.toLowerCase().includes(termo)) return false;
    if (tipoFiltro && l.tipo !== tipoFiltro) return false;
    if (statusFiltro) {
      const dataVenc = new Date(l.data_compra + "T23:59:59");
      const atrasado = l.status !== "pago" && dataVenc < hoje;
      const statusAtual = l.status === "pago" ? "pago" : atrasado ? "atrasado" : "pendente";
      if (statusFiltro === "nao_atrasado") {
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

  const grupos = {};
  const ordemGrupos = [];
  itensPagina.forEach((l) => {
    const grupo = obterGrupoData(l.data_compra);
    if (!grupos[grupo]) {
      grupos[grupo] = [];
      ordemGrupos.push(grupo);
    }
    grupos[grupo].push(l);
  });

  ordemGrupos.forEach((nomeGrupo) => {
    const itens = grupos[nomeGrupo];
    if (!itens || itens.length === 0) return;

    const recolhido = gruposRecolhidos.has(nomeGrupo);

    const header = document.createElement("div");
    header.className = "grupo-data-header";
    header.innerHTML = `
      <span class="grupo-data-texto">${nomeGrupo}</span>
      <div class="grupo-data-direita">
        <span class="grupo-data-qtd">${itens.length}</span>
        <button type="button" class="grupo-data-toggle${recolhido ? ' recolhido' : ''}" data-grupo="${nomeGrupo}" title="Recolher/Expandir" aria-label="Recolher grupo">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>`;
    container.appendChild(header);

    header.querySelector(".grupo-data-toggle").addEventListener("click", () => {
      if (gruposRecolhidos.has(nomeGrupo)) {
        gruposRecolhidos.delete(nomeGrupo);
      } else {
        gruposRecolhidos.add(nomeGrupo);
      }
      renderizarListaLancamentos();
    });

    if (!recolhido) {
      itens.forEach((lancamento) => container.appendChild(criarLinhaLancamento(lancamento)));
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
  mostrarToast("Mostrando lançamentos pendentes", "info");
}

function configurarBuscaLancamentos() {
  const campo = document.getElementById("busca-lancamento");
  if (!campo) return;

  let timeoutBusca;
  campo.addEventListener("input", (evento) => {
    clearTimeout(timeoutBusca);
    timeoutBusca = setTimeout(() => {
      termoBuscaAtual = evento.target.value;
      resetarPaginacaoLancamentos();
      renderizarListaLancamentos();
    }, 250);
  });

  ["filtro-tipo", "filtro-status", "filtro-categoria-lancamento"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", () => {
        resetarPaginacaoLancamentos();
        renderizarListaLancamentos();
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
      resetarPaginacaoLancamentos();
      renderizarListaLancamentos();
    });
  }
}
