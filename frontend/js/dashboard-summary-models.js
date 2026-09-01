// ==========================================
// dashboard-summary-models.js - Modelos rapidos do dashboard
// ==========================================

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
