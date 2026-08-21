// ==========================================
// admin-shell-ui.js - Entrada do painel admin/configurações
// ==========================================

// ==========================================
// CONTROLE DO PAINEL ADMIN / CONFIGURAÇÕES
// ==========================================
function configurarPainelAdmin() {
  const btnAdmin = document.getElementById("btn-admin");
  const btnVoltar = document.getElementById("btn-voltar-dashboard");
  const secaoDashboard = document.getElementById("dashboard-section");
  const secaoAdmin = document.getElementById("admin-section");

  if (!btnAdmin || !btnVoltar || !secaoDashboard || !secaoAdmin) return;

  btnAdmin.addEventListener("click", () => {
    secaoDashboard.style.display = "none";
    secaoAdmin.style.display = "flex";
    secaoAdmin.style.flexDirection = "column";
    carregarUsuarios();
  });

  btnVoltar.addEventListener("click", () => {
    secaoAdmin.style.display = "none";
    secaoDashboard.style.display = "block";
    carregarLancamentos();
  });

  configurarSubAbasAdmin();
  configurarFormularioUsuario();
  configurarSistemaConvites();
  configurarFormularioCategoria();
  configurarZonaDePerigo();
}
