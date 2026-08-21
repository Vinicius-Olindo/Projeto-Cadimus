// ==========================================
// reports-charts-ui.js - KPIs e gráficos dos relatórios
// ==========================================
/* --- KPIs --- */
function renderizarKPIsRelatorio(lancamentos, mesAnterior) {
  const receitas = somarValoresMonetarios(lancamentos.filter((l) => l.tipo === "receita"));
  const despesas = somarValoresMonetarios(lancamentos.filter((l) => l.tipo === "despesa"));
  const saldo = receitas - despesas;
  const economia = receitas > 0 ? Math.round((saldo / receitas) * 100) : 0;

  const el = (id) => document.getElementById(id);
  if (el("rel-kpi-receitas")) el("rel-kpi-receitas").textContent = formatadorBRL.format(receitas);
  if (el("rel-kpi-despesas")) el("rel-kpi-despesas").textContent = formatadorBRL.format(despesas);
  if (el("rel-kpi-saldo")) {
    el("rel-kpi-saldo").textContent = formatadorBRL.format(saldo);
    el("rel-kpi-saldo").style.color = saldo >= 0 ? "var(--cor-receita)" : "var(--cor-despesa)";
  }
  if (el("rel-kpi-economia")) el("rel-kpi-economia").textContent = `${economia}%`;

  // Maior gasto
  const porCategoria = {};
  lancamentos.filter((l) => l.tipo === "despesa").forEach((l) => {
    porCategoria[l.categoria] = (porCategoria[l.categoria] || 0) + valorMonetario(l);
  });
  const maior = Object.entries(porCategoria).sort((a, b) => b[1] - a[1])[0];
  if (el("rel-kpi-maior-gasto") && maior) {
    el("rel-kpi-maior-gasto").textContent = maior[0];
    el("rel-kpi-maior-gasto-valor").textContent = formatadorBRL.format(maior[1]);
  }

  if (el("rel-kpi-transacoes")) el("rel-kpi-transacoes").textContent = lancamentos.length;

  // Tendências
  carregarLancamentosPeriodo(mesAnterior.inicio, mesAnterior.fim).then((ant) => {
    const recAnt = somarValoresMonetarios(ant.filter((l) => l.tipo === "receita"));
    const despAnt = somarValoresMonetarios(ant.filter((l) => l.tipo === "despesa"));
    if (el("rel-kpi-receitas-tendencia") && recAnt > 0) {
      const pct = ((receitas - recAnt) / recAnt * 100).toFixed(0);
      const cls = pct >= 0 ? "tendencia-positiva" : "tendencia-negativa";
      el("rel-kpi-receitas-tendencia").textContent = `${pct >= 0 ? "↑" : "↓"} ${Math.abs(pct)}%`;
      el("rel-kpi-receitas-tendencia").className = `rel-kpi-tendencia ${cls}`;
    }
    if (el("rel-kpi-despesas-tendencia") && despAnt > 0) {
      const pct = ((despesas - despAnt) / despAnt * 100).toFixed(0);
      const cls = pct <= 0 ? "tendencia-positiva" : "tendencia-negativa";
      el("rel-kpi-despesas-tendencia").textContent = `${pct >= 0 ? "↑" : "↓"} ${Math.abs(pct)}%`;
      el("rel-kpi-despesas-tendencia").className = `rel-kpi-tendencia ${cls}`;
    }
  });
}

/* --- Fluxo de Caixa (SVG) --- */
function renderizarFluxoCaixa(lancamentos, periodo) {
  const container = document.getElementById("rel-grafico-fluxo");
  if (!container) return;

  const meses = obterMesesPeriodo(periodo);
  const dados = meses.map((m) => {
    const rec = somarValoresMonetarios(lancamentos.filter((l) => l.tipo === "receita" && l.data_compra?.startsWith(m.key)));
    const desp = somarValoresMonetarios(lancamentos.filter((l) => l.tipo === "despesa" && l.data_compra?.startsWith(m.key)));
    return { ...m, receitas: rec, despesas: desp, saldo: rec - desp };
  });

  if (dados.length < 2) { container.innerHTML = '<div class="plano-vazio">Período muito curto para gráfico.</div>'; return; }

  const W = 600, H = 200, P = 40;
  const vals = dados.flatMap((d) => [d.receitas, d.despesas, d.saldo]);
  const maxV = Math.max(...vals, 1);
  const minV = Math.min(...vals, 0);
  const escala = (v) => P + ((v - minV) / (maxV - minV || 1)) * (H - 2 * P);
  const x = (i) => P + (i / (dados.length - 1)) * (W - 2 * P);

  const pathRec = dados.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${escala(d.receitas)}`).join(" ");
  const pathDesp = dados.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${escala(d.despesas)}`).join(" ");
  const pathSaldo = dados.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${escala(d.saldo)}`).join(" ");

  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<line x1="${P}" y1="${escala(0)}" x2="${W - P}" y2="${escala(0)}" stroke="var(--cor-pauta-fraca)" stroke-dasharray="4"/>`;
  dados.forEach((d, i) => {
    svg += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" fill="var(--cor-texto-suave)" font-size="10">${d.label}</text>`;
  });
  svg += `<path d="${pathRec}" fill="none" stroke="var(--cor-receita)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  svg += `<path d="${pathDesp}" fill="none" stroke="var(--cor-despesa)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  svg += `<path d="${pathSaldo}" fill="none" stroke="var(--cor-marca)" stroke-width="2" stroke-dasharray="6,3" stroke-linecap="round" stroke-linejoin="round"/>`;
  dados.forEach((d, i) => {
    svg += `<circle cx="${x(i)}" cy="${escala(d.receitas)}" r="3.5" fill="var(--cor-receita)"/>`;
    svg += `<circle cx="${x(i)}" cy="${escala(d.despesas)}" r="3.5" fill="var(--cor-despesa)"/>`;
  });
  svg += `<text x="${W - P + 5}" y="${escala(dados[dados.length - 1]?.receitas || 0) + 4}" fill="var(--cor-receita)" font-size="9">Receitas</text>`;
  svg += `<text x="${W - P + 5}" y="${escala(dados[dados.length - 1]?.despesas || 0) + 4}" fill="var(--cor-despesa)" font-size="9">Despesas</text>`;
  svg += `<text x="${W - P + 5}" y="${escala(dados[dados.length - 1]?.saldo || 0) + 4}" fill="var(--cor-marca)" font-size="9">Saldo</text>`;
  svg += `</svg>`;
  container.innerHTML = svg;
}

/* --- Barras Receitas × Despesas --- */
function renderizarBarrasReceitasDespesas(lancamentos, periodo) {
  const container = document.getElementById("rel-grafico-barras");
  if (!container) return;

  const meses = obterMesesPeriodo(periodo);
  const dados = meses.map((m) => {
    const rec = somarValoresMonetarios(lancamentos.filter((l) => l.tipo === "receita" && l.data_compra?.startsWith(m.key)));
    const desp = somarValoresMonetarios(lancamentos.filter((l) => l.tipo === "despesa" && l.data_compra?.startsWith(m.key)));
    return { ...m, receitas: rec, despesas: desp };
  });

  const maxV = Math.max(...dados.flatMap((d) => [d.receitas, d.despesas]), 1);
  const W = 600, H = 180, P = 40;
  const barW = Math.min(30, (W - 2 * P) / (dados.length * 3));
  const centro = (i) => P + (i + 0.5) * ((W - 2 * P) / dados.length);

  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<line x1="${P}" y1="${H - P}" x2="${W - P}" y2="${H - P}" stroke="var(--cor-pauta-fraca)"/>`;
  dados.forEach((d, i) => {
    const cx = centro(i);
    const hRec = (d.receitas / maxV) * (H - 2 * P);
    const hDesp = (d.despesas / maxV) * (H - 2 * P);
    svg += `<rect x="${cx - barW - 1}" y="${H - P - hRec}" width="${barW}" height="${hRec}" fill="var(--cor-receita)" rx="2"/>`;
    svg += `<rect x="${cx + 1}" y="${H - P - hDesp}" width="${barW}" height="${hDesp}" fill="var(--cor-despesa)" rx="2"/>`;
    svg += `<text x="${cx}" y="${H - 8}" text-anchor="middle" fill="var(--cor-texto-suave)" font-size="9">${d.label}</text>`;
  });
  svg += `</svg>`;
  container.innerHTML = svg;
}

/* --- Donut Categorias --- */
function renderizarDonutCategorias(lancamentos) {
  const svgEl = document.getElementById("rel-donut-svg");
  const legEl = document.getElementById("rel-donut-legenda");
  if (!svgEl || !legEl) return;

  const despesas = lancamentos.filter((l) => l.tipo === "despesa");
  if (despesas.length === 0) { svgEl.innerHTML = '<div class="plano-vazio">Sem despesas no período.</div>'; legEl.innerHTML = ""; return; }

  const porCategoria = {};
  despesas.forEach((l) => { porCategoria[l.categoria] = (porCategoria[l.categoria] || 0) + valorMonetario(l); });
  const total = Object.values(porCategoria).reduce((s, v) => s + v, 0);
  const categorias = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]);

  const R = 70, cx = 90, cy = 90, stroke = 24;
  let svg = `<svg width="180" height="180" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">`;
  let angulo = -90;
  categorias.forEach(([nome, valor], i) => {
    const pct = valor / total;
    const comprimento = pct * 2 * Math.PI * R;
    const cor = CORES_GRAFICO[i % CORES_GRAFICO.length];
    svg += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${cor}" stroke-width="${stroke}" stroke-dasharray="${comprimento} ${2 * Math.PI * R}" stroke-dashoffset="${-angulo * Math.PI * R / 180}" transform="rotate(0 ${cx} ${cy})"/>`;
    angulo += pct * 360;
  });
  svg += `<text x="${cx}" y="${cy - 6}" text-anchor="middle" fill="var(--cor-texto)" font-size="13" font-weight="700">${formatadorBRL.format(total)}</text>`;
  svg += `<text x="${cx}" y="${cy + 10}" text-anchor="middle" fill="var(--cor-texto-suave)" font-size="9">Total</text>`;
  svg += `</svg>`;
  svgEl.innerHTML = svg;

  legEl.innerHTML = categorias.map(([nome, valor], i) => {
    const pct = ((valor / total) * 100).toFixed(1);
    const cor = CORES_GRAFICO[i % CORES_GRAFICO.length];
    return `<div class="rel-donut-item"><span class="rel-donut-cor" style="background:${cor}"></span><span class="rel-donut-nome">${escaparHtml(nome)}</span><span class="rel-donut-pct">${pct}%</span><span class="rel-donut-valor">${formatadorBRL.format(valor)}</span></div>`;
  }).join("");
}

/* --- Indicadores Financeiros --- */
function renderizarIndicadoresFinanceiros(lancamentos, periodo) {
  const container = document.getElementById("rel-indicadores");
  if (!container) return;

  const rec = lancamentos.filter((l) => l.tipo === "receita");
  const desp = lancamentos.filter((l) => l.tipo === "despesa");
  const totalRec = somarValoresMonetarios(rec);
  const totalDesp = somarValoresMonetarios(desp);
  const meses = Math.max(1, obterMesesPeriodo(periodo).length);
  const ticketRec = rec.length > 0 ? totalRec / rec.length : 0;
  const ticketDesp = desp.length > 0 ? totalDesp / desp.length : 0;
  const diasNegativos = calcularDiasNegativos(lancamentos);
  const rendaComprometida = totalRec > 0 ? ((totalDesp / totalRec) * 100).toFixed(0) : 0;

  const itens = [
    { nome: "Receita média mensal", valor: formatadorBRL.format(totalRec / meses), icone: "📊", cor: "var(--cor-receita)" },
    { nome: "Despesa média mensal", valor: formatadorBRL.format(totalDesp / meses), icone: "📉", cor: "var(--cor-despesa)" },
    { nome: "Saldo médio", valor: formatadorBRL.format((totalRec - totalDesp) / meses), icone: "💰", cor: "var(--cor-marca)" },
    { nome: "Maior gasto do período", valor: formatadorBRL.format(Math.max(...desp.map((l) => valorMonetario(l)), 0)), icone: "🔺", cor: "var(--cor-despesa)" },
    { nome: "Maior receita", valor: formatadorBRL.format(Math.max(...rec.map((l) => valorMonetario(l)), 0)), icone: "🔺", cor: "var(--cor-receita)" },
    { nome: "Ticket médio despesas", valor: formatadorBRL.format(ticketDesp), icone: "🧾", cor: "var(--cor-texto)" },
    { nome: "Ticket médio receitas", valor: formatadorBRL.format(ticketRec), icone: "🧾", cor: "var(--cor-texto)" },
    { nome: "Total transações", valor: String(lancamentos.length), icone: "📋", cor: "var(--cor-marca)" },
    { nome: "Dias com saldo negativo", valor: String(diasNegativos), icone: "⚠️", cor: "var(--cor-despesa)" },
    { nome: "Renda comprometida", valor: `${rendaComprometida}%`, icone: "📌", cor: "var(--cor-texto)" },
  ];

  container.innerHTML = itens.map((item) => `
    <div class="rel-ind-item">
      <div class="rel-ind-icone" style="background:${item.cor}15;color:${item.cor}">${item.icone}</div>
      <div class="rel-ind-info">
        <span class="rel-ind-nome">${item.nome}</span>
        <span class="rel-ind-valor">${item.valor}</span>
      </div>
    </div>
  `).join("");
}

function calcularDiasNegativos(lancamentos) {
  const porDia = {};
  lancamentos.forEach((l) => {
    if (!l.data_compra) return;
    if (!porDia[l.data_compra]) porDia[l.data_compra] = 0;
    porDia[l.data_compra] += (l.tipo === "receita" ? 1 : -1) * valorMonetario(l);
  });
  return Object.values(porDia).filter((v) => v < 0).length;
}

/* --- Evolução por Categoria --- */
function renderizarEvolucaoCategorias(lancamentos, periodo) {
  const container = document.getElementById("rel-grafico-evolucao-categorias");
  if (!container) return;

  const meses = obterMesesPeriodo(periodo);
  const categoriasSet = new Set();
  lancamentos.filter((l) => l.tipo === "despesa").forEach((l) => categoriasSet.add(l.categoria));
  const cats = [...categoriasSet].slice(0, 6);
  if (cats.length === 0) { container.innerHTML = '<div class="plano-vazio">Sem categorias para exibir.</div>'; return; }

  const W = 600, H = 200, P = 40;
  const dados = meses.map((m) => {
    const obj = { label: m.label };
    cats.forEach((c) => { obj[c] = somarValoresMonetarios(lancamentos.filter((l) => l.tipo === "despesa" && l.categoria === c && l.data_compra?.startsWith(m.key))); });
    return obj;
  });

  const maxV = Math.max(...dados.flatMap((d) => cats.map((c) => d[c] || 0)), 1);
  const x = (i) => P + (i / (dados.length - 1 || 1)) * (W - 2 * P);
  const escala = (v) => H - P - (v / maxV) * (H - 2 * P);

  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
  dados.forEach((d, i) => {
    svg += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" fill="var(--cor-texto-suave)" font-size="9">${d.label}</text>`;
  });

  cats.forEach((cat, ci) => {
    const cor = CORES_GRAFICO[ci % CORES_GRAFICO.length];
    const path = dados.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${escala(d[cat] || 0)}`).join(" ");
    svg += `<path d="${path}" fill="none" stroke="${cor}" stroke-width="2" stroke-linecap="round"/>`;
    dados.forEach((d, i) => {
      if (d[cat] > 0) svg += `<circle cx="${x(i)}" cy="${escala(d[cat])}" r="2.5" fill="${cor}"/>`;
    });
  });
  svg += `</svg>`;

  const legenda = cats.map((c, i) => `<span style="display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;margin-right:12px"><span style="width:10px;height:10px;border-radius:50%;background:${CORES_GRAFICO[i % CORES_GRAFICO.length]};display:inline-block"></span>${escaparHtml(c)}</span>`).join("");
  container.innerHTML = svg + `<div style="margin-top:8px">${legenda}</div>`;
}

/* --- Ranking Categorias --- */
function renderizarRankingCategorias(lancamentos) {
  const container = document.getElementById("rel-ranking-categorias");
  if (!container) return;

  const porCategoria = {};
  lancamentos.filter((l) => l.tipo === "despesa").forEach((l) => {
    porCategoria[l.categoria] = (porCategoria[l.categoria] || 0) + valorMonetario(l);
  });
  const total = Object.values(porCategoria).reduce((s, v) => s + v, 0);
  const ranking = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]);

  if (ranking.length === 0) { container.innerHTML = '<div class="plano-vazio">Sem dados.</div>'; return; }

  container.innerHTML = ranking.map(([nome, valor], i) => {
    const pct = total > 0 ? (valor / total * 100) : 0;
    const cor = CORES_GRAFICO[i % CORES_GRAFICO.length];
    return `
      <div class="rel-ranking-item">
        <span class="rel-ranking-pos">${i + 1}</span>
        <div class="rel-ranking-info">
          <span class="rel-ranking-nome">${escaparHtml(nome)}</span>
          <div class="rel-ranking-barra"><div class="rel-ranking-barra-fill" style="width:${pct}%;background:${cor}"></div></div>
        </div>
        <div class="rel-ranking-valores">
          <div class="rel-ranking-valor-principal">${formatadorBRL.format(valor)}</div>
          <div class="rel-ranking-valor-secundario">${pct.toFixed(1)}%</div>
        </div>
      </div>`;
  }).join("");
}
