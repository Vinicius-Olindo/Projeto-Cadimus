// ==========================================
// ui-bootstrap.js - Inicialização base da interface
// ==========================================

function chamarInicializadorCadimus(nome) {
  const fn = window[nome] || globalThis[nome];
  if (typeof fn === "function") fn();
}

function quandoCadimusPronto(callback) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", callback);
    return;
  }

  callback();
}

quandoCadimusPronto(() => {
  if (document.body?.dataset?.cadimusPage === "redefinir-senha") {
    inicializarDarkMode();
    return;
  }

  const ehCadastroConvite = typeof verificarCadastroConvite === "function" ? verificarCadastroConvite() : false;
  if (ehCadastroConvite) return;

  inicializarDarkMode();
  chamarInicializadorCadimus("configurarInputsMonetarios");
  chamarInicializadorCadimus("configurarInstallBanner");
});
