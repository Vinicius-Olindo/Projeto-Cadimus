// ==========================================
// dashboard-card-refreshers.js - Atualizadores dos cards do dashboard
// ==========================================

const ENTIDADES_DASHBOARD_COMPLETAS = [
  "despesas-fixas",
  "compras-parceladas",
  "bonificacoes",
  "orcamentos",
  "metas",
  "cartoes",
];

function cardDashboardEstaVisivel(id) {
  const card = document.getElementById(id);
  if (!card) return false;
  return !card.classList.contains("dashboard-visao-oculto") && !card.classList.contains("dashboard-card-oculto-usuario");
}

function executarAtualizacaoPaineisDashboard(entidades, lancamentos = []) {
  if (entidades.has("despesas-fixas") && cardDashboardEstaVisivel("card-despesas-fixas") && typeof carregarPainelDespesasFixas === "function") {
    carregarPainelDespesasFixas();
  }
  if (entidades.has("compras-parceladas") && cardDashboardEstaVisivel("card-compras-parceladas") && typeof carregarPainelComprasParceladas === "function") {
    carregarPainelComprasParceladas();
  }
  if (entidades.has("bonificacoes") && cardDashboardEstaVisivel("card-bonificacoes") && typeof carregarPainelBonificacoes === "function") {
    carregarPainelBonificacoes(lancamentos);
  }
  if (entidades.has("orcamentos") && cardDashboardEstaVisivel("card-orcamentos") && typeof carregarOrcamentos === "function") {
    carregarOrcamentos();
  }
  if (entidades.has("metas") && cardDashboardEstaVisivel("card-metas-mes-dashboard") && typeof carregarMetas === "function") {
    carregarMetas();
  }
  if (entidades.has("cartoes") && cardDashboardEstaVisivel("card-cartoes-credito")) {
    window.carregarModuloCartoesCreditoCarteira?.().then(() => carregarCartoesCredito?.());
  }
}

function entidadesAfetadasPorLancamento(lancamento = {}) {
  const entidades = new Set(["bonificacoes", "orcamentos", "metas"]);
  if (lancamento.despesa_fixa_id) entidades.add("despesas-fixas");
  if (lancamento.compra_parcelada_id) entidades.add("compras-parceladas");
  if (lancamento.cartao_credito_id) entidades.add("cartoes");
  return [...entidades];
}
