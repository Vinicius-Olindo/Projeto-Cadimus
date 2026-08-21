// ==========================================
// dashboard-insights-ui.js - Status, comparação mensal e autores
// ==========================================

// ==========================================
// [22] STATUS: Alternar Pago/Pendente
// ==========================================

// --- ALTERNAR STATUS (pago ⇄ pendente) ---
async function alternarStatusLancamento(id, statusAtual) {
  const novoStatus = statusAtual === "pago" ? "pendente" : "pago";

  try {
    const resposta = await CadimusEntriesApi.atualizar(id, { status: novoStatus });

    if (tratarSessaoExpirada(resposta)) return;

    if (resposta.ok) {
      await recarregarLancamentosAposMutacao();
      mostrarToast(novoStatus === "pago" ? "Marcado como pago" : "Marcado como pendente", "info");
    } else {
      const erro = await resposta.json();
      await mostrarAviso(`Não foi possível atualizar: ${erro.erro}`);
    }
  } catch (erro) {
    console.error(erro);
    await mostrarAviso("Erro ao se conectar com o servidor.");
  }
}

// --- COMPARAÇÃO COM O MÊS ANTERIOR ---
let ultimaRequisicaoComparacao = 0;

// ==========================================
// [23] COMPARAÇÃO MÊS A MÊS
// ==========================================

async function carregarComparacaoMesAnterior(despesasAtuais) {
  const carteiraId = document.getElementById("seletor-carteira").value;
  const campoMes = document.getElementById("filtro-mes");
  if (!carteiraId || !campoMes || !campoMes.dataset.ano) return;

  const idRequisicao = ++ultimaRequisicaoComparacao;

  let ano = Number(campoMes.dataset.ano);
  let mes = Number(campoMes.dataset.mes) - 1; // mês anterior (0-indexado)
  if (mes < 0) {
    mes = 11;
    ano -= 1;
  }
  const mesStr = String(mes + 1).padStart(2, "0");

  try {
    const resposta = await CadimusEntriesApi.listarResposta({ carteira_id: carteiraId, mes: mesStr, ano });
    if (idRequisicao !== ultimaRequisicaoComparacao) return;
    if (!resposta.ok) return;

    const dados = await resposta.json();
    if (idRequisicao !== ultimaRequisicaoComparacao) return;

    const despesasAnteriores = dados.filter((l) => l.tipo === "despesa" && l.status === "pago").reduce((soma, l) => soma + valorMonetario(l), 0);

    renderizarComparacaoMesAnterior(despesasAtuais, despesasAnteriores);
  } catch (erro) {
    console.error("Erro ao comparar com mês anterior:", erro);
  }
}

function renderizarComparacaoMesAnterior(atual, anterior) {
  const elemento = document.getElementById("comparacao-mes");
  if (!elemento) return;

  if (anterior <= 0) {
    elemento.style.display = "none";
    return;
  }

  const diferenca = ((atual - anterior) / anterior) * 100;
  const arredondado = Math.round(Math.abs(diferenca));

  if (arredondado === 0) {
    elemento.style.display = "none";
    return;
  }

  const subiu = diferenca > 0;
  elemento.textContent = `${subiu ? "▲" : "▼"} ${arredondado}% vs mês anterior`;
  elemento.className = `comparacao-mes ${subiu ? "comparacao-pior" : "comparacao-melhor"}`;
  elemento.style.display = "inline-flex";
}

// --- QUEM GASTOU QUANTO (útil na carteira compartilhada) ---
function renderizarResumoAutores(dados) {
  const card = document.getElementById("card-por-autor");
  const container = document.getElementById("lista-autores-resumo");
  if (!card || !container) return;

  const totais = {};
  dados.forEach((l) => {
    if (l.tipo !== "despesa" || l.status !== "pago") return;
    const nome = l.criado_por_nome || "?";
    totais[nome] = (totais[nome] || 0) + valorMonetario(l);
  });

  const autores = Object.entries(totais).sort((a, b) => b[1] - a[1]);

  // Só faz sentido mostrar quando mais de uma pessoa lançou algo (ex: carteira individual não precisa)
  if (autores.length < 2) {
    card.style.display = "none";
    return;
  }

  card.style.display = "flex";
  container.innerHTML = "";

  const somaTotal = autores.reduce((soma, [, valor]) => soma + valor, 0);

  autores.forEach(([nome, valor]) => {
    const percentual = Math.round((valor / somaTotal) * 100);
    const cor = typeof corDoAutor === "function" ? corDoAutor(nome) : "var(--cor-marca)";

    const linha = document.createElement("div");
    linha.className = "categoria-barra-linha";
    linha.innerHTML = `
      <div class="categoria-barra-topo">
        <strong>${escaparHtml(nome)}</strong>
        <span class="categoria-barra-valor">${formatadorBRL.format(valor)} · ${percentual}%</span>
      </div>
      <div class="categoria-barra-trilho">
        <div class="categoria-barra-preenchimento" style="background: ${cor}" data-largura="${percentual}"></div>
      </div>
    `;
    container.appendChild(linha);
  });

  requestAnimationFrame(() => {
    container.querySelectorAll(".categoria-barra-preenchimento").forEach((barra) => {
      barra.style.width = `${barra.dataset.largura}%`;
    });
  });
}
