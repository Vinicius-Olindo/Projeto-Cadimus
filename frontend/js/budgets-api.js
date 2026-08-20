// ==========================================
// budgets-api.js - Acesso aos endpoints de orçamentos
// ==========================================

(function inicializarBudgetsApi() {
  function montarQuery(filtros = {}) {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([chave, valor]) => {
      if (valor !== undefined && valor !== null && valor !== "") params.set(chave, valor);
    });
    return params.toString();
  }

  async function listar(filtros = {}) {
    const query = montarQuery(filtros);
    return CadimusApi.fetch(`/api/orcamentos${query ? `?${query}` : ""}`, { comJson: false });
  }

  async function salvar(dados) {
    return CadimusApi.fetch("/api/orcamentos", {
      method: "POST",
      body: JSON.stringify(dados),
    });
  }

  async function excluir(id) {
    return CadimusApi.fetch(`/api/orcamentos?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }

  window.CadimusBudgetsApi = {
    listar,
    salvar,
    excluir,
  };
})();
