// ==========================================
// dashboard-card-details-ui.js - Detalhes dos cards de resumo
// ==========================================

const DETALHE_CARD_TIPOS = {
  receitas: {
    titulo: "Receitas do período",
    subtitulo: "Entradas pagas que compõem o total do card.",
    classeValor: "texto-receita",
    sinal: "+",
    filtro: { tipo: "receita", status: "pago" },
    filtroTexto: "Ver receitas na lista",
  },
  despesas: {
    titulo: "Despesas do período",
    subtitulo: "Saídas pagas e pendentes que compõem o total do card.",
    classeValor: "texto-despesa",
    sinal: "−",
    filtro: { tipo: "despesa", status: "" },
    filtroTexto: "Ver despesas na lista",
  },
  pendentes: {
    titulo: "Compromissos a pagar",
    subtitulo: "Despesas ainda pendentes neste período.",
    classeValor: "texto-pendente",
    sinal: "−",
    filtro: { tipo: "", status: "pendente" },
    filtroTexto: "Ver pendentes na lista",
  },
  saldo: {
    titulo: "Composição do saldo",
    subtitulo: "Resumo do cálculo usado no saldo do período.",
    classeValor: "",
    sinal: "",
    filtro: { tipo: "", status: "" },
    filtroTexto: "Ver lançamentos do período",
  },
};

function garantirModalDetalheCard() {
  let modal = document.getElementById("modal-detalhe-card-dashboard");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "modal-detalhe-card-dashboard";
  modal.className = "modal-overlay modal-detalhe-card-dashboard";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "detalhe-card-titulo");
  modal.style.display = "none";
  modal.innerHTML = `
    <div class="modal-content detalhe-card-content">
      <div class="detalhe-card-topo">
        <div>
          <span class="detalhe-card-eyebrow">Detalhe do card</span>
          <h3 id="detalhe-card-titulo">Resumo</h3>
          <p id="detalhe-card-subtitulo"></p>
        </div>
        <button type="button" class="btn-fechar-modal detalhe-card-fechar" id="btn-fechar-modal-detalhe-card" data-detalhe-card-fechar aria-label="Fechar detalhes">×</button>
      </div>
      <div id="detalhe-card-corpo"></div>
      <div class="detalhe-card-acoes">
        <button type="button" class="btn-secundario" id="btn-detalhe-card-filtrar">Ver na lista</button>
        <button type="button" class="btn-secundario" id="btn-detalhe-card-fechar" data-detalhe-card-fechar>Fechar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.addEventListener("click", (evento) => {
    const botaoFechar = evento.target.closest("[data-detalhe-card-fechar]");
    if (botaoFechar && modal.contains(botaoFechar)) {
      evento.preventDefault();
      evento.stopPropagation();
      fecharModalDetalheCard();
      return;
    }

    if (evento.target === modal) {
      evento.preventDefault();
      fecharModalDetalheCard();
    }
  });
  modal.querySelector("#btn-detalhe-card-filtrar")?.addEventListener("click", aplicarFiltroDetalheCard);

  return modal;
}

function abrirModalCardAnaliticoDashboard(card) {
  if (!card) return;

  const modal = garantirModalDetalheCard();
  const titulo = modal.querySelector("#detalhe-card-titulo");
  const subtitulo = modal.querySelector("#detalhe-card-subtitulo");
  const corpo = modal.querySelector("#detalhe-card-corpo");
  const btnFiltrar = modal.querySelector("#btn-detalhe-card-filtrar");
  const tituloCard = card.dataset.cardAnaliticoTitulo
    || card.querySelector(".resumo-categorias-titulo")?.textContent?.trim()
    || "Detalhe do card";
  const detalheAnalitico = criarDetalheAnaliticoDashboard(card);

  if (titulo) titulo.textContent = tituloCard;
  if (subtitulo) subtitulo.textContent = detalheAnalitico?.subtitulo || "Resumo detalhado do card selecionado.";
  if (btnFiltrar) btnFiltrar.style.display = "none";
  if (corpo) {
    if (detalheAnalitico) {
      corpo.innerHTML = detalheAnalitico.html;
    } else {
      corpo.innerHTML = "";
      corpo.appendChild(clonarCardAnaliticoParaDetalhe(card));
    }
  }

  modal.dataset.tipo = "";
  modal.dataset.cardAnalitico = card.dataset.cardAnalitico || "";
  modal.classList.toggle("modal-detalhe-analitico", Boolean(detalheAnalitico));
  modal.style.display = "flex";
  if (typeof trapFoco === "function") trapFoco(modal);
}

function fecharModalDetalheCard() {
  const modal = document.getElementById("modal-detalhe-card-dashboard");
  if (!modal) return;
  if (typeof liberarFoco === "function") liberarFoco();
  modal.style.display = "none";
  modal.dataset.tipo = "";
  modal.dataset.cardAnalitico = "";
  modal.classList.remove("modal-detalhe-analitico");
}

function abrirModalDetalheCard(tipo) {
  const config = DETALHE_CARD_TIPOS[tipo];
  if (!config) return;

  const modal = garantirModalDetalheCard();
  const titulo = modal.querySelector("#detalhe-card-titulo");
  const subtitulo = modal.querySelector("#detalhe-card-subtitulo");
  const corpo = modal.querySelector("#detalhe-card-corpo");
  const btnFiltrar = modal.querySelector("#btn-detalhe-card-filtrar");
  const resumo = typeof calcularResumoLancamentosLocal === "function" ? calcularResumoLancamentosLocal() : {};
  const lancamentos = obterLancamentosDetalheCard(tipo);
  const total = tipo === "saldo" ? Number(resumo.saldoCalculado || 0) : somarLancamentosDetalheCard(lancamentos);
  const classeTotal = tipo === "saldo"
    ? total >= 0 ? "texto-receita" : "texto-despesa"
    : config.classeValor;
  const detalheAnalitico = criarDetalheResumoTopoAnalitico(tipo, resumo, lancamentos);

  if (titulo) titulo.textContent = config.titulo;
  if (subtitulo) subtitulo.textContent = detalheAnalitico?.subtitulo || config.subtitulo;
  if (btnFiltrar) {
    btnFiltrar.textContent = config.filtroTexto;
    btnFiltrar.style.display = "";
  }
  if (corpo) {
    corpo.innerHTML = detalheAnalitico?.html || `
        <div class="detalhe-card-total">
          <span>Total</span>
          <strong class="${classeTotal}">${formatadorBRL.format(total)}</strong>
        </div>
        ${tipo === "saldo" ? criarResumoSaldoDetalheCard(resumo) : `
          ${criarSubtotalStatusDetalheCard(tipo, lancamentos)}
          ${criarCategoriasDetalheCard(lancamentos)}
          ${criarListaLancamentosDetalheCard(lancamentos, config)}
        `}
      `;
  }

  modal.dataset.tipo = tipo;
  modal.dataset.cardAnalitico = "";
  modal.classList.add("modal-detalhe-analitico");
  modal.style.display = "flex";
  if (typeof trapFoco === "function") trapFoco(modal);
}

function aplicarFiltroDetalheCard() {
  const tipo = document.getElementById("modal-detalhe-card-dashboard")?.dataset?.tipo;
  const config = DETALHE_CARD_TIPOS[tipo];
  if (!config) return;

  const campoBusca = document.getElementById("busca-lancamento");
  const filtroTipo = document.getElementById("filtro-tipo");
  const filtroStatus = document.getElementById("filtro-status");
  const filtroCategoria = document.getElementById("filtro-categoria-lancamento");

  if (campoBusca) campoBusca.value = "";
  if (filtroTipo) filtroTipo.value = config.filtro.tipo;
  if (filtroStatus) filtroStatus.value = config.filtro.status;
  if (filtroCategoria) filtroCategoria.value = "";
  if (typeof termoBuscaAtual !== "undefined") termoBuscaAtual = "";
  if (typeof resetarPaginacaoLancamentos === "function") resetarPaginacaoLancamentos();
  if (typeof renderizarListaLancamentos === "function") renderizarListaLancamentos();
  fecharModalDetalheCard();
  document.querySelector(".lancamentos-cabecalho")?.scrollIntoView({ behavior: "smooth", block: "start" });
  if (typeof mostrarToast === "function") mostrarToast("Lista filtrada pelo card", "info");
}

function configurarDetalhesCardsDashboard() {
  document.querySelectorAll("[data-resumo-card]").forEach((card) => {
    const tipo = card.dataset.resumoCard;
    if (!DETALHE_CARD_TIPOS[tipo]) return;

    card.addEventListener("click", (evento) => {
      evento.preventDefault();
      evento.stopImmediatePropagation();
      abrirModalDetalheCard(tipo);
    }, true);

    card.addEventListener("keydown", (evento) => {
      if (evento.key !== "Enter" && evento.key !== " ") return;
      evento.preventDefault();
      evento.stopImmediatePropagation();
      abrirModalDetalheCard(tipo);
    }, true);
  });

  document.addEventListener("click", (evento) => {
    const card = evento.target.closest("[data-card-analitico]");
    if (!card || document.body.classList.contains("dashboard-layout-modo-ativo")) return;
    if (evento.target.closest("button, a, input, select, textarea, label, [data-action], [data-risco-acao]")) return;
    evento.preventDefault();
    abrirModalCardAnaliticoDashboard(card);
  });

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && document.getElementById("modal-detalhe-card-dashboard")?.style.display !== "none") {
      evento.preventDefault();
      fecharModalDetalheCard();
      return;
    }

    if (evento.key !== "Enter" && evento.key !== " ") return;
    const card = evento.target.closest("[data-card-analitico]");
    if (!card || document.body.classList.contains("dashboard-layout-modo-ativo")) return;
    if (evento.target.closest("button, a, input, select, textarea, label, [data-action], [data-risco-acao]")) return;
    evento.preventDefault();
    abrirModalCardAnaliticoDashboard(card);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", configurarDetalhesCardsDashboard);
} else {
  configurarDetalhesCardsDashboard();
}
