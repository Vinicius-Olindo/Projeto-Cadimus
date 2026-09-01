// ==========================================
// dashboard-summary-today.js - Hoje financeiro do dashboard
// ==========================================

function dataISOHojeDashboard() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function dataSelecionadaEhMesAtualDashboard() {
  const campoMes = document.getElementById("filtro-mes")?.value || "";
  return campoMes && dataISOHojeDashboard().startsWith(campoMes);
}

function resumoItemHojeDashboard(lancamento) {
  const valor = valorMonetario(lancamento);
  const classe = lancamento.tipo === "receita" ? "texto-receita" : "texto-despesa";
  const sinal = lancamento.tipo === "receita" ? "+" : "−";
  const rotuloStatus = lancamento.status === "pago" ? "pago" : "pendente";

  return `
    <div class="hoje-dashboard-item">
      <span class="hoje-dashboard-item-info">
        <strong>${escaparHtml(lancamento.descricao || "Lançamento")}</strong>
        <small>${escaparHtml(lancamento.categoria || "Sem categoria")} • ${rotuloStatus}</small>
      </span>
      <span class="hoje-dashboard-item-valor ${classe}">${sinal} ${formatadorBRL.format(valor)}</span>
    </div>
  `;
}

function configurarAcoesTelaHojeDashboard() {
  const btnNovo = document.getElementById("hoje-btn-novo");
  const btnPendentes = document.getElementById("hoje-btn-pendentes");
  const btnBuscar = document.getElementById("hoje-btn-buscar");

  if (btnNovo) btnNovo.onclick = () => {
    if (typeof abrirModalNovoLancamento === "function") abrirModalNovoLancamento();
  };

  if (btnPendentes) btnPendentes.onclick = () => {
    if (typeof filtrarLancamentosPendentes === "function") filtrarLancamentosPendentes();
  };

  if (btnBuscar) btnBuscar.onclick = () => {
    if (typeof abrirBuscaGlobal === "function") abrirBuscaGlobal();
    else document.getElementById("busca-lancamento")?.focus();
  };
}

function renderizarTelaHojeDashboard(lancamentos = [], totais = {}) {
  const card = document.getElementById("card-hoje-dashboard");
  if (!card) return;

  const hojeISO = dataISOHojeDashboard();
  const hojeData = new Date(`${hojeISO}T12:00:00`);
  const mesmoMes = dataSelecionadaEhMesAtualDashboard();
  const lancamentosSeguros = Array.isArray(lancamentos) ? lancamentos : [];
  const lancamentosHoje = mesmoMes ? lancamentosSeguros.filter((l) => l.data_compra === hojeISO) : [];
  const vencendoHoje = lancamentosHoje.filter((l) => l.status !== "pago");
  const atrasados = mesmoMes
    ? lancamentosSeguros.filter((l) => l.status !== "pago" && l.data_compra && l.data_compra < hojeISO)
    : [];
  const pendenteHoje = vencendoHoje.reduce((soma, l) => soma + valorMonetario(l), 0);
  const saldoCalculado = Number(totais.saldoCalculado || 0);

  const dataEl = document.getElementById("hoje-dashboard-data");
  const resumoEl = document.getElementById("hoje-dashboard-resumo");
  const vencendoEl = document.getElementById("hoje-kpi-vencendo");
  const atrasadosEl = document.getElementById("hoje-kpi-atrasados");
  const pendenteEl = document.getElementById("hoje-kpi-pendente");
  const saldoEl = document.getElementById("hoje-kpi-saldo");
  const listaEl = document.getElementById("hoje-dashboard-lista");

  if (dataEl) {
    dataEl.textContent = hojeData.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
  }

  if (vencendoEl) vencendoEl.textContent = String(vencendoHoje.length);
  if (atrasadosEl) atrasadosEl.textContent = String(atrasados.length);
  if (pendenteEl) pendenteEl.textContent = formatadorBRL.format(pendenteHoje);
  if (saldoEl) {
    saldoEl.textContent = formatadorBRL.format(saldoCalculado);
    saldoEl.classList.toggle("texto-receita", saldoCalculado >= 0);
    saldoEl.classList.toggle("texto-despesa", saldoCalculado < 0);
  }

  if (!mesmoMes) {
    if (resumoEl) resumoEl.textContent = "Volte para o mês atual para ver as ações de hoje.";
    if (listaEl) {
      listaEl.innerHTML = `
        <div class="hoje-dashboard-vazio">
          Este painel acompanha o dia atual. Toque no mês acima para voltar ao mês de hoje.
        </div>
      `;
    }
    configurarAcoesTelaHojeDashboard();
    return;
  }

  if (resumoEl) {
    if (atrasados.length > 0) {
      resumoEl.textContent = `${atrasados.length} pendência(s) atrasada(s) merecem atenção antes de seguir o dia.`;
    } else if (vencendoHoje.length > 0) {
      resumoEl.textContent = `${vencendoHoje.length} compromisso(s) vencem hoje. Bom momento para resolver.`;
    } else {
      resumoEl.textContent = "Nada urgente para hoje. Dá para registrar o dia com calma.";
    }
  }

  if (listaEl) {
    const destaques = [...atrasados, ...vencendoHoje].slice(0, 3);
    listaEl.innerHTML = destaques.length > 0
      ? destaques.map(resumoItemHojeDashboard).join("")
      : '<div class="hoje-dashboard-vazio">Sem contas vencendo hoje. Se aparecer algo novo, cadastre pelo atalho abaixo.</div>';
  }

  configurarAcoesTelaHojeDashboard();
}
