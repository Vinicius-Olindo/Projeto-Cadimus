// ==========================================
// wallets-api.js - Acesso aos endpoints de carteiras e transferências
// ==========================================

(function inicializarWalletsApi() {
  async function listarCarteiras() {
    return CadimusApi.fetch("/api/carteiras", { comJson: false });
  }

  async function listarColegas() {
    return CadimusApi.fetch("/api/carteiras?colegas=1", { comJson: false });
  }

  async function listarMembros(carteiraId) {
    return CadimusApi.fetch(`/api/carteiras?membros=${encodeURIComponent(carteiraId)}`, { comJson: false });
  }

  async function criarCarteira(corpo) {
    return CadimusApi.fetch("/api/carteiras", {
      method: "POST",
      body: JSON.stringify(corpo),
    });
  }

  async function salvarOrdem(ordem) {
    return CadimusApi.fetch("/api/carteiras", {
      method: "PATCH",
      body: JSON.stringify({ ordem }),
    });
  }

  async function atualizarMembros(carteiraId, membros) {
    return CadimusApi.fetch(`/api/carteiras?id=${encodeURIComponent(carteiraId)}`, {
      method: "PUT",
      body: JSON.stringify({ membros }),
    });
  }

  async function excluirCarteira(carteiraId) {
    return CadimusApi.fetch(`/api/carteiras?id=${encodeURIComponent(carteiraId)}`, {
      method: "DELETE",
      comJson: false,
    });
  }

  async function transferir({ valor, valorCentavos, data, origemId, destinoId, descricao, idempotencyKey }) {
    return CadimusApi.fetch("/api/transferencias", {
      method: "POST",
      body: JSON.stringify({
        valor,
        valor_centavos: valorCentavos,
        data_transferencia: data,
        carteira_origem_id: origemId,
        carteira_destino_id: destinoId,
        descricao,
        idempotency_key: idempotencyKey,
      }),
    });
  }

  window.CadimusWalletsApi = {
    listarCarteiras,
    listarColegas,
    listarMembros,
    criarCarteira,
    salvarOrdem,
    atualizarMembros,
    excluirCarteira,
    transferir,
  };
})();
