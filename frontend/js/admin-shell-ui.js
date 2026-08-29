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
  const paginaConfiguracoes = document.body?.dataset?.cadimusPage === "admin";

  if (btnAdmin) {
    btnAdmin.addEventListener("click", () => {
      window.location.href = "configuracoes.html";
    });
  }

  if (!secaoAdmin) return;

  btnVoltar?.addEventListener("click", () => {
    window.location.href = "index.html";
  });

  configurarSubAbasAdmin();
  configurarFormularioUsuario();
  configurarSistemaConvites();
  configurarFormularioCategoria();
  configurarZonaDePerigo();

  if (paginaConfiguracoes && typeof carregarUsuarios === "function") {
    carregarUsuarios();
    if (sessionStorage.getItem("cadimus_abrir_perfil") === "1") {
      sessionStorage.removeItem("cadimus_abrir_perfil");
      setTimeout(() => {
        if (typeof abrirPerfilUsuario === "function") abrirPerfilUsuario();
      }, 500);
    }
  } else if (secaoDashboard && secaoAdmin) {
    secaoAdmin.style.display = "none";
  }
}
