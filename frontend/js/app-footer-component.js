// ==========================================
// app-footer-component.js - Rodapé compartilhado do app
// ==========================================

(function () {
  function renderizarAppFooter() {
    const root = document.getElementById("app-footer-root");
    if (!root || root.dataset.renderizado === "1") return;

    root.innerHTML = `
      <footer class="app-footer" id="app-footer">
        <div class="footer-linha-superior"></div>
        <div class="footer-linha1">
          <span class="footer-brand">Cadimus &copy; 2026</span>
          <span class="footer-sincronizado" id="footer-sincronizado">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
            <span id="footer-status-texto">Sincronizado</span>
          </span>
        </div>
        <div class="footer-linha2">
          <span>Versão 1.0.0</span>
          <span class="footer-sep">·</span>
          <a href="politica-privacidade.html" class="footer-link" target="_blank">Política de Privacidade</a>
          <span class="footer-sep">·</span>
          <a href="termos-uso.html" class="footer-link" target="_blank">Termos de Uso</a>
          <span class="footer-sep">·</span>
          <a href="changelog.html" class="footer-link" target="_blank">Changelog</a>
        </div>
        <div class="footer-linha3">
          <span>Desenvolvimento por <a href="https://olinbytedigital.pages.dev/" target="_blank" rel="noopener" class="footer-link footer-link-destaque">Olinbyte Digital</a></span>
        </div>
      </footer>
    `.trim();
    root.dataset.renderizado = "1";
  }

  window.renderizarAppFooter = renderizarAppFooter;

  renderizarAppFooter();
  document.addEventListener("DOMContentLoaded", renderizarAppFooter);
})();
