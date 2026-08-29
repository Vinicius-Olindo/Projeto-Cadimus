// ==========================================
// budgets-ui.js - Orçamentos mensais
// ==========================================
// ==========================================
// [10] ORÇAMENTOS MENSAIS
// ==========================================

// --- PAINEL DE ORÇAMENTOS ---
let orcamentosCarregados = [];

function obterResumoOrcamentoMensal(orcamento) {
  const limite = valorMonetario(orcamento);
  const gasto = valorMonetario(orcamento, "total_gasto");
  const saldo = Math.max(0, Number(orcamento.saldo ?? limite - gasto));
  const progressoReal = Number.isFinite(Number(orcamento.progresso_real))
    ? Number(orcamento.progresso_real)
    : limite > 0 ? (gasto / limite) * 100 : 0;
  const status = orcamento.status || (progressoReal >= 100 ? "estourado" : progressoReal >= 80 ? "alerta" : "ok");

  return {
    id: orcamento.id,
    categoria: orcamento.categoria || "Sem categoria",
    limite,
    gasto,
    saldo,
    progresso: Math.min(Math.max(progressoReal, 0), 100),
    progressoReal,
    status,
  };
}

function renderizarMetasMesDashboard(orcamentos = []) {
  const card = document.getElementById("card-metas-mes-dashboard");
  const lista = document.getElementById("lista-metas-mes-dashboard");
  const livreEl = document.getElementById("metas-mes-livre");
  const alertasEl = document.getElementById("metas-mes-alertas");
  const btnPlanejamento = document.getElementById("btn-metas-mes-planejamento");
  if (!card || !lista) return;

  if (!Array.isArray(orcamentos) || orcamentos.length === 0) {
    card.style.display = "none";
    lista.innerHTML = "";
    return;
  }

  const resumos = orcamentos.map(obterResumoOrcamentoMensal);
  const totalLivre = resumos.reduce((total, item) => total + item.saldo, 0);
  const totalAlertas = resumos.filter((item) => item.status !== "ok" || item.progressoReal >= 80).length;
  const prioridadeStatus = { estourado: 0, alerta: 1, ok: 2 };
  const itensDestaque = [...resumos]
    .sort((a, b) => {
      const porStatus = (prioridadeStatus[a.status] ?? 3) - (prioridadeStatus[b.status] ?? 3);
      if (porStatus !== 0) return porStatus;
      return a.saldo - b.saldo;
    })
    .slice(0, 4);

  card.style.display = "flex";
  if (livreEl) livreEl.textContent = formatadorBRL.format(totalLivre);
  if (alertasEl) {
    alertasEl.textContent = String(totalAlertas);
    alertasEl.className = totalAlertas > 0 ? "metas-mes-alertas-ativo" : "";
  }

  lista.innerHTML = itensDestaque.map((item) => {
    const estourou = item.status === "estourado" || item.progressoReal >= 100;
    const emAlerta = item.status === "alerta" || item.progressoReal >= 80;
    const classeStatus = estourou ? "estourado" : emAlerta ? "alerta" : "ok";
    const textoSaldo = estourou ? "Limite estourado" : `Pode gastar ${formatadorBRL.format(item.saldo)}`;
    const detalhe = `${formatadorBRL.format(item.gasto)} de ${formatadorBRL.format(item.limite)}`;

    return `
      <button type="button" class="metas-mes-item metas-mes-item-${classeStatus}" data-categoria="${escaparHtml(item.categoria)}">
        <span class="metas-mes-item-topo">
          <strong>${escaparHtml(item.categoria)}</strong>
          <em>${Math.round(item.progressoReal)}%</em>
        </span>
        <span class="metas-mes-barra" aria-hidden="true">
          <span style="width: ${item.progresso}%"></span>
        </span>
        <span class="metas-mes-item-rodape">
          <small>${detalhe}</small>
          <b>${textoSaldo}</b>
        </span>
      </button>
    `;
  }).join("");

  lista.querySelectorAll(".metas-mes-item").forEach((item) => {
    item.addEventListener("click", () => {
      const inputMes = document.getElementById("filtro-mes")?.value || "";
      const [ano, mes] = inputMes.split("-");
      window.abrirModalOrcamento?.({
        categoria: item.dataset.categoria || "",
        mes: Number(mes),
        ano: Number(ano),
      });
    });
  });

  if (btnPlanejamento) {
    btnPlanejamento.onclick = () => document.getElementById("btn-planejamento")?.click();
  }
}

async function carregarOrcamentos() {
  const card = document.getElementById("card-orcamentos");
  const container = document.getElementById("lista-orcamentos-painel");
  const carteiraId = document.getElementById("seletor-carteira").value;
  orcamentosCarregados = [];
  if (!card || !container || !carteiraId) {
    if (card) card.style.display = "none";
    renderizarMetasMesDashboard([]);
    return;
  }

  const inputMes = document.getElementById("filtro-mes").value;
  if (!inputMes) {
    card.style.display = "none";
    renderizarMetasMesDashboard([]);
    return;
  }

  const [ano, mes] = inputMes.split("-");

  try {
    const resposta = await CadimusBudgetsApi.listar({ carteira_id: carteiraId, mes, ano });

    if (tratarSessaoExpirada(resposta)) return;
    if (!resposta.ok) {
      orcamentosCarregados = [];
      card.style.display = "none";
      renderizarMetasMesDashboard([]);
      return;
    }

    orcamentosCarregados = await resposta.json();
    renderizarMetasMesDashboard(orcamentosCarregados);
    if (typeof renderizarAlertasRiscoFinanceiro === "function") renderizarAlertasRiscoFinanceiro();

    if (orcamentosCarregados.length === 0) {
      card.style.display = "none";
      return;
    }

    card.style.display = "flex";
    container.innerHTML = "";

    orcamentosCarregados.forEach((orc) => {
      const div = document.createElement("div");
      div.className = "orcamento-item";

      const corBarra = orc.status === "estourado" ? "var(--cor-despesa)" : orc.status === "alerta" ? "var(--cor-pendente)" : "var(--cor-receita)";

      div.innerHTML = `
        <div class="orcamento-cabecalho">
          <span class="orcamento-categoria">${escaparHtml(orc.categoria)}</span>
          <span class="orcamento-status status-${orc.status}">${orc.progresso_real.toFixed(0)}%</span>
        </div>
        <div class="orcamento-barra-fundo">
          <div class="orcamento-barra-progresso" style="width: ${orc.progresso}%; background: ${corBarra}"></div>
        </div>
        <div class="orcamento-valores">
          <span class="orcamento-gasto">${formatadorBRL.format(valorMonetario(orc, "total_gasto"))} / ${formatadorBRL.format(valorMonetario(orc))}</span>
          <span class="orcamento-saldo">${orc.saldo > 0 ? `Restam ${formatadorBRL.format(orc.saldo)}` : "Estourado!"}</span>
        </div>
        <button type="button" class="orcamento-btn-excluir" data-id="${orc.id}" title="Excluir orçamento">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        </button>
      `;

      container.appendChild(div);
    });

    // Botão de excluir
    container.querySelectorAll(".orcamento-btn-excluir").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const confirmado = await pedirConfirmacao("Tem certeza que deseja excluir este orçamento?");
        if (!confirmado) return;

        try {
          const resp = await CadimusBudgetsApi.excluir(btn.dataset.id);

          if (tratarSessaoExpirada(resp)) return;

          if (resp.ok) {
            carregarOrcamentos();
            mostrarToast("Orçamento excluído.");
          } else {
            const erro = await resp.json();
            await mostrarAviso(`Erro: ${erro.erro}`);
          }
        } catch (e) {
          await mostrarAviso("Erro de conexão.");
        }
      });
    });
  } catch (erro) {
    console.error("Erro ao carregar orçamentos:", erro);
    orcamentosCarregados = [];
    card.style.display = "none";
    renderizarMetasMesDashboard([]);
    if (typeof renderizarAlertasRiscoFinanceiro === "function") renderizarAlertasRiscoFinanceiro();
  }
}
