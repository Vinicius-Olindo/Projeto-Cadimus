// ==========================================
// installments-ui.js - Compras parceladas
// ==========================================
// ==========================================
// [9] COMPRAS PARCELADAS
// ==========================================

// ==========================================
// COMPRAS PARCELADAS (ex: "Notebook em 10x de R$300")
// ==========================================
let comprasParceladasCarregadas = [];

async function abrirModalComprasParceladas() {
  const modal = document.getElementById("modal-compra-parcelada");
  const carteiraId = document.getElementById("seletor-carteira").value;
  if (!modal) return;

  if (!carteiraId) {
    await mostrarAviso("Aguarde suas carteiras carregarem antes de cadastrar uma compra parcelada.");
    return;
  }

  await popularSelectCategorias(document.getElementById("parcelada-categoria"));
  await popularSelectCartoesCredito?.(document.getElementById("parcelada-cartao-credito"), carteiraId);

  // Sugere o mês atual como padrão pra 1ª parcela
  const campoMesInicio = document.getElementById("parcelada-mes-inicio");
  if (campoMesInicio && !campoMesInicio.value) {
    const hoje = new Date();
    campoMesInicio.value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  }

  modal.style.display = "flex";
  trapFoco(modal);
}

function configurarModalComprasParceladas() {
  const modal = document.getElementById("modal-compra-parcelada");
  const btnAbrirTopo = document.getElementById("btn-compras-parceladas");
  const btnAbrirDoCard = document.getElementById("btn-nova-compra-parcelada");
  const btnFechar = document.getElementById("btn-fechar-modal-parcelada");
  const form = document.getElementById("form-compra-parcelada");
  const campoValorTotal = document.getElementById("parcelada-valor-total");
  const campoTotalParcelas = document.getElementById("parcelada-total");
  const preview = document.getElementById("parcelada-preview");

  if (!modal || !btnFechar || !form) return;

  configurarCampoCartaoCredito?.({
    campoId: "campo-cartao-parcelada",
    selectId: "parcelada-cartao-credito",
    meioId: "parcelada-meio-pagamento",
  });

  btnAbrirTopo?.addEventListener("click", abrirModalComprasParceladas);
  btnAbrirDoCard?.addEventListener("click", abrirModalComprasParceladas);

  // Modal de histórico
  const modalHistorico = document.getElementById("modal-historico-parcela");
  const btnFecharHistorico = document.getElementById("btn-fechar-modal-historico-parcela");
  btnFecharHistorico?.addEventListener("click", () => {
    modalHistorico.style.display = "none";
    liberarFoco();
  });

  function atualizarPreview() {
    let totalCentavos;
    try {
      totalCentavos = window.CadimusMoney.reaisParaCentavos(campoValorTotal.value);
    } catch {
      preview.style.display = "none";
      return;
    }
    const parcelas = parseInt(campoTotalParcelas.value, 10);

    if (totalCentavos <= 0 || !Number.isInteger(parcelas) || parcelas < 2) {
      preview.style.display = "none";
      return;
    }

    const centavosBase = Math.floor(totalCentavos / parcelas);
    const centavosUltima = totalCentavos - centavosBase * (parcelas - 1);
    const valorParcela = centavosBase / 100;
    const valorUltimaParcela = centavosUltima / 100;
    preview.textContent = valorParcela === valorUltimaParcela
      ? `= ${parcelas}x de ${formatadorBRL.format(valorParcela)}`
      : `= ${parcelas - 1}x de ${formatadorBRL.format(valorParcela)} + 1x de ${formatadorBRL.format(valorUltimaParcela)}`;
    preview.style.display = "block";
  }

  campoValorTotal?.addEventListener("input", atualizarPreview);
  campoTotalParcelas?.addEventListener("input", atualizarPreview);

  btnFechar.addEventListener("click", () => {
    modal.style.display = "none";
    liberarFoco();
    form.reset();
    preview.style.display = "none";
  });

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const carteiraId = document.getElementById("seletor-carteira").value;
    const btnSalvar = document.getElementById("btn-salvar-parcelada");
    btnSalvar.disabled = true;
    btnSalvar.innerText = "Salvando...";

    try {
      const mesInicioValor = document.getElementById("parcelada-mes-inicio").value; // "YYYY-MM"
      if (!mesInicioValor) {
        await mostrarAviso("Escolha o mês da primeira parcela.");
        return;
      }
      const [anoInicio, mesInicio] = mesInicioValor.split("-").map(Number);

      const valorTotalCentavos = window.CadimusMoney.reaisParaCentavos(campoValorTotal.value);
      const valorTotal = window.CadimusMoney.centavosParaReais(valorTotalCentavos);
      const totalParcelas = parseInt(campoTotalParcelas.value, 10);
      // O backend recebe o valor total e distribui os centavos, deixando a
      // última parcela ajustar qualquer diferença de arredondamento.
      const valorParcelaCentavos = Math.floor(valorTotalCentavos / totalParcelas);
      const valorParcela = window.CadimusMoney.centavosParaReais(valorParcelaCentavos);

      const corpo = {
        carteira_id: carteiraId,
        descricao: document.getElementById("parcelada-descricao").value.trim(),
        valor_total: valorTotal,
        valor_total_centavos: valorTotalCentavos,
        valor_parcela: valorParcela,
        valor_parcela_centavos: valorParcelaCentavos,
        total_parcelas: totalParcelas,
        dia_vencimento: parseInt(document.getElementById("parcelada-dia").value, 10),
        ano_inicio: anoInicio,
        mes_inicio: mesInicio,
        categoria: document.getElementById("parcelada-categoria").value,
        meio_pagamento: document.getElementById("parcelada-meio-pagamento").value,
        cartao_credito_id: document.getElementById("parcelada-cartao-credito")?.value || null,
      };

      const resposta = await CadimusScheduledApi.criarParcelada(corpo);

      if (tratarSessaoExpirada(resposta)) return;

      if (resposta.ok) {
        form.reset();
        preview.style.display = "none";
        modal.style.display = "none";
        liberarFoco();
        carregarPainelComprasParceladas();
        await recarregarLancamentosAposMutacao();
        mostrarToast("Compra parcelada criada");
      } else {
        const erro = await resposta.json();
        await mostrarAviso(`Erro: ${erro.erro}`);
      }
    } catch (erro) {
      console.error(erro);
      await mostrarAviso("Erro de conexão ao cadastrar compra parcelada.");
    } finally {
      btnSalvar.disabled = false;
      btnSalvar.innerText = "Salvar";
    }
  });
}

// Calcula em que parcela a compra está HOJE (pode ser <1 = ainda não começou, ou >total = já terminou)
function calcularParcelaAtual(compra) {
  const hoje = new Date();
  return (hoje.getFullYear() - compra.ano_inicio) * 12 + (hoje.getMonth() + 1 - compra.mes_inicio) + 1;
}

async function carregarPainelComprasParceladas() {
  const card = document.getElementById("card-compras-parceladas");
  const container = document.getElementById("lista-compras-parceladas-painel");
  const carteiraId = document.getElementById("seletor-carteira").value;
  if (!card || !container || !carteiraId) return;

  try {
    const resposta = await CadimusScheduledApi.listarParceladas({ carteira_id: carteiraId });
    if (tratarSessaoExpirada(resposta)) return;
    if (!resposta.ok) return;

    comprasParceladasCarregadas = await resposta.json();

    if (comprasParceladasCarregadas.length === 0) {
      card.style.display = "none";
      return;
    }

    card.style.display = "flex";
    container.innerHTML = "";

    comprasParceladasCarregadas.forEach((compra) => {
      const valorFormatado = formatadorBRL.format(valorMonetario(compra, "valor_parcela"));
      const parcelaAtual = calcularParcelaAtual(compra);
      const concluida = parcelaAtual > compra.total_parcelas;

      let rotuloParcela;
      if (!compra.ativo) {
        rotuloParcela = "Cancelada";
      } else if (concluida) {
        rotuloParcela = `Concluída (${compra.total_parcelas}/${compra.total_parcelas})`;
      } else if (parcelaAtual < 1) {
        rotuloParcela = `Começa em ${NOMES_MESES_ABREV[compra.mes_inicio - 1]}/${compra.ano_inicio}`;
      } else {
        rotuloParcela = `Parcela ${parcelaAtual}/${compra.total_parcelas}`;
      }

      const div = document.createElement("div");
      div.className = "linha-item linha-usuario lancamento-recorrente-card lancamento-recorrente-parcelada";
      div.innerHTML = `
        ${!concluida ? `
        <button type="button" class="fixa-btn-toggle btn-alternar-parcela ${compra.ativo ? "fixa-ativa" : "fixa-pausada"}" data-id="${compra.id}" title="${compra.ativo ? "Pausar" : "Ativar"}">
          ${compra.ativo
            ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>'
            : '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>'}
        </button>` : ""}
        <div class="fixa-conteudo">
          <span class="item-descricao">${escaparHtml(compra.descricao)}</span>
          <span class="item-categoria">${rotuloParcela} · ${valorFormatado}/mês</span>
          <div class="fixa-botoes">
            <span class="item-status ${compra.ativo && !concluida ? "status-pago" : "status-pendente"}">${compra.ativo ? (concluida ? "Concluída" : "Ativa") : "Pausada"}</span>
            <button type="button" class="fixa-btn btn-historico-parcela" data-id="${compra.id}" data-descricao="${escaparHtml(compra.descricao)}">Histórico</button>
            <button type="button" class="fixa-btn-excluir btn-excluir-parcela" data-id="${compra.id}">Excluir</button>
          </div>
        </div>
      `;
      container.appendChild(div);
    });

    container.querySelectorAll(".btn-historico-parcela").forEach((btn) => {
      btn.addEventListener("click", () => abrirHistoricoParcela(Number(btn.dataset.id), btn.dataset.descricao));
    });
    container.querySelectorAll(".btn-alternar-parcela").forEach((btn) => {
      btn.addEventListener("click", () => alternarComprasParcelada(Number(btn.dataset.id)));
    });
    container.querySelectorAll(".btn-excluir-parcela").forEach((btn) => {
      btn.addEventListener("click", () => excluirComprasParcelada(Number(btn.dataset.id)));
    });
  } catch (erro) {
    console.error("Erro ao carregar compras parceladas:", erro);
  }

  atualizarBadgeNotificacoes();
}

async function alternarComprasParcelada(id) {
  const alvo = comprasParceladasCarregadas.find((c) => c.id === id);
  if (!alvo) return;

  try {
    const resposta = await CadimusScheduledApi.atualizarParcelada(id, { ativo: !alvo.ativo });

    if (tratarSessaoExpirada(resposta)) return;

    if (resposta.ok) {
      carregarPainelComprasParceladas();
      mostrarToast(alvo.ativo ? "Compra parcelada cancelada" : "Compra parcelada reativada", "info");
    } else {
      const erro = await resposta.json();
      await mostrarAviso(`Erro: ${erro.erro}`);
    }
  } catch (erro) {
    await mostrarAviso("Erro de conexão.");
  }
}

async function excluirComprasParcelada(id) {
  if (!(await pedirConfirmacao("Excluir esta compra parcelada? As parcelas já lançadas continuam na lista, só param de ser geradas novas.", { textoConfirmar: "Excluir", perigo: true }))) return;

  try {
    const resposta = await CadimusScheduledApi.excluirParcelada(id);

    if (tratarSessaoExpirada(resposta)) return;

    if (resposta.ok) {
      carregarPainelComprasParceladas();
      mostrarToast("Compra parcelada excluída", "info");
    } else {
      const erro = await resposta.json();
      await mostrarAviso(`Erro: ${erro.erro}`);
    }
  } catch (erro) {
    await mostrarAviso("Erro de conexão.");
  }
}

// --- HISTÓRICO DE PARCELAS (COMPRA PARCELADA) ---
async function abrirHistoricoParcela(compraId, descricao) {
  const modal = document.getElementById("modal-historico-parcela");
  const titulo = document.getElementById("titulo-historico-parcela");
  const lista = document.getElementById("historico-parcela-lista");
  if (!modal || !titulo || !lista) return;

  titulo.textContent = `Histórico — ${descricao}`;
  lista.innerHTML = '<p class="historico-fixa-vazio">Carregando...</p>';
  modal.style.display = "flex";
  trapFoco(modal);

  try {
    const resposta = await CadimusEntriesApi.listarResposta({ compra_parcelada_id: compraId });

    if (!resposta.ok) {
      lista.innerHTML = '<p class="historico-fixa-vazio">Erro ao carregar histórico.</p>';
      return;
    }

    const lancamentos = await resposta.json();

    if (lancamentos.length === 0) {
      lista.innerHTML = '<p class="historico-fixa-vazio">Nenhuma parcela registrada ainda.</p>';
      return;
    }

    lista.innerHTML = "";
    lancamentos.forEach((l) => {
      const dataFormatada = new Date(l.data_compra + "T12:00:00").toLocaleDateString("pt-BR");
      const valorFormatado = formatadorBRL.format(valorMonetario(l));
      const classeTipo = l.tipo === "receita" ? "texto-receita" : "texto-despesa";
      const sinal = l.tipo === "receita" ? "+" : "-";
      const dataVenc = new Date(l.data_compra + "T23:59:59");
      const hoje = new Date();
      const atrasado = l.status !== "pago" && dataVenc < hoje;
      const classeStatus = l.status === "pago" ? "status-pago" : atrasado ? "status-atrasado" : "status-pendente";
      const textoStatus = l.status === "pago" ? "Pago" : atrasado ? "Atrasado" : "Pendente";

      const linha = document.createElement("div");
      linha.className = "historico-fixa-linha";
      linha.innerHTML = `
        <span class="historico-fixa-data">${dataFormatada}</span>
        <span class="historico-fixa-valor ${classeTipo}">${sinal} ${valorFormatado}</span>
        <span class="historico-fixa-status ${classeStatus}">${textoStatus}</span>
      `;
      lista.appendChild(linha);
    });
  } catch (erro) {
    lista.innerHTML = '<p class="historico-fixa-vazio">Erro de conexão.</p>';
  }
}
