// ==========================================
// scheduled-api.js - Despesas fixas, compras parceladas e recorrências
// ==========================================

(function inicializarScheduledApi() {
  function montarQuery(filtros = {}) {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([chave, valor]) => {
      if (valor !== undefined && valor !== null && valor !== "") params.set(chave, valor);
    });
    return params.toString();
  }

  function endpoint(base, filtros = {}) {
    const query = montarQuery(filtros);
    return `${base}${query ? `?${query}` : ""}`;
  }

  async function listarFixas(filtros = {}) {
    return CadimusApi.fetch(endpoint("/api/despesas-fixas", filtros), { comJson: false });
  }

  async function salvarFixa(dados, idEdicao = null) {
    if (idEdicao) {
      return CadimusApi.fetch(`/api/despesas-fixas?id=${encodeURIComponent(idEdicao)}`, {
        method: "PUT",
        body: JSON.stringify(dados),
      });
    }

    return CadimusApi.fetch("/api/despesas-fixas", {
      method: "POST",
      body: JSON.stringify(dados),
    });
  }

  async function atualizarFixa(id, dados) {
    return CadimusApi.fetch(`/api/despesas-fixas?id=${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(dados),
    });
  }

  async function excluirFixa(id) {
    return CadimusApi.fetch(`/api/despesas-fixas?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      comJson: false,
    });
  }

  async function listarParceladas(filtros = {}) {
    return CadimusApi.fetch(endpoint("/api/compras-parceladas", filtros), { comJson: false });
  }

  async function criarParcelada(dados) {
    return CadimusApi.fetch("/api/compras-parceladas", {
      method: "POST",
      body: JSON.stringify(dados),
    });
  }

  async function atualizarParcelada(id, dados) {
    return CadimusApi.fetch(`/api/compras-parceladas?id=${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(dados),
    });
  }

  async function excluirParcelada(id) {
    return CadimusApi.fetch(`/api/compras-parceladas?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      comJson: false,
    });
  }

  async function listarRecorrentes(filtros = {}) {
    return CadimusApi.fetch(endpoint("/api/lancamentos-recorrentes", filtros), { comJson: false });
  }

  async function salvarRecorrente(dados, idEdicao = null) {
    if (idEdicao) {
      return CadimusApi.fetch(`/api/lancamentos-recorrentes?id=${encodeURIComponent(idEdicao)}`, {
        method: "PUT",
        body: JSON.stringify(dados),
      });
    }

    return CadimusApi.fetch("/api/lancamentos-recorrentes", {
      method: "POST",
      body: JSON.stringify(dados),
    });
  }

  async function atualizarRecorrente(id, dados) {
    return CadimusApi.fetch(`/api/lancamentos-recorrentes?id=${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(dados),
    });
  }

  async function excluirRecorrente(id) {
    return CadimusApi.fetch(`/api/lancamentos-recorrentes?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      comJson: false,
    });
  }

  window.CadimusScheduledApi = {
    listarFixas,
    salvarFixa,
    atualizarFixa,
    excluirFixa,
    listarParceladas,
    criarParcelada,
    atualizarParcelada,
    excluirParcelada,
    listarRecorrentes,
    salvarRecorrente,
    atualizarRecorrente,
    excluirRecorrente,
  };
})();
