// ==========================================
// entries-api.js - Acesso aos endpoints de lançamentos
// ==========================================

(function inicializarEntriesApi() {
  function montarQueryLancamentos(filtros = {}) {
    const params = new URLSearchParams();

    Object.entries(filtros).forEach(([chave, valor]) => {
      if (valor !== undefined && valor !== null && valor !== "") {
        params.set(chave, valor);
      }
    });

    return params.toString();
  }

  async function listarResposta(filtros = {}) {
    const query = montarQueryLancamentos(filtros);
    return CadimusApi.fetch(`/api/lancamentos${query ? `?${query}` : ""}`, { comJson: false });
  }

  async function listar(filtros = {}) {
    const resposta = await listarResposta(filtros);
    if (!resposta.ok) return [];
    return resposta.json();
  }

  async function salvar(dados, idEdicao = null) {
    if (idEdicao) {
      return CadimusApi.fetch(`/api/lancamentos?id=${encodeURIComponent(idEdicao)}`, {
        method: "PUT",
        body: JSON.stringify(dados),
      });
    }

    return CadimusApi.fetch("/api/lancamentos", {
      method: "POST",
      body: JSON.stringify(dados),
    });
  }

  async function atualizar(id, dados) {
    return CadimusApi.fetch(`/api/lancamentos?id=${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(dados),
    });
  }

  async function atualizarEmLote(dados) {
    return CadimusApi.fetch("/api/lancamentos", {
      method: "PATCH",
      body: JSON.stringify(dados),
    });
  }

  async function excluir(id) {
    return CadimusApi.fetch(`/api/lancamentos?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      comJson: false,
    });
  }

  window.CadimusEntriesApi = {
    montarQueryLancamentos,
    listarResposta,
    listar,
    salvar,
    atualizar,
    atualizarEmLote,
    excluir,
  };
})();
