// ==========================================
// dashboard-charts-ui.js - Gráficos do dashboard financeiro
// ==========================================
// --- TENDÊNCIA (últimos 6 meses, terminando no mês visualizado) ---
// ==========================================
// [24] TENDÊNCIA E GRÁFICOS
// ==========================================

const cacheTendencia = new Map();
const cacheResumoMensalDashboard = new Map();
let ultimaRequisicaoTendencia = 0;
const NOMES_MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function calcularEscalaGrafico(valorMaximo) {
  if (valorMaximo <= 0) return 1;
  const potencia = Math.pow(10, Math.floor(Math.log10(valorMaximo)));
  const normalizado = valorMaximo / potencia;
  const fator = normalizado <= 1 ? 1 : normalizado <= 2 ? 2 : normalizado <= 5 ? 5 : 10;
  return fator * potencia;
}

function percentualVisual(valor, maximo, minimo = 7) {
  if (valor <= 0) return 0;
  return Math.max(minimo, Math.round((valor / maximo) * 100));
}

function abreviarValorGrafico(valor) {
  if (valor >= 1000000) return `${formatadorBRL.format(valor / 1000000)} mi`;
  if (valor >= 1000) return `${formatadorBRL.format(valor / 1000)} mil`;
  return formatadorBRL.format(valor);
}

function criarResumoGrafico(titulo, principal, detalhe, classe = "") {
  const resumo = document.createElement("div");
  resumo.className = `grafico-resumo ${classe}`.trim();
  resumo.innerHTML = `
    <div class="grafico-resumo-topo">
      <span class="grafico-resumo-label">${titulo}</span>
      <strong class="grafico-resumo-valor">${principal}</strong>
    </div>
    <span class="grafico-resumo-detalhe">${detalhe}</span>
  `;
  return resumo;
}

async function carregarResumoMensalDashboard(carteiraId, ano, mes) {
  const chave = `${carteiraId}:${ano}-${String(mes + 1).padStart(2, "0")}`;
  if (cacheResumoMensalDashboard.has(chave)) return cacheResumoMensalDashboard.get(chave);

  try {
    const resposta = await CadimusEntriesApi.listarResposta({ carteira_id: carteiraId, mes: mes + 1, ano });
    if (!resposta.ok) return { receitas: 0, despesas: 0, saldo: 0 };

    const dadosMes = await resposta.json();
    let receitas = 0;
    let despesas = 0;

    dadosMes.forEach((lancamento) => {
      if (lancamento.status === "pendente") return;
      const valor = valorMonetario(lancamento);
      if (lancamento.tipo === "receita") receitas += valor;
      else despesas += valor;
    });

    const resumo = { receitas, despesas, saldo: receitas - despesas };
    cacheResumoMensalDashboard.set(chave, resumo);
    cacheTendencia.set(chave, resumo);
    cacheComparativo6?.set?.(chave, resumo);
    return resumo;
  } catch {
    return { receitas: 0, despesas: 0, saldo: 0 };
  }
}

function atualizarResumoMensalDashboardEmCache(carteiraId, ano, mes, resumo = {}) {
  if (!carteiraId || !Number.isFinite(Number(ano)) || !Number.isFinite(Number(mes))) return;

  const mesIndice = Number(mes) > 11 ? Number(mes) - 1 : Number(mes);
  const chave = `${carteiraId}:${ano}-${String(mesIndice + 1).padStart(2, "0")}`;
  const resumoCache = {
    receitas: Number(resumo.totalReceitas || resumo.receitas || 0),
    despesas: Number(resumo.totalDespesas || resumo.despesas || 0),
    saldo: Number(resumo.saldoCalculado ?? resumo.saldo ?? 0),
  };

  cacheResumoMensalDashboard.set(chave, resumoCache);
  cacheTendencia.set(chave, resumoCache);
  cacheComparativo6?.set?.(chave, resumoCache);
}

async function carregarTendencia() {
  const carteiraId = document.getElementById("seletor-carteira").value;
  const campoMes = document.getElementById("filtro-mes");
  if (!carteiraId || !campoMes || !campoMes.dataset.ano) return;

  const idRequisicao = ++ultimaRequisicaoTendencia;

  const anoBase = Number(campoMes.dataset.ano);
  const mesBase = Number(campoMes.dataset.mes); // 0-indexado

  const meses = [];
  for (let i = 5; i >= 0; i--) {
    let m = mesBase - i;
    let a = anoBase;
    while (m < 0) {
      m += 12;
      a -= 1;
    }
    meses.push({ ano: a, mes: m });
  }

  const dados = await Promise.all(
    meses.map(async ({ ano, mes }) => {
      const chave = `${carteiraId}:${ano}-${String(mes + 1).padStart(2, "0")}`;
      if (cacheTendencia.has(chave)) return cacheTendencia.get(chave);
      return carregarResumoMensalDashboard(carteiraId, ano, mes);
    }),
  );

  if (idRequisicao !== ultimaRequisicaoTendencia) return;

  renderizarTendencia(meses, dados, mesBase, anoBase);
}

function renderizarTendencia(meses, dados, mesAtualIdx, anoAtual) {
  const card = document.getElementById("card-tendencia");
  const container = document.getElementById("grafico-tendencia");
  if (!card || !container) return;

  const algumValor = dados.some((d) => Math.abs(d.saldo || 0) > 0 || d.despesas > 0);
  if (!algumValor) {
    card.style.display = "none";
    return;
  }

  card.style.display = "flex";
  container.innerHTML = "";

  const saldosGrafico = dados.map((d) => Math.max(d.saldo || 0, 0));
  const todosValores = dados.flatMap((d, i) => [saldosGrafico[i], d.despesas]);
  const maior = calcularEscalaGrafico(Math.max(...todosValores, 1));
  const atualIndex = meses.findIndex(({ mes, ano }) => mes === mesAtualIdx && ano === anoAtual);
  const dadoAtual = dados[atualIndex >= 0 ? atualIndex : dados.length - 1] || { saldo: 0, despesas: 0 };
  const saldoAtual = dadoAtual.saldo || 0;
  const despesasAtual = dadoAtual.despesas || 0;
  const classeSaldo = saldoAtual >= 0 ? "grafico-resumo-positivo" : "grafico-resumo-negativo";
  const detalheResumo = `Despesas no período: ${formatadorBRL.format(despesasAtual)}`;

  container.appendChild(criarResumoGrafico("Mês selecionado", formatadorBRL.format(saldoAtual), detalheResumo, classeSaldo));

  const svgNS = "http://www.w3.org/2000/svg";
  const W = 320, H = 132, PAD_X = 42, PAD_Y = 16;
  const plotW = W - PAD_X * 2;
  const plotH = H - PAD_Y * 2;

  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("class", "tendencia-svg");

  const gridGroup = document.createElementNS(svgNS, "g");
  [1, 0.5, 0].forEach((marcador) => {
    const y = PAD_Y + plotH - (plotH * marcador);
    const valorGrade = maior * marcador;
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", PAD_X);
    line.setAttribute("y1", y);
    line.setAttribute("x2", W - PAD_X);
    line.setAttribute("y2", y);
    line.setAttribute("class", "tendencia-grid-line");
    gridGroup.appendChild(line);

    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", PAD_X - 8);
    label.setAttribute("y", y + 3);
    label.setAttribute("class", "tendencia-grid-label");
    label.setAttribute("text-anchor", "end");
    label.textContent = valorGrade === 0 ? "0" : abreviarValorGrafico(valorGrade);
    gridGroup.appendChild(label);
  });
  svg.appendChild(gridGroup);

  function buildPath(values) {
    return values.map((v, i) => {
      const x = PAD_X + (plotW / (values.length - 1)) * i;
      const y = PAD_Y + plotH - (v / maior) * plotH;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    }).join(" ");
  }

  function addLine(values, cssClass, label) {
    if (values.every((v) => v === 0)) return;
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", buildPath(values));
    path.setAttribute("class", `tendencia-line ${cssClass}`);
    svg.appendChild(path);

    values.forEach((v, i) => {
      if (v === 0) return;
      const cx = PAD_X + (plotW / (values.length - 1)) * i;
      const cy = PAD_Y + plotH - (v / maior) * plotH;
      const circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("cx", cx);
      circle.setAttribute("cy", cy);
      circle.setAttribute("r", 3);
      circle.setAttribute("class", `tendencia-dot ${cssClass}`);
      svg.appendChild(circle);

      const title = document.createElementNS(svgNS, "title");
      title.textContent = `${label} em ${NOMES_MESES_ABREV[meses[i].mes]}: ${formatadorBRL.format(v)}`;
      circle.appendChild(title);

      const ehUltimo = i === atualIndex || (atualIndex < 0 && i === values.length - 1);
      const ehPico = v === Math.max(...values);
      if (ehUltimo && ehPico) {
        const texto = document.createElementNS(svgNS, "text");
        texto.setAttribute("x", cx);
        texto.setAttribute("y", Math.max(10, cy - 8));
        texto.setAttribute("class", `tendencia-value-label ${cssClass}`);
        texto.setAttribute("text-anchor", i >= values.length - 2 ? "end" : "middle");
        texto.textContent = abreviarValorGrafico(v);
        svg.appendChild(texto);
      }
    });
  }

  addLine(saldosGrafico, "tendencia-receita", "Saldo");
  addLine(dados.map((d) => d.despesas), "tendencia-despesa", "Despesas");

  container.appendChild(svg);

  const rotulos = document.createElement("div");
  rotulos.className = "tendencia-rotulos";
  meses.forEach(({ mes }, i) => {
    const span = document.createElement("span");
    span.className = "tendencia-rotulo";
    span.textContent = NOMES_MESES_ABREV[mes];
    rotulos.appendChild(span);
  });
  container.appendChild(rotulos);
}


// --- COMPARATIVO 6 MESES (RECEITAS vs DESPESAS) ---
let ultimaRequisicaoComparativo6 = 0;
const cacheComparativo6 = new Map();

async function carregarComparativo6Meses() {
  const carteiraId = document.getElementById("seletor-carteira").value;
  const campoMes = document.getElementById("filtro-mes");
  if (!carteiraId || !campoMes || !campoMes.dataset.ano) return;

  const idRequisicao = ++ultimaRequisicaoComparativo6;

  const anoBase = Number(campoMes.dataset.ano);
  const mesBase = Number(campoMes.dataset.mes);

  const meses = [];
  for (let i = 5; i >= 0; i--) {
    let m = mesBase - i;
    let a = anoBase;
    while (m < 0) { m += 12; a -= 1; }
    meses.push({ ano: a, mes: m });
  }

  const dados = await Promise.all(
    meses.map(async ({ ano, mes }) => {
      const chave = `${carteiraId}:${ano}-${String(mes + 1).padStart(2, "0")}`;
      if (cacheComparativo6.has(chave)) return cacheComparativo6.get(chave);
      return carregarResumoMensalDashboard(carteiraId, ano, mes);
    }),
  );

  if (idRequisicao !== ultimaRequisicaoComparativo6) return;
  renderizarComparativo6Meses(meses, dados, mesBase, anoBase);
}

function renderizarComparativo6Meses(meses, dados, mesAtualIdx, anoAtual) {
  const card = document.getElementById("card-comparativo");
  const container = document.getElementById("grafico-comparativo");
  if (!card || !container) return;

  const algumValor = dados.some((d) => Math.abs(d.saldo || 0) > 0 || d.despesas > 0);
  if (!algumValor) {
    card.style.display = "none";
    return;
  }

  card.style.display = "flex";
  container.innerHTML = "";

  const maiorValor = calcularEscalaGrafico(Math.max(...dados.map((d) => Math.max(Math.max(d.saldo || 0, 0), d.despesas)), 1));
  const atualIndex = meses.findIndex(({ mes, ano }) => mes === mesAtualIdx && ano === anoAtual);
  const dadoAtual = dados[atualIndex >= 0 ? atualIndex : dados.length - 1] || { saldo: 0, despesas: 0 };
  const saldoAtual = dadoAtual.saldo || 0;
  const despesasAtual = dadoAtual.despesas || 0;
  const diferenca = saldoAtual - despesasAtual;
  const detalheResumo = saldoAtual >= despesasAtual
    ? `Saldo acima das despesas em ${formatadorBRL.format(Math.max(diferenca, 0))}`
    : `Despesas acima do saldo em ${formatadorBRL.format(Math.abs(diferenca))}`;

  const resumoComparativo = document.createElement("div");
  resumoComparativo.className = `comparativo-resumo ${saldoAtual >= despesasAtual ? "comparativo-resumo-positivo" : "comparativo-resumo-negativo"}`;
  resumoComparativo.innerHTML = `
    <div class="comparativo-resumo-grid">
      <div class="comparativo-resumo-item">
        <span class="comparativo-resumo-label">Saldo</span>
        <strong class="comparativo-resumo-valor">${formatadorBRL.format(saldoAtual)}</strong>
      </div>
      <div class="comparativo-resumo-item">
        <span class="comparativo-resumo-label">Despesas</span>
        <strong class="comparativo-resumo-valor">${formatadorBRL.format(despesasAtual)}</strong>
      </div>
    </div>
    <span class="comparativo-resumo-detalhe">${detalheResumo}</span>
  `;
  container.appendChild(resumoComparativo);

  const barrasContainer = document.createElement("div");
  barrasContainer.className = "comparativo-barras-container";

  meses.forEach(({ ano, mes }, i) => {
    const saldoVisual = Math.max(dados[i].saldo || 0, 0);
    const alturaRec = percentualVisual(saldoVisual, maiorValor);
    const alturaDesp = percentualVisual(dados[i].despesas, maiorValor);
    const ehMesAtual = mes === mesAtualIdx && ano === anoAtual;
    const saldoFormatado = formatadorBRL.format(dados[i].saldo || 0);
    const despesasFormatadas = formatadorBRL.format(dados[i].despesas);

    const coluna = document.createElement("div");
    coluna.className = "comparativo-coluna";
    coluna.innerHTML = `
      <div class="comparativo-barras">
        <div class="comparativo-barra comparativo-barra-receita ${ehMesAtual ? "comparativo-barra-atual" : ""}" data-altura="${alturaRec}" title="Saldo em ${NOMES_MESES_ABREV[mes]}: ${saldoFormatado}" aria-label="Saldo em ${NOMES_MESES_ABREV[mes]}: ${saldoFormatado}"></div>
        <div class="comparativo-barra comparativo-barra-despesa ${ehMesAtual ? "comparativo-barra-atual" : ""}" data-altura="${alturaDesp}" title="Despesas em ${NOMES_MESES_ABREV[mes]}: ${despesasFormatadas}" aria-label="Despesas em ${NOMES_MESES_ABREV[mes]}: ${despesasFormatadas}"></div>
      </div>
      <span class="comparativo-rotulo">${NOMES_MESES_ABREV[mes]}</span>
    `;
    barrasContainer.appendChild(coluna);
  });

  container.appendChild(barrasContainer);

  // Legenda
  const legenda = document.createElement("div");
  legenda.className = "comparativo-legenda";
  legenda.innerHTML = `
    <span class="comparativo-legenda-item"><span class="comparativo-legenda-dot" style="background: var(--cor-receita)"></span>Saldo</span>
    <span class="comparativo-legenda-item"><span class="comparativo-legenda-dot" style="background: var(--cor-despesa)"></span>Despesas</span>
  `;
  container.appendChild(legenda);

  requestAnimationFrame(() => {
    container.querySelectorAll(".comparativo-barra").forEach((barra) => {
      barra.style.height = `${barra.dataset.altura}%`;
    });
  });
}
