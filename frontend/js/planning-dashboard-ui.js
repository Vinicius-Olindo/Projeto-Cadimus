// ==========================================
// planning-dashboard-ui.js - Indicadores e cards do planejamento
// ==========================================
function renderizarGuardaPlano(salario) {
  const cardGuarda = document.getElementById("plano-card-guarda");
  const guardaValor = document.getElementById("plano-guarda-valor");
  const guardaDetalhe = document.getElementById("plano-guarda-detalhe");

  if (salario > 0 && cardGuarda) {
    let totalFixas = 0;
    let totalParcelas = 0;

    if (typeof despesasFixasCarregadas !== "undefined") {
      despesasFixasCarregadas.forEach((f) => { if (f.ativo) totalFixas += valorMonetario(f); });
    }
    if (typeof comprasParceladasCarregadas !== "undefined") {
      comprasParceladasCarregadas.forEach((c) => { if (c.ativo) totalParcelas += valorMonetario(c, "valor_parcela"); });
    }

    const sobra = salario - totalFixas - totalParcelas;
    const sobraPositiva = Math.max(0, sobra);
    const guardaSemanal = Math.round(sobraPositiva / 4);

    cardGuarda.style.display = "flex";
    guardaValor.textContent = formatadorBRL.format(sobraPositiva);
    guardaValor.style.color = sobra >= 0 ? "var(--cor-receita)" : "var(--cor-despesa)";

    if (sobra <= 0) {
      guardaDetalhe.textContent = "Suas fixas e parcelas consomem todo o salário.";
    } else {
      guardaDetalhe.textContent = `Dá pra guardar ~${formatadorBRL.format(guardaSemanal)}/semana.`;
    }

    const maxValor = Math.max(salario, 1);
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

  if (salario <= 0) {
    container.innerHTML = '<div class="plano-vazio">Defina o salário para ver a distribuição.</div>';
    return;
  }

  let totalFixas = 0;
  let totalParcelas = 0;
  let totalPlanos = 0;

  if (typeof despesasFixasCarregadas !== "undefined") {
    despesasFixasCarregadas.forEach((f) => { if (f.ativo) totalFixas += valorMonetario(f); });
  }
  if (typeof comprasParceladasCarregadas !== "undefined") {
    comprasParceladasCarregadas.forEach((c) => { if (c.ativo) totalParcelas += valorMonetario(c, "valor_parcela"); });
  }

  planosCarregados.forEach((p) => {
    if (p.status === "ativo" && p.parcela_mensal) totalPlanos += p.parcela_mensal;
  });

  const sobra = Math.max(0, salario - totalFixas - totalParcelas - totalPlanos);
  const itens = [];

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
      <div class="plano-dist-info"><div class="plano-dist-nome">Planos ativos</div><div class="plano-dist-detalhe">${planosCarregados.filter((p) => p.status === "ativo" && p.parcela_mensal).length} plano(s)</div></div>
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
  let totalFixas = 0, totalParcelas = 0;
  if (typeof despesasFixasCarregadas !== "undefined") despesasFixasCarregadas.forEach((f) => { if (f.ativo) totalFixas += valorMonetario(f); });
  if (typeof comprasParceladasCarregadas !== "undefined") comprasParceladasCarregadas.forEach((c) => { if (c.ativo) totalParcelas += valorMonetario(c, "valor_parcela"); });

  const despesasPlanejadas = totalFixas + totalParcelas;
  const economia = Math.max(0, salario - despesasPlanejadas);
  const pct = salario > 0 ? ((economia / salario) * 100).toFixed(1) : "0";

  if (el("plano-kpi-receita")) el("plano-kpi-receita").textContent = formatadorBRL.format(salario);
  if (el("plano-kpi-despesas")) el("plano-kpi-despesas").textContent = formatadorBRL.format(despesasPlanejadas);
  if (el("plano-kpi-economia")) el("plano-kpi-economia").textContent = formatadorBRL.format(economia);
  if (el("plano-kpi-pct")) el("plano-kpi-pct").textContent = `${pct}%`;
  if (el("plano-kpi-saldo")) {
    el("plano-kpi-saldo").textContent = formatadorBRL.format(economia);
    el("plano-kpi-saldo").style.color = economia >= 0 ? "var(--cor-receita)" : "var(--cor-despesa)";
  }
}

// --- INDICADORES FINANCEIROS ---
function renderizarIndicadoresPlano(salario) {
  const container = document.getElementById("plano-indicadores");
  if (!container) return;

  let totalFixas = 0, totalParcelas = 0;
  if (typeof despesasFixasCarregadas !== "undefined") despesasFixasCarregadas.forEach((f) => { if (f.ativo) totalFixas += valorMonetario(f); });
  if (typeof comprasParceladasCarregadas !== "undefined") comprasParceladasCarregadas.forEach((c) => { if (c.ativo) totalParcelas += valorMonetario(c, "valor_parcela"); });

  const despesasFixas = totalFixas;
  const despesasVar = totalParcelas;
  const comprometido = despesasFixas + despesasVar;
  const pctComprometido = salario > 0 ? ((comprometido / salario) * 100).toFixed(1) : "0";
  const capacidadeInvest = Math.max(0, salario - comprometido);

  const itens = [
    { nome: "Taxa de economia", valor: `${salario > 0 ? (((salario - comprometido) / salario) * 100).toFixed(0) : 0}%`, cor: "var(--cor-receita)", bg: "rgba(46,125,50,0.1)" },
    { nome: "Renda comprometida", valor: `${pctComprometido}%`, cor: "var(--cor-despesa)", bg: "rgba(198,40,40,0.1)" },
    { nome: "Investimentos", valor: formatadorBRL.format(planosCarregados.filter((p) => p.status === "ativo" && p.tipo === "investimento").reduce((s, p) => s + (p.parcela_mensal || 0), 0)), cor: "var(--cor-marca)", bg: "rgba(169,122,47,0.1)" },
    { nome: "Despesas fixas", valor: formatadorBRL.format(despesasFixas), cor: "var(--cor-texto)", bg: "var(--cor-fundo)" },
    { nome: "Despesas variáveis", valor: formatadorBRL.format(despesasVar), cor: "var(--cor-texto)", bg: "var(--cor-fundo)" },
    { nome: "Capacidade de invest.", valor: formatadorBRL.format(capacidadeInvest), cor: "var(--cor-receita)", bg: "rgba(46,125,50,0.1)" },
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
function renderizarAlertasPlano(salario) {
  const card = document.getElementById("plano-card-alertas");
  const container = document.getElementById("plano-alertas");
  if (!card || !container) return;

  const alertas = [];
  let totalFixas = 0, totalParcelas = 0;
  if (typeof despesasFixasCarregadas !== "undefined") despesasFixasCarregadas.forEach((f) => { if (f.ativo) totalFixas += valorMonetario(f); });
  if (typeof comprasParceladasCarregadas !== "undefined") comprasParceladasCarregadas.forEach((c) => { if (c.ativo) totalParcelas += valorMonetario(c, "valor_parcela"); });

  const comprometido = totalFixas + totalParcelas;
  const pct = salario > 0 ? (comprometido / salario) * 100 : 0;

  if (pct > 90) alertas.push({ tipo: "erro", texto: `Seu orçamento está ${pct.toFixed(0)}% comprometido. Considere reduzir gastos.` });
  else if (pct > 70) alertas.push({ tipo: "aviso", texto: `Seu orçamento está ${pct.toFixed(0)}% comprometido. Atenção aos gastos.` });
  else if (salario > 0) alertas.push({ tipo: "ok", texto: `Parabéns! Apenas ${pct.toFixed(0)}% da renda está comprometida.` });

  if (typeof ultimoLoteLancamentos !== "undefined") {
    const atrasados = ultimoLoteLancamentos.filter((l) => l.status === "atrasado");
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
    const gasto = valorMonetario(o, "gasto_atual");
    const limite = valorMonetario(o, "valor_limite");
    const pct = limite > 0 ? Math.min((gasto / limite) * 100, 100) : 0;
    const cor = pct >= 90 ? "var(--cor-despesa)" : pct >= 70 ? "var(--cor-pendente)" : "var(--cor-receita)";
    return `
      <div class="plano-lista-item">
        <div class="plano-lista-info">
          <div class="plano-lista-nome">${escaparHtml(o.categoria)}</div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
            <div style="flex:1;height:6px;background:var(--cor-pauta-forte);border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:${cor};border-radius:3px"></div>
            </div>
            <span style="font-size:0.7rem;color:${cor}">${pct.toFixed(0)}%</span>
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
  if (receitas.length === 0) {
    container.innerHTML = '<div class="plano-vazio">Nenhuma receita registrada neste período.</div>';
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

  if (itens.length === 0) {
    container.innerHTML = '<div class="plano-vazio">Nenhuma despesa fixa ou parcelada ativa.</div>';
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
    const real = valorMonetario(o, "gasto_atual");
    const limite = valorMonetario(o, "valor_limite");
    const diff = real - limite;
    const diffLabel = diff > 0 ? `+${formatadorBRL.format(diff)}` : diff < 0 ? formatadorBRL.format(diff) : "—";
    const cls = diff > 0 ? "positivo" : diff < 0 ? "negativo" : "";
    return `<div class="plano-comp-linha"><span class="plano-comp-categoria">${escaparHtml(o.categoria)}</span><span class="plano-comp-valor">${formatadorBRL.format(limite)}</span><span class="plano-comp-valor">${formatadorBRL.format(real)}</span><span class="plano-comp-diferenca ${cls}">${diffLabel}</span></div>`;
  }).join("");

  container.innerHTML = header + linhas;
}

// --- SIMULAÇÃO ---
function configurarSimulacaoPlano() {
  const btn = document.getElementById("btn-simular");
  const input = document.getElementById("simulacao-valor");
  const resultado = document.getElementById("plano-resultado-simulacao");
  if (!btn || !input || !resultado) return;

  btn.onclick = () => {
    const valor = parseFloat(input.value) || 0;
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
