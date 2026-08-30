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

function obterPeriodoSelecionadoCalendario() {
  const inputMes = document.getElementById("filtro-mes")?.value || "";
  const [ano, mes] = inputMes.split("-").map(Number);
  if (!ano || !mes) return null;
  return { ano, mes, totalDias: new Date(ano, mes, 0).getDate() };
}

function segundaComoPrimeiroDiaSemana(data) {
  const dia = data.getDay();
  return dia === 0 ? 6 : dia - 1;
}

function fecharModalCalendarioDia() {
  const modal = document.getElementById("modal-calendario-dia");
  if (modal) modal.style.display = "none";
}

function resumoLancamentosDiaCalendario(lancamentos = []) {
  const receitas = somarValoresMonetarios(lancamentos.filter((l) => l.tipo === "receita"));
  const despesas = somarValoresMonetarios(lancamentos.filter((l) => l.tipo !== "receita"));
  const pendentes = lancamentos.filter((l) => l.status !== "pago").length;
  return { receitas, despesas, pendentes, saldo: receitas - despesas };
}

function renderizarItemCalendarioDia(lancamento) {
  const tipo = lancamento.tipo === "receita" ? "receita" : "despesa";
  const status = lancamento.status === "pago" ? "pago" : "pendente";
  const textoStatus = status === "pago" ? "Pago" : "Pendente";
  const proximoStatus = status === "pago" ? "pendente" : "pago";
  const valor = formatadorBRL.format(valorMonetario(lancamento));

  return `
    <div class="calendario-dia-item calendario-dia-item-${tipo}">
      <div class="calendario-dia-item-info">
        <strong>${escaparHtml(lancamento.descricao || lancamento.categoria || "Lançamento")}</strong>
        <span>${escaparHtml(lancamento.categoria || "Sem categoria")} · ${escaparHtml(lancamento.carteira_nome || "Carteira")}</span>
      </div>
      <div class="calendario-dia-item-acoes">
        <span class="calendario-dia-item-valor tipo-${tipo}">${tipo === "receita" ? "+" : "-"} ${valor}</span>
        <button type="button" class="item-status status-${status}" data-calendario-status-id="${lancamento.id}" data-status-atual="${status}" title="Marcar como ${proximoStatus}">
          ${textoStatus}
        </button>
      </div>
    </div>
  `;
}

function abrirModalCalendarioDia(dataISO, lancamentosDoDia = []) {
  const modal = document.getElementById("modal-calendario-dia");
  const titulo = document.getElementById("calendario-dia-titulo");
  const resumo = document.getElementById("calendario-dia-resumo");
  const lista = document.getElementById("calendario-dia-lista");
  if (!modal || !titulo || !resumo || !lista) return;

  const dataFormatada = new Date(`${dataISO}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const totais = resumoLancamentosDiaCalendario(lancamentosDoDia);
  titulo.textContent = `Agenda de ${dataFormatada}`;
  resumo.textContent = lancamentosDoDia.length
    ? `${lancamentosDoDia.length} lançamento(s) · saldo ${formatadorBRL.format(totais.saldo)} · ${totais.pendentes} pendente(s)`
    : "Nenhum lançamento nesse dia.";

  lista.innerHTML = lancamentosDoDia.length
    ? lancamentosDoDia.map(renderizarItemCalendarioDia).join("")
    : '<div class="calendario-dia-vazio-modal">Sem lançamentos cadastrados para esta data.</div>';

  lista.querySelectorAll("[data-calendario-status-id]").forEach((botao) => {
    botao.addEventListener("click", async () => {
      botao.disabled = true;
      await alternarStatusLancamento(Number(botao.dataset.calendarioStatusId), botao.dataset.statusAtual);
      fecharModalCalendarioDia();
    });
  });

  document.getElementById("btn-fechar-modal-calendario-dia")?.addEventListener("click", fecharModalCalendarioDia, { once: true });
  modal.addEventListener("click", (evento) => {
    if (evento.target === modal) fecharModalCalendarioDia();
  }, { once: true });
  modal.style.display = "flex";
}

function renderizarCalendarioFinanceiro(lancamentos = []) {
  const card = document.getElementById("card-calendario-financeiro");
  const grid = document.getElementById("calendario-financeiro-grid");
  const resumo = document.getElementById("calendario-financeiro-resumo");
  if (!card || !grid) return;

  const periodo = obterPeriodoSelecionadoCalendario();
  const dados = Array.isArray(lancamentos) ? lancamentos : [];
  if (!periodo) {
    card.style.display = "none";
    return;
  }

  const porDia = new Map();
  dados.forEach((lancamento) => {
    const data = String(lancamento.data_compra || "");
    const dia = Number(data.slice(8, 10));
    if (!dia || data.slice(0, 7) !== `${periodo.ano}-${String(periodo.mes).padStart(2, "0")}`) return;
    const atual = porDia.get(dia) || { receitas: 0, despesas: 0, pendentes: 0, itens: 0, lancamentos: [] };
    const valor = valorMonetario(lancamento);
    atual.itens += 1;
    atual.lancamentos.push(lancamento);
    if (lancamento.status !== "pago") atual.pendentes += valor;
    if (lancamento.tipo === "receita") atual.receitas += valor;
    else atual.despesas += valor;
    porDia.set(dia, atual);
  });

  card.style.display = "flex";
  const totalItens = dados.length;
  const diasComMovimento = porDia.size;
  if (resumo) {
    resumo.textContent = totalItens > 0
      ? `${totalItens} lançamento(s) em ${diasComMovimento} dia(s) deste mês.`
      : "Sem lançamentos neste mês por enquanto.";
  }

  const primeiroDia = new Date(periodo.ano, periodo.mes - 1, 1);
  const espacosAntes = segundaComoPrimeiroDiaSemana(primeiroDia);
  const celulas = [];

  for (let i = 0; i < espacosAntes; i += 1) {
    celulas.push('<span class="calendario-dia calendario-dia-vazio" aria-hidden="true"></span>');
  }

  for (let dia = 1; dia <= periodo.totalDias; dia += 1) {
    const info = porDia.get(dia);
    const hojeISO = dataISOHojeDashboard();
    const dataISO = `${periodo.ano}-${String(periodo.mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    const classes = ["calendario-dia"];
    if (dataISO === hojeISO) classes.push("calendario-dia-hoje");
    if (info?.pendentes > 0) classes.push("calendario-dia-pendente");
    if (info?.despesas > 0) classes.push("calendario-dia-despesa");
    if (info?.receitas > 0) classes.push("calendario-dia-receita");

    const saldoDia = (info?.receitas || 0) - (info?.despesas || 0);
    const valorPrincipal = info ? formatadorBRL.format(Math.abs(saldoDia || info.pendentes || 0)) : "";
    const titulo = info
      ? `${dia}: ${info.itens} lançamento(s), saldo ${formatadorBRL.format(saldoDia)}, pendente ${formatadorBRL.format(info.pendentes)}`
      : `${dia}: sem movimento`;

    celulas.push(`
      <button type="button" class="${classes.join(" ")}" title="${escaparHtml(titulo)}" data-calendario-dia="${dia}">
        <span class="calendario-dia-numero">${dia}</span>
        ${info ? `<span class="calendario-dia-valor">${valorPrincipal}</span>` : ""}
        ${info ? `<span class="calendario-dia-pontos">
          ${info.receitas > 0 ? '<i class="ponto-receita"></i>' : ""}
          ${info.despesas > 0 ? '<i class="ponto-despesa"></i>' : ""}
          ${info.pendentes > 0 ? '<i class="ponto-pendente"></i>' : ""}
        </span>` : ""}
      </button>
    `);
  }

  grid.innerHTML = celulas.join("");
  grid.querySelectorAll("[data-calendario-dia]").forEach((botao) => {
    botao.onclick = () => {
      const dia = Number(botao.dataset.calendarioDia);
      const dataISO = `${periodo.ano}-${String(periodo.mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
      abrirModalCalendarioDia(dataISO, porDia.get(dia)?.lancamentos || []);
    };
  });
}

let modelosLancamentoDashboard = [];

function criarChaveModeloLancamento(lancamento) {
  return [
    String(lancamento.descricao || "").trim().toLowerCase(),
    String(lancamento.tipo || "").trim().toLowerCase(),
    String(lancamento.categoria || "").trim().toLowerCase(),
    String(lancamento.meio_pagamento || "").trim().toLowerCase(),
  ].join("|");
}

function renderizarModelosLancamentoDashboard(lancamentos = []) {
  const card = document.getElementById("card-modelos-lancamento");
  const lista = document.getElementById("lista-modelos-lancamento");
  if (!card || !lista) return;

  const dados = Array.isArray(lancamentos) ? lancamentos : [];
  const grupos = new Map();

  dados.forEach((lancamento) => {
    const descricao = String(lancamento.descricao || "").trim();
    if (!descricao) return;
    const chave = criarChaveModeloLancamento(lancamento);
    const atual = grupos.get(chave) || {
      descricao,
      tipo: lancamento.tipo || "despesa",
      categoria: lancamento.categoria || "",
      meio_pagamento: lancamento.meio_pagamento || "pix",
      status: lancamento.status || "pendente",
      valor_centavos: Number.isInteger(lancamento.valor_centavos) ? lancamento.valor_centavos : null,
      valor: valorMonetario(lancamento),
      cartao_credito_id: lancamento.cartao_credito_id || null,
      nota: lancamento.nota || "",
      usos: 0,
      total: 0,
    };
    atual.usos += 1;
    atual.total += valorMonetario(lancamento);
    grupos.set(chave, atual);
  });

  modelosLancamentoDashboard = [...grupos.values()]
    .filter((modelo) => modelo.usos >= 2)
    .sort((a, b) => {
      if (b.usos !== a.usos) return b.usos - a.usos;
      return b.total - a.total;
    })
    .slice(0, 4)
    .map((modelo) => ({
      ...modelo,
      valor: modelo.usos > 0 ? modelo.total / modelo.usos : modelo.valor,
      valor_centavos: null,
    }));

  if (modelosLancamentoDashboard.length === 0) {
    card.style.display = "none";
    lista.innerHTML = "";
    return;
  }

  card.style.display = "flex";
  lista.innerHTML = modelosLancamentoDashboard.map((modelo, indice) => {
    const classeTipo = modelo.tipo === "receita" ? "texto-receita" : "texto-despesa";
    const tipoTexto = modelo.tipo === "receita" ? "Receita" : "Despesa";

    return `
      <button type="button" class="modelo-lancamento-item" data-modelo-indice="${indice}">
        <span class="modelo-lancamento-info">
          <strong>${escaparHtml(modelo.descricao)}</strong>
          <small>${escaparHtml(modelo.categoria || "Sem categoria")} • ${tipoTexto} • ${modelo.usos}x</small>
        </span>
        <span class="modelo-lancamento-valor ${classeTipo}">${formatadorBRL.format(modelo.valor)}</span>
      </button>
    `;
  }).join("");

  lista.querySelectorAll("[data-modelo-indice]").forEach((botao) => {
    botao.onclick = async () => {
      const modelo = modelosLancamentoDashboard[Number(botao.dataset.modeloIndice)];
      if (modelo && typeof abrirModalModeloLancamento === "function") await abrirModalModeloLancamento(modelo);
    };
  });
}

const PALAVRAS_CHAVE_ASSINATURA_DASHBOARD = [
  "assinatura",
  "mensalidade",
  "streaming",
  "netflix",
  "spotify",
  "prime",
  "amazon",
  "disney",
  "youtube",
  "hbo",
  "max",
  "globoplay",
  "deezer",
  "icloud",
  "google",
  "microsoft",
  "canva",
  "adobe",
  "internet",
  "academia",
  "gym",
];

function textoIndicaAssinaturaDashboard(...partes) {
  const texto = partes.filter(Boolean).join(" ").toLowerCase();
  return PALAVRAS_CHAVE_ASSINATURA_DASHBOARD.some((palavra) => texto.includes(palavra));
}

function chaveAssinaturaDashboard(item) {
  return String(item.descricao || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function coletarAssinaturasDashboard(lancamentos = []) {
  const candidatos = [];
  const fixas = typeof despesasFixasCarregadas !== "undefined" && Array.isArray(despesasFixasCarregadas) ? despesasFixasCarregadas : [];
  const recorrentes = typeof recorrentesCarregadas !== "undefined" && Array.isArray(recorrentesCarregadas) ? recorrentesCarregadas : [];
  const lancamentosSeguros = Array.isArray(lancamentos) ? lancamentos : [];

  fixas.forEach((fixa) => {
    if (!fixa.ativo || !textoIndicaAssinaturaDashboard(fixa.descricao, fixa.categoria)) return;
    candidatos.push({
      descricao: fixa.descricao || "Assinatura",
      categoria: fixa.categoria || "Despesa fixa",
      valor: valorMonetario(fixa),
      origem: "Fixa",
    });
  });

  recorrentes.forEach((recorrente) => {
    if (!recorrente.ativo || recorrente.tipo === "receita" || !textoIndicaAssinaturaDashboard(recorrente.descricao, recorrente.categoria)) return;
    candidatos.push({
      descricao: recorrente.descricao || "Assinatura",
      categoria: recorrente.categoria || "Recorrência",
      valor: valorMonetario(recorrente),
      origem: "Recorrente",
    });
  });

  lancamentosSeguros.forEach((lancamento) => {
    if (lancamento.tipo === "receita" || !textoIndicaAssinaturaDashboard(lancamento.descricao, lancamento.categoria, lancamento.nota)) return;
    candidatos.push({
      descricao: lancamento.descricao || "Assinatura",
      categoria: lancamento.categoria || "Lançamento",
      valor: valorMonetario(lancamento),
      origem: lancamento.status === "pago" ? "Pago" : "Pendente",
    });
  });

  const agrupadas = new Map();
  candidatos.forEach((item) => {
    const chave = chaveAssinaturaDashboard(item);
    if (!chave) return;
    const atual = agrupadas.get(chave) || { ...item, ocorrencias: 0, valor: 0 };
    atual.valor += item.valor;
    atual.ocorrencias += 1;
    if (item.origem === "Fixa" || item.origem === "Recorrente") atual.origem = item.origem;
    agrupadas.set(chave, atual);
  });

  return [...agrupadas.values()].sort((a, b) => b.valor - a.valor);
}

function renderizarResumoAssinaturasDashboard(lancamentos = []) {
  const card = document.getElementById("card-assinaturas");
  const lista = document.getElementById("lista-assinaturas-dashboard");
  const totalMensalEl = document.getElementById("assinaturas-total-mensal");
  const totalAnualEl = document.getElementById("assinaturas-total-anual");
  const subtituloEl = document.getElementById("assinaturas-subtitulo");
  if (!card || !lista) return;

  const assinaturas = coletarAssinaturasDashboard(lancamentos);
  if (assinaturas.length === 0) {
    card.style.display = "none";
    lista.innerHTML = "";
    return;
  }

  const totalMensal = assinaturas.reduce((soma, item) => soma + item.valor, 0);
  card.style.display = "flex";
  if (totalMensalEl) totalMensalEl.textContent = formatadorBRL.format(totalMensal);
  if (totalAnualEl) totalAnualEl.textContent = formatadorBRL.format(totalMensal * 12);
  if (subtituloEl) {
    subtituloEl.textContent = `${assinaturas.length} assinatura(s) ou mensalidade(s) detectada(s) neste contexto.`;
  }

  lista.innerHTML = assinaturas.slice(0, 5).map((item) => `
    <div class="assinatura-item">
      <span class="assinatura-item-info">
        <strong>${escaparHtml(item.descricao)}</strong>
        <small>${escaparHtml(item.categoria)} • ${escaparHtml(item.origem)}${item.ocorrencias > 1 ? ` • ${item.ocorrencias}x` : ""}</small>
      </span>
      <span class="assinatura-item-valor">${formatadorBRL.format(item.valor)}</span>
    </div>
  `).join("");
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
