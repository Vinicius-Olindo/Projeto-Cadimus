// ==========================================
// dashboard-card-detail-utils.js - Helpers dos detalhes dos cards
// ==========================================

function obterLancamentosDetalheCard(tipo) {
  const lancamentos = typeof ultimoLoteLancamentos !== "undefined" && Array.isArray(ultimoLoteLancamentos) ? ultimoLoteLancamentos : [];
  if (tipo === "receitas") return lancamentos.filter((l) => l.tipo === "receita" && l.status === "pago");
  if (tipo === "despesas") return lancamentos.filter((l) => l.tipo === "despesa");
  if (tipo === "pendentes") return lancamentos.filter((l) => l.status !== "pago");
  return lancamentos;
}

function obterTransferenciasDetalheCard() {
  return typeof ultimoLoteTransferencias !== "undefined" && Array.isArray(ultimoLoteTransferencias) ? ultimoLoteTransferencias : [];
}

function ordenarLancamentosDetalheCard(lancamentos) {
  return [...lancamentos].sort((a, b) => String(b.data_compra || "").localeCompare(String(a.data_compra || "")));
}

function formatarDataDetalheCard(data) {
  if (!data) return "Sem data";
  const [ano, mes, dia] = String(data).slice(0, 10).split("-");
  if (!ano || !mes || !dia) return String(data);
  return `${dia}/${mes}/${ano}`;
}

function obterStatusDetalheCard(lancamento) {
  if (lancamento.status === "pago") return { texto: "Pago", classe: "status-pago" };
  const data = String(lancamento.data_compra || "");
  const hoje = new Date().toISOString().slice(0, 10);
  if (data && data < hoje) return { texto: "Atrasado", classe: "status-atrasado" };
  return { texto: "Pendente", classe: "status-pendente" };
}

function somarLancamentosDetalheCard(lancamentos) {
  return lancamentos.reduce((total, lancamento) => total + valorMonetario(lancamento), 0);
}

function agruparPorStatusDetalheCard(lancamentos) {
  return lancamentos.reduce((grupos, lancamento) => {
    const chave = lancamento.status === "pago" ? "pagos" : "pendentes";
    grupos[chave] = (grupos[chave] || 0) + valorMonetario(lancamento);
    return grupos;
  }, {});
}

function agruparPorCategoriaDetalheCard(lancamentos) {
  const mapa = lancamentos.reduce((grupos, lancamento) => {
    const categoria = lancamento.categoria || "Sem categoria";
    grupos[categoria] = (grupos[categoria] || 0) + valorMonetario(lancamento);
    return grupos;
  }, {});

  return Object.entries(mapa)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
}

function obterArrayGlobalDetalhe(nome) {
  if (nome === "cartoesCreditoCarregados" && typeof cartoesCreditoCarregados !== "undefined" && Array.isArray(cartoesCreditoCarregados)) return cartoesCreditoCarregados;
  if (nome === "orcamentosCarregados" && typeof orcamentosCarregados !== "undefined" && Array.isArray(orcamentosCarregados)) return orcamentosCarregados;
  if (nome === "despesasFixasCarregadas" && typeof despesasFixasCarregadas !== "undefined" && Array.isArray(despesasFixasCarregadas)) return despesasFixasCarregadas;
  if (nome === "comprasParceladasCarregadas" && typeof comprasParceladasCarregadas !== "undefined" && Array.isArray(comprasParceladasCarregadas)) return comprasParceladasCarregadas;
  if (nome === "bonificacoesCarregadas" && typeof bonificacoesCarregadas !== "undefined" && Array.isArray(bonificacoesCarregadas)) return bonificacoesCarregadas;
  return [];
}

function criarMetricaDetalheCard(rotulo, valor, classe = "") {
  return `
    <div class="detalhe-analise-metrica">
      <span>${rotulo}</span>
      <strong class="${classe}">${valor}</strong>
    </div>
  `;
}

function criarLinhaAnaliseDetalhe({ titulo, detalhe = "", valor = "", classe = "", progresso = null }) {
  const largura = Number.isFinite(Number(progresso)) ? Math.max(0, Math.min(100, Number(progresso))) : null;
  return `
    <div class="detalhe-analise-linha">
      <div class="detalhe-analise-linha-topo">
        <span>
          <strong>${escaparHtml(titulo)}</strong>
          ${detalhe ? `<small>${escaparHtml(detalhe)}</small>` : ""}
        </span>
        ${valor ? `<b class="${classe}">${valor}</b>` : ""}
      </div>
      ${largura !== null ? `
        <div class="detalhe-analise-barra" aria-hidden="true">
          <span class="${classe}" style="width:${largura}%"></span>
        </div>
      ` : ""}
    </div>
  `;
}

function obterResumoAtualDetalheCard() {
  return typeof calcularResumoLancamentosLocal === "function"
    ? calcularResumoLancamentosLocal()
    : { totalReceitas: 0, totalDespesas: 0, totalPendente: 0, saldoCalculado: 0, totaisPorCategoria: {} };
}
