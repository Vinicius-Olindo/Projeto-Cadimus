// ==========================================
// reports-export-ui.js - Exportação dos relatórios
// ==========================================
/* --- Exportar --- */
function configurarExportarRelatorio() {
  const btnExp = document.getElementById("btn-relatorio-exportar");
  const modal = document.getElementById("modal-relatorio-exportar");
  const btnFechar = document.getElementById("btn-fechar-modal-relatorio-exportar");
  if (btnExp && modal) {
    btnExp.addEventListener("click", () => { modal.style.display = "flex"; modal.classList.add("modal-aberto"); });
  }
  if (btnFechar && modal) {
    btnFechar.addEventListener("click", () => { modal.style.display = "none"; modal.classList.remove("modal-aberto"); });
  }
  if (modal) {
    modal.addEventListener("click", (e) => { if (e.target === modal) { modal.style.display = "none"; modal.classList.remove("modal-aberto"); } });
  }

  document.querySelectorAll(".rel-exportar-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const formato = btn.dataset.formato;
      if (formato === "csv") exportarRelatorioCSV();
      else if (formato === "json") exportarRelatorioJSON();
      else if (formato === "imprimir") window.print();
      else if (formato === "pdf") exportarRelatorioPDF();
      if (modal) { modal.style.display = "none"; modal.classList.remove("modal-aberto"); }
    });
  });

  // Busca e ordenação da tabela
  const busca = document.getElementById("rel-busca-transacoes");
  const ordem = document.getElementById("rel-ordem-tabela");
  if (busca) busca.addEventListener("input", () => { relatorioPagina.atual = 1; renderizarTabelaTransacoes(relatorioDados.lancamentos); });
  if (ordem) ordem.addEventListener("change", () => { relatorioPagina.atual = 1; renderizarTabelaTransacoes(relatorioDados.lancamentos); });

  // Botão compartilhar
  const btnComp = document.getElementById("btn-relatorio-compartilhar");
  if (btnComp) btnComp.addEventListener("click", () => {
    if (navigator.share) navigator.share({ title: "Relatório Financeiro", text: "Meu relatório financeiro - Gestor Financeiro" });
    else mostrarToast("Função de compartilhar não disponível neste navegador", "aviso");
  });

}

function exportarRelatorioCSV() {
  const { lancamentos } = relatorioDados;
  if (lancamentos.length === 0) { mostrarToast("Sem dados para exportar", "aviso"); return; }

  const linhas = [["Data", "Descricao", "Categoria", "Tipo", "Valor", "Valor Centavos", "Conta", "Forma Pagamento"]];
  lancamentos.forEach((l) => {
    linhas.push([l.data_compra || "", l.descricao || "", l.categoria || "", l.tipo || "", valorMonetario(l), centavosMonetarios(l), l.carteira_nome || "", l.forma_pagamento || ""]);
  });

  const csv = linhas.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  baixarArquivo(blob, `relatorio_financeiro_${new Date().toISOString().split("T")[0]}.csv`);
}

function exportarRelatorioJSON() {
  const { lancamentos, periodo } = relatorioDados;
  const lancamentosNormalizados = lancamentos.map((l) => ({
    ...l,
    valor: valorMonetario(l),
    valor_centavos: centavosMonetarios(l),
  }));
  const json = JSON.stringify({ periodo, lancamentos: lancamentosNormalizados }, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  baixarArquivo(blob, `relatorio_financeiro_${new Date().toISOString().split("T")[0]}.json`);
}

function exportarRelatorioPDF() {
  const { lancamentos, periodo } = relatorioDados;
  const totalRec = somarValoresMonetarios(lancamentos.filter((l) => l.tipo === "receita"));
  const totalDesp = somarValoresMonetarios(lancamentos.filter((l) => l.tipo === "despesa"));
  const saldo = totalRec - totalDesp;

  let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Relatório Financeiro</title><style>
    body{font-family:'IBM Plex Sans',sans-serif;max-width:800px;margin:0 auto;padding:20px;color:#1a1a1a}
    h1{font-size:1.3rem;border-bottom:2px solid #2e7d32;padding-bottom:8px}
    .kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0}
    .kpi{padding:12px;border:1px solid #e0e0e0;border-radius:8px;text-align:center}
    .kpi-rotulo{font-size:0.75rem;color:#666;text-transform:uppercase}
    .kpi-valor{font-size:1.2rem;font-weight:700;margin-top:4px}
    table{width:100%;border-collapse:collapse;margin:16px 0;font-size:0.85rem}
    th,td{padding:8px;border-bottom:1px solid #e0e0e0;text-align:left}
    th{background:#f5f5f5;font-weight:600;font-size:0.75rem;text-transform:uppercase}
    .footer{margin-top:32px;padding-top:12px;border-top:1px solid #e0e0e0;font-size:0.7rem;color:#999;text-align:center}
  </style></head><body>
    <h1>Relatório Financeiro — Gestor Financeiro</h1>
    <p style="color:#666;font-size:0.85rem">Período: ${periodo.inicio} a ${periodo.fim}</p>
    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-rotulo">Receitas</div><div class="kpi-valor" style="color:#2e7d32">${formatadorBRL.format(totalRec)}</div></div>
      <div class="kpi"><div class="kpi-rotulo">Despesas</div><div class="kpi-valor" style="color:#c62828">${formatadorBRL.format(totalDesp)}</div></div>
      <div class="kpi"><div class="kpi-rotulo">Saldo</div><div class="kpi-valor" style="color:${saldo >= 0 ? "#2e7d32" : "#c62828"}">${formatadorBRL.format(saldo)}</div></div>
    </div>
    <h2>Transações</h2>
    <table><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Tipo</th><th style="text-align:right">Valor</th></tr></thead><tbody>${
      lancamentos.map((l) => `<tr><td>${l.data_compra ? new Date(l.data_compra + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td><td>${escaparHtml(l.descricao || "")}</td><td>${escaparHtml(l.categoria || "")}</td><td>${l.tipo || ""}</td><td style="text-align:right">${formatadorBRL.format(valorMonetario(l))}</td></tr>`).join("")
    }</tbody></table>
    <div class="footer">Gerado em ${new Date().toLocaleString("pt-BR")} — Gestor Financeiro</div></body></html>`;

  const janela = window.open("", "_blank");
  if (janela) { janela.document.write(html); janela.document.close(); janela.print(); }
}

function baixarArquivo(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
