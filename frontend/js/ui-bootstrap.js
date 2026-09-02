// ==========================================
// ui-bootstrap.js - Inicialização geral da interface
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  if (document.body?.dataset?.cadimusPage === "redefinir-senha") {
    inicializarDarkMode();
    return;
  }

  const ehCadastroConvite = typeof verificarCadastroConvite === "function" ? verificarCadastroConvite() : false;
  if (ehCadastroConvite) return;

  const chamarSeExistir = (nome) => {
    const fn = window[nome] || globalThis[nome];
    if (typeof fn === "function") fn();
  };

  chamarSeExistir("inicializarFiltroMes");
  inicializarDarkMode();
  chamarSeExistir("configurarInputsMonetarios");
  chamarSeExistir("configurarMonitoresDeFiltro");
  chamarSeExistir("configurarBuscaLancamentos");
  chamarSeExistir("configurarNotificacoes");
  chamarSeExistir("configurarLote");
  chamarSeExistir("configurarPopupNota");
  chamarSeExistir("configurarComparativoPeriodo");
  chamarSeExistir("configurarBuscaGlobal");
  chamarSeExistir("configurarModal");
  chamarSeExistir("configurarModalCarteira");
  chamarSeExistir("configurarModalGerenciarMembros");
  chamarSeExistir("configurarModalDespesasFixas");
  chamarSeExistir("configurarModalComprasParceladas");
  chamarSeExistir("configurarModalMeta");
  chamarSeExistir("configurarModalDeposito");
  chamarSeExistir("configurarModalRenomearCategoria");
  chamarSeExistir("configurarPainelAdmin");
  chamarSeExistir("configurarPlano");
  chamarSeExistir("configurarModalTransferencia");
  chamarSeExistir("configurarModalOrcamento");
  chamarSeExistir("configurarModalCartaoCredito");
  chamarSeExistir("configurarRelatorios");
  chamarSeExistir("configurarDashboardLayout");
  chamarSeExistir("configurarVisoesDashboard");
  chamarSeExistir("configurarAcoesDashboard");

  chamarSeExistir("configurarInstallBanner");
});
