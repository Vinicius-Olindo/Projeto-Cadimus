// ==========================================
// cards-api.js - Acesso aos endpoints de cartões de crédito
// ==========================================

(function inicializarCardsApi() {
  function montarQuery(filtros = {}) {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([chave, valor]) => {
      if (valor !== undefined && valor !== null && valor !== "") params.set(chave, valor);
    });
    return params.toString();
  }

  async function listar(filtros = {}) {
    const query = montarQuery(filtros);
    return CadimusApi.fetch(`/api/cartoes-credito${query ? `?${query}` : ""}`, { comJson: false });
  }

  async function salvar(dados, idEdicao = null) {
    if (idEdicao) {
      return CadimusApi.fetch(`/api/cartoes-credito?id=${encodeURIComponent(idEdicao)}`, {
        method: "PUT",
        body: JSON.stringify(dados),
      });
    }

    return CadimusApi.fetch("/api/cartoes-credito", {
      method: "POST",
      body: JSON.stringify(dados),
    });
  }

  async function excluir(id) {
    return CadimusApi.fetch(`/api/cartoes-credito?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }

  window.CadimusCardsApi = {
    listar,
    salvar,
    excluir,
  };
})();
