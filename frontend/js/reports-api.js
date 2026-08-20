// ==========================================
// reports-api.js - Acesso aos endpoints usados pelos relatórios
// ==========================================

(function inicializarReportsApi() {
  function montarParamsLancamentos({ inicio, fim, usuarioId, carteiraId = "", categoria = "", tipo = "" }) {
    const params = new URLSearchParams({
      data_inicio: inicio,
      data_fim: fim,
      usuario_id: usuarioId,
    });

    if (carteiraId) params.set("carteira_id", carteiraId);
    if (categoria) params.set("categoria", categoria);
    if (tipo) params.set("tipo", tipo);

    return params;
  }

  async function buscarLancamentosResposta(filtros) {
    const params = montarParamsLancamentos(filtros);
    return CadimusApi.fetch(`/api/lancamentos?${params}`);
  }

  async function buscarLancamentos(filtros) {
    const resposta = await buscarLancamentosResposta(filtros);
    if (!resposta.ok) throw new Error("Erro ao carregar lancamentos do relatorio.");
    return resposta.json();
  }

  async function buscarLancamentosPeriodo({ inicio, fim, usuarioId }) {
    try {
      return await buscarLancamentos({ inicio, fim, usuarioId });
    } catch {
      return [];
    }
  }

  window.CadimusReportsApi = {
    buscarLancamentosResposta,
    buscarLancamentos,
    buscarLancamentosPeriodo,
  };
})();
