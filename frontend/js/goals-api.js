// ==========================================
// goals-api.js - Acesso aos endpoints de metas e depósitos
// ==========================================

(function inicializarGoalsApi() {
  function montarQuery(filtros = {}) {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([chave, valor]) => {
      if (valor !== undefined && valor !== null && valor !== "") params.set(chave, valor);
    });
    return params.toString();
  }

  async function listarMetas(filtros = {}) {
    const query = montarQuery(filtros);
    return CadimusApi.fetch(`/api/metas${query ? `?${query}` : ""}`, { comJson: false });
  }

  async function salvarMeta(dados) {
    return CadimusApi.fetch("/api/metas", {
      method: "POST",
      body: JSON.stringify(dados),
    });
  }

  async function excluirMeta(id) {
    return CadimusApi.fetch(`/api/metas?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      comJson: false,
    });
  }

  async function listarDepositos(metaId) {
    return CadimusApi.fetch(`/api/metas-depositos?meta_id=${encodeURIComponent(metaId)}`, { comJson: false });
  }

  async function criarDeposito({ metaId, valor, valorCentavos, descricao }) {
    return CadimusApi.fetch("/api/metas-depositos", {
      method: "POST",
      body: JSON.stringify({
        meta_id: metaId,
        valor,
        valor_centavos: valorCentavos,
        descricao,
      }),
    });
  }

  async function excluirDeposito(id) {
    return CadimusApi.fetch(`/api/metas-depositos?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      comJson: false,
    });
  }

  window.CadimusGoalsApi = {
    listarMetas,
    salvarMeta,
    excluirMeta,
    listarDepositos,
    criarDeposito,
    excluirDeposito,
  };
})();
