// ==========================================
// entries-list-filters.js - Filtros da lista de lancamentos
// ==========================================

function limparFiltros() {
  const campoBusca = document.getElementById("busca-lancamento");
  const filtroTipo = document.getElementById("filtro-tipo");
  const filtroStatus = document.getElementById("filtro-status");
  const filtroCategoria = document.getElementById("filtro-categoria-lancamento");

  if (campoBusca) campoBusca.value = "";
  if (filtroTipo) filtroTipo.value = "";
  if (filtroStatus) filtroStatus.value = "";
  if (filtroCategoria) filtroCategoria.value = "";

  termoBuscaAtual = "";
  resetarPaginacaoLancamentos();
  renderizarListaLancamentos();
}

function filtrarLancamentosPendentes() {
  const campoBusca = document.getElementById("busca-lancamento");
  const filtroTipo = document.getElementById("filtro-tipo");
  const filtroStatus = document.getElementById("filtro-status");
  const filtroCategoria = document.getElementById("filtro-categoria-lancamento");

  if (campoBusca) campoBusca.value = "";
  if (filtroTipo) filtroTipo.value = "";
  if (filtroStatus) filtroStatus.value = "pendente";
  if (filtroCategoria) filtroCategoria.value = "";

  termoBuscaAtual = "";
  resetarPaginacaoLancamentos();
  renderizarListaLancamentos();

  document.querySelector(".lancamentos-cabecalho")?.scrollIntoView({ behavior: "smooth", block: "start" });
  mostrarToast("Mostrando compromissos a pagar", "info");
}

function limparFiltrosPeloResumo() {
  limparFiltros();
  document.querySelector(".lancamentos-cabecalho")?.scrollIntoView({ behavior: "smooth", block: "start" });
  mostrarToast("Filtros de lançamentos limpos", "info");
}
