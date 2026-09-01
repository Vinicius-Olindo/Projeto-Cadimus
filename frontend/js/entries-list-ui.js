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


function criarDataLocalMeioDia(dataStr) {
  return new Date(`${String(dataStr).slice(0, 10)}T12:00:00`);
}

function obterChaveData(data) {
  return [
    data.getFullYear(),
    String(data.getMonth() + 1).padStart(2, "0"),
    String(data.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatarDataGrupo(data, opcoes = {}) {
  const { compacta = false } = opcoes;
  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: compacta ? "short" : "long",
    year: compacta ? undefined : "numeric",
  }).replace(".", "");
}

function obterInicioSemana(dataBase) {
  const inicio = new Date(dataBase);
  const diaSemana = inicio.getDay();
  const diasDesdeSegunda = diaSemana === 0 ? 6 : diaSemana - 1;
  inicio.setDate(inicio.getDate() - diasDesdeSegunda);
  inicio.setHours(12, 0, 0, 0);
  return inicio;
}

function obterGrupoTemporalLancamento(dataStr) {
  const data = criarDataLocalMeioDia(dataStr);
  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);
  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);
  const inicioSemana = obterInicioSemana(hoje);

  const chaveData = obterChaveData(data);
  const chaveHoje = obterChaveData(hoje);
  const chaveOntem = obterChaveData(ontem);

  if (data > hoje) {
    return {
      chave: "futuros",
      titulo: "Próximos lançamentos",
      subtitulo: "Datas futuras",
      ordem: 1,
      agruparPorData: true,
      data,
    };
  }

  if (chaveData === chaveHoje) {
    return {
      chave: "hoje",
      titulo: "Hoje",
      ordem: 2,
      agruparPorData: false,
      data,
    };
  }

  if (chaveData === chaveOntem) {
    return {
      chave: "ontem",
      titulo: "Ontem",
      ordem: 3,
      agruparPorData: false,
      data,
    };
  }

  if (data >= inicioSemana && data < ontem) {
    return {
      chave: "semana",
      titulo: "Esta semana",
      subtitulo: "Antes de ontem",
      ordem: 4,
      agruparPorData: true,
      data,
    };
  }

  if (data.getMonth() === hoje.getMonth() && data.getFullYear() === hoje.getFullYear()) {
    return {
      chave: "mes",
      titulo: "Este mês",
      subtitulo: "Fora desta semana",
      ordem: 5,
      agruparPorData: true,
      data,
    };
  }

  return {
    chave: "outros",
    titulo: "Outros períodos",
    ordem: 6,
    agruparPorData: true,
    data,
  };
}

function agruparLancamentosPorTempo(lancamentos) {
  const grupos = new Map();

  lancamentos.forEach((lancamento) => {
    const info = obterGrupoTemporalLancamento(lancamento.data_compra);
    if (!grupos.has(info.chave)) {
      grupos.set(info.chave, {
        chave: info.chave,
        titulo: info.titulo,
        subtitulo: info.subtitulo || "",
        ordem: info.ordem,
        agruparPorData: info.agruparPorData,
        itens: [],
        datas: new Map(),
      });
    }

    const grupo = grupos.get(info.chave);
    grupo.itens.push(lancamento);

    if (grupo.agruparPorData) {
      const chaveData = obterChaveData(info.data);
      if (!grupo.datas.has(chaveData)) {
        grupo.datas.set(chaveData, {
          data: info.data,
          titulo: formatarDataGrupo(info.data),
          itens: [],
        });
      }
      grupo.datas.get(chaveData).itens.push(lancamento);
    }
  });

  return [...grupos.values()].sort((a, b) => a.ordem - b.ordem);
}

function criarHeaderGrupoLancamentos(grupo, recolhido) {
  const header = document.createElement("div");
  header.className = "grupo-data-header grupo-data-header-principal";
  header.innerHTML = `
    <span class="grupo-data-identidade">
      <span class="grupo-data-texto">${escaparHtml(grupo.titulo)}</span>
      ${grupo.subtitulo ? `<span class="grupo-data-subtitulo">${escaparHtml(grupo.subtitulo)}</span>` : ""}
    </span>
    <div class="grupo-data-direita">
      <span class="grupo-data-qtd">${grupo.itens.length}</span>
      <button type="button" class="grupo-data-toggle${recolhido ? ' recolhido' : ''}" data-grupo="${escaparHtml(grupo.chave)}" title="Recolher/Expandir" aria-label="Recolher grupo">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    </div>`;
  return header;
}

function criarSubheaderDataLancamentos(grupoData) {
  const header = document.createElement("div");
  header.className = "grupo-data-header grupo-data-subheader";
  header.innerHTML = `
    <span class="grupo-data-texto">${escaparHtml(grupoData.titulo)}</span>
    <span class="grupo-data-qtd">${grupoData.itens.length}</span>
  `;
  return header;
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
let renderizacaoListaLancamentosPendente = false;

function agendarRenderizacaoListaLancamentos(opcoes = {}) {
  if (opcoes.resetarPagina) resetarPaginacaoLancamentos();
  if (renderizacaoListaLancamentosPendente) return;

  renderizacaoListaLancamentosPendente = true;
  requestAnimationFrame(() => {
    renderizacaoListaLancamentosPendente = false;
    renderizarListaLancamentos();
    if (opcoes.rolar) {
      document.getElementById("lista-lancamentos")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

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
  agendarRenderizacaoListaLancamentos({ rolar: true });
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
