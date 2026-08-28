// ==========================================
// reports-tables-ui.js - Tabelas, comparativos e insights dos relatórios
// ==========================================
/* --- Tabelas --- */
function renderizarTabelaContas(lancamentos) {
  const container = document.getElementById("rel-tabela-contas");
  if (!container) return;

  const porConta = {};
  lancamentos.forEach((l) => {
    const conta = l.carteira_nome || l.carteira_id || "Sem conta";
    if (!porConta[conta]) porConta[conta] = { entradas: 0, saidas: 0 };
    if (l.tipo === "receita") porConta[conta].entradas += valorMonetario(l);
    else if (l.tipo === "despesa") porConta[conta].saidas += valorMonetario(l);
  });

  const contas = Object.entries(porConta);
  if (contas.length === 0) { container.innerHTML = '<div class="plano-vazio">Sem dados.</div>'; return; }

  container.innerHTML = `<table class="rel-tabela"><thead><tr><th>Conta</th><th class="col-valor">Entradas</th><th class="col-valor">Saídas</th><th class="col-valor">Saldo</th></tr></thead><tbody>${
    contas.map(([nome, d]) => {
      const saldo = d.entradas - d.saidas;
      return `<tr><td>${escaparHtml(nome)}</td><td class="col-valor tipo-receita">${formatadorBRL.format(d.entradas)}</td><td class="col-valor tipo-despesa">${formatadorBRL.format(d.saidas)}</td><td class="col-valor" style="color:${saldo >= 0 ? "var(--cor-receita)" : "var(--cor-despesa)"}">${formatadorBRL.format(saldo)}</td></tr>`;
    }).join("")
  }</tbody></table>`;
}

function renderizarTabelaFormasPagamento(lancamentos) {
  const container = document.getElementById("rel-tabela-formas");
  if (!container) return;

  const porForma = {};
  lancamentos.filter((l) => l.tipo === "despesa").forEach((l) => {
    const forma = l.forma_pagamento || "Não informado";
    porForma[forma] = (porForma[forma] || 0) + valorMonetario(l);
  });

  const total = Object.values(porForma).reduce((s, v) => s + v, 0);
  const formas = Object.entries(porForma).sort((a, b) => b[1] - a[1]);

  if (formas.length === 0) { container.innerHTML = '<div class="plano-vazio">Sem dados.</div>'; return; }

  container.innerHTML = `<table class="rel-tabela"><thead><tr><th>Forma</th><th class="col-valor">Valor</th><th class="col-valor">%</th><th style="width:40%">Proporção</th></tr></thead><tbody>${
    formas.map(([nome, valor]) => {
      const pct = total > 0 ? (valor / total * 100) : 0;
      return `<tr><td>${escaparHtml(nome)}</td><td class="col-valor">${formatadorBRL.format(valor)}</td><td class="col-valor">${pct.toFixed(1)}%</td><td><div class="rel-barra-progresso"><div class="rel-barra-trilho"><div class="rel-barra-preenchimento" style="width:${pct}%;background:var(--cor-marca)"></div></div></div></td></tr>`;
    }).join("")
  }</tbody></table>`;
}

function obterCarteiraRelatorio(carteiraId) {
  const idTexto = String(carteiraId || "");
  const carteira = typeof carteirasCarregadas !== "undefined" && Array.isArray(carteirasCarregadas)
    ? carteirasCarregadas.find((item) => String(item.id) === idTexto)
    : null;

  return {
    id: idTexto || "sem-carteira",
    nome: carteira?.nome || (carteiraId ? `Carteira ${carteiraId}` : "Sem carteira"),
    tipo: carteira?.tipo || "",
  };
}

function obterFormaPagamentoRelatorio(lancamento) {
  return lancamento.forma_pagamento || lancamento.meio_pagamento || "Não informado";
}

function criarMapaComparativoCarteiras(lancamentos) {
  const mapa = new Map();

  lancamentos.forEach((lancamento) => {
    const carteira = obterCarteiraRelatorio(lancamento.carteira_id);
    if (!mapa.has(carteira.id)) {
      mapa.set(carteira.id, {
        ...carteira,
        receitas: 0,
        despesas: 0,
        pendentes: 0,
        transacoes: 0,
        despesasCartao: 0,
        categorias: {},
        formas: {},
      });
    }

    const item = mapa.get(carteira.id);
    const valor = valorMonetario(lancamento);
    item.transacoes += 1;

    if (lancamento.tipo === "receita") {
      item.receitas += valor;
      return;
    }

    if (lancamento.tipo === "despesa") {
      item.despesas += valor;
      if (lancamento.status !== "pago") item.pendentes += valor;
      if (lancamento.cartao_credito_id || lancamento.meio_pagamento === "credito") item.despesasCartao += valor;
      const categoria = lancamento.categoria || "Sem categoria";
      const forma = obterFormaPagamentoRelatorio(lancamento);
      item.categorias[categoria] = (item.categorias[categoria] || 0) + valor;
      item.formas[forma] = (item.formas[forma] || 0) + valor;
    }
  });

  return [...mapa.values()].map((item) => ({
    ...item,
    saldo: item.receitas - item.despesas,
    maiorCategoria: Object.entries(item.categorias).sort((a, b) => b[1] - a[1])[0] || null,
    maiorForma: Object.entries(item.formas).sort((a, b) => b[1] - a[1])[0] || null,
  }));
}

function renderizarComparativoCarteiras(lancamentos) {
  const container = document.getElementById("rel-comparativo-carteiras");
  if (!container) return;

  const carteiras = criarMapaComparativoCarteiras(lancamentos)
    .sort((a, b) => b.despesas - a.despesas || b.receitas - a.receitas);

  if (carteiras.length === 0) {
    container.innerHTML = '<div class="plano-vazio">Sem dados de carteiras neste período.</div>';
    return;
  }

  const totalDespesas = carteiras.reduce((total, carteira) => total + carteira.despesas, 0);
  const maiorDespesa = carteiras[0];
  const melhorSaldo = [...carteiras].sort((a, b) => b.saldo - a.saldo)[0];

  container.innerHTML = `
    <div class="rel-carteiras-resumo">
      <div>
        <span>Maior saída</span>
        <strong>${escaparHtml(maiorDespesa.nome)}</strong>
        <small>${formatadorBRL.format(maiorDespesa.despesas)}</small>
      </div>
      <div>
        <span>Melhor saldo</span>
        <strong>${escaparHtml(melhorSaldo.nome)}</strong>
        <small style="color:${melhorSaldo.saldo >= 0 ? "var(--cor-receita)" : "var(--cor-despesa)"}">${formatadorBRL.format(melhorSaldo.saldo)}</small>
      </div>
      <div>
        <span>Carteiras no período</span>
        <strong>${carteiras.length}</strong>
        <small>${lancamentos.length} transação(ões)</small>
      </div>
    </div>
    <div class="rel-carteiras-grid">
      ${carteiras.map((carteira) => {
        const pctDespesas = totalDespesas > 0 ? Math.round((carteira.despesas / totalDespesas) * 100) : 0;
        const corSaldo = carteira.saldo >= 0 ? "var(--cor-receita)" : "var(--cor-despesa)";
        const tipo = carteira.tipo ? carteira.tipo.replace(/_/g, " ") : "carteira";
        const maiorCategoria = carteira.maiorCategoria
          ? `${carteira.maiorCategoria[0]} · ${formatadorBRL.format(carteira.maiorCategoria[1])}`
          : "Sem despesas categorizadas";
        const maiorForma = carteira.maiorForma
          ? `${carteira.maiorForma[0]} · ${formatadorBRL.format(carteira.maiorForma[1])}`
          : "Sem forma de pagamento";

        return `
          <article class="rel-carteira-card">
            <div class="rel-carteira-topo">
              <div>
                <strong>${escaparHtml(carteira.nome)}</strong>
                <span>${escaparHtml(tipo)}</span>
              </div>
              <em>${pctDespesas}% das saídas</em>
            </div>
            <div class="rel-carteira-barra">
              <div class="rel-carteira-barra-fill" style="width:${pctDespesas}%;"></div>
            </div>
            <div class="rel-carteira-metricas">
              <div><span>Receitas</span><strong class="tipo-receita">${formatadorBRL.format(carteira.receitas)}</strong></div>
              <div><span>Despesas</span><strong class="tipo-despesa">${formatadorBRL.format(carteira.despesas)}</strong></div>
              <div><span>Saldo</span><strong style="color:${corSaldo}">${formatadorBRL.format(carteira.saldo)}</strong></div>
              <div><span>Pendente</span><strong>${formatadorBRL.format(carteira.pendentes)}</strong></div>
            </div>
            <div class="rel-carteira-detalhes">
              <span>Maior categoria: <strong>${escaparHtml(maiorCategoria)}</strong></span>
              <span>Principal forma: <strong>${escaparHtml(maiorForma)}</strong></span>
              ${carteira.despesasCartao > 0 ? `<span>Cartão: <strong>${formatadorBRL.format(carteira.despesasCartao)}</strong></span>` : ""}
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderizarMaioresDespesas(lancamentos) {
  const container = document.getElementById("rel-tabela-maiores-despesas");
  if (!container) return;

  const despesas = lancamentos.filter((l) => l.tipo === "despesa").sort((a, b) => valorMonetario(b) - valorMonetario(a)).slice(0, 15);
  if (despesas.length === 0) { container.innerHTML = '<div class="plano-vazio">Sem despesas.</div>'; return; }

  container.innerHTML = `<table class="rel-tabela"><thead><tr><th>Descrição</th><th>Categoria</th><th>Data</th><th class="col-valor">Valor</th></tr></thead><tbody>${
    despesas.map((l) => `<tr><td>${escaparHtml(l.descricao || l.categoria)}</td><td><span class="rel-tabela col-categoria" style="background:var(--cor-despesa)15;color:var(--cor-despesa)">${escaparHtml(l.categoria || "")}</span></td><td>${l.data_compra ? new Date(l.data_compra + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td><td class="col-valor tipo-despesa">${formatadorBRL.format(valorMonetario(l))}</td></tr>`).join("")
  }</tbody></table>`;
}

function renderizarMaioresReceitas(lancamentos) {
  const container = document.getElementById("rel-tabela-maiores-receitas");
  if (!container) return;

  const receitas = lancamentos.filter((l) => l.tipo === "receita").sort((a, b) => valorMonetario(b) - valorMonetario(a)).slice(0, 15);
  if (receitas.length === 0) { container.innerHTML = '<div class="plano-vazio">Sem receitas.</div>'; return; }

  container.innerHTML = `<table class="rel-tabela"><thead><tr><th>Descrição</th><th>Categoria</th><th>Data</th><th class="col-valor">Valor</th></tr></thead><tbody>${
    receitas.map((l) => `<tr><td>${escaparHtml(l.descricao || l.categoria)}</td><td><span class="rel-tabela col-categoria" style="background:var(--cor-receita)15;color:var(--cor-receita)">${escaparHtml(l.categoria || "")}</span></td><td>${l.data_compra ? new Date(l.data_compra + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td><td class="col-valor tipo-receita">${formatadorBRL.format(valorMonetario(l))}</td></tr>`).join("")
  }</tbody></table>`;
}

function renderizarRecorrentesRelatorio(lancamentos) {
  const container = document.getElementById("rel-tabela-recorrentes");
  if (!container) return;

  const fixas = typeof despesasFixasCarregadas !== "undefined" ? despesasFixasCarregadas.filter((f) => f.ativo) : [];
  if (fixas.length === 0) { container.innerHTML = '<div class="plano-vazio">Sem despesas recorrentes.</div>'; return; }

  container.innerHTML = `<table class="rel-tabela"><thead><tr><th>Despesa</th><th>Frequência</th><th class="col-valor">Valor</th></tr></thead><tbody>${
    fixas.map((f) => `<tr><td>${escaparHtml(f.descricao)}</td><td>Mensal</td><td class="col-valor">${formatadorBRL.format(valorMonetario(f))}</td></tr>`).join("")
  }</tbody></table>`;
}

/* --- Comparativo --- */
function renderizarComparativoPeriodos(lancamentos, mesAnterior) {
  const container = document.getElementById("rel-comparacao-periodos");
  if (!container) return;

  const recAtual = somarValoresMonetarios(lancamentos.filter((l) => l.tipo === "receita"));
  const despAtual = somarValoresMonetarios(lancamentos.filter((l) => l.tipo === "despesa"));

  carregarLancamentosPeriodo(mesAnterior.inicio, mesAnterior.fim).then((ant) => {
    const recAnt = somarValoresMonetarios(ant.filter((l) => l.tipo === "receita"));
    const despAnt = somarValoresMonetarios(ant.filter((l) => l.tipo === "despesa"));
    const ecoAtual = recAtual - despAtual;
    const ecoAnt = recAnt - despAnt;

    const calcPct = (atual, anterior) => anterior > 0 ? ((atual - anterior) / anterior * 100).toFixed(0) : "—";

    container.innerHTML = `
      <div class="rel-comp-linha rel-comp-header"><span>Métrica</span><span style="text-align:right">Período atual</span><span style="text-align:right">Período anterior</span><span style="text-align:right">Variação</span></div>
      <div class="rel-comp-linha"><span>Receitas</span><span class="rel-comp-valor">${formatadorBRL.format(recAtual)}</span><span class="rel-comp-valor">${formatadorBRL.format(recAnt)}</span><span class="rel-comp-diferenca ${recAtual >= recAnt ? "positivo" : "negativo"}">${calcPct(recAtual, recAnt)}%</span></div>
      <div class="rel-comp-linha"><span>Despesas</span><span class="rel-comp-valor">${formatadorBRL.format(despAtual)}</span><span class="rel-comp-valor">${formatadorBRL.format(despAnt)}</span><span class="rel-comp-diferenca ${despAtual <= despAnt ? "positivo" : "negativo"}">${calcPct(despAtual, despAnt)}%</span></div>
      <div class="rel-comp-linha"><span>Economia</span><span class="rel-comp-valor">${formatadorBRL.format(ecoAtual)}</span><span class="rel-comp-valor">${formatadorBRL.format(ecoAnt)}</span><span class="rel-comp-diferenca ${ecoAtual >= ecoAnt ? "positivo" : "negativo"}">${calcPct(ecoAtual, ecoAnt)}%</span></div>
    `;
  });
}

/* --- Metas --- */
function renderizarMetasRelatorio() {
  const container = document.getElementById("rel-metas-progresso");
  if (!container) return;

  if (typeof metasCarregadas === "undefined" || metasCarregadas.length === 0) {
    container.innerHTML = '<div class="plano-vazio">Nenhuma meta configurada.</div>';
    return;
  }

  container.innerHTML = metasCarregadas.map((meta) => {
    const valorLimite = valorMonetario(meta, "valor_limite");
    const totalDepositado = valorMonetario(meta, "total_depositado");
    const pct = valorLimite > 0 ? Math.min(100, Math.round((totalDepositado / valorLimite) * 100)) : 0;
    const cor = pct >= 80 ? "var(--cor-receita)" : pct >= 40 ? "var(--cor-marca)" : "var(--cor-despesa)";
    return `
      <div class="rel-ranking-item">
        <div class="rel-ranking-info">
          <span class="rel-ranking-nome">${escaparHtml(meta.categoria)}</span>
          <div class="rel-barra-progresso" style="margin-top:4px">
            <div class="rel-barra-trilho"><div class="rel-barra-preenchimento" style="width:${pct}%;background:${cor}"></div></div>
            <span class="rel-barra-pct" style="color:${cor}">${pct}%</span>
          </div>
          <span class="rel-ranking-valor-secundario">${formatadorBRL.format(totalDepositado)} / ${formatadorBRL.format(valorLimite)}</span>
        </div>
      </div>`;
  }).join("");
}

/* --- Insights Automáticos --- */
function renderizarInsights(lancamentos, mesAnterior) {
  const container = document.getElementById("rel-insights-lista");
  if (!container) return;

  const insights = [];
  const desp = lancamentos.filter((l) => l.tipo === "despesa");
  const rec = lancamentos.filter((l) => l.tipo === "receita");
  const totalDesp = somarValoresMonetarios(desp);
  const totalRec = somarValoresMonetarios(rec);

  // Insight: despesas maiores que receitas
  if (totalDesp > totalRec && totalRec > 0) {
    insights.push({ tipo: "alerta", texto: `Suas despesas (${formatadorBRL.format(totalDesp)}) ultrapassam as receitas (${formatadorBRL.format(totalRec)}) neste período.` });
  }

  // Insight: categoria com maior aumento
  carregarLancamentosPeriodo(mesAnterior.inicio, mesAnterior.fim).then((ant) => {
    const despAnt = ant.filter((l) => l.tipo === "despesa");
    const catAtual = {}, catAnt = {};
    desp.forEach((l) => { catAtual[l.categoria] = (catAtual[l.categoria] || 0) + valorMonetario(l); });
    despAnt.forEach((l) => { catAnt[l.categoria] = (catAnt[l.categoria] || 0) + valorMonetario(l); });

    Object.keys(catAtual).forEach((cat) => {
      if (catAnt[cat] && catAtual[cat] > catAnt[cat] * 1.15) {
        const pct = ((catAtual[cat] - catAnt[cat]) / catAnt[cat] * 100).toFixed(0);
        insights.push({ tipo: "alerta", texto: `Você gastou ${pct}% mais com ${cat} em relação ao período anterior.` });
      }
    });

    Object.keys(catAtual).forEach((cat) => {
      if (catAnt[cat] && catAtual[cat] < catAnt[cat] * 0.85) {
        const pct = ((catAnt[cat] - catAtual[cat]) / catAnt[cat] * 100).toFixed(0);
        insights.push({ tipo: "ok", texto: `Redução de ${pct}% nos gastos com ${cat}. Continue assim!` });
      }
    });

    // Economia
    const ecoAtual = totalRec - totalDesp;
    const ecoAnt = somarValoresMonetarios(rec) - somarValoresMonetarios(despAnt);
    if (ecoAtual > ecoAnt && ecoAnt > 0) {
      insights.push({ tipo: "ok", texto: `Sua economia cresceu ${((ecoAtual - ecoAnt) / ecoAnt * 100).toFixed(0)}% em relação ao período anterior.` });
    }

    // Fixas > 60% renda
    const fixas = typeof despesasFixasCarregadas !== "undefined" ? somarValoresMonetarios(despesasFixasCarregadas.filter((f) => f.ativo)) : 0;
    if (totalRec > 0 && fixas / totalRec > 0.6) {
      insights.push({ tipo: "alerta", texto: `As despesas fixas representam ${((fixas / totalRec) * 100).toFixed(0)}% da sua renda.` });
    }

    // Ticket médio
    if (desp.length > 0) {
      const ticket = totalDesp / desp.length;
      insights.push({ tipo: "info", texto: `Ticket médio das despesas: ${formatadorBRL.format(ticket)}. Considere analisar transações acima deste valor.` });
    }

    // Zero insights = mensagem padrão
    if (insights.length === 0) {
      insights.push({ tipo: "ok", texto: "Seus indicadores estão dentro do esperado. Continue monitorando!" });
    }

    container.innerHTML = insights.map((ins) => {
      const cls = ins.tipo === "alerta" ? "insight-alerta" : ins.tipo === "ok" ? "insight-ok" : "insight-info";
      const icone = ins.tipo === "alerta" ? "⚠️" : ins.tipo === "ok" ? "✅" : "ℹ️";
      return `<div class="rel-insight-item"><div class="rel-insight-icone ${cls}">${icone}</div><span class="rel-insight-texto">${ins.texto}</span></div>`;
    }).join("");
  });
}

/* --- Tabela Completa --- */
function renderizarTabelaTransacoes(lancamentos) {
  const container = document.getElementById("rel-tabela-transacoes");
  const pagContainer = document.getElementById("rel-tabela-paginacao");
  if (!container) return;

  const busca = document.getElementById("rel-busca-transacoes")?.value?.toLowerCase() || "";
  const ordem = document.getElementById("rel-ordem-tabela")?.value || "data-desc";

  let filtrados = lancamentos.filter((l) => {
    if (busca && !(l.descricao || "").toLowerCase().includes(busca) && !(l.categoria || "").toLowerCase().includes(busca)) return false;
    return true;
  });

  filtrados.sort((a, b) => {
    switch (ordem) {
      case "data-desc": return (b.data_compra || "").localeCompare(a.data_compra || "");
      case "data-asc": return (a.data_compra || "").localeCompare(b.data_compra || "");
      case "valor-desc": return valorMonetario(b) - valorMonetario(a);
      case "valor-asc": return valorMonetario(a) - valorMonetario(b);
      case "desc-alf": return (a.descricao || "").localeCompare(b.descricao || "");
      default: return 0;
    }
  });

  const totalPaginas = Math.ceil(filtrados.length / relatorioPagina.porPagina);
  if (relatorioPagina.atual > totalPaginas) relatorioPagina.atual = 1;
  const inicio = (relatorioPagina.atual - 1) * relatorioPagina.porPagina;
  const pagina = filtrados.slice(inicio, inicio + relatorioPagina.porPagina);

  container.innerHTML = `<table class="rel-tabela"><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Tipo</th><th class="col-valor">Valor</th></tr></thead><tbody>${
    pagina.map((l) => {
      const tipoCor = l.tipo === "receita" ? "tipo-receita" : l.tipo === "despesa" ? "tipo-despesa" : "tipo-transferencia";
      return `<tr><td>${l.data_compra ? new Date(l.data_compra + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td><td>${escaparHtml(l.descricao || "")}</td><td>${escaparHtml(l.categoria || "")}</td><td class="${tipoCor}">${l.tipo || ""}</td><td class="col-valor">${formatadorBRL.format(valorMonetario(l))}</td></tr>`;
    }).join("")
  }</tbody></table>`;

  if (pagContainer) {
    if (totalPaginas <= 1) { pagContainer.innerHTML = ""; return; }
    let html = `<button ${relatorioPagina.atual <= 1 ? "disabled" : ""} onclick="relatorioPagina.atual--;renderizarTabelaTransacoes(relatorioDados.lancamentos)">‹</button>`;
    for (let i = 1; i <= totalPaginas; i++) {
      if (totalPaginas > 7 && i > 3 && i < totalPaginas - 1 && Math.abs(i - relatorioPagina.atual) > 1) { if (i === 4 || i === totalPaginas - 2) html += `<button disabled>…</button>`; continue; }
      html += `<button class="${i === relatorioPagina.atual ? "ativo" : ""}" onclick="relatorioPagina.atual=${i};renderizarTabelaTransacoes(relatorioDados.lancamentos)">${i}</button>`;
    }
    html += `<button ${relatorioPagina.atual >= totalPaginas ? "disabled" : ""} onclick="relatorioPagina.atual++;renderizarTabelaTransacoes(relatorioDados.lancamentos)">›</button>`;
    pagContainer.innerHTML = html;
  }
}

/* --- Helpers --- */
function obterMesesPeriodo(periodo) {
  const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const resultado = [];
  const ini = new Date(periodo.inicioDate);
  const fim = new Date(periodo.fimDate);
  const atual = new Date(ini);
  while (atual <= fim) {
    resultado.push({ key: `${atual.getFullYear()}-${String(atual.getMonth() + 1).padStart(2, "0")}`, label: `${meses[atual.getMonth()]}${periodo.tipo === "ano" ? "" : " " + (atual.getMonth() + 1)}` });
    atual.setMonth(atual.getMonth() + 1);
  }
  return resultado;
}
