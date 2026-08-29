// ==========================================
// dashboard-layout-ui.js - Modo de edição dos cards do dashboard
// ==========================================

const DASHBOARD_LAYOUT_STORAGE_PREFIX = "cadimus_dashboard_layout";
const DASHBOARD_LAYOUT_AREAS = [
  {
    chave: "lancamentos",
    seletor: "#dashboard-section .area-lancamentos",
    cards: ["card-hoje-dashboard", "card-comparativo-periodo", "card-lancamentos"],
  },
  {
    chave: "controle",
    seletor: "#dashboard-section .area-controle",
    cards: [
      "resumo-categorias",
      "card-tendencia",
      "card-comparativo",
      "card-por-autor",
      "card-despesas-fixas",
      "card-compras-parceladas",
      "card-bonificacoes",
      "card-orcamentos",
      "card-cartoes-credito",
      "card-score",
    ],
  },
];
const DASHBOARD_LAYOUT_CARDS = DASHBOARD_LAYOUT_AREAS.flatMap((area) => area.cards);
const DASHBOARD_LAYOUT_BANNER_ID = "dashboard-layout-banner";
const DASHBOARD_LAYOUT_STORAGE_ULTIMO = `${DASHBOARD_LAYOUT_STORAGE_PREFIX}_ultimo`;

let dashboardLayoutEditando = false;
let dashboardLayoutCardArrastado = null;
let dashboardLayoutAreaArrastada = null;
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

function lerOrdemLayoutDashboardSalva() {
  for (const chave of obterChavesLeituraLayoutDashboard()) {
    try {
      const valor = lerLocalStorageSeguro(chave, "");
      if (!valor) continue;
      const ordem = normalizarOrdemLayoutDashboard(JSON.parse(valor));
      if (Object.keys(ordem).length > 0) return ordem;
    } catch {
      // Ignora layouts antigos/corrompidos e tenta a próxima chave.
    }
  }

  return {};
}

function gravarOrdemLayoutDashboardSalva(ordem) {
  const valor = JSON.stringify(ordem);
  gravarLocalStorageSeguro(obterChaveLayoutDashboard(), valor);
  gravarLocalStorageSeguro(DASHBOARD_LAYOUT_STORAGE_ULTIMO, valor);
}

function removerOrdemLayoutDashboardSalva() {
  removerLocalStorageSeguro(obterChaveLayoutDashboard());
  removerLocalStorageSeguro(DASHBOARD_LAYOUT_STORAGE_ULTIMO);
  removerLocalStorageSeguro(`${DASHBOARD_LAYOUT_STORAGE_PREFIX}_anonimo`);
}

function obterAreaLayoutDashboard(chave) {
  const area = DASHBOARD_LAYOUT_AREAS.find((item) => item.chave === chave);
  const container = area ? document.querySelector(area.seletor) : null;
  return container ? { ...area, container } : null;
}

function obterAreasLayoutDashboard() {
  return DASHBOARD_LAYOUT_AREAS
    .map((area) => ({ ...area, container: document.querySelector(area.seletor) }))
    .filter((area) => area.container);
}

function obterContainerLayoutDashboard() {
  return obterAreaLayoutDashboard("controle")?.container || null;
}

function obterCardsLayoutDashboard() {
  return obterAreasLayoutDashboard().flatMap((area) =>
    area.cards
      .map((id) => area.container.querySelector(`#${id}`))
      .filter(Boolean)
  );
}

function obterCardsAreaLayoutDashboard(area) {
  if (!area?.container) return [];
  return area.cards
    .map((id) => area.container.querySelector(`#${id}`))
    .filter(Boolean);
}

function obterOrdemAtualLayoutDashboard() {
  return obterAreasLayoutDashboard().reduce((ordem, area) => {
    ordem[area.chave] = Array.from(area.container.children)
      .map((el) => el.id)
      .filter((id) => area.cards.includes(id));
    return ordem;
  }, {});
}

function normalizarOrdemLayoutDashboard(ordem) {
  if (Array.isArray(ordem)) {
    return { controle: ordem };
  }
  return ordem && typeof ordem === "object" ? ordem : {};
}

function aplicarOrdemEmAreaLayoutDashboard(area, ordem = []) {
  if (!area?.container || !Array.isArray(ordem)) return;
  const idsAplicados = new Set();
  const cardsOrdenados = [];

  ordem
    .filter((id) => area.cards.includes(id))
    .forEach((id) => {
      const card = document.getElementById(id);
      if (card && card.parentElement === area.container) {
        cardsOrdenados.push(card);
        idsAplicados.add(id);
      }
    });

  area.cards
    .filter((id) => !idsAplicados.has(id))
    .forEach((id) => {
      const card = document.getElementById(id);
      if (card && card.parentElement === area.container) cardsOrdenados.push(card);
    });

  cardsOrdenados.forEach((card, indice) => {
    if (area.container.children[indice] !== card) area.container.insertBefore(card, area.container.children[indice] || null);
  });
}

function aplicarOrdemLayoutDashboard(ordem) {
  const ordemNormalizada = normalizarOrdemLayoutDashboard(ordem);

  dashboardLayoutAplicandoOrdem = true;
  try {
    obterAreasLayoutDashboard().forEach((area) => {
      aplicarOrdemEmAreaLayoutDashboard(area, ordemNormalizada[area.chave] || area.cards);
    });
    const banner = document.getElementById(DASHBOARD_LAYOUT_BANNER_ID);
    if (banner?.parentElement) banner.parentElement.prepend(banner);
  } finally {
    dashboardLayoutAplicandoOrdem = false;
  }
}

function obterOuCriarBannerLayoutDashboard(container) {
  let banner = document.getElementById(DASHBOARD_LAYOUT_BANNER_ID);
  if (banner) return banner;

  banner = document.createElement("div");
  banner.id = DASHBOARD_LAYOUT_BANNER_ID;
  banner.className = "dashboard-layout-banner";
  banner.innerHTML = `
    <span class="dashboard-layout-banner-icone" aria-hidden="true">↕</span>
    <span class="dashboard-layout-banner-texto">
      <strong>Modo layout ativo</strong>
      <small>Arraste ou use ↑/↓ para reorganizar. Clique em Salvar layout ao finalizar.</small>
    </span>
  `;
  container.prepend(banner);
  return banner;
}

function aplicarLayoutDashboardSalvo() {
  const areas = obterAreasLayoutDashboard();
  if (areas.length === 0) return false;

  const ordemNormalizada = lerOrdemLayoutDashboardSalva();
  if (Object.keys(ordemNormalizada).length === 0) return false;

  aplicarOrdemLayoutDashboard(ordemNormalizada);
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
  gravarOrdemLayoutDashboardSalva(obterOrdemAtualLayoutDashboard());
  dashboardLayoutOrdemAntesEdicao = null;
  mostrarToast("Layout do dashboard salvo", "sucesso");
}

function resetarLayoutDashboard() {
  if (obterAreasLayoutDashboard().length === 0) return;

  removerOrdemLayoutDashboardSalva();
  aplicarOrdemLayoutDashboard(
    DASHBOARD_LAYOUT_AREAS.reduce((ordem, area) => {
      ordem[area.chave] = area.cards;
      return ordem;
    }, {})
  );
  dashboardLayoutOrdemAntesEdicao = null;
  dashboardLayoutEditando = false;
  atualizarEstadoModoLayoutDashboard();
  atualizarControlesCardsLayoutDashboard();

  mostrarToast("Layout padrão restaurado", "sucesso");
}

function removerControlesCardsLayoutDashboard() {
  document.querySelectorAll(".dashboard-layout-card-acoes").forEach((acoes) => acoes.remove());
}

function moverCardLayoutDashboard(card, direcao) {
  const area = obterAreasLayoutDashboard().find((item) => item.container === card?.parentElement);
  if (!area || !card) return;
  const cardsVisiveis = obterCardsAreaLayoutDashboard(area).filter((item) => item.offsetParent !== null);
  const indice = cardsVisiveis.indexOf(card);
  if (indice < 0) return;

  const alvo = cardsVisiveis[indice + direcao];
  if (!alvo) return;

  if (direcao < 0) area.container.insertBefore(card, alvo);
  else area.container.insertBefore(alvo, card);
  atualizarControlesCardsLayoutDashboard();
}

function atualizarControlesCardsLayoutDashboard() {
  if (!dashboardLayoutEditando) {
    removerControlesCardsLayoutDashboard();
    return;
  }

  obterAreasLayoutDashboard().forEach((area) => {
    const cardsVisiveis = obterCardsAreaLayoutDashboard(area).filter((card) => card.offsetParent !== null);
    cardsVisiveis.forEach((card, indice) => {
      let acoes = card.querySelector(":scope > .dashboard-layout-card-acoes");
      if (!acoes) {
        acoes = document.createElement("div");
        acoes.className = "dashboard-layout-card-acoes";
        acoes.innerHTML = `
          <button type="button" data-layout-mover="-1" title="Mover card para cima" aria-label="Mover card para cima">↑</button>
          <button type="button" data-layout-mover="1" title="Mover card para baixo" aria-label="Mover card para baixo">↓</button>
        `;
        card.appendChild(acoes);
      }

      const btnSubir = acoes.querySelector('[data-layout-mover="-1"]');
      const btnDescer = acoes.querySelector('[data-layout-mover="1"]');
      if (btnSubir) btnSubir.disabled = indice === 0;
      if (btnDescer) btnDescer.disabled = indice === cardsVisiveis.length - 1;
    });
  });
}

function atualizarEstadoModoLayoutDashboard() {
  const botao = document.getElementById("btn-editar-layout-dashboard");
  const cancelar = document.getElementById("btn-cancelar-layout-dashboard");
  const divisorCancelar = document.querySelector(".acoes-topo-divider-cancelar-layout");
  const areas = obterAreasLayoutDashboard();
  if (areas.length === 0 || !botao) return;
  const label = botao.querySelector(".btn-topo-label");

  document.body.classList.toggle("dashboard-layout-modo-ativo", dashboardLayoutEditando);
  areas.forEach((area) => area.container.classList.toggle("dashboard-layout-editando", dashboardLayoutEditando));
  botao.classList.toggle("ativo", dashboardLayoutEditando);
  botao.setAttribute("aria-pressed", String(dashboardLayoutEditando));
  botao.title = dashboardLayoutEditando ? "Salvar layout do dashboard" : "Editar layout do dashboard";
  if (label) label.textContent = dashboardLayoutEditando ? "Salvar layout" : "Layout";
  if (cancelar) cancelar.hidden = !dashboardLayoutEditando;
  if (divisorCancelar) divisorCancelar.hidden = !dashboardLayoutEditando;

  const areaBanner = obterAreaLayoutDashboard("lancamentos") || obterAreaLayoutDashboard("controle");
  const banner = dashboardLayoutEditando && areaBanner
    ? obterOuCriarBannerLayoutDashboard(areaBanner.container)
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
  if (!dashboardLayoutEditando) dashboardLayoutOrdemAntesEdicao = obterOrdemAtualLayoutDashboard();
  dashboardLayoutEditando = !dashboardLayoutEditando;
  atualizarEstadoModoLayoutDashboard();

  if (dashboardLayoutEditando) {
    mostrarToast("Modo layout ativo. Arraste os cards e clique em Salvar layout.", "aviso");
  } else {
    salvarLayoutDashboard();
  }
}

function cancelarModoLayoutDashboard() {
  if (!dashboardLayoutEditando) return;
  aplicarOrdemLayoutDashboard(dashboardLayoutOrdemAntesEdicao);
  dashboardLayoutOrdemAntesEdicao = null;
  dashboardLayoutEditando = false;
  atualizarEstadoModoLayoutDashboard();
  mostrarToast("Edição de layout cancelada", "info");
}

function obterCardDepoisDoArraste(container, y) {
  const cards = [...container.querySelectorAll(".dashboard-card-editavel:not(.arrastando)")].filter((card) => card.offsetParent !== null);

  return cards.reduce((maisProximo, card) => {
    const box = card.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > maisProximo.offset) {
      return { offset, element: card };
    }
    return maisProximo;
  }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
}

function configurarEventosAreaLayoutDashboard(area) {
  const { container } = area;

  container.addEventListener("dragstart", (evento) => {
    if (!dashboardLayoutEditando) return;
    const card = evento.target.closest(".dashboard-card-editavel");
    if (!card || card.parentElement !== container) return;
    dashboardLayoutCardArrastado = card;
    dashboardLayoutAreaArrastada = container;
    card.classList.add("arrastando");
    card.setAttribute("aria-grabbed", "true");
    evento.dataTransfer.effectAllowed = "move";
    evento.dataTransfer.setData("text/plain", card.id);
  });

  container.addEventListener("dragend", () => {
    dashboardLayoutCardArrastado?.classList.remove("arrastando");
    dashboardLayoutCardArrastado?.setAttribute("aria-grabbed", "false");
    dashboardLayoutCardArrastado = null;
    dashboardLayoutAreaArrastada = null;
    atualizarControlesCardsLayoutDashboard();
  });

  container.addEventListener("dragover", (evento) => {
    if (!dashboardLayoutEditando || !dashboardLayoutCardArrastado || dashboardLayoutAreaArrastada !== container) return;
    evento.preventDefault();
    const depois = obterCardDepoisDoArraste(container, evento.clientY);
    if (depois) container.insertBefore(dashboardLayoutCardArrastado, depois);
    else container.appendChild(dashboardLayoutCardArrastado);
    atualizarControlesCardsLayoutDashboard();
  });

  container.addEventListener("click", (evento) => {
    const botaoMover = evento.target.closest("[data-layout-mover]");
    if (!dashboardLayoutEditando || !botaoMover) return;
    evento.preventDefault();
    evento.stopPropagation();
    moverCardLayoutDashboard(botaoMover.closest(".dashboard-card-editavel"), Number(botaoMover.dataset.layoutMover));
  });
}

function configurarEventosLayoutDashboard() {
  obterAreasLayoutDashboard().forEach(configurarEventosAreaLayoutDashboard);
}

function configurarDashboardLayout() {
  if (dashboardLayoutConfigurado) return;
  const botao = document.getElementById("btn-editar-layout-dashboard");
  const cancelar = document.getElementById("btn-cancelar-layout-dashboard");
  const resetar = document.getElementById("btn-resetar-layout-dashboard");
  const areas = obterAreasLayoutDashboard();
  if (!botao || areas.length === 0) return;
  dashboardLayoutConfigurado = true;

  aplicarLayoutDashboardSalvo();
  configurarEventosLayoutDashboard();
  document.addEventListener("click", bloquearCriacaoDuranteLayout, true);

  areas.forEach((area) => {
    const observer = new MutationObserver(agendarReaplicacaoLayoutDashboard);
    observer.observe(area.container, { childList: true });
  });

  botao.addEventListener("click", alternarModoLayoutDashboard);
  cancelar?.addEventListener("click", cancelarModoLayoutDashboard);
  resetar?.addEventListener("click", resetarLayoutDashboard);
  window.addEventListener("cadimus:usuario-logado", reaplicarLayoutDashboardSalvo);
  atualizarEstadoModoLayoutDashboard();
}
