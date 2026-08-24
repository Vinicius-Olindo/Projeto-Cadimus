// ==========================================
// respostas.js - Respostas JSON padronizadas para rotas
// ==========================================

// @ts-check

/**
 * @param {unknown} dados
 * @param {number} [status]
 */
export function json(dados, status = 200) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

/**
 * @param {string} mensagem
 * @param {number} [status]
 * @param {string} [codigo]
 */
export function erroCliente(mensagem, status = 400, codigo = "erro_validacao") {
  return json({ erro: mensagem, codigo }, status);
}

/**
 * Resposta para falhas inesperadas. O detalhe fica no log; o cliente recebe
 * uma mensagem segura, com código estável para debug/telemetria.
 *
 * @param {unknown} erro
 * @param {string} contexto
 * @param {string} mensagem
 * @param {string} [codigo]
 */
export function erroInterno(erro, contexto, mensagem, codigo = "erro_interno") {
  console.error(`[${contexto}]`, erro);
  return json({ erro: mensagem, codigo }, 500);
}
