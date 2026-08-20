// ==========================================
// planning-api.js - Acesso aos endpoints de Planejamento
// ==========================================

(function inicializarPlanningApi() {
  async function listarPlanos() {
    return CadimusApi.fetch("/api/planos");
  }

  async function listarPlanosCompartilhados() {
    return CadimusApi.fetch("/api/planos?tipo=compartilhados");
  }

  async function salvarPlano(dados, idEdicao = null) {
    const metodo = idEdicao ? "PUT" : "POST";
    const payload = idEdicao ? { id: Number(idEdicao), ...dados } : dados;

    return CadimusApi.fetch("/api/planos", {
      method: metodo,
      body: JSON.stringify(payload),
    });
  }

  async function atualizarStatusPlano(id, status) {
    return CadimusApi.fetch("/api/planos", {
      method: "PUT",
      body: JSON.stringify({ id, status }),
    });
  }

  async function listarDepositosPlano(planoId) {
    return CadimusApi.fetch(`/api/planos-depositos?plano_id=${encodeURIComponent(planoId)}`);
  }

  async function criarDepositoPlano({ planoId, valor, valorCentavos, descricao }) {
    return CadimusApi.fetch("/api/planos-depositos", {
      method: "POST",
      body: JSON.stringify({
        plano_id: Number(planoId),
        valor,
        valor_centavos: valorCentavos,
        descricao,
      }),
    });
  }

  window.CadimusPlanningApi = {
    listarPlanos,
    listarPlanosCompartilhados,
    salvarPlano,
    atualizarStatusPlano,
    listarDepositosPlano,
    criarDepositoPlano,
  };
})();
