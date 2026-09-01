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

function criarResumoSaldoDetalheCard(resumo) {
  const transferencias = obterTransferenciasDetalheCard();
  const linhas = [
    { nome: "Receitas pagas", valor: resumo.totalReceitas, classe: "texto-receita", sinal: "+" },
    { nome: "Despesas do período", valor: resumo.totalDespesas, classe: "texto-despesa", sinal: "−" },
    { nome: "Transferências enviadas", valor: resumo.totalTransferenciasSaida, classe: "texto-despesa", sinal: "−" },
    { nome: "Transferências recebidas", valor: resumo.totalTransferenciasEntrada, classe: "texto-receita", sinal: "+" },
  ].filter((item) => item.valor > 0);

  const saldoClasse = resumo.saldoCalculado >= 0 ? "texto-receita" : "texto-despesa";
  return `
    <div class="detalhe-card-formula">
      ${linhas.length ? linhas.map((item) => `
        <div class="detalhe-card-formula-linha">
          <span>${item.nome}</span>
          <strong class="${item.classe}">${item.sinal} ${formatadorBRL.format(item.valor)}</strong>
        </div>
      `).join("") : `<p class="detalhe-card-vazio">Sem movimento no período selecionado.</p>`}
      <div class="detalhe-card-formula-total">
        <span>Saldo calculado</span>
        <strong class="${saldoClasse}">${formatadorBRL.format(resumo.saldoCalculado)}</strong>
      </div>
      ${transferencias.length ? `<small>${transferencias.length} transferência(s) considerada(s) no período.</small>` : ""}
    </div>
  `;
}

function criarListaLancamentosDetalheCard(lancamentos, config) {
  const ordenados = ordenarLancamentosDetalheCard(lancamentos);
  const primeiros = ordenados.slice(0, 8);

  if (!primeiros.length) {
    return `<p class="detalhe-card-vazio">Nada encontrado para este card no período atual.</p>`;
  }

  return `
    <div class="detalhe-card-lista">
      ${primeiros.map((lancamento) => {
        const status = obterStatusDetalheCard(lancamento);
        const valor = valorMonetario(lancamento);
        const sinal = lancamento.tipo === "receita" ? "+" : "−";
        const classeValor = lancamento.tipo === "receita" ? "texto-receita" : "texto-despesa";
        return `
          <div class="detalhe-card-item">
            <div class="detalhe-card-item-info">
              <strong>${escaparHtml(lancamento.descricao || "Lançamento")}</strong>
              <small>${formatarDataDetalheCard(lancamento.data_compra)} · ${escaparHtml(lancamento.categoria || "Sem categoria")}</small>
            </div>
            <div class="detalhe-card-item-valor">
              <span class="${classeValor}">${sinal} ${formatadorBRL.format(valor)}</span>
              <em class="${status.classe}">${status.texto}</em>
            </div>
          </div>
        `;
      }).join("")}
      ${ordenados.length > primeiros.length ? `<div class="detalhe-card-mais">+${ordenados.length - primeiros.length} lançamento(s) na lista completa</div>` : ""}
    </div>
  `;
}

function criarCategoriasDetalheCard(lancamentos) {
  const categorias = agruparPorCategoriaDetalheCard(lancamentos);
  if (!categorias.length) return "";

  return `
    <div class="detalhe-card-categorias">
      <span class="detalhe-card-secao-titulo">Maiores categorias</span>
      ${categorias.map(([categoria, valor]) => `
        <div class="detalhe-card-categoria">
          <span>${escaparHtml(categoria)}</span>
          <strong>${formatadorBRL.format(valor)}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function criarSubtotalStatusDetalheCard(tipo, lancamentos) {
  if (tipo !== "despesas" && tipo !== "pendentes") return "";
  const grupos = agruparPorStatusDetalheCard(lancamentos);
  const partes = [];
  if (grupos.pagos) partes.push(`<span>Pagas <strong>${formatadorBRL.format(grupos.pagos)}</strong></span>`);
  if (grupos.pendentes) partes.push(`<span>Pendentes <strong>${formatadorBRL.format(grupos.pendentes)}</strong></span>`);
  if (!partes.length) return "";
  return `<div class="detalhe-card-subtotais">${partes.join("")}</div>`;
}

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
        <button type="button" class="btn-fechar-modal detalhe-card-fechar" id="btn-fechar-modal-detalhe-card" aria-label="Fechar detalhes">×</button>
      </div>
      <div id="detalhe-card-corpo"></div>
      <div class="detalhe-card-acoes">
        <button type="button" class="btn-secundario" id="btn-detalhe-card-filtrar">Ver na lista</button>
        <button type="button" class="btn-secundario" id="btn-detalhe-card-fechar">Fechar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.addEventListener("click", (evento) => {
    if (evento.target === modal) fecharModalDetalheCard();
  });
  modal.querySelector("#btn-fechar-modal-detalhe-card")?.addEventListener("click", fecharModalDetalheCard);
  modal.querySelector("#btn-detalhe-card-fechar")?.addEventListener("click", fecharModalDetalheCard);
  modal.querySelector("#btn-detalhe-card-filtrar")?.addEventListener("click", aplicarFiltroDetalheCard);

  return modal;
}

function clonarCardAnaliticoParaDetalhe(card) {
  const clone = card.cloneNode(true);
  clone.removeAttribute("id");
  clone.removeAttribute("style");
  clone.removeAttribute("role");
  clone.removeAttribute("tabindex");
  clone.removeAttribute("title");
  clone.removeAttribute("aria-label");
  clone.classList.remove("dashboard-card-detalhe-atalho", "dashboard-card-editavel", "arrastando");
  clone.classList.add("detalhe-card-clone");
  delete clone.dataset.cardAnalitico;
  delete clone.dataset.cardAnaliticoTitulo;

  clone.querySelectorAll("[id]").forEach((elemento) => elemento.removeAttribute("id"));
  clone.querySelectorAll(".dashboard-layout-card-acoes, .dashboard-card-drag-handle").forEach((elemento) => elemento.remove());
  clone.querySelectorAll("button, a, input, select, textarea").forEach((elemento) => {
    if (elemento.matches(".btn-link-adicionar, .btn-editar, .btn-excluir, .btn-duplicar")) {
      elemento.remove();
      return;
    }
    elemento.setAttribute("tabindex", "-1");
  });

  return clone;
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

  if (titulo) titulo.textContent = tituloCard;
  if (subtitulo) subtitulo.textContent = "Visão ampliada do card para consultar com mais conforto.";
  if (btnFiltrar) btnFiltrar.style.display = "none";
  if (corpo) {
    corpo.innerHTML = "";
    corpo.appendChild(clonarCardAnaliticoParaDetalhe(card));
  }

  modal.dataset.tipo = "";
  modal.dataset.cardAnalitico = card.dataset.cardAnalitico || "";
  modal.style.display = "flex";
  if (typeof trapFoco === "function") trapFoco(modal);
}

function fecharModalDetalheCard() {
  const modal = document.getElementById("modal-detalhe-card-dashboard");
  if (!modal) return;
  modal.style.display = "none";
  modal.dataset.tipo = "";
  modal.dataset.cardAnalitico = "";
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

  if (titulo) titulo.textContent = config.titulo;
  if (subtitulo) subtitulo.textContent = config.subtitulo;
  if (btnFiltrar) {
    btnFiltrar.textContent = config.filtroTexto;
    btnFiltrar.style.display = "";
  }
  if (corpo) {
    corpo.innerHTML = `
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
