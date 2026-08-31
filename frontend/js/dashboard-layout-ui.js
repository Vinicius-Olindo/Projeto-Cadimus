// ==========================================
// dashboard-layout-ui.js - Modo de edição livre dos cards do dashboard
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
  { id: "resumo-categorias", nome: "Categorias", tamanhoPadrao: "inteiro", zona: "lateral" },
  { id: "card-tendencia", nome: "Evolução mensal", tamanhoPadrao: "inteiro", zona: "lateral" },
  { id: "card-comparativo", nome: "Saldo vs despesas", tamanhoPadrao: "inteiro", zona: "lateral" },
  { id: "card-por-autor", nome: "Quem gastou quanto", tamanhoPadrao: "inteiro", zona: "lateral" },
  { id: "card-despesas-fixas", nome: "Despesas fixas", tamanhoPadrao: "inteiro", zona: "lateral" },
  { id: "card-compras-parceladas", nome: "Compras parceladas", tamanhoPadrao: "inteiro", zona: "lateral" },
  { id: "card-bonificacoes", nome: "Bonificações", tamanhoPadrao: "inteiro", zona: "lateral" },
  { id: "card-assinaturas", nome: "Assinaturas", tamanhoPadrao: "inteiro", zona: "lateral" },
  { id: "card-metas-mes-dashboard", nome: "Metas do mês", tamanhoPadrao: "inteiro", zona: "lateral" },
  { id: "card-orcamentos", nome: "Orçamento", tamanhoPadrao: "inteiro", zona: "lateral" },
  { id: "card-cartoes-credito", nome: "Cartões", tamanhoPadrao: "inteiro", zona: "lateral" },
  { id: "card-riscos-financeiros", nome: "Riscos financeiros", tamanhoPadrao: "inteiro", zona: "lateral" },
  { id: "card-modelos-lancamento", nome: "Modelos rápidos", tamanhoPadrao: "inteiro", zona: "lateral" },
  { id: "card-score", nome: "Saúde financeira", tamanhoPadrao: "inteiro", zona: "lateral" },
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

function obterContainerCardLayoutDashboard(id) {
  const seletor = obterZonaCardLayoutDashboard(id) === "lateral"
    ? DASHBOARD_LAYOUT_SIDE_CONTAINER_SELECTOR
    : DASHBOARD_LAYOUT_MAIN_CONTAINER_SELECTOR;
  return document.querySelector(seletor);
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
  if (DASHBOARD_LAYOUT_TAMANHOS[tamanho]) return tamanho;
  return obterConfigCardLayoutDashboard(id).tamanhoPadrao;
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
        visivel: item.visivel !== false,
      };
    });

  DASHBOARD_LAYOUT_CARDS
    .filter((id) => document.getElementById(id) && !vistos.has(id))
    .forEach((id) => {
      normalizados.push({
        id,
        tamanho: obterConfigCardLayoutDashboard(id).tamanhoPadrao,
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
      visivel: true,
    }));

  const cardsOcultos = DASHBOARD_LAYOUT_CARD_CONFIGS
    .filter((config) => document.getElementById(config.id) && !idsPreset.has(config.id))
    .map((config) => ({
      id: config.id,
      tamanho: config.tamanhoPadrao,
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
        visivel: !card?.classList.contains("dashboard-card-oculto-usuario"),
      };
    });

  return { version: 2, cards };
}

function aplicarPreferenciasCardLayoutDashboard(card, preferencias = {}) {
  if (!card?.id || !DASHBOARD_LAYOUT_CARDS.includes(card.id)) return;

  const tamanho = normalizarTamanhoLayoutDashboard(preferencias.tamanho, card.id);
  card.dataset.dashboardLayoutTamanho = tamanho;
  card.classList.toggle("dashboard-card-oculto-usuario", preferencias.visivel === false);
  card.setAttribute("data-layout-visivel", preferencias.visivel === false ? "false" : "true");
}

function aplicarLayoutDashboard(layout = []) {
  const containers = obterContainersLayoutDashboard();
  if (containers.length === 0) return;

  const layoutNormalizado = normalizarLayoutDashboard(layout);
  const configsPorId = new Map(layoutNormalizado.cards.map((card) => [card.id, card]));
  const idsAplicadosPorZona = new Map();
  const cardsOrdenadosPorZona = new Map();

  dashboardLayoutAplicandoOrdem = true;
  try {
    layoutNormalizado.cards
      .map((item) => item.id)
      .filter((id) => DASHBOARD_LAYOUT_CARDS.includes(id))
      .forEach((id) => {
        const card = document.getElementById(id);
        const zona = obterZonaCardLayoutDashboard(id);
        const container = obterContainerCardLayoutDashboard(id);
        if (!card || !container) return;
        const cardsOrdenados = cardsOrdenadosPorZona.get(zona) || [];
        const idsAplicados = idsAplicadosPorZona.get(zona) || new Set();
        cardsOrdenados.push(card);
        idsAplicados.add(id);
        cardsOrdenadosPorZona.set(zona, cardsOrdenados);
        idsAplicadosPorZona.set(zona, idsAplicados);
      });

    DASHBOARD_LAYOUT_CARDS
      .forEach((id) => {
        const zona = obterZonaCardLayoutDashboard(id);
        const idsAplicados = idsAplicadosPorZona.get(zona) || new Set();
        if (idsAplicados.has(id)) return;
        const card = document.getElementById(id);
        const container = obterContainerCardLayoutDashboard(id);
        if (!card || !container) return;
        const cardsOrdenados = cardsOrdenadosPorZona.get(zona) || [];
        cardsOrdenados.push(card);
        idsAplicados.add(id);
        cardsOrdenadosPorZona.set(zona, cardsOrdenados);
        idsAplicadosPorZona.set(zona, idsAplicados);
      });

    cardsOrdenadosPorZona.forEach((cardsOrdenados, zona) => {
      const container = zona === "lateral"
        ? document.querySelector(DASHBOARD_LAYOUT_SIDE_CONTAINER_SELECTOR)
        : document.querySelector(DASHBOARD_LAYOUT_MAIN_CONTAINER_SELECTOR);
      if (!container) return;
      cardsOrdenados.forEach((card, indice) => {
        aplicarPreferenciasCardLayoutDashboard(card, configsPorId.get(card.id));
        if (container.children[indice] !== card) container.insertBefore(card, container.children[indice] || null);
      });
    });

    const banner = document.getElementById(DASHBOARD_LAYOUT_BANNER_ID);
    const area = obterAreaLayoutDashboard();
    if (banner && area) area.prepend(banner);
  } finally {
    dashboardLayoutAplicandoOrdem = false;
  }
}

function aplicarPresetLayoutDashboard(chave) {
  const preset = DASHBOARD_LAYOUT_PRESETS.find((item) => item.chave === chave);
  if (!preset) return;

  aplicarLayoutDashboard(criarLayoutAPartirDePreset(preset));
  renderizarPainelLayoutDashboard();
  atualizarControlesCardsLayoutDashboard();
  mostrarToast(`Preset "${preset.nome}" aplicado. Clique em Salvar layout para confirmar.`, "info");
}

function renderizarBotoesPresetLayoutDashboard() {
  return DASHBOARD_LAYOUT_PRESETS
    .map(
      (preset) => `
        <button type="button" class="dashboard-layout-preset-btn" data-layout-preset="${preset.chave}" title="${preset.descricao}">
          <strong>${preset.nome}</strong>
          <span>${preset.descricao}</span>
        </button>
      `
    )
    .join("");
}

function obterOuCriarBannerLayoutDashboard(container) {
  let banner = document.getElementById(DASHBOARD_LAYOUT_BANNER_ID);
  if (banner) {
    renderizarPainelLayoutDashboard();
    return banner;
  }

  banner = document.createElement("div");
  banner.id = DASHBOARD_LAYOUT_BANNER_ID;
  banner.className = "dashboard-layout-banner";
  banner.innerHTML = `
    <div class="dashboard-layout-banner-resumo">
      <span class="dashboard-layout-banner-icone" aria-hidden="true">↕</span>
      <span class="dashboard-layout-banner-texto">
        <strong>Modo layout ativo</strong>
        <small>Escolha um preset, arraste, ajuste tamanhos e oculte cards. Clique em Salvar layout ao finalizar.</small>
      </span>
    </div>
    <div class="dashboard-layout-presets" id="dashboard-layout-presets" aria-label="Presets de layout">
      ${renderizarBotoesPresetLayoutDashboard()}
    </div>
    <div class="dashboard-layout-banner-acoes">
      <button type="button" class="dashboard-layout-toggle-painel" data-layout-toggle-painel aria-expanded="false">
        Configurar cards
      </button>
    </div>
    <div class="dashboard-layout-painel" id="dashboard-layout-painel" aria-label="Configurações dos cards" hidden></div>
  `;
  container.prepend(banner);
  renderizarPainelLayoutDashboard();
  return banner;
}

function renderizarPainelLayoutDashboard() {
  const painel = document.getElementById("dashboard-layout-painel");
  if (!painel) return;

  painel.innerHTML = DASHBOARD_LAYOUT_CARD_CONFIGS
    .filter((config) => document.getElementById(config.id) && cardPertenceVisaoAtualLayoutDashboard(config.id))
    .map((config) => {
      const card = document.getElementById(config.id);
      const tamanhoAtual = normalizarTamanhoLayoutDashboard(card?.dataset?.dashboardLayoutTamanho, config.id);
      const visivel = !card?.classList.contains("dashboard-card-oculto-usuario");
      const opcoesTamanho = Object.entries(DASHBOARD_LAYOUT_TAMANHOS)
        .map(([valor, rotulo]) => `<option value="${valor}" ${valor === tamanhoAtual ? "selected" : ""}>${rotulo}</option>`)
        .join("");

      return `
        <div class="dashboard-layout-painel-item" data-layout-card-config="${config.id}">
          <label class="dashboard-layout-visibilidade">
            <input type="checkbox" data-layout-visivel-card="${config.id}" ${visivel ? "checked" : ""} />
            <span>${config.nome}</span>
          </label>
          <select data-layout-tamanho-card="${config.id}" aria-label="Tamanho de ${config.nome}">
            ${opcoesTamanho}
          </select>
        </div>
      `;
    })
    .join("");
}

function aplicarLayoutDashboardSalvo() {
  if (obterContainersLayoutDashboard().length === 0) return false;

  const layout = lerLayoutDashboardSalvo();
  if (layout.cards.length === 0) return false;

  aplicarLayoutDashboard(layout);
  return true;
}

function reaplicarLayoutDashboardSalvo() {
  if (dashboardLayoutEditando) return;
  aplicarLayoutDashboardSalvo();
}

function agendarReaplicacaoLayoutDashboard() {
  if (dashboardLayoutEditando || dashboardLayoutAplicandoOrdem || dashboardLayoutReaplicacaoPendente) return;
  dashboardLayoutReaplicacaoPendente = true;
  requestAnimationFrame(() => {
    dashboardLayoutReaplicacaoPendente = false;
    reaplicarLayoutDashboardSalvo();
  });
}

function salvarLayoutDashboard() {
  gravarLayoutDashboardSalvo(obterLayoutAtualDashboard());
  dashboardLayoutOrdemAntesEdicao = null;
  mostrarToast("Layout do dashboard salvo", "sucesso");
}

function resetarLayoutDashboard() {
  if (obterContainersLayoutDashboard().length === 0) return;

  removerOrdemLayoutDashboardSalva();
  aplicarLayoutDashboard(obterOrdemPadraoLayoutDashboard());
  dashboardLayoutOrdemAntesEdicao = null;
  dashboardLayoutEditando = false;
  atualizarEstadoModoLayoutDashboard();
  atualizarControlesCardsLayoutDashboard();

  mostrarToast("Layout padrão restaurado", "sucesso");
}

function removerControlesCardsLayoutDashboard() {
  document.querySelectorAll(".dashboard-layout-card-acoes").forEach((acoes) => acoes.remove());
}

function obterCardsVisiveisLayoutDashboard() {
  return obterCardsLayoutDashboard().filter((item) => item.offsetParent !== null && !item.classList.contains("dashboard-visao-oculto"));
}

function moverCardLayoutDashboard(card, direcao) {
  const container = card?.parentElement;
  if (!container || !card || card.parentElement !== container) return;
  const cardsVisiveis = obterCardsVisiveisLayoutDashboard().filter((item) => item.parentElement === container);
  const indice = cardsVisiveis.indexOf(card);
  if (indice < 0) return;

  const alvo = cardsVisiveis[indice + direcao];
  if (!alvo) return;

  if (direcao < 0) container.insertBefore(card, alvo);
  else container.insertBefore(alvo, card);
  atualizarControlesCardsLayoutDashboard();
}

function alterarTamanhoCardLayoutDashboard(id, tamanho) {
  const card = document.getElementById(id);
  if (!card || !DASHBOARD_LAYOUT_CARDS.includes(id)) return;

  card.dataset.dashboardLayoutTamanho = normalizarTamanhoLayoutDashboard(tamanho, id);
  atualizarControlesCardsLayoutDashboard();
}

function alterarVisibilidadeCardLayoutDashboard(id, visivel) {
  const card = document.getElementById(id);
  if (!card || !DASHBOARD_LAYOUT_CARDS.includes(id)) return;

  card.classList.toggle("dashboard-card-oculto-usuario", !visivel);
  card.setAttribute("data-layout-visivel", visivel ? "true" : "false");
  atualizarControlesCardsLayoutDashboard();
}

function atualizarControlesCardsLayoutDashboard() {
  if (!dashboardLayoutEditando) {
    removerControlesCardsLayoutDashboard();
    return;
  }

  obterCardsVisiveisLayoutDashboard().forEach((card) => {
    const cardsVisiveisDoContainer = obterCardsVisiveisLayoutDashboard().filter((item) => item.parentElement === card.parentElement);
    const indice = cardsVisiveisDoContainer.indexOf(card);
    let acoes = card.querySelector(":scope > .dashboard-layout-card-acoes");
    if (!acoes) {
      acoes = document.createElement("div");
      acoes.className = "dashboard-layout-card-acoes";
      acoes.innerHTML = `
        <button type="button" data-layout-mover="-1" title="Mover card para trás" aria-label="Mover card para trás">←</button>
        <button type="button" data-layout-mover="1" title="Mover card para frente" aria-label="Mover card para frente">→</button>
      `;
      card.appendChild(acoes);
    }

    const btnAnterior = acoes.querySelector('[data-layout-mover="-1"]');
    const btnProximo = acoes.querySelector('[data-layout-mover="1"]');
    if (btnAnterior) btnAnterior.disabled = indice === 0;
    if (btnProximo) btnProximo.disabled = indice === cardsVisiveisDoContainer.length - 1;
  });
}

function atualizarEstadoModoLayoutDashboard() {
  const botao = document.getElementById("btn-editar-layout-dashboard");
  const cancelar = document.getElementById("btn-cancelar-layout-dashboard");
  const divisorCancelar = document.querySelector(".acoes-topo-divider-cancelar-layout");
  const area = obterAreaLayoutDashboard();
  const containers = obterContainersLayoutDashboard();
  if (!area || containers.length === 0 || !botao) return;
  const label = botao.querySelector(".btn-topo-label");

  document.body.classList.toggle("dashboard-layout-modo-ativo", dashboardLayoutEditando);
  containers.forEach((container) => container.classList.toggle("dashboard-layout-editando", dashboardLayoutEditando));
  botao.classList.toggle("ativo", dashboardLayoutEditando);
  botao.setAttribute("aria-pressed", String(dashboardLayoutEditando));
  botao.title = dashboardLayoutEditando ? "Salvar layout do dashboard" : "Editar layout do dashboard";
  if (label) label.textContent = dashboardLayoutEditando ? "Salvar layout" : "Layout";
  if (cancelar) cancelar.hidden = !dashboardLayoutEditando;
  if (divisorCancelar) divisorCancelar.hidden = !dashboardLayoutEditando;

  const banner = dashboardLayoutEditando
    ? obterOuCriarBannerLayoutDashboard(area)
    : document.getElementById(DASHBOARD_LAYOUT_BANNER_ID);
  if (banner) banner.hidden = !dashboardLayoutEditando;

  obterCardsLayoutDashboard().forEach((card) => {
    card.draggable = dashboardLayoutEditando;
    card.classList.toggle("dashboard-card-editavel", dashboardLayoutEditando);
    card.setAttribute("aria-grabbed", String(dashboardLayoutEditando && card.classList.contains("arrastando")));
  });
  atualizarControlesCardsLayoutDashboard();
}

function bloquearCriacaoDuranteLayout(evento) {
  if (!dashboardLayoutEditando) return;

  const seletorBloqueado = [
    "#btn-novo-gasto",
    "#btn-nova-despesa-fixa",
    "#btn-nova-compra-parcelada",
    "#btn-nova-bonificacao",
    "#btn-despesas-fixas",
    "#btn-compras-parceladas",
    "#btn-bonificacoes",
    "[data-atalho-lancamento]",
  ].join(",");

  if (!evento.target.closest(seletorBloqueado)) return;

  evento.preventDefault();
  evento.stopPropagation();
  evento.stopImmediatePropagation();
  mostrarToast("Finalize ou cancele a edição de layout antes de criar lançamentos.", "aviso");
}

function alternarModoLayoutDashboard() {
  if (!dashboardLayoutEditando) dashboardLayoutOrdemAntesEdicao = obterLayoutAtualDashboard();
  dashboardLayoutEditando = !dashboardLayoutEditando;
  atualizarEstadoModoLayoutDashboard();

  if (dashboardLayoutEditando) {
    mostrarToast("Modo layout ativo. Arraste os cards livremente pela grade e clique em Salvar layout.", "aviso");
  } else {
    salvarLayoutDashboard();
  }
}

function cancelarModoLayoutDashboard() {
  if (!dashboardLayoutEditando) return;
  aplicarLayoutDashboard(dashboardLayoutOrdemAntesEdicao);
  dashboardLayoutOrdemAntesEdicao = null;
  dashboardLayoutEditando = false;
  atualizarEstadoModoLayoutDashboard();
  mostrarToast("Edição de layout cancelada", "info");
}

function obterCardDepoisDoArraste(container, x, y) {
  const cards = [...container.querySelectorAll(".dashboard-card-editavel:not(.arrastando)")].filter((card) => card.offsetParent !== null);

  return cards.find((card) => {
    const box = card.getBoundingClientRect();
    const meioY = box.top + box.height / 2;
    const meioX = box.left + box.width / 2;
    const mesmaLinha = y >= box.top && y <= box.bottom;

    return y < meioY || (mesmaLinha && x < meioX);
  }) || null;
}

function configurarEventosLayoutDashboard() {
  const area = obterAreaLayoutDashboard();
  const containers = obterContainersLayoutDashboard();
  if (!area || containers.length === 0) return;

  containers.forEach((container) => {
    container.addEventListener("dragstart", (evento) => {
      if (!dashboardLayoutEditando) return;
      const card = evento.target.closest(".dashboard-card-editavel");
      if (!card || card.parentElement !== container) return;
      dashboardLayoutCardArrastado = card;
      card.classList.add("arrastando");
      card.setAttribute("aria-grabbed", "true");
      evento.dataTransfer.effectAllowed = "move";
      evento.dataTransfer.setData("text/plain", card.id);
    });

    container.addEventListener("dragend", () => {
      dashboardLayoutCardArrastado?.classList.remove("arrastando");
      dashboardLayoutCardArrastado?.setAttribute("aria-grabbed", "false");
      dashboardLayoutCardArrastado = null;
      atualizarControlesCardsLayoutDashboard();
    });

    container.addEventListener("dragover", (evento) => {
      if (!dashboardLayoutEditando || !dashboardLayoutCardArrastado || dashboardLayoutCardArrastado.parentElement !== container) return;
      evento.preventDefault();
      const depois = obterCardDepoisDoArraste(container, evento.clientX, evento.clientY);
      if (depois) container.insertBefore(dashboardLayoutCardArrastado, depois);
      else container.appendChild(dashboardLayoutCardArrastado);
      atualizarControlesCardsLayoutDashboard();
    });
  });

  area.addEventListener("click", (evento) => {
    const botaoPreset = evento.target.closest("[data-layout-preset]");
    if (dashboardLayoutEditando && botaoPreset) {
      evento.preventDefault();
      evento.stopPropagation();
      aplicarPresetLayoutDashboard(botaoPreset.dataset.layoutPreset);
      return;
    }

    const botaoPainel = evento.target.closest("[data-layout-toggle-painel]");
    if (dashboardLayoutEditando && botaoPainel) {
      const painel = document.getElementById("dashboard-layout-painel");
      if (!painel) return;
      const abrir = painel.hidden;
      painel.hidden = !abrir;
      botaoPainel.setAttribute("aria-expanded", String(abrir));
      botaoPainel.textContent = abrir ? "Ocultar configurações" : "Configurar cards";
      if (abrir) renderizarPainelLayoutDashboard();
      return;
    }

    const botaoMover = evento.target.closest("[data-layout-mover]");
    if (!dashboardLayoutEditando || !botaoMover) return;
    evento.preventDefault();
    evento.stopPropagation();
    moverCardLayoutDashboard(botaoMover.closest(".dashboard-card-editavel"), Number(botaoMover.dataset.layoutMover));
  });

  area.addEventListener("change", (evento) => {
    if (!dashboardLayoutEditando) return;

    const seletorTamanho = evento.target.closest("[data-layout-tamanho-card]");
    if (seletorTamanho) {
      alterarTamanhoCardLayoutDashboard(seletorTamanho.dataset.layoutTamanhoCard, seletorTamanho.value);
      return;
    }

    const checkboxVisivel = evento.target.closest("[data-layout-visivel-card]");
    if (checkboxVisivel) {
      alterarVisibilidadeCardLayoutDashboard(checkboxVisivel.dataset.layoutVisivelCard, checkboxVisivel.checked);
    }
  });
}

function configurarDashboardLayout() {
  if (dashboardLayoutConfigurado) return;
  const botao = document.getElementById("btn-editar-layout-dashboard");
  const cancelar = document.getElementById("btn-cancelar-layout-dashboard");
  const resetar = document.getElementById("btn-resetar-layout-dashboard");
  const containers = obterContainersLayoutDashboard();
  if (!botao || containers.length === 0) return;
  dashboardLayoutConfigurado = true;

  aplicarLayoutDashboardSalvo();
  configurarEventosLayoutDashboard();
  document.addEventListener("click", bloquearCriacaoDuranteLayout, true);

  const observer = new MutationObserver(agendarReaplicacaoLayoutDashboard);
  containers.forEach((container) => observer.observe(container, { childList: true }));

  botao.addEventListener("click", () => {
    if (!dashboardLayoutEditando && typeof ativarVisaoDashboard === "function") {
      ativarVisaoDashboard("dashboard");
    }
    alternarModoLayoutDashboard();
  });
  cancelar?.addEventListener("click", cancelarModoLayoutDashboard);
  resetar?.addEventListener("click", resetarLayoutDashboard);
  window.addEventListener("cadimus:usuario-logado", reaplicarLayoutDashboardSalvo);
  document.addEventListener("cadimus:dashboard-visao-alterada", () => {
    if (!dashboardLayoutEditando) return;
    renderizarPainelLayoutDashboard();
    atualizarControlesCardsLayoutDashboard();
  });
  atualizarEstadoModoLayoutDashboard();
}
