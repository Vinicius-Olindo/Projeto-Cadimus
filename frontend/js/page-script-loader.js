// page-script-loader.js - Carregamento de scripts por página
(() => {
  "use strict";

  const BASE = "js/";

  function normalizarScript(item) {
    if (typeof item === "string") return { src: item };
    return item || {};
  }

  function criarTagScript(script) {
    const src = script.src.startsWith("http") || script.src.startsWith("/") ? script.src : `${BASE}${script.src}`;
    const defer = script.defer ? " defer" : "";
    return `<script src="${src}"${defer}><\/script>`;
  }

  function carregarSequencialmente(scripts) {
    return scripts.reduce((fila, item) => {
      const script = normalizarScript(item);
      if (!script.src) return fila;

      return fila.then(() => new Promise((resolve, reject) => {
        const tag = document.createElement("script");
        const src = script.src.startsWith("http") || script.src.startsWith("/") ? script.src : `${BASE}${script.src}`;
        tag.src = src;
        tag.defer = !!script.defer;
        tag.onload = resolve;
        tag.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
        document.head.appendChild(tag);
      }));
    }, Promise.resolve());
  }

  function carregar(scripts) {
    const lista = Array.isArray(scripts) ? scripts : [];
    if (document.readyState === "loading") {
      document.write(lista.map(normalizarScript).map(criarTagScript).join("\n"));
      return Promise.resolve();
    }

    return carregarSequencialmente(lista).catch((erro) => {
      console.error("Erro ao carregar scripts da página:", erro);
    });
  }

  window.CadimusPageLoader = { carregar };
})();
