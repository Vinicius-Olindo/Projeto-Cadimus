// ==========================================
// author-colors-ui.js - Cores estáveis para autores
// ==========================================

/**
 * Escolhe uma cor estável para o carimbo de autor a partir do nome de usuário,
 * assim a mesma pessoa sempre aparece com a mesma cor.
 * @param {string} nome
 * @returns {string} valor CSS (ex: "var(--autor-b)")
 */
function corDoAutor(nome) {
  const cores = ["var(--autor-a)", "var(--autor-b)", "var(--autor-c)", "var(--autor-d)"];
  let hash = 0;
  const texto = String(nome || "");

  for (let i = 0; i < texto.length; i++) {
    hash = (hash * 31 + texto.charCodeAt(i)) >>> 0;
  }

  return cores[hash % cores.length];
}
