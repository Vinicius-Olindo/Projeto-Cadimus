// ==========================================
// reports-shell-ui.js - Estrutura e carregamento dos relatórios
// ==========================================
/* ======================== RELATÓRIOS FINANCEIROS ======================== */
let relatorioDados = { lancamentos: [], periodo: {}, filtros: {} };
const relatorioPagina = { atual: 1, porPagina: 20 };
const CORES_GRAFICO = ["#2e7d32","#c62828","#1565c0","#e65100","#6a1b9a","#00838f","#4e342e","#ad1457","#827717","#00695c","#d84315","#283593"];
let relatoriosConfigurados = false;
let relatorioTimerCarregamento = null;
let relatorioRenderToken = 0;
const cacheRelatoriosFinanceiros = new Map();
const LIMITE_CACHE_RELATORIOS = 6;

function agendarTarefaRelatorio(tarefa) {
  if (typeof tarefa !== "function") return;
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => tarefa(), { timeout: 700 });
    return;
  }
  setTimeout(tarefa, 40);
}

function agendarCarregarDadosRelatorio() {
  if (relatorioTimerCarregamento) clearTimeout(relatorioTimerCarregamento);
  relatorioTimerCarregamento = setTimeout(() => {
    relatorioTimerCarregamento = null;
    carregarDadosRelatorio();
  }, 180);
}

function obterChaveCacheRelatorio(parametros) {
  return JSON.stringify(parametros || {});
}

function gravarCacheRelatorio(chave, dados) {
  if (!chave) return;
  cacheRelatoriosFinanceiros.set(chave, Array.isArray(dados) ? [...dados] : []);
  while (cacheRelatoriosFinanceiros.size > LIMITE_CACHE_RELATORIOS) {
    const primeiraChave = cacheRelatoriosFinanceiros.keys().next().value;
    cacheRelatoriosFinanceiros.delete(primeiraChave);
  }
}

function configurarRelatorios() {
  if (relatoriosConfigurados) return;
  const btnRel = document.getElementById("btn-relatorios");
  const btnVoltar = document.getElementById("btn-voltar-dashboard-relatorio");
  const secaoDash = document.getElementById("dashboard-section");
  const secaoRel = document.getElementById("relatorios-section");
  const paginaRelatorios = document.body?.dataset?.cadimusPage === "relatorios";

  if (btnRel) {
    btnRel.addEventListener("click", () => {
      window.location.href = "relatorios.html";
    });
  }
  if (btnVoltar) {
    btnVoltar.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  }

  if (!secaoRel && !paginaRelatorios) return;
  relatoriosConfigurados = true;

  configurarTabsRelatorio();
  configurarPeriodoRelatorio();
  configurarExportarRelatorio();

  if (paginaRelatorios) {
    inicializarFiltrosRelatorio();
    carregarDadosRelatorio();
  }
}

function configurarTabsRelatorio() {
  document.querySelectorAll(".relatorio-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".relatorio-tab").forEach((t) => t.classList.remove("ativo"));
      document.querySelectorAll(".relatorio-painel").forEach((p) => (p.style.display = "none"));
      tab.classList.add("ativo");
      const painel = document.getElementById(tab.dataset.painel);
      if (painel) painel.style.display = "block";
    });
  });
}

function configurarPeriodoRelatorio() {
  const sel = document.getElementById("relatorio-periodo");
  const grupoData = document.querySelector(".relatorio-periodo-personalizado");
  if (sel) {
    sel.addEventListener("change", () => {
      if (grupoData) grupoData.style.display = sel.value === "personalizado" ? "flex" : "none";
      agendarCarregarDadosRelatorio();
    });
  }
  const dtInicio = document.getElementById("relatorio-data-inicio");
  const dtFim = document.getElementById("relatorio-data-fim");
  if (dtInicio) dtInicio.addEventListener("change", agendarCarregarDadosRelatorio);
  if (dtFim) dtFim.addEventListener("change", agendarCarregarDadosRelatorio);

  ["relatorio-filtro-carteira", "relatorio-filtro-categoria", "relatorio-filtro-tipo"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", agendarCarregarDadosRelatorio);
  });
}

function inicializarFiltrosRelatorio() {
  popularSelectRelatorio("relatorio-filtro-carteira", "carteiras", "Todas");
  popularSelectRelatorio("relatorio-filtro-categoria", "categorias", "Todas");
}

function popularSelectRelatorio(selectId, tipo, labelPadrao) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const valorAtual = sel.value;
  sel.innerHTML = `<option value="">${labelPadrao}</option>`;
  const dados = tipo === "carteiras" ? (typeof carteirasCarregadas !== "undefined" ? carteirasCarregadas : []) :
    tipo === "categorias" ? (typeof categoriasCarregadas !== "undefined" ? categoriasCarregadas.map((c) => ({ id: c, nome: c })) : []) : [];
  dados.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = tipo === "categorias" ? d.nome || d : d.id;
    opt.textContent = tipo === "categorias" ? (d.nome || d) : (d.nome || d.id);
    sel.appendChild(opt);
  });
  sel.value = valorAtual;
}

function obterPeriodoRelatorio() {
  const sel = document.getElementById("relatorio-periodo");
  const tipo = sel ? sel.value : "mes";
  const hoje = new Date();
  let inicio, fim;

  switch (tipo) {
    case "hoje":
      inicio = fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
      break;
    case "semana": {
      const dia = hoje.getDay();
      inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - dia);
      fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + (6 - dia));
      break;
    }
    case "mes":
      inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      break;
    case "3meses":
      inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);
      fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      break;
    case "6meses":
      inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1);
      fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      break;
    case "ano":
      inicio = new Date(hoje.getFullYear(), 0, 1);
      fim = new Date(hoje.getFullYear(), 11, 31);
      break;
    case "personalizado": {
      const di = document.getElementById("relatorio-data-inicio");
      const df = document.getElementById("relatorio-data-fim");
      inicio = di && di.value ? new Date(di.value + "T12:00:00") : new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      fim = df && df.value ? new Date(df.value + "T12:00:00") : hoje;
      break;
    }
    default:
      inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  }

  return {
    inicio: inicio.toISOString().split("T")[0],
    fim: fim.toISOString().split("T")[0],
    inicioDate: inicio,
    fimDate: fim,
    tipo
  };
}

function atualizarResumoPeriodoRelatorio(periodo) {
  const resumo = document.getElementById("relatorio-periodo-atual");
  if (!resumo || !periodo?.inicioDate || !periodo?.fimDate) return;

  const formatar = (data) => data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  const labels = {
    hoje: "Hoje",
    semana: "Esta semana",
    mes: "Este mês",
    "3meses": "Últimos 3 meses",
    "6meses": "Últimos 6 meses",
    ano: "Este ano",
    personalizado: "Período personalizado",
  };

  resumo.innerHTML = `
    <span class="relatorio-periodo-nome">${labels[periodo.tipo] || "Período"}</span>
    <span class="relatorio-periodo-intervalo">${formatar(periodo.inicioDate)} — ${formatar(periodo.fimDate)}</span>
  `;
}

async function carregarDadosRelatorio() {
  const periodo = obterPeriodoRelatorio();
  atualizarResumoPeriodoRelatorio(periodo);
  const filtroCarteira = document.getElementById("relatorio-filtro-carteira")?.value || "";
  const filtroCategoria = document.getElementById("relatorio-filtro-categoria")?.value || "";
  const filtroTipo = document.getElementById("relatorio-filtro-tipo")?.value || "";

  const usuario = obterUsuarioLogado();
  const parametros = {
    inicio: periodo.inicio,
    fim: periodo.fim,
    usuarioId: usuario.id,
    carteiraId: filtroCarteira,
    categoria: filtroCategoria,
    tipo: filtroTipo,
  };
  const chaveCache = obterChaveCacheRelatorio(parametros);
  const dadosEmCache = cacheRelatoriosFinanceiros.get(chaveCache);

  if (dadosEmCache) {
    relatorioDados.lancamentos = [...dadosEmCache];
    relatorioDados.periodo = periodo;
    relatorioDados.filtros = { filtroCarteira, filtroCategoria, filtroTipo };
    renderizarRelatorioCompleto();
  }

  try {
    const resposta = await CadimusReportsApi.buscarLancamentosResposta(parametros);
    if (tratarSessaoExpirada(resposta)) return;
    if (!resposta.ok) throw new Error("Erro ao carregar");
    relatorioDados.lancamentos = await resposta.json();
    relatorioDados.periodo = periodo;
    relatorioDados.filtros = { filtroCarteira, filtroCategoria, filtroTipo };
    gravarCacheRelatorio(chaveCache, relatorioDados.lancamentos);

    renderizarRelatorioCompleto();
  } catch (erro) {
    mostrarToast("Erro ao carregar dados do relatório", "erro");
  }
}

function renderizarRelatorioCompleto() {
  const { lancamentos, periodo } = relatorioDados;
  const mesAnterior = obterPeriodoMesAnterior(periodo);
  const token = ++relatorioRenderToken;

  renderizarKPIsRelatorio(lancamentos, mesAnterior);
  renderizarFluxoCaixa(lancamentos, periodo);
  renderizarBarrasReceitasDespesas(lancamentos, periodo);

  [
    () => renderizarDonutCategorias(lancamentos),
    () => renderizarIndicadoresFinanceiros(lancamentos, periodo),
    () => renderizarEvolucaoCategorias(lancamentos, periodo),
    () => renderizarRankingCategorias(lancamentos),
    () => renderizarComparativoCarteiras(lancamentos),
    () => renderizarTabelaContas(lancamentos),
    () => renderizarTabelaFormasPagamento(lancamentos),
    () => renderizarMaioresDespesas(lancamentos),
    () => renderizarMaioresReceitas(lancamentos),
    () => renderizarRecorrentesRelatorio(lancamentos),
    () => renderizarComparativoPeriodos(lancamentos, mesAnterior),
    () => renderizarMetasRelatorio(),
    () => renderizarInsights(lancamentos, mesAnterior),
    () => renderizarTabelaTransacoes(lancamentos),
  ].forEach((tarefa) => {
    agendarTarefaRelatorio(() => {
      if (token !== relatorioRenderToken) return;
      tarefa();
    });
  });
}

function obterPeriodoMesAnterior(periodo) {
  const ini = new Date(periodo.inicioDate);
  const fim = new Date(periodo.fimDate);
  const diff = Math.round((fim - ini) / (1000 * 60 * 60 * 24)) + 1;
  const antInicio = new Date(ini);
  antInicio.setDate(antInicio.getDate() - diff);
  const antFim = new Date(ini);
  antFim.setDate(antFim.getDate() - 1);
  return { inicio: antInicio.toISOString().split("T")[0], fim: antFim.toISOString().split("T")[0] };
}

async function carregarLancamentosPeriodo(inicio, fim) {
  const usuario = obterUsuarioLogado();
  return CadimusReportsApi.buscarLancamentosPeriodo({ inicio, fim, usuarioId: usuario.id });
}
