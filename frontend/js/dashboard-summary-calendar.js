// ==========================================
// dashboard-summary-calendar.js - Calendario financeiro do dashboard
// ==========================================

function obterPeriodoSelecionadoCalendario() {
  const inputMes = document.getElementById("filtro-mes")?.value || "";
  const [ano, mes] = inputMes.split("-").map(Number);
  if (!ano || !mes) return null;
  return { ano, mes, totalDias: new Date(ano, mes, 0).getDate() };
}

function segundaComoPrimeiroDiaSemana(data) {
  const dia = data.getDay();
  return dia === 0 ? 6 : dia - 1;
}

function fecharModalCalendarioDia() {
  const modal = document.getElementById("modal-calendario-dia");
  if (modal) modal.style.display = "none";
}

function resumoLancamentosDiaCalendario(lancamentos = []) {
  const receitas = somarValoresMonetarios(lancamentos.filter((l) => l.tipo === "receita"));
  const despesas = somarValoresMonetarios(lancamentos.filter((l) => l.tipo !== "receita"));
  const pendentes = lancamentos.filter((l) => l.status !== "pago").length;
  return { receitas, despesas, pendentes, saldo: receitas - despesas };
}

function renderizarItemCalendarioDia(lancamento) {
  const tipo = lancamento.tipo === "receita" ? "receita" : "despesa";
  const status = lancamento.status === "pago" ? "pago" : "pendente";
  const textoStatus = status === "pago" ? "Pago" : "Pendente";
  const proximoStatus = status === "pago" ? "pendente" : "pago";
  const valor = formatadorBRL.format(valorMonetario(lancamento));

  return `
    <div class="calendario-dia-item calendario-dia-item-${tipo}">
      <div class="calendario-dia-item-info">
        <strong>${escaparHtml(lancamento.descricao || lancamento.categoria || "Lançamento")}</strong>
        <span>${escaparHtml(lancamento.categoria || "Sem categoria")} · ${escaparHtml(lancamento.carteira_nome || "Carteira")}</span>
      </div>
      <div class="calendario-dia-item-acoes">
        <span class="calendario-dia-item-valor tipo-${tipo}">${tipo === "receita" ? "+" : "-"} ${valor}</span>
        <button type="button" class="item-status status-${status}" data-calendario-status-id="${lancamento.id}" data-status-atual="${status}" title="Marcar como ${proximoStatus}">
          ${textoStatus}
        </button>
      </div>
    </div>
  `;
}

function abrirModalCalendarioDia(dataISO, lancamentosDoDia = []) {
  const modal = document.getElementById("modal-calendario-dia");
  const titulo = document.getElementById("calendario-dia-titulo");
  const resumo = document.getElementById("calendario-dia-resumo");
  const lista = document.getElementById("calendario-dia-lista");
  if (!modal || !titulo || !resumo || !lista) return;

  const dataFormatada = new Date(`${dataISO}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const totais = resumoLancamentosDiaCalendario(lancamentosDoDia);
  titulo.textContent = `Agenda de ${dataFormatada}`;
  resumo.textContent = lancamentosDoDia.length
    ? `${lancamentosDoDia.length} lançamento(s) · saldo ${formatadorBRL.format(totais.saldo)} · ${totais.pendentes} pendente(s)`
    : "Nenhum lançamento nesse dia.";

  lista.innerHTML = lancamentosDoDia.length
    ? lancamentosDoDia.map(renderizarItemCalendarioDia).join("")
    : '<div class="calendario-dia-vazio-modal">Sem lançamentos cadastrados para esta data.</div>';

  lista.querySelectorAll("[data-calendario-status-id]").forEach((botao) => {
    botao.addEventListener("click", async () => {
      botao.disabled = true;
      await alternarStatusLancamento(Number(botao.dataset.calendarioStatusId), botao.dataset.statusAtual);
      fecharModalCalendarioDia();
    });
  });

  document.getElementById("btn-fechar-modal-calendario-dia")?.addEventListener("click", fecharModalCalendarioDia, { once: true });
  modal.addEventListener("click", (evento) => {
    if (evento.target === modal) fecharModalCalendarioDia();
  }, { once: true });
  modal.style.display = "flex";
}

function renderizarCalendarioFinanceiro(lancamentos = []) {
  const card = document.getElementById("card-calendario-financeiro");
  const grid = document.getElementById("calendario-financeiro-grid");
  const resumo = document.getElementById("calendario-financeiro-resumo");
  if (!card || !grid) return;

  const periodo = obterPeriodoSelecionadoCalendario();
  const dados = Array.isArray(lancamentos) ? lancamentos : [];
  if (!periodo) {
    card.style.display = "none";
    return;
  }

  const porDia = new Map();
  dados.forEach((lancamento) => {
    const data = String(lancamento.data_compra || "");
    const dia = Number(data.slice(8, 10));
    if (!dia || data.slice(0, 7) !== `${periodo.ano}-${String(periodo.mes).padStart(2, "0")}`) return;
    const atual = porDia.get(dia) || { receitas: 0, despesas: 0, pendentes: 0, itens: 0, lancamentos: [] };
    const valor = valorMonetario(lancamento);
    atual.itens += 1;
    atual.lancamentos.push(lancamento);
    if (lancamento.status !== "pago") atual.pendentes += valor;
    if (lancamento.tipo === "receita") atual.receitas += valor;
    else atual.despesas += valor;
    porDia.set(dia, atual);
  });

  card.style.display = "flex";
  const totalItens = dados.length;
  const diasComMovimento = porDia.size;
  if (resumo) {
    resumo.textContent = totalItens > 0
      ? `${totalItens} lançamento(s) em ${diasComMovimento} dia(s) deste mês.`
      : "Sem lançamentos neste mês por enquanto.";
  }

  const primeiroDia = new Date(periodo.ano, periodo.mes - 1, 1);
  const espacosAntes = segundaComoPrimeiroDiaSemana(primeiroDia);
  const celulas = [];

  for (let i = 0; i < espacosAntes; i += 1) {
    celulas.push('<span class="calendario-dia calendario-dia-vazio" aria-hidden="true"></span>');
  }

  for (let dia = 1; dia <= periodo.totalDias; dia += 1) {
    const info = porDia.get(dia);
    const hojeISO = dataISOHojeDashboard();
    const dataISO = `${periodo.ano}-${String(periodo.mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    const classes = ["calendario-dia"];
    if (dataISO === hojeISO) classes.push("calendario-dia-hoje");
    if (info?.pendentes > 0) classes.push("calendario-dia-pendente");
    if (info?.despesas > 0) classes.push("calendario-dia-despesa");
    if (info?.receitas > 0) classes.push("calendario-dia-receita");

    const saldoDia = (info?.receitas || 0) - (info?.despesas || 0);
    const valorPrincipal = info ? formatadorBRL.format(Math.abs(saldoDia || info.pendentes || 0)) : "";
    const titulo = info
      ? `${dia}: ${info.itens} lançamento(s), saldo ${formatadorBRL.format(saldoDia)}, pendente ${formatadorBRL.format(info.pendentes)}`
      : `${dia}: sem movimento`;

    celulas.push(`
      <button type="button" class="${classes.join(" ")}" title="${escaparHtml(titulo)}" data-calendario-dia="${dia}">
        <span class="calendario-dia-numero">${dia}</span>
        ${info ? `<span class="calendario-dia-valor">${valorPrincipal}</span>` : ""}
        ${info ? `<span class="calendario-dia-pontos">
          ${info.receitas > 0 ? '<i class="ponto-receita"></i>' : ""}
          ${info.despesas > 0 ? '<i class="ponto-despesa"></i>' : ""}
          ${info.pendentes > 0 ? '<i class="ponto-pendente"></i>' : ""}
        </span>` : ""}
      </button>
    `);
  }

  grid.innerHTML = celulas.join("");
  grid.querySelectorAll("[data-calendario-dia]").forEach((botao) => {
    botao.onclick = () => {
      const dia = Number(botao.dataset.calendarioDia);
      const dataISO = `${periodo.ano}-${String(periodo.mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
      abrirModalCalendarioDia(dataISO, porDia.get(dia)?.lancamentos || []);
    };
  });
}
