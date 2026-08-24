// ==========================================
// carteiras.ts - Controle de acesso às carteiras do usuário
// ==========================================

import type { CadimusEnv, IdEntrada } from "../types.js";

interface UsuarioCarteiraRow {
  carteira_id: number | string;
}

/**
 * Retorna os IDs das carteiras às quais o usuário tem acesso.
 */
export async function obterCarteirasDoUsuario(env: CadimusEnv, usuarioId: IdEntrada): Promise<number[]> {
  const { results } = await env.DB.prepare(`SELECT carteira_id FROM usuarios_carteiras WHERE usuario_id = ?`).bind(usuarioId).all<UsuarioCarteiraRow>();

  return results
    .map((row) => Number(row.carteira_id))
    .filter((carteiraId) => Number.isInteger(carteiraId) && carteiraId > 0);
}
