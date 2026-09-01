// ==========================================
// dashboard-health-ui.js - Saúde financeira do dashboard
// ==========================================
// ==========================================
// [25] TAXA DE POUPANÇA
// ==========================================

let ultimoResumoRiscoFinanceiro = {
  lancamentos: [],
  totais: { saldoCalculado: 0, totalReceitas: 0, totalDespesas: 0, totalPendente: 0 },
};

function obterDiasDoMesSelecionadoRisco() {
  const inputMes = document.getElementById("filtro-mes")?.value || "";
  const [ano, mes] = inputMes.split("-").map(Number);
  if (!ano || !mes) return { diaAtual: 1, totalDias: 30, mesAtual: false };

  const hoje = new Date();
  const mesAtual = hoje.getFullYear() === ano && hoje.getMonth() + 1 === mes;
  const totalDias = new Date(ano, mes, 0).getDate();
  return {
    diaAtual: mesAtual ? Math.max(1, hoje.getDate()) : totalDias,
    totalDias,
    mesAtual,
  };
}

function criarAlertaRiscoFinanceiro(tipo, titulo, detalhe, acao = "") {
  return { tipo, titulo, detalhe, acao };
}

function renderizarAlertasRiscoFinanceiro(lancamentos, totais) {
  const card = document.getElementById("card-riscos-financeiros");
  const lista = document.getElementById("lista-riscos-financeiros");
  if (!card || !lista) return;

  if (Array.isArray(lancamentos)) ultimoResumoRiscoFinanceiro.lancamentos = lancamentos;
  if (totais && typeof totais === "object") ultimoResumoRiscoFinanceiro.totais = { ...ultimoResumoRiscoFinanceiro.totais, ...totais };

  const dados = ultimoResumoRiscoFinanceiro.lancamentos || [];
  const resumo = ultimoResumoRiscoFinanceiro.totais || {};
  const alertas = [];
  const { diaAtual, totalDias, mesAtual } = obterDiasDoMesSelecionadoRisco();
  const hojeISO = typeof dataISOHojeDashboard === "function" ? dataISOHojeDashboard() : "";

  const atrasados = mesAtual
    ? dados.filter((l) => l.tipo === "despesa" && l.status !== "pago" && l.data_compra && l.data_compra < hojeISO)
    : [];
  if (atrasados.length > 0) {
    const totalAtrasado = atrasados.reduce((soma, item) => soma + valorMonetario(item), 0);
    alertas.push(criarAlertaRiscoFinanceiro(
      "erro",
      `${atrasados.length} conta(s) atrasada(s)`,
      `Total em atraso: ${formatadorBRL.format(totalAtrasado)}.`,
      "ver-pendencias"
    ));
  }

  const totalReceitas = Number(resumo.totalReceitas || 0);
  const totalDespesas = Number(resumo.totalDespesas || 0);
  if (mesAtual && totalReceitas > 0 && diaAtual > 0) {
    const despesasProjetadas = (totalDespesas / diaAtual) * totalDias;
    const saldoProjetado = totalReceitas - despesasProjetadas;
    if (saldoProjetado < 0) {
      alertas.push(criarAlertaRiscoFinanceiro(
        "erro",
        "Ritmo atual fecha negativo",
        `Nesse ritmo, o mês pode fechar em ${formatadorBRL.format(saldoProjetado)}.`,
        "ver-planejamento"
      ));
    } else if (despesasProjetadas / totalReceitas >= 0.8) {
      alertas.push(criarAlertaRiscoFinanceiro(
        "aviso",
        "Gastos acima de 80% da renda",
        `Projeção de despesas: ${formatadorBRL.format(despesasProjetadas)}.`,
        "ver-planejamento"
      ));
    }
  } else if (Number(resumo.saldoCalculado || 0) < 0) {
    alertas.push(criarAlertaRiscoFinanceiro(
      "erro",
      "Mês negativo",
      `Saldo atual: ${formatadorBRL.format(Number(resumo.saldoCalculado || 0))}.`,
      "ver-planejamento"
    ));
  }

  if (typeof orcamentosCarregados !== "undefined" && Array.isArray(orcamentosCarregados)) {
    orcamentosCarregados.forEach((orcamento) => {
      const item = typeof obterResumoOrcamentoMensal === "function" ? obterResumoOrcamentoMensal(orcamento) : null;
      if (!item || item.limite <= 0 || item.progressoReal < 80) return;
      const estourou = item.progressoReal >= 100 || item.status === "estourado";
      alertas.push(criarAlertaRiscoFinanceiro(
        estourou ? "erro" : "aviso",
        `${item.categoria} ${estourou ? "estourou" : "passou de 80%"}`,
        `${formatadorBRL.format(item.gasto)} de ${formatadorBRL.format(item.limite)} usados.`,
        "ver-planejamento"
      ));
    });
  }

  if (typeof cartoesCreditoCarregados !== "undefined" && Array.isArray(cartoesCreditoCarregados)) {
    cartoesCreditoCarregados.forEach((cartao) => {
      const limite = valorMonetario(cartao, "limite");
      const usado = valorMonetario(cartao, "gasto_atual");
      const pct = limite > 0 ? (usado / limite) * 100 : 0;
      if (pct < 80) return;
      alertas.push(criarAlertaRiscoFinanceiro(
        pct >= 100 ? "erro" : "aviso",
        `${cartao.nome || "Cartão"} perto do limite`,
        `${pct.toFixed(0)}% usado: ${formatadorBRL.format(usado)} de ${formatadorBRL.format(limite)}.`,
        "ver-cartoes"
      ));
    });
  }

  const prioridade = { erro: 0, aviso: 1, ok: 2 };
  const alertasVisiveis = alertas
    .sort((a, b) => (prioridade[a.tipo] ?? 3) - (prioridade[b.tipo] ?? 3))
    .slice(0, 4);

  card.style.display = "flex";
  if (alertasVisiveis.length === 0) {
    lista.innerHTML = `
      <div class="risco-financeiro-item risco-financeiro-ok">
        <span class="risco-financeiro-icone">✓</span>
        <span>
          <strong>Sem risco importante agora</strong>
          <small>Orçamentos, saldo, cartões e pendências estão sob controle neste período.</small>
        </span>
      </div>
    `;
    return;
  }

  lista.innerHTML = alertasVisiveis.map((alerta) => `
    <button type="button" class="risco-financeiro-item risco-financeiro-${alerta.tipo}" data-risco-acao="${alerta.acao}">
      <span class="risco-financeiro-icone">${alerta.tipo === "erro" ? "!" : "•"}</span>
      <span>
        <strong>${escaparHtml(alerta.titulo)}</strong>
        <small>${escaparHtml(alerta.detalhe)}</small>
      </span>
    </button>
  `).join("");

  lista.querySelectorAll("[data-risco-acao]").forEach((botao) => {
    botao.onclick = () => {
      const acao = botao.dataset.riscoAcao;
      if (acao === "ver-pendencias" && typeof filtrarLancamentosPendentes === "function") filtrarLancamentosPendentes();
      if (acao === "ver-planejamento") window.location.href = "planejamento.html";
      if (acao === "ver-cartoes") document.getElementById("btn-cartoes-credito")?.click();
    };
  });
}

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
function calcularCapacidadeGuarda(resumoPeriodo = {}) {
  const card = document.getElementById("card-guarda");
  const valorEl = document.getElementById("valor-guarda");
  const descEl = document.getElementById("guarda-desc");
  if (!card || !valorEl || !descEl) return;

  const {
    saldoCalculado = 0,
    totalPendente = 0,
    totalReceitas = 0,
    totalDespesas = 0,
    totalTransferenciasEntrada = 0,
    totalTransferenciasSaida = 0,
  } = resumoPeriodo;

  const temMovimentoNoPeriodo = [
    totalReceitas,
    totalDespesas,
    totalPendente,
    totalTransferenciasEntrada,
    totalTransferenciasSaida,
  ].some((valor) => Math.abs(Number(valor) || 0) > 0);

  if (!temMovimentoNoPeriodo) {
    card.style.display = "none";
    return;
  }

  const capacidade = saldoCalculado - totalPendente;
  const guardaMensal = Math.max(0, capacidade);

  card.style.display = "flex";
  valorEl.textContent = formatadorBRL.format(guardaMensal);
  valorEl.style.color = capacidade >= 0 ? "var(--cor-receita)" : "var(--cor-despesa)";

  if (capacidade < 0) {
    descEl.textContent = `Faltam ${formatadorBRL.format(Math.abs(capacidade))} para equilibrar o período.`;
  } else if (capacidade === 0) {
    descEl.textContent = "Sem sobra prevista neste período.";
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

  const diagnostico = score >= 85
    ? "Sua saúde financeira está forte neste período."
    : score >= 70
      ? "Você está no caminho certo, com poucos pontos de atenção."
      : score >= 40
        ? "Há sinais de atenção para acompanhar de perto."
        : "O período pede revisão de gastos e pendências.";

  const criteriosVisiveis = criterios.filter((c) => ["Taxa de poupança", "Controle de gastos", "Pagamentos em dia"].includes(c.nome));
  const recomendacoes = [];

  if (temAtrasado) {
    recomendacoes.push("Quite ou reprograme os atrasados antes de assumir novos gastos.");
  }
  if (razaoGastos > 100) {
    recomendacoes.push("Corte ou adie despesas variáveis: o mês está gastando mais do que entra.");
  } else if (razaoGastos > 80) {
    recomendacoes.push("Segure gastos novos: mais de 80% da receita já foi comprometida.");
  }
  if (taxaPoupanca < 10 && totalReceitas > 0) {
    recomendacoes.push("Busque uma sobra mínima de 10% da receita para criar respiro.");
  }
  if (pctFixas > 50) {
    recomendacoes.push("Revise despesas fixas: elas já passam de metade da renda cadastrada.");
  }
  if (concentracao >= 40 && maiorCategoria > 0) {
    recomendacoes.push("Olhe a maior categoria do mês: ela concentra boa parte dos gastos.");
  }
  if (recomendacoes.length === 0) {
    recomendacoes.push("Mantenha o ritmo e revise o orçamento antes de grandes compras.");
  }

  detalhesEl.innerHTML = `
    <p class="score-diagnostico">${diagnostico}</p>
    <div class="score-pilulas"></div>
    <div class="score-acoes">
      <strong>Próximas ações</strong>
      <ul>
        ${recomendacoes.slice(0, 3).map((acao) => `<li>${escaparHtml(acao)}</li>`).join("")}
      </ul>
    </div>
  `;
  const pilulasEl = detalhesEl.querySelector(".score-pilulas");

  criteriosVisiveis.forEach((c) => {
    const pct = c.pontos / c.max;
    let cls = pct >= 0.7 ? "score-criterio-ok" : pct >= 0.4 ? "score-criterio-medio" : "score-criterio-ruim";
    const icone = pct >= 0.7 ? "✓" : pct >= 0.4 ? "!" : "✗";
    const div = document.createElement("div");
    div.className = `score-criterio ${cls}`;
    div.innerHTML = `
      <span class="score-criterio-icone ${cls}">${icone}</span>
      <span class="score-criterio-texto">${c.nome}</span>
      <span class="score-criterio-valor">${c.valor}</span>
    `;
    pilulasEl.appendChild(div);
  });
}
