// ==========================================
// dashboard-summary-ui.js - Resumos do dashboard financeiro
// ==========================================

// ==========================================
// [21] DASHBOARD: Resumo Categorias, Autores, KPIs
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

// --- RAIO-X POR CATEGORIA (só despesas, é o que faz sentido controlar) ---
function renderizarResumoCategorias(totaisPorCategoria) {
  const card = document.getElementById("resumo-categorias");
  const container = document.getElementById("lista-categorias-resumo");
  const donutEl = document.getElementById("grafico-donut");
  const legendaEl = document.getElementById("grafico-legenda");
  if (!card || !container) return;

  const categorias = Object.entries(totaisPorCategoria).sort((a, b) => b[1] - a[1]);
  const TOP_GASTOS_CATEGORIAS = 3;

  if (categorias.length === 0) {
    card.style.display = "none";
    if (donutEl) donutEl.style.background = "none";
    if (legendaEl) legendaEl.innerHTML = "";
    return;
  }

  card.style.display = "flex";

  const cores = ["#4caf50","#2196f3","#ff9800","#e91e63","#9c27b0","#00bcd4","#f44336","#607d8b","#795548","#cddc39"];
  const totalDespesas = categorias.reduce((soma, [, v]) => soma + v, 0);
  const maiorCategoria = categorias[0];
  const percentualMaior = Math.round((maiorCategoria[1] / totalDespesas) * 100);

  let conicParts = [];
  let accum = 0;
  categorias.forEach(([cat, valor], i) => {
    const pct = (valor / totalDespesas) * 100;
    const cor = cores[i % cores.length];
    conicParts.push(`${cor} ${accum}% ${accum + pct}%`);
    accum += pct;
  });

  if (donutEl) {
    donutEl.style.background = `conic-gradient(${conicParts.join(", ")})`;
    donutEl.title = `Total de despesas: ${formatadorBRL.format(totalDespesas)}`;
    donutEl.setAttribute("aria-label", `Total de despesas por categoria: ${formatadorBRL.format(totalDespesas)}`);
    donutEl.innerHTML = `
      <span class="grafico-donut-total">
        <small>Maior gasto</small>
        <strong>${percentualMaior}%</strong>
        <em>${escaparHtml(maiorCategoria[0])}</em>
      </span>
    `;
  }

  if (legendaEl) {
    legendaEl.innerHTML = "";
    const itensLegenda = categorias.slice(0, TOP_GASTOS_CATEGORIAS);

    itensLegenda.forEach(([cat, valor], i) => {
      const cor = cores[i % cores.length];
      const pct = ((valor / totalDespesas) * 100).toFixed(1);
      const item = document.createElement("div");
      item.className = "grafico-legenda-item";
      item.innerHTML = `
        <span class="grafico-legenda-cor" style="background:${cor}"></span>
        <span class="grafico-legenda-nome">${escaparHtml(cat)}</span>
        <span class="grafico-legenda-valores">
          <strong>${pct}%</strong>
          <small>${formatadorBRL.format(valor)}</small>
        </span>
      `;
      legendaEl.appendChild(item);
    });
  }
  container.innerHTML = "";

  const maiorValor = categorias[0][1];
  const TOP_N = TOP_GASTOS_CATEGORIAS;
  const principais = categorias.slice(0, TOP_N);
  const linhas = principais;

  linhas.forEach(([categoria, valor], indice) => {
    const meta = categoria !== "Outras" ? obterMetaPorCategoria(categoria) : null;
    const valorFormatado = formatadorBRL.format(valor);
    const percentualTotal = ((valor / totalDespesas) * 100).toFixed(1);
    const cor = categoria === "Outras" ? "var(--cor-texto-suave)" : cores[indice % cores.length];

    let percentualLargura;
    let classeCor = "";
    let textoValor = valorFormatado;

    if (meta) {
      const valorMeta = valorMonetario(meta, "valor_limite");
      const percentualMeta = (valor / valorMeta) * 100;
      percentualLargura = Math.min(percentualMeta, 100);
      classeCor = percentualMeta >= 100 ? "barra-estourou" : percentualMeta >= 80 ? "barra-atencao" : "barra-ok";
      textoValor = `${valorFormatado} / ${formatadorBRL.format(valorMeta)}`;
    } else {
      percentualLargura = Math.round((valor / maiorValor) * 100);
    }

    const iconeMeta = meta
      ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/></svg>'
      : "";

    const linha = document.createElement("div");
    linha.className = "categoria-barra-linha";
    linha.innerHTML = `
      <div class="categoria-barra-topo">
        <span class="categoria-barra-identidade">
          <span class="categoria-barra-cor" style="background:${cor}"></span>
          <strong class="${categoria !== "Outras" ? "categoria-barra-nome" : ""} ${meta ? "barra-meta-clicavel" : ""}" data-categoria="${escaparHtml(categoria)}" data-meta="${meta ? valorMonetario(meta, "valor_limite") : ""}" data-datalimite="${meta?.data_limite || ""}">
            ${escaparHtml(categoria)} ${iconeMeta}
          </strong>
        </span>
        <span class="categoria-barra-valor"><strong>${percentualTotal}%</strong><small>${textoValor}</small></span>
        ${meta && meta.data_limite && meta.falta > 0 ? `<span class="badge-semana">~${formatadorBRL.format(valorMonetario(meta, "guarda_semanal"))}/sem.</span>` : ""}
      </div>
      <div class="categoria-barra-trilho ${meta ? "barra-meta-clicavel" : ""}" data-categoria="${escaparHtml(categoria)}" data-meta="${meta ? valorMonetario(meta, "valor_limite") : ""}">
        <div class="categoria-barra-preenchimento ${classeCor}" data-largura="${percentualLargura}" style="--categoria-cor:${cor}"></div>
      </div>
    `;
    container.appendChild(linha);
  });

  container.querySelectorAll(".categoria-barra-nome").forEach((el) => {
    el.addEventListener("click", () => {
      const categoria = el.dataset.categoria;
      const meta = obterMetaPorCategoria(categoria);
      if (meta) {
        abrirModalDeposito(meta.id, categoria);
      } else {
        abrirModalMeta(categoria, el.dataset.meta, el.dataset.datalimite || null);
      }
    });
  });

  container.querySelectorAll(".categoria-barra-trilho.barra-meta-clicavel").forEach((el) => {
    el.addEventListener("click", () => {
      const categoria = el.dataset.categoria;
      const meta = obterMetaPorCategoria(categoria);
      if (meta) {
        abrirModalDeposito(meta.id, categoria);
      }
    });
  });

  // Anima a largura das barras depois de inseridas no DOM (senão a transição CSS não dispara)
  requestAnimationFrame(() => {
    container.querySelectorAll(".categoria-barra-preenchimento").forEach((barra) => {
      barra.style.width = `${barra.dataset.largura}%`;
    });
  });
}
