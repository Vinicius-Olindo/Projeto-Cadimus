// ==========================================
// dashboard-charts-ui.js - Gráficos do dashboard financeiro
// ==========================================
// --- TENDÊNCIA (últimos 6 meses, terminando no mês visualizado) ---
// ==========================================
// [24] TENDÊNCIA E GRÁFICOS
// ==========================================

const cacheTendencia = new Map();
let ultimaRequisicaoTendencia = 0;
const NOMES_MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

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

      try {
        const resposta = await CadimusEntriesApi.listarResposta({ carteira_id: carteiraId, mes: mes + 1, ano });
        if (!resposta.ok) return { receitas: 0, despesas: 0 };
        const dadosMes = await resposta.json();
        const receitas = dadosMes.filter((l) => l.tipo === "receita" && l.status === "pago").reduce((soma, l) => soma + valorMonetario(l), 0);
        const despesas = dadosMes.filter((l) => l.tipo === "despesa" && l.status === "pago").reduce((soma, l) => soma + valorMonetario(l), 0);
        const total = { receitas, despesas };
        cacheTendencia.set(chave, total);
        return total;
      } catch {
        return { receitas: 0, despesas: 0 };
      }
    }),
  );

  if (idRequisicao !== ultimaRequisicaoTendencia) return;

  renderizarTendencia(meses, dados, mesBase, anoBase);
}

function renderizarTendencia(meses, dados, mesAtualIdx, anoAtual) {
  const card = document.getElementById("card-tendencia");
  const container = document.getElementById("grafico-tendencia");
  if (!card || !container) return;

  const algumValor = dados.some((d) => d.receitas > 0 || d.despesas > 0);
  if (!algumValor) {
    card.style.display = "none";
    return;
  }

  card.style.display = "flex";
  container.innerHTML = "";

  const todosValores = dados.flatMap((d) => [d.receitas, d.despesas]);
  const maior = Math.max(...todosValores, 1);

  const svgNS = "http://www.w3.org/2000/svg";
  const W = 280, H = 120, PAD_X = 30, PAD_Y = 10;
  const plotW = W - PAD_X * 2;
  const plotH = H - PAD_Y * 2;

  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("class", "tendencia-svg");

  const gridGroup = document.createElementNS(svgNS, "g");
  for (let i = 0; i <= 4; i++) {
    const y = PAD_Y + (plotH / 4) * i;
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", PAD_X);
    line.setAttribute("y1", y);
    line.setAttribute("x2", W - PAD_X);
    line.setAttribute("y2", y);
    line.setAttribute("class", "tendencia-grid-line");
    gridGroup.appendChild(line);
  }
  svg.appendChild(gridGroup);

  function buildPath(values) {
    return values.map((v, i) => {
      const x = PAD_X + (plotW / (values.length - 1)) * i;
      const y = PAD_Y + plotH - (v / maior) * plotH;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    }).join(" ");
  }

  function addLine(values, cssClass) {
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
      title.textContent = formatadorBRL.format(v);
      circle.appendChild(title);
    });
  }

  addLine(dados.map((d) => d.receitas), "tendencia-receita");
  addLine(dados.map((d) => d.despesas), "tendencia-despesa");

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

      try {
        const resposta = await CadimusEntriesApi.listarResposta({ carteira_id: carteiraId, mes: mes + 1, ano });
        if (!resposta.ok) return { receitas: 0, despesas: 0 };
        const dadosMes = await resposta.json();
        let receitas = 0, despesas = 0;
        dadosMes.forEach((l) => {
          if (l.status === "pendente") return;
          const valor = valorMonetario(l);
          if (l.tipo === "receita") receitas += valor;
          else despesas += valor;
        });
        const resultado = { receitas, despesas };
        cacheComparativo6.set(chave, resultado);
        return resultado;
      } catch {
        return { receitas: 0, despesas: 0 };
      }
    }),
  );

  if (idRequisicao !== ultimaRequisicaoComparativo6) return;
  renderizarComparativo6Meses(meses, dados, mesBase, anoBase);
}

function renderizarComparativo6Meses(meses, dados, mesAtualIdx, anoAtual) {
  const card = document.getElementById("card-comparativo");
  const container = document.getElementById("grafico-comparativo");
  if (!card || !container) return;

  const algumValor = dados.some((d) => d.receitas > 0 || d.despesas > 0);
  if (!algumValor) {
    card.style.display = "none";
    return;
  }

  card.style.display = "flex";
  container.innerHTML = "";

  const maiorValor = Math.max(...dados.map((d) => Math.max(d.receitas, d.despesas)), 1);

  const barrasContainer = document.createElement("div");
  barrasContainer.className = "comparativo-barras-container";

  meses.forEach(({ ano, mes }, i) => {
    const alturaRec = Math.round((dados[i].receitas / maiorValor) * 100);
    const alturaDesp = Math.round((dados[i].despesas / maiorValor) * 100);
    const ehMesAtual = mes === mesAtualIdx && ano === anoAtual;

    const coluna = document.createElement("div");
    coluna.className = "comparativo-coluna";
    coluna.innerHTML = `
      <div class="comparativo-barras">
        <div class="comparativo-barra comparativo-barra-receita ${ehMesAtual ? "comparativo-barra-atual" : ""}" data-altura="${alturaRec}" title="Saldo: ${formatadorBRL.format(dados[i].receitas)}"></div>
        <div class="comparativo-barra comparativo-barra-despesa ${ehMesAtual ? "comparativo-barra-atual" : ""}" data-altura="${alturaDesp}" title="Despesas: ${formatadorBRL.format(dados[i].despesas)}"></div>
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
