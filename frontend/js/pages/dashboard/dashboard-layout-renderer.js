// ==========================================
// dashboard-layout-renderer.js - Render e aplicação do layout do dashboard
// ==========================================

function aplicarPreferenciasCardLayoutDashboard(card, preferencias = {}) {
  if (!card?.id || !DASHBOARD_LAYOUT_CARDS.includes(card.id)) return;

  const tamanho = normalizarTamanhoLayoutDashboard(preferencias.tamanho, card.id);
  const zona = normalizarZonaLayoutDashboard(preferencias.zona, card.id);
  card.dataset.dashboardLayoutTamanho = tamanho;
  card.dataset.dashboardLayoutZona = zona;
  card.dataset.dashboardLayoutOrigem = obterZonaCardLayoutDashboard(card.id);
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
        const preferencias = configsPorId.get(id);
        const zona = normalizarZonaLayoutDashboard(preferencias?.zona, id);
        const container = obterContainerZonaLayoutDashboard(zona);
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
        const container = obterContainerZonaLayoutDashboard(zona);
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
        <small>Escolha um preset, arraste entre as colunas e oculte cards. Clique em Salvar layout ao finalizar.</small>
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
      const zonaAtual = card?.parentElement?.id === "dashboard-side-grid" ? "lateral" : "principal";
      const visivel = !card?.classList.contains("dashboard-card-oculto-usuario");
      const opcoesZona = Object.entries(DASHBOARD_LAYOUT_ZONAS)
        .map(([valor, rotulo]) => `<option value="${valor}" ${valor === zonaAtual ? "selected" : ""}>${rotulo}</option>`)
        .join("");

      return `
        <div class="dashboard-layout-painel-item" data-layout-card-config="${config.id}">
          <label class="dashboard-layout-visibilidade">
            <input type="checkbox" data-layout-visivel-card="${config.id}" ${visivel ? "checked" : ""} />
            <span>${config.nome}</span>
          </label>
          <select data-layout-zona-card="${config.id}" aria-label="Coluna de ${config.nome}">
            ${opcoesZona}
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

function alterarZonaCardLayoutDashboard(id, zona) {
  const card = document.getElementById(id);
  const zonaNormalizada = normalizarZonaLayoutDashboard(zona, id);
  const destino = obterContainerZonaLayoutDashboard(zonaNormalizada);
  if (!card || !destino || !DASHBOARD_LAYOUT_CARDS.includes(id)) return;

  const tamanhoVisual = obterTamanhoVisualAoMoverCardLayoutDashboard(card);
  destino.appendChild(card);
  card.dataset.dashboardLayoutZona = zonaNormalizada;
  card.dataset.dashboardLayoutTamanho = tamanhoVisual;
  renderizarPainelLayoutDashboard();
  atualizarControlesCardsLayoutDashboard();
}

function alternarZonaCardLayoutDashboard(card) {
  if (!card?.id || !DASHBOARD_LAYOUT_CARDS.includes(card.id)) return;

  const zonaAtual = card.parentElement?.id === "dashboard-side-grid" ? "lateral" : "principal";
  alterarZonaCardLayoutDashboard(card.id, zonaAtual === "lateral" ? "principal" : "lateral");
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
        <button type="button" data-layout-alternar-zona title="Mover para outra coluna" aria-label="Mover para outra coluna">↔</button>
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
