// ==========================================
// entries-list-pagination.js - Paginação da lista de lançamentos
// ==========================================

let gruposRecolhidos = new Set();
let paginaLancamentosAtual = 1;
const OPCOES_LANCAMENTOS_POR_PAGINA = [10, 20, 30, 50];
const CHAVE_LANCAMENTOS_POR_PAGINA = "cadimus_lancamentos_por_pagina";
let lancamentosPorPagina = obterPreferenciaLancamentosPorPagina();
let renderizacaoListaLancamentosPendente = false;

function agendarRenderizacaoListaLancamentos(opcoes = {}) {
  if (opcoes.resetarPagina) resetarPaginacaoLancamentos();
  if (renderizacaoListaLancamentosPendente) return;

  renderizacaoListaLancamentosPendente = true;
  requestAnimationFrame(() => {
    renderizacaoListaLancamentosPendente = false;
    renderizarListaLancamentos();
    if (opcoes.rolar) {
      document.getElementById("lista-lancamentos")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

function obterPreferenciaLancamentosPorPagina() {
  const salvo = Number(lerLocalStorageSeguro(CHAVE_LANCAMENTOS_POR_PAGINA));
  return OPCOES_LANCAMENTOS_POR_PAGINA.includes(salvo) ? salvo : 20;
}

function ocultarPaginacaoLancamentos() {
  const paginacao = document.getElementById("lancamentos-paginacao");
  if (paginacao) paginacao.innerHTML = "";
}

function renderizarSeletorLancamentosPorPagina() {
  return `
    <label class="lancamentos-por-pagina">
      <span>Por página</span>
      <select id="lancamentos-por-pagina-select" aria-label="Lançamentos por página">
        ${OPCOES_LANCAMENTOS_POR_PAGINA.map((opcao) => `<option value="${opcao}" ${opcao === lancamentosPorPagina ? "selected" : ""}>${opcao}</option>`).join("")}
      </select>
    </label>
  `;
}

function renderizarPaginacaoLancamentos(totalItens) {
  const paginacao = document.getElementById("lancamentos-paginacao");
  if (!paginacao) return;

  const totalPaginas = Math.ceil(totalItens / lancamentosPorPagina);
  if (totalItens <= 0) {
    paginacao.innerHTML = "";
    return;
  }

  paginaLancamentosAtual = Math.min(Math.max(paginaLancamentosAtual, 1), totalPaginas);
  const inicio = (paginaLancamentosAtual - 1) * lancamentosPorPagina + 1;
  const fim = Math.min(paginaLancamentosAtual * lancamentosPorPagina, totalItens);

  const botoes = [];
  if (totalPaginas > 1) {
    for (let pagina = 1; pagina <= totalPaginas; pagina++) {
      if (totalPaginas > 7 && pagina > 3 && pagina < totalPaginas - 1 && Math.abs(pagina - paginaLancamentosAtual) > 1) {
        if (pagina === 4 || pagina === totalPaginas - 2) botoes.push('<button type="button" disabled>…</button>');
        continue;
      }
      botoes.push(`<button type="button" class="${pagina === paginaLancamentosAtual ? "ativo" : ""}" data-pagina="${pagina}" aria-label="Ir para página ${pagina}">${pagina}</button>`);
    }
  }

  paginacao.innerHTML = `
    <div class="lancamentos-paginacao-info">Mostrando ${inicio}-${fim} de ${totalItens}</div>
    <div class="lancamentos-paginacao-controles">
      ${renderizarSeletorLancamentosPorPagina()}
      ${totalPaginas > 1 ? `
        <div class="lancamentos-paginacao-botoes">
          <button type="button" data-pagina="${paginaLancamentosAtual - 1}" ${paginaLancamentosAtual <= 1 ? "disabled" : ""} aria-label="Página anterior">‹</button>
          ${botoes.join("")}
          <button type="button" data-pagina="${paginaLancamentosAtual + 1}" ${paginaLancamentosAtual >= totalPaginas ? "disabled" : ""} aria-label="Próxima página">›</button>
        </div>
      ` : ""}
    </div>
  `;
}

function irParaPaginaLancamentos(pagina) {
  paginaLancamentosAtual = pagina;
  agendarRenderizacaoListaLancamentos({ rolar: true });
}

function resetarPaginacaoLancamentos() {
  paginaLancamentosAtual = 1;
}
