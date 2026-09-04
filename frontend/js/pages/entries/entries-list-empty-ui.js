// ==========================================
// entries-list-empty-ui.js - Estados visuais da lista de lançamentos
// ==========================================

/**
 * Cria uma mensagem visual indicando que os dados estão sendo carregados da nuvem
 * @returns {HTMLElement} Elemento de carregamento
 */
function criarFeedbackCarregamento() {
  const div = document.createElement("div");
  div.classList.add("loading-container");
  div.innerHTML = `
        <div class="spinner"></div>
        <p>Sincronizando com a nuvem CADIMUS...</p>
    `;
  return div;
}

/**
 * Cria um elemento de aviso para lista vazia
 * (quando não há lançamentos no período, ou quando uma busca não encontrar nada)
 * @param {string} [mensagem] - Texto customizado (opcional)
 * @param {string} [textoBotao] - Texto do botão de ação (opcional)
 * @param {string} [acaoBotao] - Ação do botão (opcional: "novo-lancamento" ou "limpar-filtros")
 * @returns {HTMLElement} Elemento de lista vazia
 */
function criarAvisoListaVazia(mensagem, textoBotao, acaoBotao) {
  const div = document.createElement("div");
  div.classList.add("lista-vazia");

  let botaoHtml = "";
  if (acaoBotao === "limpar-filtros") {
    botaoHtml = `
      <button type="button" class="lista-vazia-btn" data-action="limpar-filtros">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
        </svg>
        ${textoBotao || "Limpar filtros"}
      </button>`;
  } else if (acaoBotao === "novo-lancamento" || !acaoBotao) {
    botaoHtml = `
      <button type="button" class="lista-vazia-btn" data-action="novo-lancamento">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        ${textoBotao || "Criar primeiro lançamento"}
      </button>`;
  }

  div.innerHTML = `
        <div class="lista-vazia-icone">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
        </div>
        <p class="lista-vazia-texto">${mensagem || "Nenhum lançamento neste período."}</p>
        ${botaoHtml}
    `;
  return div;
}
