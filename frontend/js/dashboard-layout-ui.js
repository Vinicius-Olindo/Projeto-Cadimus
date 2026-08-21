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
  const container = obterContainerLayoutDashboard();
  if (!container) return;

  const ordem = Array.from(container.children)
    .map((el) => el.id)
    .filter((id) => DASHBOARD_LAYOUT_CARDS.includes(id));

  gravarLocalStorageSeguro(obterChaveLayoutDashboard(), JSON.stringify(ordem));
  mostrarToast("Layout do dashboard salvo", "sucesso");
}

function resetarLayoutDashboard() {
  const container = obterContainerLayoutDashboard();
  if (!container) return;

  removerLocalStorageSeguro(obterChaveLayoutDashboard());
  DASHBOARD_LAYOUT_CARDS.forEach((id) => {
    const card = document.getElementById(id);
    if (card && card.parentElement === container) container.appendChild(card);
  });

  mostrarToast("Layout padrão restaurado", "sucesso");
}

function atualizarEstadoModoLayoutDashboard() {
  const botao = document.getElementById("btn-editar-layout-dashboard");
  const container = obterContainerLayoutDashboard();
  if (!container || !botao) return;

  container.classList.toggle("dashboard-layout-editando", dashboardLayoutEditando);
  botao.classList.toggle("ativo", dashboardLayoutEditando);
  botao.setAttribute("aria-pressed", String(dashboardLayoutEditando));
  botao.title = dashboardLayoutEditando ? "Salvar layout do dashboard" : "Editar layout do dashboard";

  obterCardsLayoutDashboard().forEach((card) => {
    card.draggable = dashboardLayoutEditando;
    card.classList.toggle("dashboard-card-editavel", dashboardLayoutEditando);
  });
}

function alternarModoLayoutDashboard() {
  dashboardLayoutEditando = !dashboardLayoutEditando;
  atualizarEstadoModoLayoutDashboard();

  if (dashboardLayoutEditando) {
    mostrarToast("Arraste os cards da coluna direita para reorganizar", "aviso");
  } else {
    salvarLayoutDashboard();
  }
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
    evento.dataTransfer.effectAllowed = "move";
    evento.dataTransfer.setData("text/plain", card.id);
  });

  container.addEventListener("dragend", () => {
    dashboardLayoutCardArrastado?.classList.remove("arrastando");
    dashboardLayoutCardArrastado = null;
  });

  container.addEventListener("dragover", (evento) => {
    if (!dashboardLayoutEditando || !dashboardLayoutCardArrastado) return;
    evento.preventDefault();
    const depois = obterCardDepoisDoArraste(container, evento.clientY);
    if (depois) container.insertBefore(dashboardLayoutCardArrastado, depois);
    else container.appendChild(dashboardLayoutCardArrastado);
  });
}

function configurarDashboardLayout() {
  const botao = document.getElementById("btn-editar-layout-dashboard");
  const resetar = document.getElementById("btn-resetar-layout-dashboard");
  const container = obterContainerLayoutDashboard();
  if (!botao || !container) return;

  aplicarLayoutDashboardSalvo();
  configurarEventosLayoutDashboard();

  botao.addEventListener("click", alternarModoLayoutDashboard);
  resetar?.addEventListener("click", resetarLayoutDashboard);
  atualizarEstadoModoLayoutDashboard();
}
