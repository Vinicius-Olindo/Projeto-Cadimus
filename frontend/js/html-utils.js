// ==========================================
// html-utils.js - Helpers HTML globais
// ==========================================

function escaparHtml(texto) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(texto));
  return div.innerHTML;
}

