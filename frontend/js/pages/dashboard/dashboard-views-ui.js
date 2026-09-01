// ==========================================
// dashboard-views-ui.js - Organização das visões da tela inicial
// ==========================================

const DASHBOARD_VISAO_STORAGE = "cadimus_dashboard_visao";
const DASHBOARD_VISOES = {
  hoje: {
    titulo: "Lançamentos",
    cards: [
      "area-resumo",
      "card-hoje-dashboard",
      "card-lancamentos",
      "card-modelos-lancamento",
      "card-despesas-fixas",
      "card-compras-parceladas",
      "card-bonificacoes",
    ],
  },
  dashboard: {
    titulo: "Dashboard",
    cards: [
      "area-resumo",
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
    ],
  },
};

function obterCardsDashboardOrganizaveis() {
  return [
    document.querySelector("#dashboard-section .area-resumo"),
    ...document.querySelectorAll("#dashboard-section #dashboard-free-grid > *"),
    ...document.querySelectorAll("#dashboard-section #dashboard-side-grid > *"),
  ].filter(Boolean);
}

function obterIdCardDashboard(card) {
  if (card.classList.contains("area-resumo")) return "area-resumo";
  return card.id || "";
}

function atualizarContainersVisaoDashboard() {
  const containers = [
    document.querySelector("#dashboard-section #dashboard-free-grid"),
    document.querySelector("#dashboard-section #dashboard-side-grid"),
  ].filter(Boolean);

  containers.forEach((container) => {
    const temCardDaVisao = [...container.children].some((filho) => !filho.classList.contains("dashboard-visao-oculto"));
    container.classList.toggle("dashboard-area-oculta", !temCardDaVisao);
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
  document.dispatchEvent(new CustomEvent("cadimus:dashboard-visao-alterada", { detail: { visao } }));

  if (opcoes.salvar !== false) {
    gravarLocalStorageSeguro(DASHBOARD_VISAO_STORAGE, visao);
  }
}

function abrirAtalhoVisaoDashboard(atalho) {
  if (atalho === "planejamento") {
    window.location.href = "planejamento.html";
    return;
  }

  if (atalho === "relatorios") {
    window.location.href = "relatorios.html";
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
  const visaoInicial = ["lancamentos", "central"].includes(visaoSalva) ? "hoje" : visaoSalva;
  ativarVisaoDashboard(DASHBOARD_VISOES[visaoInicial] ? visaoInicial : "hoje", { salvar: false });
}
