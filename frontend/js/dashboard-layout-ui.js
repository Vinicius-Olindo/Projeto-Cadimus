// ==========================================
// dashboard-layout-ui.js - Controle do modo de edição livre do dashboard
// ==========================================

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
      if (!dashboardLayoutEditando || !dashboardLayoutCardArrastado) return;
      evento.preventDefault();
      const depois = obterCardDepoisDoArraste(container, evento.clientX, evento.clientY);
      const tamanhoVisual = obterTamanhoVisualAoMoverCardLayoutDashboard(dashboardLayoutCardArrastado);
      if (depois) container.insertBefore(dashboardLayoutCardArrastado, depois);
      else container.appendChild(dashboardLayoutCardArrastado);
      dashboardLayoutCardArrastado.dataset.dashboardLayoutZona = container.id === "dashboard-side-grid" ? "lateral" : "principal";
      dashboardLayoutCardArrastado.dataset.dashboardLayoutTamanho = tamanhoVisual;
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

    const botaoAlternarZona = evento.target.closest("[data-layout-alternar-zona]");
    if (dashboardLayoutEditando && botaoAlternarZona) {
      evento.preventDefault();
      evento.stopPropagation();
      alternarZonaCardLayoutDashboard(botaoAlternarZona.closest(".dashboard-card-editavel"));
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

    const seletorZona = evento.target.closest("[data-layout-zona-card]");
    if (seletorZona) {
      alterarZonaCardLayoutDashboard(seletorZona.dataset.layoutZonaCard, seletorZona.value);
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
