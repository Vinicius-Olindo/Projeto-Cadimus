// ==========================================
// dashboard-actions-ui.js - Ações da página principal/dashboard
// ==========================================

function configurarBotaoNovoOrcamentoDashboard() {
  const btnNovoOrcamento = document.getElementById("btn-novo-orcamento");
  if (!btnNovoOrcamento) return;

  btnNovoOrcamento.addEventListener("click", () => window.abrirModalOrcamento?.());
}

function configurarBotaoNovoCartaoDashboard() {
  const btnNovoCartao = document.getElementById("btn-novo-cartao");
  if (!btnNovoCartao) return;

  btnNovoCartao.addEventListener("click", () => window.abrirModalCartao?.());
}

function configurarBotaoCartoesCreditoDashboard() {
  const btnCartoesCredito = document.getElementById("btn-cartoes-credito");
  if (!btnCartoesCredito) return;

  btnCartoesCredito.addEventListener("click", () => {
    const cartoes = typeof cartoesCreditoCarregados !== "undefined" && Array.isArray(cartoesCreditoCarregados)
      ? cartoesCreditoCarregados
      : [];

    // Se já tem cartões, scrolla para o painel; senão abre modal de novo
    if (cartoes.length > 0) {
      const card = document.getElementById("card-cartoes-credito");
      if (card && card.style.display !== "none") {
        card.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }

    window.abrirModalCartao?.();
  });
}

function configurarBotaoRelatorioPdfDashboard() {
  const btnRelatorioPdf = document.getElementById("btn-relatorio-pdf");
  if (!btnRelatorioPdf || typeof gerarRelatorioPDF !== "function") return;

  btnRelatorioPdf.addEventListener("click", gerarRelatorioPDF);
}

function configurarAcoesDashboard() {
  configurarBotaoNovoOrcamentoDashboard();
  configurarBotaoNovoCartaoDashboard();
  configurarBotaoCartoesCreditoDashboard();
  configurarBotaoRelatorioPdfDashboard();
}
