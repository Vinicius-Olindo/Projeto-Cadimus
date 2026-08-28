// ==========================================
// requisicao.ts - Helpers seguros para entrada HTTP
// ==========================================

function ehObjetoPlano(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/**
 * Lê o corpo JSON garantindo que a rota recebeu um objeto.
 * Evita casts diretos de `request.json()` para Payload nas rotas.
 */
export async function lerJsonObjeto<T extends object>(request: Request): Promise<T | null> {
  try {
    const dados: unknown = await request.json();
    return ehObjetoPlano(dados) ? (dados as T) : null;
  } catch {
    return null;
  }
}
