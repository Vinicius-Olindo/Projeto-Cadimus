// ui-theme.js - Tema claro/escuro do topo
const ICONE_LUA = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>';
const ICONE_SOL =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';

function inicializarDarkMode() {
  aplicarTemaAtual();

  const areaAcoes = document.querySelector(".acoes-topo");
  if (!areaAcoes) return;
  if (document.getElementById("btn-theme-toggle")) {
    atualizarSeletorTemaTopo();
    return;
  }

  const btnTheme = document.createElement("button");
  btnTheme.id = "btn-theme-toggle";
  btnTheme.className = "tema-switch";
  btnTheme.title = "Alternar tema";
  btnTheme.setAttribute("type", "button");
  btnTheme.setAttribute("aria-label", "Alternar entre modo claro e escuro");

  areaAcoes.insertBefore(btnTheme, document.querySelector(".avatar-dropdown-wrapper"));

  atualizarSeletorTemaTopo();

  btnTheme.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    gravarLocalStorageSeguro("cadimus_tema", document.body.classList.contains("dark-mode") ? "dark" : "light");
    atualizarMetaThemeColor();
    atualizarSeletorTemaTopo();
    if (typeof sincronizarToggleTema === "function") sincronizarToggleTema();
  });
}

window.aplicarTemaAtual = aplicarTemaAtual;
window.atualizarMetaThemeColor = atualizarMetaThemeColor;

function aplicarTemaAtual() {
  const temaSalvo = lerLocalStorageSeguro("cadimus_tema");
  const prefereEscuro = !temaSalvo && window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  const temaEscuroAtivo = temaSalvo === "dark" || prefereEscuro;

  document.body.classList.toggle("dark-mode", temaEscuroAtivo);
  atualizarMetaThemeColor();
}

function atualizarMetaThemeColor() {
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (!metaThemeColor) return;

  metaThemeColor.setAttribute("content", document.body.classList.contains("dark-mode") ? "#0b1f14" : "#a97a2f");
}

function atualizarSeletorTemaTopo() {
  const btnTheme = document.getElementById("btn-theme-toggle");
  if (!btnTheme) return;

  const estaEscuro = document.body.classList.contains("dark-mode");
  btnTheme.classList.toggle("tema-switch-escuro", estaEscuro);
  btnTheme.setAttribute("aria-pressed", String(estaEscuro));
  btnTheme.title = estaEscuro ? "Tema escuro ativo. Clique para usar tema claro." : "Tema claro ativo. Clique para usar tema escuro.";
  btnTheme.innerHTML = `
    <span class="tema-switch-trilho" aria-hidden="true">
      <span class="tema-switch-opcao tema-switch-sol">${ICONE_SOL}</span>
      <span class="tema-switch-opcao tema-switch-lua">${ICONE_LUA}</span>
      <span class="tema-switch-thumb"></span>
    </span>
  `;
}
