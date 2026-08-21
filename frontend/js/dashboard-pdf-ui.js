// ==========================================
// dashboard-pdf-ui.js - Relatório PDF do dashboard
// ==========================================
// --- RELATÓRIO PDF (via impressão do navegador) ---
function gerarRelatorioPDF() {
  const usuario = obterUsuarioLogado();
  const nomeMes = document.getElementById("rotulo-mes")?.textContent || "";
  const dados = typeof ultimoLoteLancamentos !== "undefined" ? ultimoLoteLancamentos : [];

  let totalReceitas = 0, totalDespesas = 0, totalPendente = 0, qtdPendentes = 0, qtdAtrasados = 0;
  const porCategoria = {};
  const porStatus = { pago: 0, pendente: 0, atrasado: 0 };

  dados.forEach((l) => {
    const valor = valorMonetario(l);
    porStatus[l.status] = (porStatus[l.status] || 0) + valor;
    if (l.status === "pendente" && l.tipo === "despesa") { totalPendente += valor; qtdPendentes++; }
    if (l.status === "atrasado") qtdAtrasados++;
    if (l.status !== "pago") return;
    if (l.tipo === "receita") totalReceitas += valor;
    else {
      totalDespesas += valor;
      porCategoria[l.categoria] = (porCategoria[l.categoria] || 0) + valor;
    }
  });

  const saldo = totalReceitas - totalDespesas;
  const taxaPoupanca = totalReceitas > 0 ? ((totalReceitas - totalDespesas) / totalReceitas * 100) : 0;
  const categorias = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]);
  const maiorCategoria = categorias.length > 0 ? categorias[0][1] : 1;
  const cores = ["#2e7d32","#1565c0","#e65100","#6a1b9a","#c62828","#00838f","#4e342e","#37474f","#827717","#ad1457"];

  // Status badges
  const statusBadge = (s) => {
    const cores = { pago: "#2e7d32", pendente: "#f9a825", atrasado: "#c62828" };
    const labels = { pago: "Pago", pendente: "Pendente", atrasado: "Atrasado" };
    return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:0.7rem;font-weight:600;color:#fff;background:${cores[s] || "#666"}">${labels[s] || s}</span>`;
  };

  const html = `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8"/>
    <title>Relatório Financeiro — ${nomeMes}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Inter', sans-serif; padding: 48px; color: #1a1a2e; background: #fafafa; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 2px solid #e8e8e8; padding-bottom: 20px; }
      .header-left h1 { font-size: 1.6rem; font-weight: 700; color: #1a1a2e; }
      .header-left .sub { color: #666; font-size: 0.85rem; margin-top: 4px; }
      .header-right { text-align: right; font-size: 0.75rem; color: #999; }
      .header-right .logo-text { font-size: 1.1rem; font-weight: 700; color: #a97a2f; }

      .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
      .kpi { background: #fff; border: 1px solid #e8e8e8; border-radius: 10px; padding: 16px; text-align: center; border-top: 3px solid #e0e0e0; }
      .kpi-receita { border-top-color: #2e7d32; }
      .kpi-despesa { border-top-color: #c62828; }
      .kpi-saldo { border-top-color: ${saldo >= 0 ? "#2e7d32" : "#c62828"}; }
      .kpi-pendente { border-top-color: #f9a825; }
      .kpi-rotulo { font-size: 0.68rem; color: #888; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
      .kpi-valor { font-size: 1.3rem; font-weight: 700; margin-top: 6px; }
      .kpi-receita .kpi-valor { color: #2e7d32; }
      .kpi-despesa .kpi-valor { color: #c62828; }
      .kpi-saldo .kpi-valor { color: ${saldo >= 0 ? "#2e7d32" : "#c62828"}; }
      .kpi-pendente .kpi-valor { color: #f9a825; }
      .kpi-extra { font-size: 0.68rem; color: #999; margin-top: 4px; }

      .section-title { font-size: 1rem; font-weight: 700; margin: 28px 0 12px; padding-bottom: 8px; border-bottom: 1px solid #e8e8e8; color: #1a1a2e; }

      .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }

      .card { background: #fff; border: 1px solid #e8e8e8; border-radius: 10px; padding: 16px; }
      .card-title { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 12px; }

      .cat-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
      .cat-bar-nome { width: 120px; font-size: 0.8rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .cat-bar-trilho { flex: 1; height: 10px; background: #f0f0f0; border-radius: 5px; overflow: hidden; }
      .cat-bar-fill { height: 100%; border-radius: 5px; }
      .cat-bar-valor { width: 80px; text-align: right; font-size: 0.78rem; font-weight: 600; font-family: monospace; }

      .resumo-item { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f5f5f5; font-size: 0.82rem; }
      .resumo-item:last-child { border-bottom: none; }
      .resumo-label { color: #666; }
      .resumo-valor { font-weight: 600; font-family: monospace; }

      table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
      th { background: #f8f8f8; font-weight: 600; text-transform: uppercase; font-size: 0.65rem; letter-spacing: 0.5px; color: #888; padding: 10px 12px; text-align: left; border-bottom: 2px solid #e8e8e8; }
      td { padding: 9px 12px; border-bottom: 1px solid #f0f0f0; }
      tr:hover td { background: #fafafa; }
      .text-right { text-align: right; }
      .text-receita { color: #2e7d32; font-weight: 600; }
      .text-despesa { color: #c62828; font-weight: 600; }
      .text-pendente { color: #f9a825; }
      .nota-cell { font-size: 0.72rem; color: #999; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

      .footer { margin-top: 40px; padding-top: 16px; border-top: 2px solid #e8e8e8; display: flex; justify-content: space-between; font-size: 0.7rem; color: #aaa; }

      .print-bar {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: #fff;
        border-top: 1px solid #e0e0e0;
        padding: 16px 48px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        box-shadow: 0 -2px 10px rgba(0,0,0,0.08);
        z-index: 100;
      }
      .print-bar-texto { font-size: 0.82rem; color: #666; }
      .print-bar-texto strong { color: #333; }
      .print-bar-btn {
        background: #a97a2f;
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 10px 28px;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        white-space: nowrap;
      }
      .print-bar-btn:hover { background: #8c6520; }
      .print-bar-btn svg { flex-shrink: 0; }
      .print-bar-dica { font-size: 0.7rem; color: #999; }
      body { padding-bottom: 80px; }

      @media print {
        body { padding: 24px; padding-bottom: 0; background: #fff; }
        .card { break-inside: avoid; }
        tr { break-inside: avoid; }
        .print-bar { display: none !important; }
      }
    </style>
  </head>
  <body>
    <div class="print-bar">
      <div>
        <div class="print-bar-texto"><strong>Salvo como PDF:</strong> clique em "Imprimir" e selecione <strong>"Salvar como PDF"</strong> no destino.</div>
        <div class="print-bar-dica">No Chrome: Destino → Salvar como PDF · No Firefox: Configurações → PDF</div>
      </div>
      <button class="print-bar-btn" onclick="window.print()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Imprimir / Salvar PDF
      </button>
    </div>
    <div class="header">
      <div class="header-left">
        <h1>Relatório Financeiro</h1>
        <div class="sub">${escaparHtml(usuario.nome || "Usuário")} — ${nomeMes}</div>
      </div>
      <div class="header-right">
        <div class="logo-text">Gestor Financeiro</div>
        <div>Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</div>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi kpi-receita">
        <div class="kpi-rotulo">Saldo</div>
        <div class="kpi-valor">${formatadorBRL.format(totalReceitas)}</div>
        <div class="kpi-extra">${dados.filter((l) => l.tipo === "receita" && l.status === "pago").length} receita(s)</div>
      </div>
      <div class="kpi kpi-despesa">
        <div class="kpi-rotulo">Despesas</div>
        <div class="kpi-valor">${formatadorBRL.format(totalDespesas)}</div>
        <div class="kpi-extra">${categorias.length} categoria(s)</div>
      </div>
      <div class="kpi kpi-saldo">
        <div class="kpi-rotulo">Saldo do período</div>
        <div class="kpi-valor">${formatadorBRL.format(saldo)}</div>
        <div class="kpi-extra">Poupança: ${taxaPoupanca.toFixed(1)}%</div>
      </div>
      <div class="kpi kpi-pendente">
        <div class="kpi-rotulo">A pagar</div>
        <div class="kpi-valor">${formatadorBRL.format(totalPendente)}</div>
        <div class="kpi-extra">${qtdPendentes} pendente(s)${qtdAtrasados > 0 ? " · " + qtdAtrasados + " atrasado(s)" : ""}</div>
      </div>
    </div>

    <div class="two-col">
      <div class="card">
        <div class="card-title">Despesas por categoria</div>
        ${categorias.length > 0 ? categorias.slice(0, 8).map(([cat, val], i) => {
          const pct = (val / maiorCategoria) * 100;
          const pctTotal = (val / totalDespesas * 100).toFixed(1);
          return `<div class="cat-bar">
            <span class="cat-bar-nome">${escaparHtml(cat)}</span>
            <div class="cat-bar-trilho"><div class="cat-bar-fill" style="width:${pct}%;background:${cores[i % cores.length]}"></div></div>
            <span class="cat-bar-valor">${formatadorBRL.format(val)} <span style="color:#999;font-weight:400">(${pctTotal}%)</span></span>
          </div>`;
        }).join("") : "<p style='color:#999;font-size:0.82rem'>Nenhuma despesa paga neste período.</p>"}
      </div>
      <div class="card">
        <div class="card-title">Resumo do período</div>
        <div class="resumo-item"><span class="resumo-label">Total de lançamentos</span><span class="resumo-valor">${dados.length}</span></div>
        <div class="resumo-item"><span class="resumo-label">Pagos</span><span class="resumo-valor" style="color:#2e7d32">${porStatus.pago ? formatadorBRL.format(porStatus.pago) : "R$ 0,00"}</span></div>
        <div class="resumo-item"><span class="resumo-label">Pendentes</span><span class="resumo-valor" style="color:#f9a825">${porStatus.pendente ? formatadorBRL.format(porStatus.pendente) : "R$ 0,00"}</span></div>
        ${porStatus.atrasado > 0 ? `<div class="resumo-item"><span class="resumo-label">Atrasados</span><span class="resumo-valor" style="color:#c62828">${formatadorBRL.format(porStatus.atrasado)}</span></div>` : ""}
        <div class="resumo-item"><span class="resumo-label">Ticket médio (despesa)</span><span class="resumo-valor">${totalDespesas > 0 && categorias.length > 0 ? formatadorBRL.format(totalDespesas / dados.filter((l) => l.tipo === "despesa" && l.status === "pago").length) : "—"}</span></div>
        <div class="resumo-item"><span class="resumo-label">Maior gasto</span><span class="resumo-valor">${categorias.length > 0 ? escaparHtml(categorias[0][0]) : "—"}</span></div>
      </div>
    </div>

    <h2 class="section-title">Lançamentos (${dados.length})</h2>
    <table>
      <thead>
        <tr>
          <th>Data</th>
          <th>Descrição</th>
          <th>Categoria</th>
          <th>Status</th>
          <th class="text-right">Valor</th>
        </tr>
      </thead>
      <tbody>
        ${dados.map((l) => `
          <tr>
            <td style="white-space:nowrap">${new Date(l.data_compra + "T12:00:00").toLocaleDateString("pt-BR")}</td>
            <td>${escaparHtml(l.descricao || "—")}</td>
            <td>${escaparHtml(l.categoria || "—")}</td>
            <td>${statusBadge(l.status)}</td>
            <td class="text-right ${l.tipo === "receita" ? "text-receita" : l.status === "atrasado" ? "text-despesa" : l.status === "pendente" ? "text-pendente" : "text-despesa"}">${l.tipo === "receita" ? "+" : "−"}${formatadorBRL.format(valorMonetario(l))}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <div class="footer">
      <span>Gestor Financeiro — ${new Date().getFullYear()}</span>
      <span>Documento gerado automaticamente</span>
    </div>
  </body></html>`;

  const janela = window.open("", "_blank");
  if (janela) {
    janela.document.write(html);
    janela.document.close();
  } else {
    mostrarToast("Permita pop-ups para gerar o relatório.", "aviso");
  }
}
