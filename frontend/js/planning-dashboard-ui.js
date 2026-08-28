// ==========================================
// planning-dashboard-ui.js - Indicadores e cards do planejamento
// ==========================================
function obterResumoFinanceiroPlanejamento(salario = 0) {
  const resumo = {
    salario: Number(salario) || 0,
    bonificacoesPrevistas: 0,
    bonificacoesRecebidas: 0,
    despesasFixas: 0,
    parcelas: 0,
    planosAtivos: 0,
    investimentos: 0,
    planosAtivosQtd: 0,
  };

  if (typeof despesasFixasCarregadas !== "undefined") {
    despesasFixasCarregadas.forEach((fixa) => {
      if (fixa.ativo) resumo.despesasFixas += valorMonetario(fixa);
    });
  }

  if (typeof comprasParceladasCarregadas !== "undefined") {
    comprasParceladasCarregadas.forEach((compra) => {
      if (compra.ativo) resumo.parcelas += valorMonetario(compra, "valor_parcela");
    });
  }

  if (typeof planosCarregados !== "undefined") {
    planosCarregados.forEach((plano) => {
      if (plano.status !== "ativo") return;
      const parcelaMensal = valorMonetario(plano, "parcela_mensal");
      if (parcelaMensal <= 0) return;
      resumo.planosAtivos += parcelaMensal;
      resumo.planosAtivosQtd += 1;
      if (plano.tipo === "investimento") resumo.investimentos += parcelaMensal;
    });
  }

  if (
    typeof bonificacoesCarregadas !== "undefined" &&
    typeof contarOcorrenciasBonificacao === "function" &&
    typeof obterAnoMesDashboard === "function"
  ) {
    const { ano, mes } = obterAnoMesDashboard();
    bonificacoesCarregadas.forEach((recorrente) => {
      if (recorrente.ativo) {
        resumo.bonificacoesPrevistas += contarOcorrenciasBonificacao(recorrente, ano, mes) * valorMonetario(recorrente);
      }
    });
  }

  if (typeof ultimoLoteLancamentos !== "undefined") {
    resumo.bonificacoesRecebidas = ultimoLoteLancamentos
      .filter((lancamento) => lancamento.tipo === "receita" && String(lancamento.categoria || "").toLowerCase() === "bonificação" && lancamento.status === "pago")
      .reduce((total, lancamento) => total + valorMonetario(lancamento), 0);
  }

  resumo.receitaPlanejada = resumo.salario + resumo.bonificacoesPrevistas;
  resumo.compromissos = resumo.despesasFixas + resumo.parcelas;
  resumo.reservasPlanejadas = resumo.planosAtivos;
  resumo.saldoPrevisto = resumo.receitaPlanejada - resumo.compromissos - resumo.reservasPlanejadas;
  resumo.capacidadeLivre = Math.max(0, resumo.saldoPrevisto);
  resumo.totalProtegido = Math.max(0, resumo.saldoPrevisto) + resumo.reservasPlanejadas;

  return resumo;
}

function obterValorLimiteOrcamento(orcamento) {
  return valorMonetario(orcamento, "valor_limite") || valorMonetario(orcamento);
}

function obterGastoAtualOrcamento(orcamento) {
  return valorMonetario(orcamento, "gasto_atual") || valorMonetario(orcamento, "total_gasto");
}

function renderizarGuardaPlano(salario) {
  const cardGuarda = document.getElementById("plano-card-guarda");
  const guardaValor = document.getElementById("plano-guarda-valor");
  const guardaDetalhe = document.getElementById("plano-guarda-detalhe");
  const resumo = obterResumoFinanceiroPlanejamento(salario);

  if (resumo.receitaPlanejada > 0 && cardGuarda) {
    const totalFixas = resumo.despesasFixas;
    const totalParcelas = resumo.parcelas;
    const sobra = resumo.saldoPrevisto;
    const sobraPositiva = Math.max(0, sobra);
    const guardaSemanal = Math.round(sobraPositiva / 4);

    cardGuarda.style.display = "flex";
    guardaValor.textContent = formatadorBRL.format(sobraPositiva);
    guardaValor.style.color = sobra >= 0 ? "var(--cor-receita)" : "var(--cor-despesa)";

    if (sobra <= 0) {
      guardaDetalhe.textContent = "Compromissos e planos consomem toda a renda planejada.";
    } else {
      guardaDetalhe.textContent = `Dá pra guardar ~${formatadorBRL.format(guardaSemanal)}/semana.`;
    }

    const maxValor = Math.max(resumo.receitaPlanejada, 1);
    const el = (id) => document.getElementById(id);
    if (el("plano-barra-fixas")) el("plano-barra-fixas").style.width = `${Math.round((totalFixas / maxValor) * 100)}%`;
    if (el("plano-barra-parcelas")) el("plano-barra-parcelas").style.width = `${Math.round((totalParcelas / maxValor) * 100)}%`;
    if (el("plano-barra-sobra")) el("plano-barra-sobra").style.width = `${Math.round((sobraPositiva / maxValor) * 100)}%`;
    if (el("plano-valor-fixas")) el("plano-valor-fixas").textContent = formatadorBRL.format(totalFixas);
    if (el("plano-valor-parcelas")) el("plano-valor-parcelas").textContent = formatadorBRL.format(totalParcelas);
    if (el("plano-valor-sobra")) el("plano-valor-sobra").textContent = formatadorBRL.format(sobraPositiva);
  } else if (cardGuarda) {
    cardGuarda.style.display = "none";
  }
}

function renderizarDistribuicaoPlano(salario) {
  const container = document.getElementById("plano-distribuicao");
  if (!container) return;

  const resumo = obterResumoFinanceiroPlanejamento(salario);
  if (resumo.receitaPlanejada <= 0) {
    container.innerHTML = '<div class="plano-vazio">Defina o salário ou uma bonificação para ver a distribuição.</div>';
    return;
  }

  const totalFixas = resumo.despesasFixas;
  const totalParcelas = resumo.parcelas;
  const totalPlanos = resumo.planosAtivos;
  const sobra = resumo.capacidadeLivre;
  const itens = [];

  if (resumo.bonificacoesPrevistas > 0) {
    itens.push(`<div class="plano-dist-item plano-dist-receita">
      <span class="plano-dist-icone">✦</span>
      <div class="plano-dist-info"><div class="plano-dist-nome">Bonificações previstas</div><div class="plano-dist-detalhe">No período selecionado</div></div>
      <span class="plano-dist-restante">+${formatadorBRL.format(resumo.bonificacoesPrevistas)}</span>
    </div>`);
  }

  if (totalFixas > 0) {
    itens.push(`<div class="plano-dist-item">
      <span class="plano-dist-icone">🔁</span>
      <div class="plano-dist-info"><div class="plano-dist-nome">Despesas fixas</div><div class="plano-dist-detalhe">Mensal</div></div>
      <span class="plano-dist-valor">-${formatadorBRL.format(totalFixas)}</span>
    </div>`);
  }

  if (totalParcelas > 0) {
    itens.push(`<div class="plano-dist-item">
      <span class="plano-dist-icone">📦</span>
      <div class="plano-dist-info"><div class="plano-dist-nome">Parcelas</div><div class="plano-dist-detalhe">Mensal</div></div>
      <span class="plano-dist-valor">-${formatadorBRL.format(totalParcelas)}</span>
    </div>`);
  }

  if (totalPlanos > 0) {
    itens.push(`<div class="plano-dist-item">
      <span class="plano-dist-icone">🎯</span>
      <div class="plano-dist-info"><div class="plano-dist-nome">Planos ativos</div><div class="plano-dist-detalhe">${resumo.planosAtivosQtd} plano(s)</div></div>
      <span class="plano-dist-valor">-${formatadorBRL.format(totalPlanos)}</span>
    </div>`);
  }

  itens.push(`<div class="plano-dist-item" style="border-bottom: none; padding-top: 0.75rem">
    <span class="plano-dist-icone">💰</span>
    <div class="plano-dist-info"><div class="plano-dist-nome" style="font-weight: 700">Sobra mensal</div></div>
    <span class="plano-dist-restante">${formatadorBRL.format(sobra)}</span>
  </div>`);

  container.innerHTML = itens.join("");
}

// --- KPIs DO PLANEJAMENTO ---
function renderizarKPIsPlano(salario) {
  const el = (id) => document.getElementById(id);
  const resumo = obterResumoFinanceiroPlanejamento(salario);
  const economia = Math.max(0, resumo.totalProtegido);
  const pct = resumo.receitaPlanejada > 0 ? ((economia / resumo.receitaPlanejada) * 100).toFixed(1) : "0";

  if (el("plano-kpi-receita")) el("plano-kpi-receita").textContent = formatadorBRL.format(resumo.receitaPlanejada);
  if (el("plano-kpi-despesas")) el("plano-kpi-despesas").textContent = formatadorBRL.format(resumo.compromissos);
  if (el("plano-kpi-invest")) el("plano-kpi-invest").textContent = formatadorBRL.format(resumo.investimentos);
  if (el("plano-kpi-economia")) el("plano-kpi-economia").textContent = formatadorBRL.format(economia);
  if (el("plano-kpi-pct")) el("plano-kpi-pct").textContent = `${pct}%`;
  if (el("plano-kpi-saldo")) {
    el("plano-kpi-saldo").textContent = formatadorBRL.format(resumo.saldoPrevisto);
    el("plano-kpi-saldo").style.color = resumo.saldoPrevisto >= 0 ? "var(--cor-receita)" : "var(--cor-despesa)";
  }
}

function atualizarResumoPlanejamento(salario) {
  const saudeEl = document.getElementById("plano-resumo-saude");
  const comprometidoEl = document.getElementById("plano-resumo-comprometido");
  const acaoEl = document.getElementById("plano-resumo-acao");
  if (!saudeEl || !comprometidoEl || !acaoEl) return;

  const resumo = obterResumoFinanceiroPlanejamento(salario);
  const comprometido = resumo.compromissos + resumo.reservasPlanejadas;
  const percentual = resumo.receitaPlanejada > 0 ? Math.round((comprometido / resumo.receitaPlanejada) * 100) : 0;
  const sobra = resumo.saldoPrevisto;

  comprometidoEl.textContent = resumo.receitaPlanejada > 0 ? `${percentual}%` : "—";

  if (resumo.receitaPlanejada <= 0) {
    saudeEl.textContent = "Pendente";
    saudeEl.style.color = "var(--cor-pendente)";
    acaoEl.textContent = "Definir salário";
    return;
  }

  if (sobra < 0 || percentual >= 90) {
    saudeEl.textContent = "Atenção";
    saudeEl.style.color = "var(--cor-despesa)";
    acaoEl.textContent = "Reduzir compromissos";
  } else if (percentual >= 70) {
    saudeEl.textContent = "No limite";
    saudeEl.style.color = "var(--cor-pendente)";
    acaoEl.textContent = "Rever orçamento";
  } else if (resumo.planosAtivos === 0) {
    saudeEl.textContent = "Saudável";
    saudeEl.style.color = "var(--cor-receita)";
    acaoEl.textContent = "Criar meta";
  } else {
    saudeEl.textContent = "Equilibrado";
    saudeEl.style.color = "var(--cor-receita)";
    acaoEl.textContent = "Acompanhar metas";
  }
}

// --- INDICADORES FINANCEIROS ---
function renderizarIndicadoresPlano(salario) {
  const container = document.getElementById("plano-indicadores");
  if (!container) return;

  const resumo = obterResumoFinanceiroPlanejamento(salario);
  const comprometido = resumo.compromissos + resumo.reservasPlanejadas;
  const pctComprometido = resumo.receitaPlanejada > 0 ? ((comprometido / resumo.receitaPlanejada) * 100).toFixed(1) : "0";

  const itens = [
    { nome: "Taxa de economia", valor: `${resumo.receitaPlanejada > 0 ? ((resumo.totalProtegido / resumo.receitaPlanejada) * 100).toFixed(0) : 0}%`, cor: "var(--cor-receita)", bg: "color-mix(in srgb, var(--cor-receita) 10%, transparent)" },
    { nome: "Renda comprometida", valor: `${pctComprometido}%`, cor: "var(--cor-despesa)", bg: "color-mix(in srgb, var(--cor-despesa) 10%, transparent)" },
    { nome: "Bonificações", valor: formatadorBRL.format(resumo.bonificacoesPrevistas), cor: "var(--cor-receita)", bg: "color-mix(in srgb, var(--cor-receita) 10%, transparent)" },
    { nome: "Planos ativos", valor: formatadorBRL.format(resumo.reservasPlanejadas), cor: "var(--cor-marca)", bg: "color-mix(in srgb, var(--cor-marca) 10%, transparent)" },
    { nome: "Despesas fixas", valor: formatadorBRL.format(resumo.despesasFixas), cor: "var(--cor-texto)", bg: "var(--cor-fundo)" },
    { nome: "Parcelas", valor: formatadorBRL.format(resumo.parcelas), cor: "var(--cor-texto)", bg: "var(--cor-fundo)" },
    { nome: "Livre no mês", valor: formatadorBRL.format(resumo.capacidadeLivre), cor: "var(--cor-receita)", bg: "color-mix(in srgb, var(--cor-receita) 10%, transparent)" },
  ];

  container.innerHTML = itens.map((item) => `
    <div class="plano-ind-item">
      <div class="plano-ind-icone" style="background:${item.bg};color:${item.cor}">•</div>
      <div class="plano-ind-info">
        <div class="plano-ind-nome">${item.nome}</div>
        <div class="plano-ind-valor" style="color:${item.cor}">${item.valor}</div>
      </div>
    </div>
  `).join("");
}

// --- ALERTAS ---
function lancamentoPendenteAtrasadoPlano(lancamento) {
  if (!lancamento || lancamento.status === "pago") return false;
  if (lancamento.status === "atrasado") return true;
  if (!lancamento.data_compra) return false;

  const vencimento = new Date(`${lancamento.data_compra}T23:59:59`);
  const hoje = new Date();
  return !Number.isNaN(vencimento.getTime()) && vencimento < hoje;
}

function renderizarAlertasPlano(salario) {
  const card = document.getElementById("plano-card-alertas");
  const container = document.getElementById("plano-alertas");
  if (!card || !container) return;

  const alertas = [];
  const resumo = obterResumoFinanceiroPlanejamento(salario);

  const comprometido = resumo.compromissos + resumo.reservasPlanejadas;
  const pct = resumo.receitaPlanejada > 0 ? (comprometido / resumo.receitaPlanejada) * 100 : 0;

  if (planejamentoDependenciasComErro) {
    alertas.push({ tipo: "aviso", texto: "Alguns dados não foram carregados. Confira sua conexão e atualize o período se algo parecer incompleto." });
  }

  if (pct > 90) alertas.push({ tipo: "erro", texto: `Seu orçamento está ${pct.toFixed(0)}% comprometido. Considere reduzir gastos.` });
  else if (pct > 70) alertas.push({ tipo: "aviso", texto: `Seu orçamento está ${pct.toFixed(0)}% comprometido. Atenção aos gastos.` });
  else if (resumo.receitaPlanejada > 0) alertas.push({ tipo: "ok", texto: `Parabéns! Apenas ${pct.toFixed(0)}% da renda planejada está comprometida.` });

  if (resumo.bonificacoesPrevistas > 0 && resumo.bonificacoesRecebidas < resumo.bonificacoesPrevistas) {
    alertas.push({ tipo: "aviso", texto: `Bonificações previstas: ${formatadorBRL.format(resumo.bonificacoesPrevistas)}. Já recebido: ${formatadorBRL.format(resumo.bonificacoesRecebidas)}.` });
  }

  if (typeof ultimoLoteLancamentos !== "undefined") {
    const atrasados = ultimoLoteLancamentos.filter(lancamentoPendenteAtrasadoPlano);
    if (atrasados.length > 0) alertas.push({ tipo: "erro", texto: `Você tem ${atrasados.length} conta(s) atrasada(s).` });
  }

  if (alertas.length === 0) { card.style.display = "none"; return; }
  card.style.display = "flex";
  container.innerHTML = alertas.map((a) => `<div class="plano-alerta-item plano-alerta-${a.tipo}">${a.texto}</div>`).join("");
}

// --- ORÇAMENTO POR CATEGORIA ---
function renderizarOrcamentosPlano() {
  const container = document.getElementById("plano-lista-orcamentos");
  if (!container) return;

  if (typeof orcamentosCarregados === "undefined" || orcamentosCarregados.length === 0) {
    container.innerHTML = '<div class="plano-vazio">Nenhum orçamento definido. Clique em "+ Novo orçamento" para começar.</div>';
    return;
  }

  container.innerHTML = orcamentosCarregados.map((o) => {
    const gasto = obterGastoAtualOrcamento(o);
    const limite = obterValorLimiteOrcamento(o);
    const pct = limite > 0 ? Math.min((gasto / limite) * 100, 100) : 0;
    const cor = pct >= 90 ? "var(--cor-despesa)" : pct >= 70 ? "var(--cor-pendente)" : "var(--cor-receita)";
    return `
      <div class="plano-lista-item plano-lista-item-com-progresso">
        <div class="plano-lista-info">
          <div class="plano-lista-nome">${escaparHtml(o.categoria)}</div>
          <div class="plano-lista-progresso">
            <div class="plano-lista-progresso-trilho">
              <div class="plano-lista-progresso-fill" style="width:${pct}%;background:${cor}"></div>
            </div>
            <span style="color:${cor}">${pct.toFixed(0)}%</span>
          </div>
        </div>
        <div class="plano-lista-valor" style="color:${cor}">${formatadorBRL.format(gasto)} / ${formatadorBRL.format(limite)}</div>
      </div>`;
  }).join("");
}

// --- RECEITAS PLANEJADAS ---
function renderizarReceitasPlano() {
  const container = document.getElementById("plano-lista-receitas");
  if (!container) return;

  if (typeof ultimoLoteLancamentos === "undefined") {
    container.innerHTML = '<div class="plano-vazio">Carregue os lançamentos primeiro.</div>';
    return;
  }

  const receitas = ultimoLoteLancamentos.filter((l) => l.tipo === "receita");
  const resumo = obterResumoFinanceiroPlanejamento(obterUsuarioLogado().salario || 0);
  if (receitas.length === 0) {
    container.innerHTML = resumo.bonificacoesPrevistas > 0
      ? `<div class="plano-vazio">Sem receitas lançadas ainda. Há ${formatadorBRL.format(resumo.bonificacoesPrevistas)} em bonificações previstas para este período.</div>`
      : '<div class="plano-vazio">Nenhuma receita registrada neste período.</div>';
    return;
  }

  container.innerHTML = receitas.map((r) => {
    const statusCls = r.status === "pago" ? "plano-status-recebido" : "plano-status-pendente";
    const statusLabel = r.status === "pago" ? "Recebido" : "Pendente";
    return `
      <div class="plano-lista-item">
        <div class="plano-lista-info">
          <div class="plano-lista-nome">${escaparHtml(r.descricao || r.categoria)}</div>
          <div class="plano-lista-detalhe">${new Date(r.data_compra + "T12:00:00").toLocaleDateString("pt-BR")} · ${escaparHtml(r.categoria || "")}</div>
        </div>
        <span class="plano-lista-status ${statusCls}">${statusLabel}</span>
        <span class="plano-lista-valor" style="color:var(--cor-receita)">+${formatadorBRL.format(valorMonetario(r))}</span>
      </div>`;
  }).join("");
}

// --- DESPESAS PLANEJADAS ---
function renderizarDespesasPlano() {
  const container = document.getElementById("plano-lista-despesas");
  if (!container) return;

  const itens = [];
  if (typeof despesasFixasCarregadas !== "undefined") {
    despesasFixasCarregadas.filter((f) => f.ativo).forEach((f) => {
      itens.push({ nome: f.descricao, valor: valorMonetario(f), cat: f.categoria, freq: "Mensal", tipo: "fixa" });
    });
  }
  if (typeof comprasParceladasCarregadas !== "undefined") {
    comprasParceladasCarregadas.filter((c) => c.ativo).forEach((c) => {
      itens.push({ nome: c.descricao, valor: valorMonetario(c, "valor_parcela"), cat: c.categoria, freq: `Parcela ${c.parcela_atual || 1}/${c.total_parcelas}`, tipo: "parcela" });
    });
  }
  if (typeof planosCarregados !== "undefined") {
    planosCarregados.filter((p) => p.status === "ativo" && valorMonetario(p, "parcela_mensal") > 0).forEach((p) => {
      itens.push({ nome: p.nome, valor: valorMonetario(p, "parcela_mensal"), cat: p.tipo === "investimento" ? "Investimento" : "Plano", freq: "Reserva mensal", tipo: "plano" });
    });
  }

  if (itens.length === 0) {
    container.innerHTML = '<div class="plano-vazio">Nenhum compromisso fixo, parcelado ou plano ativo neste período.</div>';
    return;
  }

  container.innerHTML = itens.map((d) => `
    <div class="plano-lista-item">
      <div class="plano-lista-info">
        <div class="plano-lista-nome">${escaparHtml(d.nome)}</div>
        <div class="plano-lista-detalhe">${escaparHtml(d.cat || "")} · ${d.freq}</div>
      </div>
      <span class="plano-lista-valor" style="color:var(--cor-despesa)">-${formatadorBRL.format(d.valor)}</span>
    </div>
  `).join("");
}

// --- COMPARAÇÃO PLANEJADO × REAL ---
function renderizarComparacaoPlano() {
  const container = document.getElementById("plano-comparacao");
  if (!container) return;

  if (typeof orcamentosCarregados === "undefined" || orcamentosCarregados.length === 0) {
    container.innerHTML = '<div class="plano-vazio">Defina orçamentos para ver a comparação.</div>';
    return;
  }

  const header = `<div class="plano-comp-linha plano-comp-header"><span>Categoria</span><span style="text-align:right">Planejado</span><span style="text-align:right">Real</span><span style="text-align:right">Diferença</span></div>`;

  const linhas = orcamentosCarregados.map((o) => {
    const real = obterGastoAtualOrcamento(o);
    const limite = obterValorLimiteOrcamento(o);
    const diff = real - limite;
    const diffLabel = diff > 0 ? `+${formatadorBRL.format(diff)}` : diff < 0 ? formatadorBRL.format(diff) : "—";
    const cls = diff > 0 ? "positivo" : diff < 0 ? "negativo" : "";
    return `<div class="plano-comp-linha"><span class="plano-comp-categoria">${escaparHtml(o.categoria)}</span><span class="plano-comp-valor">${formatadorBRL.format(limite)}</span><span class="plano-comp-valor">${formatadorBRL.format(real)}</span><span class="plano-comp-diferenca ${cls}">${diffLabel}</span></div>`;
  }).join("");

  container.innerHTML = header + linhas;
}

function renderizarRecomendacoesPlano(salario) {
  const container = document.getElementById("plano-recomendacoes");
  if (!container) return;

  const resumo = obterResumoFinanceiroPlanejamento(salario);
  const recomendacoes = [];
  const percentualComprometido = resumo.receitaPlanejada > 0
    ? Math.round(((resumo.compromissos + resumo.reservasPlanejadas) / resumo.receitaPlanejada) * 100)
    : 0;

  if (resumo.receitaPlanejada <= 0) {
    recomendacoes.push({
      tipo: "aviso",
      titulo: "Defina uma renda base",
      texto: "Informe o salário ou cadastre bonificações para o planejamento conseguir calcular sobras e compromissos.",
    });
  } else if (resumo.saldoPrevisto < 0) {
    recomendacoes.push({
      tipo: "erro",
      titulo: "Plano acima da renda",
      texto: `Os compromissos passam da renda planejada em ${formatadorBRL.format(Math.abs(resumo.saldoPrevisto))}.`,
    });
  } else if (percentualComprometido >= 70) {
    recomendacoes.push({
      tipo: "aviso",
      titulo: "Renda bem comprometida",
      texto: `${percentualComprometido}% da renda planejada já está comprometida. Revise fixas, parcelas ou metas antes de assumir novos gastos.`,
    });
  } else {
    recomendacoes.push({
      tipo: "ok",
      titulo: "Plano equilibrado",
      texto: `Você ainda tem ${formatadorBRL.format(resumo.capacidadeLivre)} livre no período depois dos compromissos planejados.`,
    });
  }

  if (Array.isArray(orcamentosCarregados) && orcamentosCarregados.length > 0) {
    const orcamentosCriticos = orcamentosCarregados.filter((orcamento) => {
      const limite = obterValorLimiteOrcamento(orcamento);
      const gasto = obterGastoAtualOrcamento(orcamento);
      return limite > 0 && gasto / limite >= 0.9;
    });
    if (orcamentosCriticos.length > 0) {
      recomendacoes.push({
        tipo: "erro",
        titulo: "Orçamento no limite",
        texto: `${orcamentosCriticos.length} categoria(s) estão com 90% ou mais do limite usado.`,
      });
    }
  } else {
    recomendacoes.push({
      tipo: "info",
      titulo: "Orçamento ainda vazio",
      texto: "Crie orçamentos por categoria para comparar o planejado com o real dentro do mês selecionado.",
    });
  }

  if (Array.isArray(metasCarregadas) && metasCarregadas.length === 0) {
    recomendacoes.push({
      tipo: "info",
      titulo: "Metas dão direção",
      texto: "Cadastre uma meta para transformar a sobra do mês em um objetivo concreto.",
    });
  }

  if (typeof ultimoLoteLancamentos !== "undefined") {
    const atrasados = ultimoLoteLancamentos.filter(lancamentoPendenteAtrasadoPlano);
    if (atrasados.length > 0) {
      recomendacoes.push({
        tipo: "erro",
        titulo: "Pendências atrasadas",
        texto: `Existem ${atrasados.length} lançamento(s) atrasado(s) no período/carteira selecionados.`,
      });
    }
  }

  container.innerHTML = recomendacoes.map((item) => `
    <div class="plano-recomendacao-item plano-recomendacao-${item.tipo}">
      <strong>${escaparHtml(item.titulo)}</strong>
      <span>${escaparHtml(item.texto)}</span>
    </div>
  `).join("");
}

// --- SIMULAÇÃO ---
function configurarSimulacaoPlano() {
  const btn = document.getElementById("btn-simular");
  const input = document.getElementById("simulacao-valor");
  const resultado = document.getElementById("plano-resultado-simulacao");
  if (!btn || !input || !resultado) return;

  btn.onclick = () => {
    const valor = obterReaisMonetarios("simulacao-valor", { vazioComoZero: true });
    if (valor <= 0) return;

    resultado.innerHTML = `
      <div class="plano-sim-result">
        <div class="plano-sim-card">
          <div class="plano-sim-periodo">Em 12 meses</div>
          <div class="plano-sim-valor">${formatadorBRL.format(valor * 12)}</div>
        </div>
        <div class="plano-sim-card">
          <div class="plano-sim-periodo">Em 24 meses</div>
          <div class="plano-sim-valor">${formatadorBRL.format(valor * 24)}</div>
        </div>
        <div class="plano-sim-card">
          <div class="plano-sim-periodo">Em 60 meses</div>
          <div class="plano-sim-valor">${formatadorBRL.format(valor * 60)}</div>
        </div>
      </div>
    `;
  };
}
