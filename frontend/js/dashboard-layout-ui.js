// ==========================================
// dashboard-layout-ui.js - Modo de edição dos cards do dashboard
// ==========================================

const DASHBOARD_LAYOUT_STORAGE_PREFIX = "cadimus_dashboard_layout";
const DASHBOARD_LAYOUT_CARDS = [
  "resumo-categorias",
  "card-tendencia",
  "card-comparativo",
  "card-por-autor",
  "card-despesas-fixas",
  "card-compras-parceladas",
  "card-orcamentos",
  "card-cartoes-credito",
  "card-score",
];

let dashboardLayoutEditando = false;
let dashboardLayoutCardArrastado = null;
let dashboardLayoutOrdemAntesEdicao = [];
const DASHBOARD_LAYOUT_BANNER_ID = "dashboard-layout-banner";

function obterChaveLayoutDashboard() {
  const usuario = typeof obterUsuarioLogado === "function" ? obterUsuarioLogado() : null;
  const usuarioId = usuario?.id || "anonimo";
  return `${DASHBOARD_LAYOUT_STORAGE_PREFIX}_${usuarioId}`;
}

function obterContainerLayoutDashboard() {
  return document.querySelector("#dashboard-section .area-controle");
}

function obterCardsLayoutDashboard() {
  const container = obterContainerLayoutDashboard();
  if (!container) return [];
  return DASHBOARD_LAYOUT_CARDS
    .map((id) => container.querySelector(`#${id}`))
    .filter(Boolean);
}

function obterOrdemAtualLayoutDashboard() {
  const container = obterContainerLayoutDashboard();
  if (!container) return [];
  return Array.from(container.children)
    .map((el) => el.id)
    .filter((id) => DASHBOARD_LAYOUT_CARDS.includes(id));
}

function aplicarOrdemLayoutDashboard(ordem) {
  const container = obterContainerLayoutDashboard();
  if (!container || !Array.isArray(ordem)) return;
  const idsAplicados = new Set();

  ordem
    .filter((id) => DASHBOARD_LAYOUT_CARDS.includes(id))
    .forEach((id) => {
      const card = document.getElementById(id);
      if (card && card.parentElement === container) {
        container.appendChild(card);
        idsAplicados.add(id);
      }
    });

  DASHBOARD_LAYOUT_CARDS
    .filter((id) => !idsAplicados.has(id))
    .forEach((id) => {
      const card = document.getElementById(id);
      if (card && card.parentElement === container) container.appendChild(card);
    });
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
  const container = obterContainerLayoutDashboard();
  if (!container) return;

  let ordemSalva = [];
  try {
    ordemSalva = JSON.parse(lerLocalStorageSeguro(obterChaveLayoutDashboard(), "[]") || "[]");
  } catch {
    ordemSalva = [];
  }

  if (!Array.isArray(ordemSalva) || ordemSalva.length === 0) return;

  const idsValidos = new Set(DASHBOARD_LAYOUT_CARDS);
  ordemSalva
    .filter((id) => idsValidos.has(id))
    .forEach((id) => {
      const card = document.getElementById(id);
      if (card && card.parentElement === container) container.appendChild(card);
    });
}

function salvarLayoutDashboard() {
  gravarLocalStorageSeguro(obterChaveLayoutDashboard(), JSON.stringify(obterOrdemAtualLayoutDashboard()));
  dashboardLayoutOrdemAntesEdicao = [];
  mostrarToast("Layout do dashboard salvo", "sucesso");
}

function resetarLayoutDashboard() {
  const container = obterContainerLayoutDashboard();
  if (!container) return;

  if (!dashboardLayoutEditando) removerLocalStorageSeguro(obterChaveLayoutDashboard());
  aplicarOrdemLayoutDashboard(DASHBOARD_LAYOUT_CARDS);
  atualizarControlesCardsLayoutDashboard();

  mostrarToast(dashboardLayoutEditando ? "Layout padrão aplicado. Clique em Salvar layout para confirmar." : "Layout padrão restaurado", "sucesso");
}

function removerControlesCardsLayoutDashboard() {
  document.querySelectorAll(".dashboard-layout-card-acoes").forEach((acoes) => acoes.remove());
}

function moverCardLayoutDashboard(card, direcao) {
  const container = obterContainerLayoutDashboard();
  if (!container || !card) return;
  const cardsVisiveis = obterCardsLayoutDashboard().filter((item) => item.offsetParent !== null);
  const indice = cardsVisiveis.indexOf(card);
  if (indice < 0) return;

  const alvo = cardsVisiveis[indice + direcao];
  if (!alvo) return;

  if (direcao < 0) container.insertBefore(card, alvo);
  else container.insertBefore(alvo, card);
  atualizarControlesCardsLayoutDashboard();
}

function atualizarControlesCardsLayoutDashboard() {
  if (!dashboardLayoutEditando) {
    removerControlesCardsLayoutDashboard();
    return;
  }

  const cardsVisiveis = obterCardsLayoutDashboard().filter((card) => card.offsetParent !== null);
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
}

function atualizarEstadoModoLayoutDashboard() {
  const botao = document.getElementById("btn-editar-layout-dashboard");
  const cancelar = document.getElementById("btn-cancelar-layout-dashboard");
  const divisorCancelar = document.querySelector(".acoes-topo-divider-cancelar-layout");
  const container = obterContainerLayoutDashboard();
  if (!container || !botao) return;
  const label = botao.querySelector(".btn-topo-label");

  container.classList.toggle("dashboard-layout-editando", dashboardLayoutEditando);
  botao.classList.toggle("ativo", dashboardLayoutEditando);
  botao.setAttribute("aria-pressed", String(dashboardLayoutEditando));
  botao.title = dashboardLayoutEditando ? "Salvar layout do dashboard" : "Editar layout do dashboard";
  if (label) label.textContent = dashboardLayoutEditando ? "Salvar layout" : "Layout";
  if (cancelar) cancelar.hidden = !dashboardLayoutEditando;
  if (divisorCancelar) divisorCancelar.hidden = !dashboardLayoutEditando;

  const banner = dashboardLayoutEditando ? obterOuCriarBannerLayoutDashboard(container) : document.getElementById(DASHBOARD_LAYOUT_BANNER_ID);
  if (banner) banner.hidden = !dashboardLayoutEditando;

  obterCardsLayoutDashboard().forEach((card) => {
    card.draggable = dashboardLayoutEditando;
    card.classList.toggle("dashboard-card-editavel", dashboardLayoutEditando);
    card.setAttribute("aria-grabbed", String(dashboardLayoutEditando && card.classList.contains("arrastando")));
  });
  atualizarControlesCardsLayoutDashboard();
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
  dashboardLayoutOrdemAntesEdicao = [];
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

function configurarEventosLayoutDashboard() {
  const container = obterContainerLayoutDashboard();
  if (!container) return;

  container.addEventListener("dragstart", (evento) => {
    if (!dashboardLayoutEditando) return;
    const card = evento.target.closest(".dashboard-card-editavel");
    if (!card) return;
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
    if (!dashboardLayoutEditando || !dashboardLayoutCardArrastado) return;
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

function configurarDashboardLayout() {
  const botao = document.getElementById("btn-editar-layout-dashboard");
  const cancelar = document.getElementById("btn-cancelar-layout-dashboard");
  const resetar = document.getElementById("btn-resetar-layout-dashboard");
  const container = obterContainerLayoutDashboard();
  if (!botao || !container) return;

  aplicarLayoutDashboardSalvo();
  configurarEventosLayoutDashboard();

  botao.addEventListener("click", alternarModoLayoutDashboard);
  cancelar?.addEventListener("click", cancelarModoLayoutDashboard);
  resetar?.addEventListener("click", resetarLayoutDashboard);
  atualizarEstadoModoLayoutDashboard();
}
