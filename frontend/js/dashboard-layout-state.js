// ==========================================
// dashboard-layout-state.js - Estado e persistência do layout do dashboard
// ==========================================

const DASHBOARD_LAYOUT_STORAGE_PREFIX = "cadimus_dashboard_layout";
const DASHBOARD_LAYOUT_AREA_SELECTOR = "#dashboard-section #conteudo-periodo";
const DASHBOARD_LAYOUT_MAIN_CONTAINER_SELECTOR = "#dashboard-section #dashboard-free-grid";
const DASHBOARD_LAYOUT_SIDE_CONTAINER_SELECTOR = "#dashboard-section #dashboard-side-grid";
const DASHBOARD_LAYOUT_CARD_CONFIGS = [
  { id: "card-hoje-dashboard", nome: "Hoje financeiro", tamanhoPadrao: "inteiro", zona: "principal" },
  { id: "card-calendario-financeiro", nome: "Calendário", tamanhoPadrao: "inteiro", zona: "principal" },
  { id: "card-comparativo-periodo", nome: "Comparar períodos", tamanhoPadrao: "inteiro", zona: "principal" },
  { id: "card-lancamentos", nome: "Lançamentos", tamanhoPadrao: "inteiro", zona: "principal" },
  { id: "resumo-categorias", nome: "Categorias", tamanhoPadrao: "medio", zona: "lateral" },
  { id: "card-tendencia", nome: "Evolução mensal", tamanhoPadrao: "grande", zona: "lateral" },
  { id: "card-comparativo", nome: "Saldo vs despesas", tamanhoPadrao: "grande", zona: "lateral" },
  { id: "card-por-autor", nome: "Quem gastou quanto", tamanhoPadrao: "medio", zona: "lateral" },
  { id: "card-despesas-fixas", nome: "Despesas fixas", tamanhoPadrao: "medio", zona: "lateral" },
  { id: "card-compras-parceladas", nome: "Compras parceladas", tamanhoPadrao: "medio", zona: "lateral" },
  { id: "card-bonificacoes", nome: "Bonificações", tamanhoPadrao: "medio", zona: "lateral" },
  { id: "card-assinaturas", nome: "Assinaturas", tamanhoPadrao: "medio", zona: "lateral" },
  { id: "card-metas-mes-dashboard", nome: "Metas do mês", tamanhoPadrao: "grande", zona: "lateral" },
  { id: "card-orcamentos", nome: "Orçamento", tamanhoPadrao: "medio", zona: "lateral" },
  { id: "card-cartoes-credito", nome: "Cartões", tamanhoPadrao: "medio", zona: "lateral" },
  { id: "card-riscos-financeiros", nome: "Riscos financeiros", tamanhoPadrao: "medio", zona: "lateral" },
  { id: "card-modelos-lancamento", nome: "Modelos rápidos", tamanhoPadrao: "medio", zona: "lateral" },
  { id: "card-score", nome: "Saúde financeira", tamanhoPadrao: "grande", zona: "lateral" },
];
const DASHBOARD_LAYOUT_CARDS = DASHBOARD_LAYOUT_CARD_CONFIGS.map((card) => card.id);
const DASHBOARD_LAYOUT_CARDS_POR_VISAO = {
  hoje: new Set([
    "card-hoje-dashboard",
    "card-lancamentos",
    "card-modelos-lancamento",
    "card-despesas-fixas",
    "card-compras-parceladas",
    "card-bonificacoes",
  ]),
  dashboard: new Set([
    "card-score",
    "card-riscos-financeiros",
    "card-calendario-financeiro",
    "card-comparativo-periodo",
    "resumo-categorias",
    "card-tendencia",
    "card-comparativo",
    "card-por-autor",
    "card-metas-mes-dashboard",
    "card-orcamentos",
    "card-cartoes-credito",
    "card-assinaturas",
  ]),
};
const DASHBOARD_LAYOUT_TAMANHOS = {
  pequeno: "Pequeno",
  medio: "Médio",
  grande: "Grande",
  inteiro: "Largura total",
};
const DASHBOARD_LAYOUT_ZONAS = {
  principal: "Esquerda",
  lateral: "Direita",
};
const DASHBOARD_LAYOUT_PRESETS = [
  {
    chave: "essencial",
    nome: "Essencial",
    descricao: "Resumo enxuto para uso diário.",
    cards: [
      ["card-hoje-dashboard", "grande"],
      ["card-lancamentos", "inteiro"],
      ["card-calendario-financeiro", "grande"],
      ["card-score", "grande"],
      ["card-riscos-financeiros", "medio"],
      ["card-metas-mes-dashboard", "grande"],
    ],
  },
  {
    chave: "lancamentos",
    nome: "Foco em lançamentos",
    descricao: "Rotina, agenda e compromissos.",
    cards: [
      ["card-hoje-dashboard", "grande"],
      ["card-lancamentos", "inteiro"],
      ["card-modelos-lancamento", "medio"],
      ["card-despesas-fixas", "medio"],
      ["card-compras-parceladas", "medio"],
      ["card-bonificacoes", "medio"],
      ["card-calendario-financeiro", "grande"],
    ],
  },
  {
    chave: "saude",
    nome: "Saúde financeira",
    descricao: "Riscos, score, metas e tendências.",
    cards: [
      ["card-score", "grande"],
      ["card-riscos-financeiros", "grande"],
      ["card-metas-mes-dashboard", "grande"],
      ["card-orcamentos", "medio"],
      ["resumo-categorias", "medio"],
      ["card-tendencia", "grande"],
      ["card-comparativo", "grande"],
      ["card-comparativo-periodo", "grande"],
      ["card-cartoes-credito", "medio"],
    ],
  },
  {
    chave: "analitico",
    nome: "Analítico",
    descricao: "Comparações e origem dos gastos.",
    cards: [
      ["card-comparativo-periodo", "grande"],
      ["resumo-categorias", "medio"],
      ["card-tendencia", "grande"],
      ["card-comparativo", "grande"],
      ["card-por-autor", "medio"],
      ["card-assinaturas", "medio"],
      ["card-cartoes-credito", "medio"],
      ["card-orcamentos", "medio"],
    ],
  },
  {
    chave: "completo",
    nome: "Completo",
    descricao: "Todos os cards ativos no layout padrão.",
    cards: DASHBOARD_LAYOUT_CARD_CONFIGS.map((card) => [card.id, card.tamanhoPadrao]),
  },
];
const DASHBOARD_LAYOUT_BANNER_ID = "dashboard-layout-banner";
const DASHBOARD_LAYOUT_STORAGE_ULTIMO = `${DASHBOARD_LAYOUT_STORAGE_PREFIX}_ultimo`;

let dashboardLayoutEditando = false;
let dashboardLayoutCardArrastado = null;
let dashboardLayoutOrdemAntesEdicao = null;
let dashboardLayoutAplicandoOrdem = false;
let dashboardLayoutReaplicacaoPendente = false;
let dashboardLayoutConfigurado = false;

function layoutDashboardEstaEditando() {
  return dashboardLayoutEditando;
}

window.layoutDashboardEstaEditando = layoutDashboardEstaEditando;

function obterChaveLayoutDashboard() {
  const usuario = typeof obterUsuarioLogado === "function" ? obterUsuarioLogado() : null;
  const usuarioId = usuario?.id || "anonimo";
  return `${DASHBOARD_LAYOUT_STORAGE_PREFIX}_${usuarioId}`;
}

function obterChavesLeituraLayoutDashboard() {
  const chaves = [obterChaveLayoutDashboard(), DASHBOARD_LAYOUT_STORAGE_ULTIMO, `${DASHBOARD_LAYOUT_STORAGE_PREFIX}_anonimo`];
  return [...new Set(chaves.filter(Boolean))];
}

function obterContainerLayoutDashboard() {
  return document.querySelector(DASHBOARD_LAYOUT_MAIN_CONTAINER_SELECTOR);
}

function obterAreaLayoutDashboard() {
  return document.querySelector(DASHBOARD_LAYOUT_AREA_SELECTOR);
}

function obterContainersLayoutDashboard() {
  return [
    document.querySelector(DASHBOARD_LAYOUT_MAIN_CONTAINER_SELECTOR),
    document.querySelector(DASHBOARD_LAYOUT_SIDE_CONTAINER_SELECTOR),
  ].filter(Boolean);
}

function obterZonaCardLayoutDashboard(id) {
  return obterConfigCardLayoutDashboard(id).zona || "principal";
}

function obterContainerZonaLayoutDashboard(zona) {
  const seletor = zona === "lateral"
    ? DASHBOARD_LAYOUT_SIDE_CONTAINER_SELECTOR
    : DASHBOARD_LAYOUT_MAIN_CONTAINER_SELECTOR;
  return document.querySelector(seletor);
}

function obterContainerCardLayoutDashboard(id) {
  return obterContainerZonaLayoutDashboard(obterZonaCardLayoutDashboard(id));
}

function obterVisaoAtualLayoutDashboard() {
  const visao = document.getElementById("conteudo-periodo")?.dataset?.dashboardVisaoAtual;
  return DASHBOARD_LAYOUT_CARDS_POR_VISAO[visao] ? visao : "hoje";
}

function cardPertenceVisaoAtualLayoutDashboard(id) {
  return DASHBOARD_LAYOUT_CARDS_POR_VISAO[obterVisaoAtualLayoutDashboard()]?.has(id);
}

function obterCardsLayoutDashboard() {
  return DASHBOARD_LAYOUT_CARDS
    .map((id) => document.getElementById(id))
    .filter(Boolean);
}

function obterConfigCardLayoutDashboard(id) {
  return DASHBOARD_LAYOUT_CARD_CONFIGS.find((card) => card.id === id) || { id, nome: id, tamanhoPadrao: "medio" };
}

function obterOrdemPadraoLayoutDashboard() {
  return DASHBOARD_LAYOUT_CARDS.filter((id) => document.getElementById(id));
}

function normalizarTamanhoLayoutDashboard(tamanho, id) {
  const config = obterConfigCardLayoutDashboard(id);
  if (config.zona === "lateral" && tamanho === "inteiro") return config.tamanhoPadrao;
  if (DASHBOARD_LAYOUT_TAMANHOS[tamanho]) return tamanho;
  return config.tamanhoPadrao;
}

function normalizarZonaLayoutDashboard(zona, id) {
  if (DASHBOARD_LAYOUT_ZONAS[zona]) return zona;
  return obterZonaCardLayoutDashboard(id);
}

function obterTamanhoVisualAoMoverCardLayoutDashboard(card) {
  if (!card?.id) return "medio";

  const tamanhoAtual = card.dataset.dashboardLayoutTamanho;
  const config = obterConfigCardLayoutDashboard(card.id);
  if (config.zona === "lateral" && tamanhoAtual === "inteiro") return config.tamanhoPadrao;
  return normalizarTamanhoLayoutDashboard(tamanhoAtual, card.id);
}

function normalizarLayoutDashboard(layout) {
  let cards = [];

  if (Array.isArray(layout)) {
    cards = layout.map((id) => ({ id }));
  } else if (layout && typeof layout === "object") {
    if (Array.isArray(layout.cards)) {
      cards = layout.cards.map((item) => (typeof item === "string" ? { id: item } : item));
    } else {
      const lancamentos = Array.isArray(layout.lancamentos) ? layout.lancamentos : [];
      const controle = Array.isArray(layout.controle) ? layout.controle : [];
      cards = [...lancamentos, ...controle].map((id) => ({ id }));
    }
  }

  const vistos = new Set();
  const normalizados = cards
    .filter((item) => item?.id && DASHBOARD_LAYOUT_CARDS.includes(item.id) && !vistos.has(item.id))
    .map((item) => {
      vistos.add(item.id);
      return {
        id: item.id,
        tamanho: normalizarTamanhoLayoutDashboard(item.tamanho, item.id),
        zona: normalizarZonaLayoutDashboard(item.zona, item.id),
        visivel: item.visivel !== false,
      };
    });

  DASHBOARD_LAYOUT_CARDS
    .filter((id) => document.getElementById(id) && !vistos.has(id))
    .forEach((id) => {
      normalizados.push({
        id,
        tamanho: obterConfigCardLayoutDashboard(id).tamanhoPadrao,
        zona: obterZonaCardLayoutDashboard(id),
        visivel: true,
      });
    });

  return { version: 2, cards: normalizados };
}

function criarLayoutAPartirDePreset(preset) {
  const cardsPreset = Array.isArray(preset?.cards) ? preset.cards : [];
  const idsPreset = new Set(cardsPreset.map(([id]) => id).filter((id) => DASHBOARD_LAYOUT_CARDS.includes(id)));
  const cardsVisiveis = cardsPreset
    .filter(([id]) => DASHBOARD_LAYOUT_CARDS.includes(id) && document.getElementById(id))
    .map(([id, tamanho]) => ({
      id,
      tamanho: normalizarTamanhoLayoutDashboard(tamanho, id),
      zona: obterZonaCardLayoutDashboard(id),
      visivel: true,
    }));

  const cardsOcultos = DASHBOARD_LAYOUT_CARD_CONFIGS
    .filter((config) => document.getElementById(config.id) && !idsPreset.has(config.id))
    .map((config) => ({
      id: config.id,
      tamanho: config.tamanhoPadrao,
      zona: config.zona,
      visivel: false,
    }));

  return { version: 2, preset: preset?.chave || "", cards: [...cardsVisiveis, ...cardsOcultos] };
}

function lerLayoutDashboardSalvo() {
  for (const chave of obterChavesLeituraLayoutDashboard()) {
    try {
      const valor = lerLocalStorageSeguro(chave, "");
      if (!valor) continue;
      const layout = normalizarLayoutDashboard(JSON.parse(valor));
      if (layout.cards.length > 0) return layout;
    } catch {
      // Ignora layouts antigos/corrompidos e tenta a próxima chave.
    }
  }

  return normalizarLayoutDashboard([]);
}

function gravarLayoutDashboardSalvo(layout) {
  const valor = JSON.stringify(layout);
  gravarLocalStorageSeguro(obterChaveLayoutDashboard(), valor);
  gravarLocalStorageSeguro(DASHBOARD_LAYOUT_STORAGE_ULTIMO, valor);
}

function removerOrdemLayoutDashboardSalva() {
  removerLocalStorageSeguro(obterChaveLayoutDashboard());
  removerLocalStorageSeguro(DASHBOARD_LAYOUT_STORAGE_ULTIMO);
  removerLocalStorageSeguro(`${DASHBOARD_LAYOUT_STORAGE_PREFIX}_anonimo`);
}

function obterLayoutAtualDashboard() {
  const containers = obterContainersLayoutDashboard();
  if (containers.length === 0) return normalizarLayoutDashboard([]);

  const cards = containers.flatMap((container) => Array.from(container.children))
    .map((el) => el.id)
    .filter((id) => DASHBOARD_LAYOUT_CARDS.includes(id))
    .map((id) => {
      const card = document.getElementById(id);
      return {
        id,
        tamanho: normalizarTamanhoLayoutDashboard(card?.dataset?.dashboardLayoutTamanho, id),
        zona: card?.parentElement?.id === "dashboard-side-grid" ? "lateral" : "principal",
        visivel: !card?.classList.contains("dashboard-card-oculto-usuario"),
      };
    });

  return { version: 2, cards };
}
