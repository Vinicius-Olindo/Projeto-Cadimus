// ==========================================
// dashboard-summary-subscriptions.js - Assinaturas do dashboard
// ==========================================

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
