// ==========================================
// dashboard-views-ui.js - Organização das visões da tela inicial
// ==========================================

const DASHBOARD_VISAO_STORAGE = "cadimus_dashboard_visao";
const DASHBOARD_VISOES = {
  hoje: {
    titulo: "Hoje",
    cards: ["area-resumo", "card-hoje-dashboard", "card-lancamentos", "card-modelos-lancamento"],
  },
  dashboard: {
    titulo: "Dashboard",
    cards: [
      "area-resumo",
      "card-calendario-financeiro",
      "card-comparativo-periodo",
      "resumo-categorias",
      "card-tendencia",
      "card-comparativo",
      "card-por-autor",
      "card-metas-mes-dashboard",
      "card-orcamentos",
      "card-cartoes-credito",
    ],
  },
  central: {
    titulo: "Central financeira",
    cards: [
      "card-score",
      "card-riscos-financeiros",
      "card-assinaturas",
      "card-despesas-fixas",
      "card-compras-parceladas",
      "card-bonificacoes",
    ],
  },
};

function obterCardsDashboardOrganizaveis() {
  return [
    document.querySelector("#dashboard-section .area-resumo"),
    ...document.querySelectorAll(
      "#dashboard-section .area-lancamentos > *, #dashboard-section .area-controle > *"
    ),
  ].filter(Boolean);
}

function obterIdCardDashboard(card) {
  if (card.classList.contains("area-resumo")) return "area-resumo";
  return card.id || "";
}

function atualizarContainersVisaoDashboard() {
  document.querySelectorAll("#dashboard-section .area-lancamentos, #dashboard-section .area-controle").forEach((area) => {
    const temCardDaVisao = [...area.children].some((filho) => !filho.classList.contains("dashboard-visao-oculto"));
    area.classList.toggle("dashboard-area-oculta", !temCardDaVisao);
  });
}

function ativarVisaoDashboard(visao = "hoje", opcoes = {}) {
  const config = DASHBOARD_VISOES[visao] || DASHBOARD_VISOES.hoje;
  const permitidos = new Set(config.cards);

  obterCardsDashboardOrganizaveis().forEach((card) => {
    const id = obterIdCardDashboard(card);
    card.classList.toggle("dashboard-visao-oculto", !permitidos.has(id));
  });

  document.querySelectorAll("[data-dashboard-visao]").forEach((botao) => {
    const ativo = botao.dataset.dashboardVisao === visao;
    botao.classList.toggle("ativo", ativo);
    botao.setAttribute("aria-current", ativo ? "page" : "false");
  });

  document.getElementById("conteudo-periodo")?.setAttribute("data-dashboard-visao-atual", visao);
  atualizarContainersVisaoDashboard();

  if (opcoes.salvar !== false) {
    gravarLocalStorageSeguro(DASHBOARD_VISAO_STORAGE, visao);
  }
}

function abrirAtalhoVisaoDashboard(atalho) {
  if (atalho === "planejamento") {
    document.getElementById("btn-planejamento")?.click();
    return;
  }

  if (atalho === "relatorios") {
    const secaoDash = document.getElementById("dashboard-section");
    const secaoRel = document.getElementById("relatorios-section");
    if (!secaoDash || !secaoRel) return;
    secaoDash.style.display = "none";
    secaoRel.style.display = "flex";
    secaoRel.style.flexDirection = "column";
    if (typeof inicializarFiltrosRelatorio === "function") inicializarFiltrosRelatorio();
    if (typeof carregarDadosRelatorio === "function") carregarDadosRelatorio();
  }
}

function configurarVisoesDashboard() {
  const nav = document.querySelector(".dashboard-visoes");
  if (!nav) return;

  nav.addEventListener("click", (evento) => {
    const botaoVisao = evento.target.closest("[data-dashboard-visao]");
    if (botaoVisao) {
      ativarVisaoDashboard(botaoVisao.dataset.dashboardVisao);
      return;
    }

    const botaoAtalho = evento.target.closest("[data-dashboard-atalho]");
    if (botaoAtalho) abrirAtalhoVisaoDashboard(botaoAtalho.dataset.dashboardAtalho);
  });

  const visaoSalva = lerLocalStorageSeguro(DASHBOARD_VISAO_STORAGE) || "hoje";
  const visaoInicial = visaoSalva === "lancamentos" ? "hoje" : visaoSalva;
  ativarVisaoDashboard(DASHBOARD_VISOES[visaoInicial] ? visaoInicial : "hoje", { salvar: false });
}
