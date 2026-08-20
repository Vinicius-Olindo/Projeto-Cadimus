// ==========================================
// notifications-api.js - Acesso aos endpoints de notificações
// ==========================================

(function inicializarNotificationsApi() {
  async function sincronizar(notificacoes) {
    return CadimusApi.fetch("/api/notificacoes/sincronizar", {
      method: "POST",
      body: JSON.stringify({ notificacoes }),
    });
  }

  async function listar(status = "nao_lida", limite = 50) {
    const statusSeguro = encodeURIComponent(status);
    const limiteSeguro = encodeURIComponent(limite);
    const resposta = await CadimusApi.fetch(`/api/notificacoes?status=${statusSeguro}&limite=${limiteSeguro}`, { comJson: false });
    if (!resposta.ok) throw new Error("Falha ao buscar notificacoes.");
    return resposta.json();
  }

  async function gerarAutomaticas() {
    const resposta = await CadimusApi.fetch("/api/notificacoes/gerar", {
      method: "POST",
      body: JSON.stringify({}),
    });
    if (!resposta.ok) throw new Error("Falha ao gerar notificacoes.");
    return resposta.json();
  }

  async function marcarTodasComoLidas() {
    return CadimusApi.fetch("/api/notificacoes/lidas", {
      method: "PATCH",
      comJson: false,
    });
  }

  async function arquivar(id) {
    return CadimusApi.fetch(`/api/notificacoes?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      comJson: false,
    });
  }

  window.CadimusNotificationsApi = {
    sincronizar,
    listar,
    gerarAutomaticas,
    marcarTodasComoLidas,
    arquivar,
  };
})();
