// ==========================================
// dashboard-layout-ui.js - Modo de edição livre dos cards do dashboard
// ==========================================

const DASHBOARD_LAYOUT_STORAGE_PREFIX = "cadimus_dashboard_layout";
const DASHBOARD_LAYOUT_CONTAINER_SELECTOR = "#dashboard-section #dashboard-free-grid";
const DASHBOARD_LAYOUT_CARDS = [
  "card-hoje-dashboard",
  "card-calendario-financeiro",
  "card-comparativo-periodo",
  "card-lancamentos",
  "resumo-categorias",
  "card-tendencia",
  "card-comparativo",
  "card-por-autor",
  "card-despesas-fixas",
  "card-compras-parceladas",
  "card-bonificacoes",
  "card-assinaturas",
  "card-metas-mes-dashboard",
  "card-orcamentos",
  "card-cartoes-credito",
  "card-riscos-financeiros",
  "card-modelos-lancamento",
  "card-score",
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
  return document.querySelector(DASHBOARD_LAYOUT_CONTAINER_SELECTOR);
}

function obterCardsLayoutDashboard() {
  const container = obterContainerLayoutDashboard();
  if (!container) return [];

  return DASHBOARD_LAYOUT_CARDS
    .map((id) => container.querySelector(`#${id}`))
    .filter(Boolean);
}

function obterOrdemPadraoLayoutDashboard() {
  return DASHBOARD_LAYOUT_CARDS.filter((id) => document.getElementById(id));
}

function normalizarOrdemLayoutDashboard(ordem) {
  if (Array.isArray(ordem)) return ordem;

  if (ordem && typeof ordem === "object") {
    const lancamentos = Array.isArray(ordem.lancamentos) ? ordem.lancamentos : [];
    const controle = Array.isArray(ordem.controle) ? ordem.controle : [];
    const cards = Array.isArray(ordem.cards) ? ordem.cards : [];
    return [...lancamentos, ...controle, ...cards];
  }

  return [];
}

function lerOrdemLayoutDashboardSalva() {
  for (const chave of obterChavesLeituraLayoutDashboard()) {
    try {
      const valor = lerLocalStorageSeguro(chave, "");
      if (!valor) continue;
      const ordem = normalizarOrdemLayoutDashboard(JSON.parse(valor));
      if (ordem.length > 0) return ordem;
    } catch {
      // Ignora layouts antigos/corrompidos e tenta a próxima chave.
    }
  }

  return [];
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

function obterOrdemAtualLayoutDashboard() {
  const container = obterContainerLayoutDashboard();
  if (!container) return [];

  return Array.from(container.children)
    .map((el) => el.id)
    .filter((id) => DASHBOARD_LAYOUT_CARDS.includes(id));
}

function aplicarOrdemLayoutDashboard(ordem = []) {
  const container = obterContainerLayoutDashboard();
  if (!container) return;

  const ordemNormalizada = normalizarOrdemLayoutDashboard(ordem);
  const idsAplicados = new Set();
  const cardsOrdenados = [];

  dashboardLayoutAplicandoOrdem = true;
  try {
    ordemNormalizada
      .filter((id) => DASHBOARD_LAYOUT_CARDS.includes(id))
      .forEach((id) => {
        const card = document.getElementById(id);
        if (card && card.parentElement === container) {
          cardsOrdenados.push(card);
          idsAplicados.add(id);
        }
      });

    DASHBOARD_LAYOUT_CARDS
      .filter((id) => !idsAplicados.has(id))
      .forEach((id) => {
        const card = document.getElementById(id);
        if (card && card.parentElement === container) cardsOrdenados.push(card);
      });

    cardsOrdenados.forEach((card, indice) => {
      if (container.children[indice] !== card) container.insertBefore(card, container.children[indice] || null);
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
      <small>Arraste qualquer card para outra posição da grade. Clique em Salvar layout ao finalizar.</small>
    </span>
  `;
  container.prepend(banner);
  return banner;
}

function aplicarLayoutDashboardSalvo() {
  const container = obterContainerLayoutDashboard();
  if (!container) return false;

  const ordemNormalizada = lerOrdemLayoutDashboardSalva();
  if (ordemNormalizada.length === 0) return false;

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
  const container = obterContainerLayoutDashboard();
  if (!container) return;

  removerOrdemLayoutDashboardSalva();
  aplicarOrdemLayoutDashboard(obterOrdemPadraoLayoutDashboard());
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
  return obterCardsLayoutDashboard().filter((item) => item.offsetParent !== null);
}

function moverCardLayoutDashboard(card, direcao) {
  const container = obterContainerLayoutDashboard();
  if (!container || !card || card.parentElement !== container) return;
  const cardsVisiveis = obterCardsVisiveisLayoutDashboard();
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

  const cardsVisiveis = obterCardsVisiveisLayoutDashboard();
  cardsVisiveis.forEach((card, indice) => {
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
    if (btnProximo) btnProximo.disabled = indice === cardsVisiveis.length - 1;
  });
}

function atualizarEstadoModoLayoutDashboard() {
  const botao = document.getElementById("btn-editar-layout-dashboard");
  const cancelar = document.getElementById("btn-cancelar-layout-dashboard");
  const divisorCancelar = document.querySelector(".acoes-topo-divider-cancelar-layout");
  const container = obterContainerLayoutDashboard();
  if (!container || !botao) return;
  const label = botao.querySelector(".btn-topo-label");

  document.body.classList.toggle("dashboard-layout-modo-ativo", dashboardLayoutEditando);
  container.classList.toggle("dashboard-layout-editando", dashboardLayoutEditando);
  botao.classList.toggle("ativo", dashboardLayoutEditando);
  botao.setAttribute("aria-pressed", String(dashboardLayoutEditando));
  botao.title = dashboardLayoutEditando ? "Salvar layout do dashboard" : "Editar layout do dashboard";
  if (label) label.textContent = dashboardLayoutEditando ? "Salvar layout" : "Layout";
  if (cancelar) cancelar.hidden = !dashboardLayoutEditando;
  if (divisorCancelar) divisorCancelar.hidden = !dashboardLayoutEditando;

  const banner = dashboardLayoutEditando
    ? obterOuCriarBannerLayoutDashboard(container)
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
    mostrarToast("Modo layout ativo. Arraste os cards livremente pela grade e clique em Salvar layout.", "aviso");
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
  const container = obterContainerLayoutDashboard();
  if (!container) return;

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
    if (!dashboardLayoutEditando || !dashboardLayoutCardArrastado) return;
    evento.preventDefault();
    const depois = obterCardDepoisDoArraste(container, evento.clientX, evento.clientY);
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
  if (dashboardLayoutConfigurado) return;
  const botao = document.getElementById("btn-editar-layout-dashboard");
  const cancelar = document.getElementById("btn-cancelar-layout-dashboard");
  const resetar = document.getElementById("btn-resetar-layout-dashboard");
  const container = obterContainerLayoutDashboard();
  if (!botao || !container) return;
  dashboardLayoutConfigurado = true;

  aplicarLayoutDashboardSalvo();
  configurarEventosLayoutDashboard();
  document.addEventListener("click", bloquearCriacaoDuranteLayout, true);

  const observer = new MutationObserver(agendarReaplicacaoLayoutDashboard);
  observer.observe(container, { childList: true });

  botao.addEventListener("click", () => {
    if (!dashboardLayoutEditando && typeof ativarVisaoDashboard === "function") {
      ativarVisaoDashboard("dashboard");
    }
    alternarModoLayoutDashboard();
  });
  cancelar?.addEventListener("click", cancelarModoLayoutDashboard);
  resetar?.addEventListener("click", resetarLayoutDashboard);
  window.addEventListener("cadimus:usuario-logado", reaplicarLayoutDashboardSalvo);
  atualizarEstadoModoLayoutDashboard();
}
