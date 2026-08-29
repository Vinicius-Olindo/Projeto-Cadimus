// ==========================================
// period-comparison-ui.js - Comparativo por período
// ==========================================

// --- COMPARATIVO POR PERÍODO ---
let periodoTipoAtual = "mes";

function configurarComparativoPeriodo() {
  const botoes = document.querySelectorAll(".periodo-btn");
  botoes.forEach((btn) => {
    btn.addEventListener("click", () => {
      botoes.forEach((b) => b.classList.remove("ativo"));
      btn.classList.add("ativo");
      periodoTipoAtual = btn.dataset.periodo;
      renderizarComparativoPeriodo();
    });
  });
}

// ==========================================
// [19] COMPARATIVO POR PERÍODO
// ==========================================

let periodoDadosAnterior = { receitas: 0, despesas: 0, saldo: 0 };
let periodoDadosAtual = { receitas: 0, despesas: 0, saldo: 0 };

async function renderizarComparativoPeriodo() {
  const carteiraId = document.getElementById("seletor-carteira")?.value;
  if (!carteiraId) return;

  const agora = new Date();
  let inicioAtual, fimAtual, inicioAnterior, fimAnterior, rotuloAtual, rotuloAnterior;

  if (periodoTipoAtual === "mes") {
    inicioAtual = new Date(agora.getFullYear(), agora.getMonth(), 1);
    fimAtual = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59);
    inicioAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
    fimAnterior = new Date(agora.getFullYear(), agora.getMonth(), 0, 23, 59, 59);
    rotuloAtual = "Este mês";
    rotuloAnterior = "Mês passado";
  } else if (periodoTipoAtual === "trimestre") {
    const trimestreAtual = Math.floor(agora.getMonth() / 3);
    inicioAtual = new Date(agora.getFullYear(), trimestreAtual * 3, 1);
    fimAtual = new Date(agora.getFullYear(), (trimestreAtual + 1) * 3, 0, 23, 59, 59);
    inicioAnterior = new Date(agora.getFullYear(), (trimestreAtual - 1) * 3, 1);
    fimAnterior = new Date(agora.getFullYear(), trimestreAtual * 3, 0, 23, 59, 59);
    rotuloAtual = `${trimestreAtual + 1}° Tri ${agora.getFullYear()}`;
    rotuloAnterior = `4° Tri ${trimestreAtual === 0 ? agora.getFullYear() - 1 : agora.getFullYear()}`;
    if (trimestreAtual === 0) {
      rotuloAnterior = `4° Tri ${agora.getFullYear() - 1}`;
    } else if (trimestreAtual === 1) {
      rotuloAnterior = `1° Tri ${agora.getFullYear()}`;
    } else if (trimestreAtual === 2) {
      rotuloAnterior = `2° Tri ${agora.getFullYear()}`;
    } else {
      rotuloAnterior = `3° Tri ${agora.getFullYear()}`;
    }
  } else {
    inicioAtual = new Date(agora.getFullYear(), 0, 1);
    fimAtual = new Date(agora.getFullYear(), 11, 31, 23, 59, 59);
    inicioAnterior = new Date(agora.getFullYear() - 1, 0, 1);
    fimAnterior = new Date(agora.getFullYear() - 1, 11, 31, 23, 59, 59);
    rotuloAtual = `${agora.getFullYear()}`;
    rotuloAnterior = `${agora.getFullYear() - 1}`;
  }

  const calcularTotaisDeLancamentos = (lancamentos, inicio, fim) => {
    let receitas = 0, despesas = 0;
    lancamentos.forEach((l) => {
      if (l.status !== "pago") return;
      const d = new Date(l.data_compra + "T12:00:00");
      if (d >= inicio && d <= fim) {
        const valor = valorMonetario(l);
        if (l.tipo === "receita") receitas += valor;
        else despesas += valor;
      }
    });
    return { receitas, despesas, saldo: receitas - despesas };
  };

  const buscarLancamentosPeriodo = async (inicio, fim) => {
    const anoInicio = inicio.getFullYear();
    const mesInicio = inicio.getMonth() + 1;
    const anoFim = fim.getFullYear();
    const mesFim = fim.getMonth() + 1;
    const todos = [];
    for (let a = anoInicio; a <= anoFim; a++) {
      const mStart = a === anoInicio ? mesInicio : 1;
      const mEnd = a === anoFim ? mesFim : 12;
      for (let m = mStart; m <= mEnd; m++) {
        try {
          const res = await CadimusEntriesApi.listarResposta({ carteira_id: carteiraId, mes: String(m).padStart(2, "0"), ano: a });
          if (res.ok) {
            const dados = await res.json();
            todos.push(...dados);
          }
        } catch (e) { /* ignora erro individual */ }
      }
    }
    return todos;
  };

  const [lancAtual, lancAnterior] = await Promise.all([
    buscarLancamentosPeriodo(inicioAtual, fimAtual),
    buscarLancamentosPeriodo(inicioAnterior, fimAnterior)
  ]);

  periodoDadosAtual = calcularTotaisDeLancamentos(lancAtual, inicioAtual, fimAtual);
  periodoDadosAnterior = calcularTotaisDeLancamentos(lancAnterior, inicioAnterior, fimAnterior);

  document.getElementById("periodo-atual-rotulo").textContent = rotuloAtual;
  document.getElementById("periodo-anterior-rotulo").textContent = rotuloAnterior;

  document.getElementById("periodo-atual-receitas").textContent = formatadorBRL.format(periodoDadosAtual.receitas);
  document.getElementById("periodo-atual-despesas").textContent = formatadorBRL.format(periodoDadosAtual.despesas);
  document.getElementById("periodo-atual-saldo").textContent = formatadorBRL.format(periodoDadosAtual.saldo);

  document.getElementById("periodo-anterior-receitas").textContent = formatadorBRL.format(periodoDadosAnterior.receitas);
  document.getElementById("periodo-anterior-despesas").textContent = formatadorBRL.format(periodoDadosAnterior.despesas);
  document.getElementById("periodo-anterior-saldo").textContent = formatadorBRL.format(periodoDadosAnterior.saldo);

  const variacaoEl = document.getElementById("periodo-variacao-saldo");
  const variacaoDetalheEl = document.getElementById("periodo-variacao-detalhe");
  if (periodoDadosAnterior.saldo === 0 && periodoDadosAtual.saldo === 0) {
    variacaoEl.textContent = "—";
    variacaoEl.className = "periodo-variacao-valor neutro";
    if (variacaoDetalheEl) variacaoDetalheEl.textContent = "sem saldo nos períodos";
  } else if (periodoDadosAnterior.saldo === 0) {
    variacaoEl.textContent = periodoDadosAtual.saldo > 0 ? "Novo saldo" : "Novo déficit";
    variacaoEl.className = `periodo-variacao-valor ${periodoDadosAtual.saldo >= 0 ? "positivo" : "negativo"}`;
    if (variacaoDetalheEl) variacaoDetalheEl.textContent = "sem base anterior";
  } else {
    const variacao = ((periodoDadosAtual.saldo - periodoDadosAnterior.saldo) / Math.abs(periodoDadosAnterior.saldo)) * 100;
    const sinal = variacao >= 0 ? "+" : "";
    variacaoEl.textContent = `${sinal}${variacao.toFixed(0)}%`;
    variacaoEl.className = `periodo-variacao-valor ${variacao >= 0 ? "positivo" : "negativo"}`;
    if (variacaoDetalheEl) variacaoDetalheEl.textContent = "vs período anterior";
  }

  renderizarComparativoPeriodoVisual(rotuloAtual, rotuloAnterior);
}

function renderizarComparativoPeriodoVisual(rotuloAtual, rotuloAnterior) {
  const container = document.getElementById("comparativo-periodo-visual");
  if (!container) return;

  const linhas = [
    { nome: "Receitas", atual: periodoDadosAtual.receitas, anterior: periodoDadosAnterior.receitas, classe: "receita" },
    { nome: "Despesas", atual: periodoDadosAtual.despesas, anterior: periodoDadosAnterior.despesas, classe: "despesa" },
    { nome: "Saldo", atual: periodoDadosAtual.saldo, anterior: periodoDadosAnterior.saldo, classe: periodoDadosAtual.saldo >= periodoDadosAnterior.saldo ? "receita" : "despesa" },
  ];
  const maior = Math.max(...linhas.flatMap((linha) => [Math.abs(linha.atual), Math.abs(linha.anterior)]), 1);

  container.innerHTML = linhas.map((linha) => {
    const atualPct = Math.max(4, Math.round((Math.abs(linha.atual) / maior) * 100));
    const anteriorPct = Math.max(4, Math.round((Math.abs(linha.anterior) / maior) * 100));
    const diferenca = linha.atual - linha.anterior;
    const classeDiferenca = diferenca >= 0 ? "positivo" : "negativo";
    const sinal = diferenca >= 0 ? "+" : "−";

    return `
      <div class="comparativo-visual-linha">
        <div class="comparativo-visual-topo">
          <strong>${linha.nome}</strong>
          <span class="${classeDiferenca}">${sinal} ${formatadorBRL.format(Math.abs(diferenca))}</span>
        </div>
        <div class="comparativo-visual-barras">
          <span title="${rotuloAtual}: ${formatadorBRL.format(linha.atual)}">
            <i class="comparativo-visual-barra comparativo-visual-${linha.classe}" style="width:${atualPct}%"></i>
            <b>${rotuloAtual}</b>
          </span>
          <span title="${rotuloAnterior}: ${formatadorBRL.format(linha.anterior)}">
            <i class="comparativo-visual-barra comparativo-visual-anterior" style="width:${anteriorPct}%"></i>
            <b>${rotuloAnterior}</b>
          </span>
        </div>
      </div>
    `;
  }).join("");
}
