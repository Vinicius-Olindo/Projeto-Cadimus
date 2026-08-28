// ==========================================
// components.js - Fábrica de Elementos HTML
// ==========================================

function escaparHtml(texto) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(texto));
  return div.innerHTML;
}

const MESES_ABREV_COMPONENTES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const ICONE_LAPIS =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>';
const ICONE_LIXEIRA =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>';
const ICONE_DUPLICAR =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>';
const ICONE_ANEXO =
  '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M21.4 11.6 12 21a6 6 0 0 1-8.5-8.5l9.9-9.9a4 4 0 0 1 5.7 5.7L9.2 18.2a2 2 0 0 1-2.8-2.8l9.2-9.2"/></svg>';

function sanitizarUrlAnexo(url) {
  const texto = String(url || "").trim();
  if (!texto) return "";
  try {
    const normalizada = new URL(texto);
    return normalizada.protocol === "https:" ? normalizada.href : "";
  } catch {
    return "";
  }
}

/**
 * Cria o HTML de uma linha de lançamento (despesa ou receita)
 * @param {Object} lancamento - Objeto com os dados do gasto/receita
 * @returns {HTMLElement} Elemento div pronto para ser injetado na tela
 */
function criarLinhaLancamento(lancamento) {
  const div = document.createElement("div");
  div.classList.add("linha-item");
  div.setAttribute("data-id", lancamento.id);

  // Formata pelo campo canônico em centavos quando ele vem da API; o campo em reais fica só como compatibilidade.
  const valorLancamento = Number.isInteger(lancamento.valor_centavos)
    ? window.CadimusMoney.centavosParaReais(lancamento.valor_centavos)
    : lancamento.valor;
  const valorFormatado = formatarMoedaBRL(valorLancamento);

  // Formata a data de compra para exibição brasileira
  const dataObjeto = new Date(lancamento.data_compra);
  const dataFormatada = dataObjeto.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  const diaDoMes = dataObjeto.toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit" });
  const mesAbrev = MESES_ABREV_COMPONENTES[dataObjeto.getUTCMonth()];

  // Define a classe de cor baseada no tipo (receita ou despesa)
  const classeTipo = lancamento.tipo === "receita" ? "texto-receita" : "texto-despesa";
  const sinal = lancamento.tipo === "receita" ? "+" : "−";

  // Define a cor/estilo do status de pagamento
  const dataVenc = new Date(lancamento.data_compra + "T23:59:59");
  const hoje = new Date();
  const atrasado = lancamento.status !== "pago" && dataVenc < hoje;
  const classeStatus = lancamento.status === "pago" ? "status-pago" : atrasado ? "status-atrasado" : "status-pendente";
  const textoStatus = lancamento.status === "pago" ? "Pago" : atrasado ? "Atrasado" : "Pendente";

  // Carimbo de autor: quem lançou esse registro (importante numa carteira compartilhada)
  const nomeAutor = lancamento.criado_por_nome || "?";
  const inicialAutor = nomeAutor.charAt(0).toUpperCase();
  const corAutor = corDoAutor(nomeAutor);
  const fotoAutorSegura = sanitizarUrl(lancamento.criado_por_foto);
  const nomeAutorSeguro = escaparHtml(nomeAutor);
  const avatarAutorHtml = fotoAutorSegura
    ? `<img class="carimbo-autor carimbo-autor-foto" src="${fotoAutorSegura}" alt="" />`
    : `<span class="carimbo-autor" style="--cor-autor: ${corAutor}">${inicialAutor}</span>`;
  const carimboAutorHtml = `
    <span class="carimbo-autor-chip" title="Lançado por ${nomeAutorSeguro}" aria-label="Lançado por ${nomeAutorSeguro}">
      ${avatarAutorHtml}
      <span class="carimbo-autor-nome">${nomeAutorSeguro}</span>
    </span>
  `;
  const tipoTexto = lancamento.tipo === "receita" ? "Receita" : "Despesa";

  // Só quem criou o lançamento (ou um admin) pode editar/excluir em carteira pessoal.
  // Em carteira compartilhada, qualquer membro com acesso à carteira pode gerenciar
  // os lançamentos dela; o backend confirma a mesma regra.
  const usuarioLogado = obterUsuarioLogado();
  const carteiraSelecionada = typeof obterCarteiraSelecionada === "function" ? obterCarteiraSelecionada() : null;
  const carteiraCompartilhada = carteiraSelecionada && String(carteiraSelecionada.id) === String(lancamento.carteira_id) && carteiraSelecionada.tipo === "compartilhada";
  const podeGerenciar = carteiraCompartilhada || lancamento.criado_por === usuarioLogado.id || usuarioLogado.perfil === "superadmin";
  const botoesGerenciar = podeGerenciar
    ? `<button class="btn-duplicar" data-action="duplicar" data-id="${lancamento.id}" title="Duplicar lançamento">${ICONE_DUPLICAR}</button>
       <button class="btn-editar" data-action="editar" data-id="${lancamento.id}" title="Editar registro">${ICONE_LAPIS}</button>
       <button class="btn-excluir" data-action="apagar" data-id="${lancamento.id}" title="Apagar registro">${ICONE_LIXEIRA}</button>`
    : "";

  // Nota do lançamento: a lista mostra um chip curto e o clique abre a nota completa.
  const temNota = lancamento.nota && lancamento.nota.trim().length > 0;
  const notaCompleta = temNota ? lancamento.nota.trim() : "";
  const notaResumo = notaCompleta.length > 42 ? `${notaCompleta.slice(0, 42).trim()}…` : notaCompleta;
  const notaHtml = temNota
    ? `<button type="button" class="item-nota-texto item-nota-clique" data-nota="${escaparHtml(notaCompleta)}" data-descricao="${escaparHtml(lancamento.descricao)}" title="${escaparHtml(notaCompleta)}">
        <span class="item-nota-label">Ver nota</span>
        <span class="item-nota-preview">${escaparHtml(notaResumo)}</span>
      </button>`
    : "";
  const anexoUrlSegura = sanitizarUrlAnexo(lancamento.anexo_url);
  const anexoTitulo = lancamento.anexo_nome || "Comprovante";
  const anexoHtml = anexoUrlSegura
    ? `<a class="item-anexo-link" href="${escaparHtml(anexoUrlSegura)}" target="_blank" rel="noopener noreferrer" title="${escaparHtml(anexoTitulo)}">
        ${ICONE_ANEXO}
        <span>${escaparHtml(anexoTitulo)}</span>
      </a>`
    : "";

  // Estrutura da linha: etiqueta de data compacta + corpo do lançamento —
  // lista de transações, não mais uma página de livro-caixa
  div.innerHTML = `
        <label class="lote-checkbox">
          <input type="checkbox" class="lote-check" data-id="${lancamento.id}" />
          <span class="lote-check-marca"></span>
        </label>
        <div class="data-chip" title="${dataFormatada}">
          <span class="data-chip-dia">${diaDoMes}</span>
          <span class="data-chip-mes">${mesAbrev}</span>
        </div>
        <div class="linha-corpo">
            <div class="item-info-principal">
                <span class="item-descricao">${escaparHtml(lancamento.descricao)}</span>
                <div class="item-metadados">
                  <span class="item-categoria">${escaparHtml(lancamento.categoria)}</span>
                  <span class="item-meta-separador">•</span>
                  <span class="item-tipo ${classeTipo}">${tipoTexto}</span>
                </div>
                ${notaHtml}
                ${anexoHtml}
            </div>
            <div class="item-valores">
              <div class="item-chips">
                ${carimboAutorHtml}
                <span class="item-meio-pagamento">${lancamento.meio_pagamento}</span>
                <button type="button" class="item-status ${classeStatus}" data-action="status" data-id="${lancamento.id}" data-status-atual="${lancamento.status}" title="Clique para marcar como ${lancamento.status === "pago" ? "pendente" : "pago"}">${textoStatus}</button>
              </div>
              <div class="item-valor-acoes">
                <span class="item-valor ${classeTipo}" title="${sinal} ${valorFormatado}">${sinal} ${valorFormatado}</span>
                <div class="item-acoes">${botoesGerenciar}</div>
              </div>
            </div>
        </div>
  `;

  return div;
}

/**
 * Escolhe uma cor estável para o carimbo de autor a partir do nome de usuário,
 * assim a mesma pessoa sempre aparece com a mesma cor.
 * @param {string} nome
 * @returns {string} valor CSS (ex: "var(--autor-b)")
 */
function corDoAutor(nome) {
  const cores = ["var(--autor-a)", "var(--autor-b)", "var(--autor-c)", "var(--autor-d)"];
  let hash = 0;
  for (let i = 0; i < nome.length; i++) {
    hash = (hash * 31 + nome.charCodeAt(i)) >>> 0;
  }
  return cores[hash % cores.length];
}

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
