// ==========================================
// carteiras.js - Controle de acesso às carteiras do usuário
// ==========================================

// @ts-check

/**
 * Linha mínima retornada pela tabela usuarios_carteiras.
 * @typedef {object} UsuarioCarteiraRow
 * @property {number | string} carteira_id
 */

/**
 * Ambiente mínimo esperado pelo utilitário.
 * @typedef {object} EnvComDB
 * @property {{ prepare: (query: string) => { bind: (...values: unknown[]) => { all: () => Promise<{ results: unknown[] }> } } }} DB
 */

/**
 * Retorna os IDs das carteiras às quais o usuário tem acesso.
 *
 * @param {EnvComDB} env
 * @param {number | string} usuarioId
 * @returns {Promise<number[]>}
 */
export async function obterCarteirasDoUsuario(env, usuarioId) {
  const { results } = await env.DB.prepare(`SELECT carteira_id FROM usuarios_carteiras WHERE usuario_id = ?`).bind(usuarioId).all();

  return results
    .map((row) => {
      /** @type {UsuarioCarteiraRow} */
      // @ts-expect-error Resultado do D1 é dinâmico e validado pelo uso do campo abaixo.
      const registro = row;
      return Number(registro.carteira_id);
    })
    .filter((carteiraId) => Number.isInteger(carteiraId) && carteiraId > 0);
}
