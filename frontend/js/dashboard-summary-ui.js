// ==========================================
// dashboard-summary-ui.js - Resumos do dashboard financeiro
// ==========================================

// ==========================================
// [21] DASHBOARD: Resumo Categorias, Autores, KPIs
// ==========================================

// --- RAIO-X POR CATEGORIA (só despesas, é o que faz sentido controlar) ---
function renderizarResumoCategorias(totaisPorCategoria) {
  const card = document.getElementById("resumo-categorias");
  const container = document.getElementById("lista-categorias-resumo");
  const donutEl = document.getElementById("grafico-donut");
  const legendaEl = document.getElementById("grafico-legenda");
  if (!card || !container) return;

  const categorias = Object.entries(totaisPorCategoria).sort((a, b) => b[1] - a[1]);

  if (categorias.length === 0) {
    card.style.display = "none";
    if (donutEl) donutEl.style.background = "none";
    if (legendaEl) legendaEl.innerHTML = "";
    return;
  }

  card.style.display = "flex";

  const cores = ["#4caf50","#2196f3","#ff9800","#e91e63","#9c27b0","#00bcd4","#f44336","#607d8b","#795548","#cddc39"];
  const totalDespesas = categorias.reduce((soma, [, v]) => soma + v, 0);

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
  }

  if (legendaEl) {
    legendaEl.innerHTML = "";
    categorias.forEach(([cat, valor], i) => {
      const cor = cores[i % cores.length];
      const pct = ((valor / totalDespesas) * 100).toFixed(1);
      const item = document.createElement("div");
      item.className = "grafico-legenda-item";
      item.innerHTML = `
        <span class="grafico-legenda-cor" style="background:${cor}"></span>
        <span class="grafico-legenda-nome">${escaparHtml(cat)}</span>
        <span class="grafico-legenda-valor">${pct}%</span>
      `;
      legendaEl.appendChild(item);
    });
  }
  container.innerHTML = "";

  const maiorValor = categorias[0][1];
  const TOP_N = 5;
  const principais = categorias.slice(0, TOP_N);
  const restante = categorias.slice(TOP_N).reduce((soma, [, valor]) => soma + valor, 0);

  const linhas = restante > 0 ? [...principais, ["Outras", restante]] : principais;

  linhas.forEach(([categoria, valor]) => {
    const meta = categoria !== "Outras" ? obterMetaPorCategoria(categoria) : null;
    const valorFormatado = formatadorBRL.format(valor);

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
        <strong class="${categoria !== "Outras" ? "categoria-barra-nome" : ""} ${meta ? "barra-meta-clicavel" : ""}" data-categoria="${escaparHtml(categoria)}" data-meta="${meta ? valorMonetario(meta, "valor_limite") : ""}" data-datalimite="${meta?.data_limite || ""}">
          ${escaparHtml(categoria)} ${iconeMeta}
        </strong>
        <span class="categoria-barra-valor">${textoValor}</span>
        ${meta && meta.data_limite && meta.falta > 0 ? `<span class="badge-semana">~${formatadorBRL.format(valorMonetario(meta, "guarda_semanal"))}/sem.</span>` : ""}
      </div>
      <div class="categoria-barra-trilho ${meta ? "barra-meta-clicavel" : ""}" data-categoria="${escaparHtml(categoria)}" data-meta="${meta ? valorMonetario(meta, "valor_limite") : ""}">
        <div class="categoria-barra-preenchimento ${classeCor}" data-largura="${percentualLargura}"></div>
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
