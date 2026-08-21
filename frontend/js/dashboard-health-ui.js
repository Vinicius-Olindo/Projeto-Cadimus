// ==========================================
// dashboard-health-ui.js - Saúde financeira do dashboard
// ==========================================
// ==========================================
// [25] TAXA DE POUPANÇA
// ==========================================

// --- TAXA DE POUPANÇA ---
function calcularTaxaPoupanca(totalReceitas, totalDespesas) {
  const card = document.getElementById("card-poupanca");
  const valorEl = document.getElementById("taxa-poupanca");
  const descEl = document.getElementById("poupanca-desc");
  if (!card || !valorEl || !descEl) return;

  if (totalReceitas <= 0) {
    card.style.display = "none";
    return;
  }

  const economia = totalReceitas - totalDespesas;
  const taxa = Math.round((economia / totalReceitas) * 100);

  card.style.display = "flex";
  valorEl.textContent = `${taxa}%`;
  valorEl.style.color = taxa >= 0 ? "var(--cor-receita)" : "var(--cor-despesa)";

  if (taxa >= 20) {
    descEl.textContent = "Excelente! Você está economizando bem.";
  } else if (taxa >= 10) {
    descEl.textContent = "Bom. Tente aumentar para 20%.";
  } else if (taxa > 0) {
    descEl.textContent = "Espere um pouco mais da entrada.";
  } else {
    descEl.textContent = "Gastos maiores que receitas este mês.";
  }
}

// --- CAPACIDADE DE GUARDA ---
function calcularCapacidadeGuarda() {
  const card = document.getElementById("card-guarda");
  const valorEl = document.getElementById("valor-guarda");
  const descEl = document.getElementById("guarda-desc");
  if (!card || !valorEl || !descEl) return;

  const usuario = obterUsuarioLogado();
  const salario = usuario.salario || 0;

  if (salario <= 0) {
    card.style.display = "none";
    return;
  }

  let totalFixas = 0;
  let totalParcelas = 0;

  if (typeof despesasFixasCarregadas !== "undefined") {
    despesasFixasCarregadas.forEach((f) => {
      if (f.ativo) totalFixas += valorMonetario(f);
    });
  }

  if (typeof comprasParceladasCarregadas !== "undefined") {
    comprasParceladasCarregadas.forEach((c) => {
      if (c.ativo) totalParcelas += valorMonetario(c, "valor_parcela");
    });
  }

  const guards = salario - totalFixas - totalParcelas;
  const guardaMensal = Math.max(0, guards);

  card.style.display = "flex";
  valorEl.textContent = formatadorBRL.format(guardaMensal);
  valorEl.style.color = guards >= 0 ? "var(--cor-receita)" : "var(--cor-despesa)";

  if (guards <= 0) {
    descEl.textContent = "Suas fixas e parcelas consomem todo o salário.";
  } else {
    const guardaSemanal = Math.round(guardaMensal / 4);
    descEl.textContent = `Dá pra guardar ~${formatadorBRL.format(guardaSemanal)}/semana.`;
  }
}

// --- SCORE DE SAÚDE FINANCEIRA (0-100) ---
function calcularScoreSaude(totalReceitas, totalDespesas, totaisPorCategoria) {
  const card = document.getElementById("card-score");
  const ringFill = document.getElementById("score-ring-fill");
  const valorEl = document.getElementById("score-valor");
  const statusEl = document.getElementById("score-status");
  const detalhesEl = document.getElementById("score-detalhes");
  if (!card || !ringFill || !valorEl || !detalhesEl) return;

  const totalPago = totalReceitas + totalDespesas;
  if (totalPago === 0) {
    card.style.display = "none";
    return;
  }

  let score = 0;
  const criterios = [];

  // 1. Taxa de poupança (40 pts) — receitas vs despesas
  const taxaPoupanca = totalReceitas > 0 ? ((totalReceitas - totalDespesas) / totalReceitas) * 100 : 0;
  const ptsPoupanca = Math.min(40, Math.max(0, Math.round(taxaPoupanca * 0.8)));
  score += ptsPoupanca;
  criterios.push({
    nome: "Taxa de poupança",
    valor: `${Math.round(taxaPoupanca)}%`,
    pontos: ptsPoupanca,
    max: 40,
  });

  // 2. Controle de gastos (25 pts) — despesas < receitas
  const razaoGastos = totalReceitas > 0 ? (totalDespesas / totalReceitas) * 100 : 100;
  const ptsControle = razaoGastos <= 80 ? 25 : razaoGastos <= 100 ? Math.round(25 * (1 - (razaoGastos - 80) / 40)) : 0;
  score += ptsControle;
  criterios.push({
    nome: "Controle de gastos",
    valor: `${Math.round(razaoGastos)}%`,
    pontos: ptsControle,
    max: 25,
  });

  // 3. Diversificação (15 pts) — menos concentração = melhor
  const numCategorias = Object.keys(totaisPorCategoria).length;
  const maiorCategoria = Object.values(totaisPorCategoria).sort((a, b) => b - a)[0] || 0;
  const concentracao = totalDespesas > 0 ? (maiorCategoria / totalDespesas) * 100 : 0;
  const ptsDiversificacao = numCategorias >= 5 && concentracao < 40 ? 15 : numCategorias >= 3 ? 10 : numCategorias >= 1 ? 5 : 0;
  score += ptsDiversificacao;
  criterios.push({
    nome: "Diversificação",
    valor: `${numCategorias} cats`,
    pontos: ptsDiversificacao,
    max: 15,
  });

  // 4. Regularidade (10 pts) — fixas ativas < 50% do salário
  let totalFixas = 0;
  if (typeof despesasFixasCarregadas !== "undefined") {
    despesasFixasCarregadas.forEach((f) => { if (f.ativo) totalFixas += valorMonetario(f); });
  }
  const usuario = obterUsuarioLogado();
  const salario = usuario.salario || 0;
  const pctFixas = salario > 0 ? (totalFixas / salario) * 100 : 100;
  const ptsRegularidade = pctFixas <= 30 ? 10 : pctFixas <= 50 ? 6 : 0;
  score += ptsRegularidade;
  criterios.push({
    nome: "Fixas do salário",
    valor: `${Math.round(pctFixas)}%`,
    pontos: ptsRegularidade,
    max: 10,
  });

  // 5. Pagamentos em dia (10 pts) — sem atrasados
  const temAtrasado = typeof ultimoLoteLancamentos !== "undefined" && ultimoLoteLancamentos.some((l) => l.status === "atrasado");
  const ptsAtrasados = temAtrasado ? 0 : 10;
  score += ptsAtrasados;
  criterios.push({
    nome: "Pagamentos em dia",
    valor: temAtrasado ? "Atrasados" : "Em dia",
    pontos: ptsAtrasados,
    max: 10,
  });

  // Renderizar
  card.style.display = "flex";
  valorEl.textContent = score;

  const circ = 2 * Math.PI * 52; // 326.73
  const offset = circ - (score / 100) * circ;
  ringFill.style.strokeDashoffset = offset;

  let cor;
  let statusTexto;
  if (score >= 85) {
    cor = "var(--cor-receita)";
    statusTexto = "Excelente";
  } else if (score >= 70) {
    cor = "var(--cor-receita)";
    statusTexto = "Saudável";
  } else if (score >= 40) {
    cor = "var(--cor-pendente)";
    statusTexto = "Atenção";
  } else {
    cor = "var(--cor-despesa)";
    statusTexto = "Crítico";
  }
  ringFill.style.stroke = cor;
  valorEl.style.color = cor;
  if (statusEl) {
    statusEl.textContent = statusTexto;
    statusEl.style.color = cor;
  }

  detalhesEl.innerHTML = "";
  criterios.forEach((c) => {
    const pct = c.pontos / c.max;
    let cls = pct >= 0.7 ? "score-criterio-ok" : pct >= 0.4 ? "score-criterio-medio" : "score-criterio-ruim";
    const icone = pct >= 0.7 ? "✓" : pct >= 0.4 ? "!" : "✗";
    const div = document.createElement("div");
    div.className = `score-criterio ${cls}`;
    div.innerHTML = `
      <span class="score-criterio-icone ${cls}">${icone}</span>
      <span class="score-criterio-corpo">
        <span class="score-criterio-linha">
          <span class="score-criterio-texto">${c.nome}</span>
          <span class="score-criterio-valor">${c.valor}</span>
        </span>
        <span class="score-criterio-trilho">
          <span class="score-criterio-preenchimento" style="width:${Math.round(pct * 100)}%"></span>
        </span>
      </span>
    `;
    detalhesEl.appendChild(div);
  });
}
