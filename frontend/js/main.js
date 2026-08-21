// ==========================================
// main.js - Controle de Interface, UI e Filtros
// ==========================================
//
// ESTRUTURA DO ARQUIVO:
// [1]   CONSTANTES E HELPERS GLOBAIS
// [2]   ESTADO GLOBAL
// [3]   UI: Focus Trap, Toast, Aviso, Confirmação
// [4]   INICIALIZAÇÃO (DOMContentLoaded)
// [5]   FILTROS: Mês, Período, Dark Mode
// [6]   CARTEIRAS: Carregamento, Renderização, Tabs
// [7]   MODAIS: Carteira, Transferência, Orçamento, Membros
// [8]   DESPESAS FIXAS
// [9]   COMPRAS PARCELADAS
// [10]  ORÇAMENTOS MENSAIS
// [11]  METAS E DEPÓSITOS
// [12]  CATEGORIAS (Utilitários)
// [13]  LANÇAMENTOS: Modal, CRUD, Renderização
// [14]  ANIMAÇÕES
// [15]  RENDERIZAÇÃO: Lista de Lançamentos, Grupos
// [16]  NOTIFICAÇÕES
// [17]  EDIÇÃO EM LOTE
// [18]  POPUP DE NOTA
// [19]  COMPARATIVO POR PERÍODO
// [20]  CARREGAMENTO PRINCIPAL (carregarLancamentos)
// [21]  DASHBOARD: Resumo Categorias, Autores, KPIs
// [22]  STATUS: Alternar Pago/Pendente
// [23]  COMPARAÇÃO MÊS A MÊS
// [24]  TENDÊNCIA E GRÁFICOS
// [25]  TAXA DE POUPANÇA
// [26]  APAGAR LANÇAMENTO
// [27]  ADMIN: Painel, Usuários, Categorias
// [28]  PLANEJAMENTO: Planos Financeiros
// [29]  EXPORTAÇÃO GLOBAL
// ==========================================

// ==========================================
// [1] CONSTANTES E HELPERS GLOBAIS
// ==========================================

function obterCentavosMonetarios(campoId, opcoes = {}) {
  const { vazioComoZero = false, ...opcoesDinheiro } = opcoes;
  const campo = document.getElementById(campoId);
  const valor = campo?.value;
  if (vazioComoZero && (valor === null || valor === undefined || String(valor).trim() === "")) {
    return 0;
  }
  return window.CadimusMoney.reaisParaCentavos(valor, opcoesDinheiro);
}

function montarPayloadMonetario(campoId, nomeCampo = "valor", opcoes = {}) {
  const centavos = obterCentavosMonetarios(campoId, opcoes);
  return {
    [nomeCampo]: window.CadimusMoney.centavosParaReais(centavos),
    [`${nomeCampo}_centavos`]: centavos,
  };
}

function valorMonetario(registro, nomeCampo = "valor") {
  const nomeCentavos = `${nomeCampo}_centavos`;
  if (Number.isInteger(registro?.[nomeCentavos])) {
    return window.CadimusMoney.centavosParaReais(registro[nomeCentavos]);
  }
  return Number(registro?.[nomeCampo]) || 0;
}

function centavosMonetarios(registro, nomeCampo = "valor") {
  const nomeCentavos = `${nomeCampo}_centavos`;
  if (Number.isInteger(registro?.[nomeCentavos])) {
    return registro[nomeCentavos];
  }
  return window.CadimusMoney.reaisParaCentavos(valorMonetario(registro, nomeCampo), { permitirNegativo: true });
}

function somarValoresMonetarios(registros, nomeCampo = "valor") {
  return registros.reduce((total, registro) => total + valorMonetario(registro, nomeCampo), 0);
}

window.valorMonetario = valorMonetario;
window.centavosMonetarios = centavosMonetarios;
window.somarValoresMonetarios = somarValoresMonetarios;

// Helpers visuais, filtros e tema ficam em ui-core.js.

// Interface de carteiras, transferências e membros fica em wallets-ui.js.

// ==========================================
// [8] DESPESAS FIXAS
// ==========================================

let despesasFixasCarregadas = [];

function fecharModalDespesaFixa() {
  const modal = document.getElementById("modal-despesas-fixas");
  const form = document.getElementById("form-despesa-fixa");

  modal.style.display = "none";
  liberarFoco();
  form.reset();
  document.getElementById("fixa-editando-id").value = "";
  document.getElementById("titulo-modal-fixa").innerText = "Despesas fixas";
  document.getElementById("btn-salvar-fixa").innerText = "Adicionar";
}

async function abrirModalDespesasFixas() {
  const modal = document.getElementById("modal-despesas-fixas");
  const carteiraId = document.getElementById("seletor-carteira").value;
  if (!modal) return;

  if (!carteiraId) {
    await mostrarAviso("Aguarde suas carteiras carregarem antes de abrir as despesas fixas.");
    return;
  }

  document.getElementById("fixa-editando-id").value = "";
  document.getElementById("titulo-modal-fixa").innerText = "Nova despesa fixa";
  document.getElementById("btn-salvar-fixa").innerText = "Adicionar";
  await popularSelectCategorias(document.getElementById("fixa-categoria"));
  modal.style.display = "flex";
  trapFoco(modal);
}

async function editarDespesaFixa(id) {
  const fixa = despesasFixasCarregadas.find((f) => f.id === id);
  if (!fixa) return;

  const modal = document.getElementById("modal-despesas-fixas");
  if (!modal) return;

  await popularSelectCategorias(document.getElementById("fixa-categoria"));
  adicionarOpcaoSelect(document.getElementById("fixa-categoria"), fixa.categoria);

  document.getElementById("fixa-editando-id").value = fixa.id;
  document.getElementById("fixa-descricao").value = fixa.descricao;
  document.getElementById("fixa-valor").value = valorMonetario(fixa);
  document.getElementById("fixa-dia").value = fixa.dia_vencimento;
  document.getElementById("fixa-categoria").value = fixa.categoria;
  document.getElementById("fixa-meio-pagamento").value = fixa.meio_pagamento;
  document.getElementById("fixa-tipo").value = fixa.tipo;

  document.getElementById("titulo-modal-fixa").innerText = `Editando "${fixa.descricao}"`;
  document.getElementById("btn-salvar-fixa").innerText = "Salvar edição";
  modal.style.display = "flex";
  trapFoco(modal);
}

function configurarModalDespesasFixas() {
  const modal = document.getElementById("modal-despesas-fixas");
  const btnAbrir = document.getElementById("btn-despesas-fixas");
  const btnAbrirDoCard = document.getElementById("btn-nova-despesa-fixa");
  const btnFechar = document.getElementById("btn-fechar-modal-fixas");
  const form = document.getElementById("form-despesa-fixa");

  if (!modal || !btnFechar || !form) return;

  btnAbrir?.addEventListener("click", abrirModalDespesasFixas);
  btnAbrirDoCard?.addEventListener("click", abrirModalDespesasFixas);
  btnFechar.addEventListener("click", fecharModalDespesaFixa);

  // Modal de histórico
  const modalHistorico = document.getElementById("modal-historico-fixa");
  const btnFecharHistorico = document.getElementById("btn-fechar-modal-historico-fixa");
  btnFecharHistorico?.addEventListener("click", () => {
    modalHistorico.style.display = "none";
    liberarFoco();
  });

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const idEdicao = document.getElementById("fixa-editando-id").value;
    const carteiraId = document.getElementById("seletor-carteira").value;
    const btnSalvar = document.getElementById("btn-salvar-fixa");
    btnSalvar.disabled = true;
    btnSalvar.innerText = idEdicao ? "Salvando edição..." : "Salvando...";

    try {
      const valorPayload = montarPayloadMonetario("fixa-valor");
      const corpo = {
        descricao: document.getElementById("fixa-descricao").value.trim(),
        ...valorPayload,
        dia_vencimento: parseInt(document.getElementById("fixa-dia").value, 10),
        categoria: document.getElementById("fixa-categoria").value,
        meio_pagamento: document.getElementById("fixa-meio-pagamento").value,
        tipo: document.getElementById("fixa-tipo").value,
      };
      if (!idEdicao) corpo.carteira_id = carteiraId; // carteira só é definida na criação, não muda na edição

      const resposta = await CadimusScheduledApi.salvarFixa(corpo, idEdicao || null);

      if (tratarSessaoExpirada(resposta)) return;

      if (resposta.ok) {
        fecharModalDespesaFixa();
        carregarPainelDespesasFixas();
        carregarLancamentos();
        mostrarToast(idEdicao ? "Despesa fixa atualizada" : "Despesa fixa criada");
      } else {
        const erro = await resposta.json();
        await mostrarAviso(`Erro: ${erro.erro}`);
      }
    } catch (erro) {
      console.error(erro);
      await mostrarAviso("Erro de conexão ao salvar despesa fixa.");
    } finally {
      btnSalvar.disabled = false;
      btnSalvar.innerText = idEdicao ? "Salvar edição" : "Adicionar";
    }
  });
}

async function carregarPainelDespesasFixas() {
  const card = document.getElementById("card-despesas-fixas");
  const container = document.getElementById("lista-despesas-fixas-painel");
  const carteiraId = document.getElementById("seletor-carteira").value;
  if (!card || !container || !carteiraId) return;

  try {
    const resposta = await CadimusScheduledApi.listarFixas({ carteira_id: carteiraId });
    if (tratarSessaoExpirada(resposta)) return;
    if (!resposta.ok) return;

    despesasFixasCarregadas = await resposta.json();

    if (despesasFixasCarregadas.length === 0) {
      card.style.display = "none";
      return;
    }

    card.style.display = "flex";
    container.innerHTML = "";

    despesasFixasCarregadas.forEach((fixa) => {
      const valorFormatado = formatadorBRL.format(valorMonetario(fixa));
      const aviso = fixa.ativo ? calcularAvisoVencimento(fixa.dia_vencimento) : null;

      const badgeAviso = aviso ? `<span class="aviso-vencimento ${aviso.atrasado ? "aviso-vencimento-atrasado" : ""}">${aviso.texto}</span>` : "";
      const classeDestaque = aviso ? (aviso.atrasado ? "linha-vencimento-atrasado" : "linha-vencimento-proximo") : "";

      const div = document.createElement("div");
      div.className = `linha-item linha-usuario ${classeDestaque}`.trim();
      div.innerHTML = `
        <button type="button" class="fixa-btn-toggle btn-alternar-fixa ${fixa.ativo ? "fixa-ativa" : "fixa-pausada"}" data-id="${fixa.id}" title="${fixa.ativo ? "Pausar" : "Ativar"}">
          ${fixa.ativo
            ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>'
            : '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>'}
        </button>
        <div class="fixa-conteudo">
          <span class="item-descricao">${escaparHtml(fixa.descricao)}</span>
          <span class="item-categoria">${valorFormatado} · Dia ${fixa.dia_vencimento}</span>
          <div class="fixa-botoes">
            ${badgeAviso}
            <button type="button" class="fixa-btn btn-historico-fixa" data-id="${fixa.id}" data-descricao="${escaparHtml(fixa.descricao)}">Histórico</button>
            <button type="button" class="fixa-btn btn-editar-fixa" data-id="${fixa.id}">Editar</button>
            <button type="button" class="fixa-btn-excluir btn-excluir-conta" data-id="${fixa.id}">Excluir</button>
          </div>
        </div>
      `;
      container.appendChild(div);
    });

    container.querySelectorAll(".btn-editar-fixa").forEach((btn) => {
      btn.addEventListener("click", () => editarDespesaFixa(Number(btn.dataset.id)));
    });
    container.querySelectorAll(".btn-historico-fixa").forEach((btn) => {
      btn.addEventListener("click", () => abrirHistoricoFixa(Number(btn.dataset.id), btn.dataset.descricao));
    });
    container.querySelectorAll(".btn-alternar-fixa").forEach((btn) => {
      btn.addEventListener("click", () => alternarDespesaFixa(Number(btn.dataset.id)));
    });
    container.querySelectorAll(".btn-excluir-conta").forEach((btn) => {
      btn.addEventListener("click", () => excluirDespesaFixa(Number(btn.dataset.id)));
    });
  } catch (erro) {
    console.error("Erro ao carregar despesas fixas:", erro);
  }

  atualizarBadgeNotificacoes();
}

// Calcula se o vencimento está próximo (até 3 dias), hoje, ou já passou (até 3 dias atrás)
function calcularAvisoVencimento(diaVencimento) {
  const hoje = new Date();
  const diaAtual = hoje.getDate();
  const diferenca = diaVencimento - diaAtual;

  if (diferenca === 0) {
    return { texto: "Vence hoje", atrasado: false };
  }
  if (diferenca > 0 && diferenca <= 3) {
    return { texto: `Vence em ${diferenca} dia${diferenca > 1 ? "s" : ""}`, atrasado: false };
  }
  if (diferenca < 0 && diferenca >= -3) {
    const diasAtraso = Math.abs(diferenca);
    return { texto: `Venceu há ${diasAtraso} dia${diasAtraso > 1 ? "s" : ""}`, atrasado: true };
  }
  return null;
}

async function alternarDespesaFixa(id) {
  const alvo = despesasFixasCarregadas.find((f) => f.id === id);
  if (!alvo) return;

  try {
    const resposta = await CadimusScheduledApi.atualizarFixa(id, { ativo: !alvo.ativo });

    if (tratarSessaoExpirada(resposta)) return;

    if (resposta.ok) {
      carregarPainelDespesasFixas();
      mostrarToast(alvo.ativo ? "Despesa fixa pausada" : "Despesa fixa ativada", "info");
    } else {
      const erro = await resposta.json();
      await mostrarAviso(`Erro: ${erro.erro}`);
    }
  } catch (erro) {
    await mostrarAviso("Erro de conexão.");
  }
}

async function excluirDespesaFixa(id) {
  if (!(await pedirConfirmacao("Excluir esta despesa fixa? Ela para de gerar lançamentos novos, mas os que já foram criados continuam na lista.", { textoConfirmar: "Excluir", perigo: true }))) return;

  try {
    const resposta = await CadimusScheduledApi.excluirFixa(id);

    if (tratarSessaoExpirada(resposta)) return;

    if (resposta.ok) {
      carregarPainelDespesasFixas();
      mostrarToast("Despesa fixa excluída", "info");
    } else {
      const erro = await resposta.json();
      await mostrarAviso(`Erro: ${erro.erro}`);
    }
  } catch (erro) {
    await mostrarAviso("Erro de conexão.");
  }
}

// --- HISTÓRICO DE PAGAMENTOS (DESPESA FIXA) ---
async function abrirHistoricoFixa(fixaId, descricao) {
  const modal = document.getElementById("modal-historico-fixa");
  const titulo = document.getElementById("titulo-historico-fixa");
  const lista = document.getElementById("historico-fixa-lista");
  if (!modal || !titulo || !lista) return;

  titulo.textContent = `Histórico — ${descricao}`;
  lista.innerHTML = '<p class="historico-fixa-vazio">Carregando...</p>';
  modal.style.display = "flex";
  trapFoco(modal);

  try {
    const resposta = await CadimusEntriesApi.listarResposta({ despesa_fixa_id: fixaId });

    if (!resposta.ok) {
      lista.innerHTML = '<p class="historico-fixa-vazio">Erro ao carregar histórico.</p>';
      return;
    }

    const lancamentos = await resposta.json();

    if (lancamentos.length === 0) {
      lista.innerHTML = '<p class="historico-fixa-vazio">Nenhum pagamento registrado ainda.</p>';
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

  popularSelectCategorias(document.getElementById("parcelada-categoria"));

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
      };

      const resposta = await CadimusScheduledApi.criarParcelada(corpo);

      if (tratarSessaoExpirada(resposta)) return;

      if (resposta.ok) {
        form.reset();
        preview.style.display = "none";
        modal.style.display = "none";
        liberarFoco();
        carregarPainelComprasParceladas();
        carregarLancamentos();
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
      btnSalvar.innerText = "Adicionar";
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
      div.className = "linha-item linha-usuario";
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

// ==========================================
// [10] ORÇAMENTOS MENSAIS
// ==========================================

// --- PAINEL DE ORÇAMENTOS ---
let orcamentosCarregados = [];

async function carregarOrcamentos() {
  const card = document.getElementById("card-orcamentos");
  const container = document.getElementById("lista-orcamentos-painel");
  const carteiraId = document.getElementById("seletor-carteira").value;
  if (!card || !container || !carteiraId) return;

  const inputMes = document.getElementById("filtro-mes").value;
  if (!inputMes) {
    card.style.display = "none";
    return;
  }

  const [ano, mes] = inputMes.split("-");

  try {
    const resposta = await CadimusBudgetsApi.listar({ carteira_id: carteiraId, mes, ano });

    if (tratarSessaoExpirada(resposta)) return;
    if (!resposta.ok) {
      card.style.display = "none";
      return;
    }

    orcamentosCarregados = await resposta.json();

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
    card.style.display = "none";
  }
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

// ==========================================
// [11] METAS E DEPÓSITOS
// ==========================================

// ==========================================
// METAS POR CATEGORIA (ex: "Quero gastar no máximo R$500 com Delivery")
// ==========================================
let metasCarregadas = [];

async function carregarMetas() {
  const carteiraId = document.getElementById("seletor-carteira").value;
  if (!carteiraId) return;

  try {
    const resposta = await CadimusGoalsApi.listarMetas({ carteira_id: carteiraId });
    if (tratarSessaoExpirada(resposta)) return;
    if (!resposta.ok) return;
    metasCarregadas = await resposta.json();
  } catch (erro) {
    console.error("Erro ao carregar metas:", erro);
  }
}

function obterMetaPorCategoria(categoria) {
  return metasCarregadas.find((m) => m.categoria === categoria);
}

function abrirModalMeta(categoria, valorAtual, dataLimite) {
  const modal = document.getElementById("modal-meta");
  if (!modal) return;

  document.getElementById("meta-categoria-nome").value = categoria;
  document.getElementById("meta-categoria-label").textContent = `Categoria: ${categoria}`;
  document.getElementById("meta-valor").value = valorAtual || "";
  document.getElementById("meta-data-limite").value = dataLimite || "";
  document.getElementById("btn-remover-meta").style.display = valorAtual ? "inline-block" : "none";
  modal.style.display = "flex";
  trapFoco(modal);
}

function configurarModalMeta() {
  const modal = document.getElementById("modal-meta");
  const form = document.getElementById("form-meta");
  const btnFechar = document.getElementById("btn-fechar-modal-meta");
  const btnRemover = document.getElementById("btn-remover-meta");

  if (!modal || !form || !btnFechar || !btnRemover) return;

  btnFechar.addEventListener("click", () => {
    modal.style.display = "none";
    liberarFoco();
  });

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const carteiraId = document.getElementById("seletor-carteira").value;
    const categoria = document.getElementById("meta-categoria-nome").value;
    const valorLimitePayload = montarPayloadMonetario("meta-valor", "valor_limite");
    const valorLimite = valorLimitePayload.valor_limite;
    const dataLimite = document.getElementById("meta-data-limite").value || null;
    const btnSalvar = document.getElementById("btn-salvar-meta");

    btnSalvar.disabled = true;
    btnSalvar.innerText = "Salvando...";

    try {
      const resposta = await CadimusGoalsApi.salvarMeta({ carteira_id: carteiraId, categoria, valor_limite: valorLimite, valor_limite_centavos: valorLimitePayload.valor_limite_centavos, data_limite: dataLimite });

      if (tratarSessaoExpirada(resposta)) return;

      if (resposta.ok) {
        modal.style.display = "none";
        await carregarMetas();
        carregarLancamentos();
      } else {
        const erro = await resposta.json();
        await mostrarAviso(`Erro: ${erro.erro}`);
      }
    } catch (erro) {
      await mostrarAviso("Erro de conexão ao salvar meta.");
    } finally {
      btnSalvar.disabled = false;
      btnSalvar.innerText = "Salvar meta";
    }
  });

  btnRemover.addEventListener("click", async () => {
    const categoria = document.getElementById("meta-categoria-nome").value;
    const meta = obterMetaPorCategoria(categoria);
    if (!meta) return;
    if (!(await pedirConfirmacao(`Remover a meta de "${categoria}"?`, { textoConfirmar: "Remover", perigo: true }))) return;

    try {
      const resposta = await CadimusGoalsApi.excluirMeta(meta.id);

      if (tratarSessaoExpirada(resposta)) return;

      if (resposta.ok) {
        modal.style.display = "none";
        liberarFoco();
        await carregarMetas();
        carregarLancamentos();
        mostrarToast("Meta removida", "info");
      } else {
        const erro = await resposta.json();
        await mostrarAviso(`Erro: ${erro.erro}`);
      }
    } catch (erro) {
      await mostrarAviso("Erro de conexão ao remover meta.");
    }
  });
}


// --- DEPÓSITOS EM METAS ---
let metaDepositandoId = null;

async function abrirModalDeposito(metaId, categoria) {
  const modal = document.getElementById("modal-meta-deposito");
  const titulo = document.getElementById("titulo-meta-deposito");
  const inputMetaId = document.getElementById("deposito-meta-id");
  const inputValor = document.getElementById("deposito-valor");
  const inputDescricao = document.getElementById("deposito-descricao");
  const lista = document.getElementById("lista-depositos");
  if (!modal) return;

  metaDepositandoId = metaId;
  titulo.textContent = `Depósito — ${categoria}`;
  inputMetaId.value = metaId;
  inputValor.value = "";
  inputDescricao.value = "";

  modal.style.display = "flex";
  trapFoco(modal);

  await carregarDadosDeposito(metaId);
  await carregarListaDepositos(metaId);
}

async function carregarDadosDeposito(metaId) {
  const meta = metasCarregadas.find((m) => m.id === metaId);
  if (!meta) return;

  const valorDepositado = await obterTotalDepositado(metaId);
  const valorMeta = valorMonetario(meta, "valor_limite");
  const percentual = Math.min((valorDepositado / valorMeta) * 100, 100);

  document.getElementById("deposito-valor-depositado").textContent = formatadorBRL.format(valorDepositado);
  document.getElementById("deposito-valor-meta").textContent = formatadorBRL.format(valorMeta);

  const barra = document.getElementById("deposito-barra-progresso");
  barra.style.width = `${percentual}%`;
  barra.className = `meta-deposito-progresso-barra ${percentual >= 100 ? "barra-estourou" : ""}`;

  const info = document.getElementById("deposito-info-progresso");
  const restante = valorMeta - valorDepositado;
  if (restante <= 0) {
    info.textContent = "Meta atingida!";
  } else {
    info.textContent = `Faltam ${formatadorBRL.format(restante)} (${Math.round(percentual)}%)`;
  }
}

async function obterTotalDepositado(metaId) {
  try {
    const resposta = await CadimusGoalsApi.listarDepositos(metaId);
    if (!resposta.ok) return 0;
    const depositos = await resposta.json();
    return somarValoresMonetarios(depositos);
  } catch {
    return 0;
  }
}

async function carregarListaDepositos(metaId) {
  const container = document.getElementById("lista-depositos");
  if (!container) return;

  try {
    const resposta = await CadimusGoalsApi.listarDepositos(metaId);
    if (!resposta.ok) {
      container.innerHTML = '<p class="historico-fixa-vazio">Erro ao carregar.</p>';
      return;
    }

    const depositos = await resposta.json();

    if (depositos.length === 0) {
      container.innerHTML = '<p class="historico-fixa-vazio">Nenhum depósito ainda.</p>';
      return;
    }

    container.innerHTML = "";
    depositos.forEach((d) => {
      const data = new Date(d.criado_em).toLocaleDateString("pt-BR");
      const linha = document.createElement("div");
      linha.className = "historico-deposito-linha";
      linha.innerHTML = `
        <span class="historico-deposito-data">${data}</span>
        <span class="historico-deposito-desc">${escaparHtml(d.descricao || "Depósito")}</span>
        <span class="historico-deposito-valor">+ ${formatadorBRL.format(valorMonetario(d))}</span>
        <button type="button" class="historico-deposito-excluir" data-id="${d.id}" title="Excluir">×</button>
      `;
      container.appendChild(linha);
    });

    container.querySelectorAll(".historico-deposito-excluir").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await excluirDeposito(Number(btn.dataset.id), metaId);
      });
    });
  } catch {
    container.innerHTML = '<p class="historico-fixa-vazio">Erro de conexão.</p>';
  }
}

async function excluirDeposito(depositoId, metaId) {
  if (!(await pedirConfirmacao("Excluir este depósito?", { textoConfirmar: "Excluir", perigo: true }))) return;

  try {
    const resposta = await CadimusGoalsApi.excluirDeposito(depositoId);
    if (resposta.ok) {
      await carregarDadosDeposito(metaId);
      await carregarListaDepositos(metaId);
      mostrarToast("Depósito excluído", "info");
    }
  } catch {
    await mostrarAviso("Erro de conexão.");
  }
}

function configurarModalDeposito() {
  const modal = document.getElementById("modal-meta-deposito");
  const btnFechar = document.getElementById("btn-fechar-modal-meta-deposito");
  const form = document.getElementById("form-meta-deposito");

  if (!modal || !btnFechar || !form) return;

  btnFechar.addEventListener("click", () => {
    modal.style.display = "none";
    liberarFoco();
    metaDepositandoId = null;
  });

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const metaId = Number(document.getElementById("deposito-meta-id").value);
    const valorPayload = montarPayloadMonetario("deposito-valor");
    const valor = valorPayload.valor;
    const descricao = document.getElementById("deposito-descricao").value.trim();
    const btn = document.getElementById("btn-confirmar-deposito");

    if (!Number.isFinite(valor) || valor <= 0) return;

    btn.disabled = true;
    btn.innerText = "Salvando...";

    try {
      const resposta = await CadimusGoalsApi.criarDeposito({
        metaId,
        valor,
        valorCentavos: valorPayload.valor_centavos,
        descricao,
      });

      if (tratarSessaoExpirada(resposta)) return;

      if (resposta.ok) {
        document.getElementById("deposito-valor").value = "";
        document.getElementById("deposito-descricao").value = "";
        await carregarDadosDeposito(metaId);
        await carregarListaDepositos(metaId);
        mostrarToast("Depósito registrado!");
      } else {
        const erro = await resposta.json();
        await mostrarAviso(`Erro: ${erro.erro}`);
      }
    } catch {
      await mostrarAviso("Erro de conexão ao depositar.");
    } finally {
      btn.disabled = false;
      btn.innerText = "Depositar";
    }
  });
}


// Utilitários de categorias ficam em categories-ui.js.

// Modal e CRUD de lançamentos ficam em entries-modal-ui.js.

// Listagem, filtros e animações de lançamentos ficam em entries-list-ui.js.

// Central de notificações fica em notifications-ui.js.

// Edição em lote e popup de nota ficam em batch-note-ui.js.

// Comparativo por período fica em period-comparison-ui.js.

// Carregamento principal de lançamentos fica em entries-loader-ui.js.

// Resumos do dashboard financeiro ficam em dashboard-summary-ui.js.

// Status, comparação mensal e autores ficam em dashboard-insights-ui.js.

// Gráficos do dashboard financeiro ficam em dashboard-charts-ui.js.

// Saúde financeira do dashboard fica em dashboard-health-ui.js.

// Relatório PDF do dashboard fica em dashboard-pdf-ui.js.

// Ações sensíveis de lançamentos ficam em entries-actions-ui.js.

// ==========================================
// [27] ADMIN: Painel, Usuários, Categorias
// ==========================================

// Entrada do painel admin/configurações fica em admin-shell-ui.js.

// --- PLANEJAMENTO ---
let planosCarregados = [];

// ==========================================
// [28] PLANEJAMENTO: Planos Financeiros
// ==========================================

function configurarPlano() {
  const btnPlano = document.getElementById("btn-planejamento");
  const btnVoltar = document.getElementById("btn-voltar-dashboard-plano");
  const secaoDashboard = document.getElementById("dashboard-section");
  const secaoPlano = document.getElementById("planejamento-section");

  if (!btnPlano || !btnVoltar || !secaoDashboard || !secaoPlano) return;

  btnPlano.addEventListener("click", () => {
    secaoDashboard.style.display = "none";
    secaoPlano.style.display = "flex";
    secaoPlano.style.flexDirection = "column";
    renderizarPlano();
  });

  btnVoltar.addEventListener("click", () => {
    secaoPlano.style.display = "none";
    secaoDashboard.style.display = "block";
    carregarLancamentos();
  });

  configurarTabsPlano();
  configurarSalarioPlano();
  configurarMetaPlano();
  configurarModalPlano();
  configurarModalPlanoDeposito();
}

function configurarTabsPlano() {
  document.querySelectorAll(".plano-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".plano-tab").forEach((t) => t.classList.remove("ativo"));
      document.querySelectorAll(".plano-painel").forEach((p) => (p.style.display = "none"));
      tab.classList.add("ativo");
      const painel = document.getElementById(tab.dataset.painel);
      if (painel) painel.style.display = "block";
      renderizarPlano();
    });
  });

  document.querySelectorAll(".plano-sub-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".plano-sub-tab").forEach((t) => t.classList.remove("ativo"));
      tab.classList.add("ativo");
      const tipo = tab.dataset.tipo;
      const listaMeus = document.getElementById("lista-planos");
      const listaCompartilhados = document.getElementById("lista-planos-compartilhados");
      const titulo = document.getElementById("titulo-lista-planos");

      if (tipo === "meus") {
        listaMeus.style.display = "block";
        listaCompartilhados.style.display = "none";
        titulo.textContent = "Meus planos";
      } else {
        listaMeus.style.display = "none";
        listaCompartilhados.style.display = "block";
        titulo.textContent = "Compartilhados";
        carregarPlanosCompartilhados();
      }
    });
  });
}

function configurarSalarioPlano() {
  const btnEditar = document.getElementById("btn-editar-salario");
  const btnSalvar = document.getElementById("btn-salvar-salario");
  const btnCancelar = document.getElementById("btn-cancelar-salario");
  const form = document.getElementById("plano-salario-form");
  const display = document.querySelector(".plano-salario-linha");
  const input = document.getElementById("plano-salario-input");

  if (!btnEditar || !btnSalvar || !btnCancelar || !form || !display || !input) return;

  btnEditar.addEventListener("click", () => {
    const usuario = obterUsuarioLogado();
    input.value = usuario.salario || "";
    form.style.display = "block";
    display.querySelector(".plano-salario-valor").style.display = "none";
    btnEditar.style.display = "none";
  });

  btnCancelar.addEventListener("click", () => {
    form.style.display = "none";
    display.querySelector(".plano-salario-valor").style.display = "";
    btnEditar.style.display = "";
  });

  btnSalvar.addEventListener("click", async () => {
    const valor = parseFloat(input.value) || 0;
    const usuario = obterUsuarioLogado();

    btnSalvar.disabled = true;
    btnSalvar.innerText = "Salvando...";

    try {
      const resposta = await CadimusAdminApi.atualizarUsuarioPorCaminho(usuario.id, { salario: valor });

      if (tratarSessaoExpirada(resposta)) return;

      if (resposta.ok) {
        usuario.salario = valor;
        localStorage.setItem("usuario", JSON.stringify(usuario));
        form.style.display = "none";
        display.querySelector(".plano-salario-valor").style.display = "";
        btnEditar.style.display = "";
        renderizarPlano();
        mostrarToast("Salário atualizado", "sucesso");
      }
    } catch (erro) {
      console.error("Erro ao salvar salário:", erro);
    } finally {
      btnSalvar.disabled = false;
      btnSalvar.innerText = "Salvar";
    }
  });
}

async function carregarPlanos() {
  try {
    const resposta = await CadimusPlanningApi.listarPlanos();
    if (tratarSessaoExpirada(resposta)) return;
    if (resposta.ok) {
      planosCarregados = await resposta.json();
    }
  } catch (erro) {
    console.error("Erro ao carregar planos:", erro);
  }
}

async function carregarPlanosCompartilhados() {
  const container = document.getElementById("lista-planos-compartilhados");
  if (!container) return;

  try {
    const resposta = await CadimusPlanningApi.listarPlanosCompartilhados();
    if (tratarSessaoExpirada(resposta)) return;
    if (resposta.ok) {
      const planos = await resposta.json();
      renderizarListaPlanosCompartilhados(planos);
    }
  } catch (erro) {
    console.error("Erro ao carregar planos compartilhados:", erro);
  }
}

function renderizarListaPlanosCompartilhados(planos) {
  const container = document.getElementById("lista-planos-compartilhados");
  if (!container) return;

  if (planos.length === 0) {
    container.innerHTML = '<div class="plano-vazio">Nenhum plano compartilhado por outros usuários.</div>';
    return;
  }

  container.innerHTML = planos.map((plano) => {
    const temPrazo = !!plano.data_limite;
    const dataFormatada = temPrazo ? new Date(plano.data_limite + "T12:00:00").toLocaleDateString("pt-BR") : "";
    const statusLabel = { ativo: "Ativo", concluido: "Concluído", cancelado: "Cancelado" }[plano.status] || plano.status;
    const prioridadeLabel = { alta: "Alta", media: "Média", baixa: "Baixa" }[plano.prioridade] || plano.prioridade;

    return `
      <div class="plano-card-item" data-id="${plano.id}">
        <div class="plano-card-topo">
          <div class="plano-card-icone" style="background: ${plano.cor}22">${plano.icone}</div>
          <div class="plano-card-info">
            <div class="plano-card-nome">${escaparHtml(plano.nome)} <span class="plano-badge-compartilhado">Compartilhado</span></div>
            <div class="plano-card-autor">Criado por ${escaparHtml(plano.criado_por_nome || "Usuário")}</div>
            ${plano.descricao ? `<div class="plano-card-desc">${escaparHtml(plano.descricao)}</div>` : ""}
          </div>
          <span class="plano-status-badge status-${plano.status}">${statusLabel}</span>
        </div>
        <div class="plano-card-barra">
          <div class="plano-card-barra-fill" style="width: ${plano.percentual}%; background: ${plano.cor}"></div>
        </div>
        <div class="plano-card-detalhes">
          <span>
            <span class="plano-card-valores">${formatadorBRL.format(valorMonetario(plano, "depositado"))} / ${formatadorBRL.format(valorMonetario(plano, "valor_alvo"))}</span>
            ${temPrazo ? ` · Prazo: ${dataFormatada}` : ""}
          </span>
          <span class="plano-card-prioridade prioridade-${plano.prioridade}">${prioridadeLabel}</span>
        </div>
      </div>
    `;
  }).join("");
}

function renderizarPlano() {
  const usuario = obterUsuarioLogado();
  const salario = usuario.salario || 0;

  const salarioDisplay = document.getElementById("plano-salario-display");
  if (salarioDisplay) {
    salarioDisplay.textContent = salario > 0 ? formatadorBRL.format(salario) : "Não definido";
  }

  renderizarKPIsPlano(salario);
  renderizarIndicadoresPlano(salario);
  renderizarAlertasPlano(salario);
  renderizarOrcamentosPlano();
  renderizarMetasPlano();
  renderizarReceitasPlano();
  renderizarDespesasPlano();
  renderizarComparacaoPlano();
  configurarSimulacaoPlano();
}

function renderizarGuardaPlano(salario) {
  const cardGuarda = document.getElementById("plano-card-guarda");
  const guardaValor = document.getElementById("plano-guarda-valor");
  const guardaDetalhe = document.getElementById("plano-guarda-detalhe");

  if (salario > 0 && cardGuarda) {
    let totalFixas = 0;
    let totalParcelas = 0;

    if (typeof despesasFixasCarregadas !== "undefined") {
      despesasFixasCarregadas.forEach((f) => { if (f.ativo) totalFixas += valorMonetario(f); });
    }
    if (typeof comprasParceladasCarregadas !== "undefined") {
      comprasParceladasCarregadas.forEach((c) => { if (c.ativo) totalParcelas += valorMonetario(c, "valor_parcela"); });
    }

    const sobra = salario - totalFixas - totalParcelas;
    const sobraPositiva = Math.max(0, sobra);
    const guardaSemanal = Math.round(sobraPositiva / 4);

    cardGuarda.style.display = "flex";
    guardaValor.textContent = formatadorBRL.format(sobraPositiva);
    guardaValor.style.color = sobra >= 0 ? "var(--cor-receita)" : "var(--cor-despesa)";

    if (sobra <= 0) {
      guardaDetalhe.textContent = "Suas fixas e parcelas consomem todo o salário.";
    } else {
      guardaDetalhe.textContent = `Dá pra guardar ~${formatadorBRL.format(guardaSemanal)}/semana.`;
    }

    const maxValor = Math.max(salario, 1);
    const el = (id) => document.getElementById(id);
    if (el("plano-barra-fixas")) el("plano-barra-fixas").style.width = `${Math.round((totalFixas / maxValor) * 100)}%`;
    if (el("plano-barra-parcelas")) el("plano-barra-parcelas").style.width = `${Math.round((totalParcelas / maxValor) * 100)}%`;
    if (el("plano-barra-sobra")) el("plano-barra-sobra").style.width = `${Math.round((sobraPositiva / maxValor) * 100)}%`;
    if (el("plano-valor-fixas")) el("plano-valor-fixas").textContent = formatadorBRL.format(totalFixas);
    if (el("plano-valor-parcelas")) el("plano-valor-parcelas").textContent = formatadorBRL.format(totalParcelas);
    if (el("plano-valor-sobra")) el("plano-valor-sobra").textContent = formatadorBRL.format(sobraPositiva);
  } else if (cardGuarda) {
    cardGuarda.style.display = "none";
  }
}

function renderizarDistribuicaoPlano(salario) {
  const container = document.getElementById("plano-distribuicao");
  if (!container) return;

  if (salario <= 0) {
    container.innerHTML = '<div class="plano-vazio">Defina o salário para ver a distribuição.</div>';
    return;
  }

  let totalFixas = 0;
  let totalParcelas = 0;
  let totalPlanos = 0;

  if (typeof despesasFixasCarregadas !== "undefined") {
    despesasFixasCarregadas.forEach((f) => { if (f.ativo) totalFixas += valorMonetario(f); });
  }
  if (typeof comprasParceladasCarregadas !== "undefined") {
    comprasParceladasCarregadas.forEach((c) => { if (c.ativo) totalParcelas += valorMonetario(c, "valor_parcela"); });
  }

  planosCarregados.forEach((p) => {
    if (p.status === "ativo" && p.parcela_mensal) totalPlanos += p.parcela_mensal;
  });

  const sobra = Math.max(0, salario - totalFixas - totalParcelas - totalPlanos);
  const itens = [];

  if (totalFixas > 0) {
    itens.push(`<div class="plano-dist-item">
      <span class="plano-dist-icone">🔁</span>
      <div class="plano-dist-info"><div class="plano-dist-nome">Despesas fixas</div><div class="plano-dist-detalhe">Mensal</div></div>
      <span class="plano-dist-valor">-${formatadorBRL.format(totalFixas)}</span>
    </div>`);
  }

  if (totalParcelas > 0) {
    itens.push(`<div class="plano-dist-item">
      <span class="plano-dist-icone">📦</span>
      <div class="plano-dist-info"><div class="plano-dist-nome">Parcelas</div><div class="plano-dist-detalhe">Mensal</div></div>
      <span class="plano-dist-valor">-${formatadorBRL.format(totalParcelas)}</span>
    </div>`);
  }

  if (totalPlanos > 0) {
    itens.push(`<div class="plano-dist-item">
      <span class="plano-dist-icone">🎯</span>
      <div class="plano-dist-info"><div class="plano-dist-nome">Planos ativos</div><div class="plano-dist-detalhe">${planosCarregados.filter((p) => p.status === "ativo" && p.parcela_mensal).length} plano(s)</div></div>
      <span class="plano-dist-valor">-${formatadorBRL.format(totalPlanos)}</span>
    </div>`);
  }

  itens.push(`<div class="plano-dist-item" style="border-bottom: none; padding-top: 0.75rem">
    <span class="plano-dist-icone">💰</span>
    <div class="plano-dist-info"><div class="plano-dist-nome" style="font-weight: 700">Sobra mensal</div></div>
    <span class="plano-dist-restante">${formatadorBRL.format(sobra)}</span>
  </div>`);

  container.innerHTML = itens.join("");
}

// --- KPIs DO PLANEJAMENTO ---
function renderizarKPIsPlano(salario) {
  const el = (id) => document.getElementById(id);
  let totalFixas = 0, totalParcelas = 0;
  if (typeof despesasFixasCarregadas !== "undefined") despesasFixasCarregadas.forEach((f) => { if (f.ativo) totalFixas += valorMonetario(f); });
  if (typeof comprasParceladasCarregadas !== "undefined") comprasParceladasCarregadas.forEach((c) => { if (c.ativo) totalParcelas += valorMonetario(c, "valor_parcela"); });

  const despesasPlanejadas = totalFixas + totalParcelas;
  const economia = Math.max(0, salario - despesasPlanejadas);
  const pct = salario > 0 ? ((economia / salario) * 100).toFixed(1) : "0";

  if (el("plano-kpi-receita")) el("plano-kpi-receita").textContent = formatadorBRL.format(salario);
  if (el("plano-kpi-despesas")) el("plano-kpi-despesas").textContent = formatadorBRL.format(despesasPlanejadas);
  if (el("plano-kpi-economia")) el("plano-kpi-economia").textContent = formatadorBRL.format(economia);
  if (el("plano-kpi-pct")) el("plano-kpi-pct").textContent = `${pct}%`;
  if (el("plano-kpi-saldo")) {
    el("plano-kpi-saldo").textContent = formatadorBRL.format(economia);
    el("plano-kpi-saldo").style.color = economia >= 0 ? "var(--cor-receita)" : "var(--cor-despesa)";
  }
}

// --- INDICADORES FINANCEIROS ---
function renderizarIndicadoresPlano(salario) {
  const container = document.getElementById("plano-indicadores");
  if (!container) return;

  let totalFixas = 0, totalParcelas = 0;
  if (typeof despesasFixasCarregadas !== "undefined") despesasFixasCarregadas.forEach((f) => { if (f.ativo) totalFixas += valorMonetario(f); });
  if (typeof comprasParceladasCarregadas !== "undefined") comprasParceladasCarregadas.forEach((c) => { if (c.ativo) totalParcelas += valorMonetario(c, "valor_parcela"); });

  const despesasFixas = totalFixas;
  const despesasVar = totalParcelas;
  const comprometido = despesasFixas + despesasVar;
  const pctComprometido = salario > 0 ? ((comprometido / salario) * 100).toFixed(1) : "0";
  const capacidadeInvest = Math.max(0, salario - comprometido);

  const itens = [
    { nome: "Taxa de economia", valor: `${salario > 0 ? (((salario - comprometido) / salario) * 100).toFixed(0) : 0}%`, cor: "var(--cor-receita)", bg: "rgba(46,125,50,0.1)" },
    { nome: "Renda comprometida", valor: `${pctComprometido}%`, cor: "var(--cor-despesa)", bg: "rgba(198,40,40,0.1)" },
    { nome: "Investimentos", valor: formatadorBRL.format(planosCarregados.filter((p) => p.status === "ativo" && p.tipo === "investimento").reduce((s, p) => s + (p.parcela_mensal || 0), 0)), cor: "var(--cor-marca)", bg: "rgba(169,122,47,0.1)" },
    { nome: "Despesas fixas", valor: formatadorBRL.format(despesasFixas), cor: "var(--cor-texto)", bg: "var(--cor-fundo)" },
    { nome: "Despesas variáveis", valor: formatadorBRL.format(despesasVar), cor: "var(--cor-texto)", bg: "var(--cor-fundo)" },
    { nome: "Capacidade de invest.", valor: formatadorBRL.format(capacidadeInvest), cor: "var(--cor-receita)", bg: "rgba(46,125,50,0.1)" },
  ];

  container.innerHTML = itens.map((item) => `
    <div class="plano-ind-item">
      <div class="plano-ind-icone" style="background:${item.bg};color:${item.cor}">•</div>
      <div class="plano-ind-info">
        <div class="plano-ind-nome">${item.nome}</div>
        <div class="plano-ind-valor" style="color:${item.cor}">${item.valor}</div>
      </div>
    </div>
  `).join("");
}

// --- ALERTAS ---
function renderizarAlertasPlano(salario) {
  const card = document.getElementById("plano-card-alertas");
  const container = document.getElementById("plano-alertas");
  if (!card || !container) return;

  const alertas = [];
  let totalFixas = 0, totalParcelas = 0;
  if (typeof despesasFixasCarregadas !== "undefined") despesasFixasCarregadas.forEach((f) => { if (f.ativo) totalFixas += valorMonetario(f); });
  if (typeof comprasParceladasCarregadas !== "undefined") comprasParceladasCarregadas.forEach((c) => { if (c.ativo) totalParcelas += valorMonetario(c, "valor_parcela"); });

  const comprometido = totalFixas + totalParcelas;
  const pct = salario > 0 ? (comprometido / salario) * 100 : 0;

  if (pct > 90) alertas.push({ tipo: "erro", texto: `Seu orçamento está ${pct.toFixed(0)}% comprometido. Considere reduzir gastos.` });
  else if (pct > 70) alertas.push({ tipo: "aviso", texto: `Seu orçamento está ${pct.toFixed(0)}% comprometido. Atenção aos gastos.` });
  else if (salario > 0) alertas.push({ tipo: "ok", texto: `Parabéns! Apenas ${pct.toFixed(0)}% da renda está comprometida.` });

  if (typeof ultimoLoteLancamentos !== "undefined") {
    const atrasados = ultimoLoteLancamentos.filter((l) => l.status === "atrasado");
    if (atrasados.length > 0) alertas.push({ tipo: "erro", texto: `Você tem ${atrasados.length} conta(s) atrasada(s).` });
  }

  if (alertas.length === 0) { card.style.display = "none"; return; }
  card.style.display = "flex";
  container.innerHTML = alertas.map((a) => `<div class="plano-alerta-item plano-alerta-${a.tipo}">${a.texto}</div>`).join("");
}

// --- ORÇAMENTO POR CATEGORIA ---
function renderizarOrcamentosPlano() {
  const container = document.getElementById("plano-lista-orcamentos");
  if (!container) return;

  if (typeof orcamentosCarregados === "undefined" || orcamentosCarregados.length === 0) {
    container.innerHTML = '<div class="plano-vazio">Nenhum orçamento definido. Clique em "+ Novo orçamento" para começar.</div>';
    return;
  }

  container.innerHTML = orcamentosCarregados.map((o) => {
    const gasto = valorMonetario(o, "gasto_atual");
    const limite = valorMonetario(o, "valor_limite");
    const pct = limite > 0 ? Math.min((gasto / limite) * 100, 100) : 0;
    const cor = pct >= 90 ? "var(--cor-despesa)" : pct >= 70 ? "var(--cor-pendente)" : "var(--cor-receita)";
    return `
      <div class="plano-lista-item">
        <div class="plano-lista-info">
          <div class="plano-lista-nome">${escaparHtml(o.categoria)}</div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
            <div style="flex:1;height:6px;background:var(--cor-pauta-forte);border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:${cor};border-radius:3px"></div>
            </div>
            <span style="font-size:0.7rem;color:${cor}">${pct.toFixed(0)}%</span>
          </div>
        </div>
        <div class="plano-lista-valor" style="color:${cor}">${formatadorBRL.format(gasto)} / ${formatadorBRL.format(limite)}</div>
      </div>`;
  }).join("");
}

// --- RECEITAS PLANEJADAS ---
function renderizarReceitasPlano() {
  const container = document.getElementById("plano-lista-receitas");
  if (!container) return;

  if (typeof ultimoLoteLancamentos === "undefined") {
    container.innerHTML = '<div class="plano-vazio">Carregue os lançamentos primeiro.</div>';
    return;
  }

  const receitas = ultimoLoteLancamentos.filter((l) => l.tipo === "receita");
  if (receitas.length === 0) {
    container.innerHTML = '<div class="plano-vazio">Nenhuma receita registrada neste período.</div>';
    return;
  }

  container.innerHTML = receitas.map((r) => {
    const statusCls = r.status === "pago" ? "plano-status-recebido" : "plano-status-pendente";
    const statusLabel = r.status === "pago" ? "Recebido" : "Pendente";
    return `
      <div class="plano-lista-item">
        <div class="plano-lista-info">
          <div class="plano-lista-nome">${escaparHtml(r.descricao || r.categoria)}</div>
          <div class="plano-lista-detalhe">${new Date(r.data_compra + "T12:00:00").toLocaleDateString("pt-BR")} · ${escaparHtml(r.categoria || "")}</div>
        </div>
        <span class="plano-lista-status ${statusCls}">${statusLabel}</span>
        <span class="plano-lista-valor" style="color:var(--cor-receita)">+${formatadorBRL.format(valorMonetario(r))}</span>
      </div>`;
  }).join("");
}

// --- DESPESAS PLANEJADAS ---
function renderizarDespesasPlano() {
  const container = document.getElementById("plano-lista-despesas");
  if (!container) return;

  const itens = [];
  if (typeof despesasFixasCarregadas !== "undefined") {
    despesasFixasCarregadas.filter((f) => f.ativo).forEach((f) => {
      itens.push({ nome: f.descricao, valor: valorMonetario(f), cat: f.categoria, freq: "Mensal", tipo: "fixa" });
    });
  }
  if (typeof comprasParceladasCarregadas !== "undefined") {
    comprasParceladasCarregadas.filter((c) => c.ativo).forEach((c) => {
      itens.push({ nome: c.descricao, valor: valorMonetario(c, "valor_parcela"), cat: c.categoria, freq: `Parcela ${c.parcela_atual || 1}/${c.total_parcelas}`, tipo: "parcela" });
    });
  }

  if (itens.length === 0) {
    container.innerHTML = '<div class="plano-vazio">Nenhuma despesa fixa ou parcelada ativa.</div>';
    return;
  }

  container.innerHTML = itens.map((d) => `
    <div class="plano-lista-item">
      <div class="plano-lista-info">
        <div class="plano-lista-nome">${escaparHtml(d.nome)}</div>
        <div class="plano-lista-detalhe">${escaparHtml(d.cat || "")} · ${d.freq}</div>
      </div>
      <span class="plano-lista-valor" style="color:var(--cor-despesa)">-${formatadorBRL.format(d.valor)}</span>
    </div>
  `).join("");
}

// --- COMPARAÇÃO PLANEJADO × REAL ---
function renderizarComparacaoPlano() {
  const container = document.getElementById("plano-comparacao");
  if (!container) return;

  if (typeof orcamentosCarregados === "undefined" || orcamentosCarregados.length === 0) {
    container.innerHTML = '<div class="plano-vazio">Defina orçamentos para ver a comparação.</div>';
    return;
  }

  const header = `<div class="plano-comp-linha plano-comp-header"><span>Categoria</span><span style="text-align:right">Planejado</span><span style="text-align:right">Real</span><span style="text-align:right">Diferença</span></div>`;

  const linhas = orcamentosCarregados.map((o) => {
    const real = valorMonetario(o, "gasto_atual");
    const limite = valorMonetario(o, "valor_limite");
    const diff = real - limite;
    const diffLabel = diff > 0 ? `+${formatadorBRL.format(diff)}` : diff < 0 ? formatadorBRL.format(diff) : "—";
    const cls = diff > 0 ? "positivo" : diff < 0 ? "negativo" : "";
    return `<div class="plano-comp-linha"><span class="plano-comp-categoria">${escaparHtml(o.categoria)}</span><span class="plano-comp-valor">${formatadorBRL.format(limite)}</span><span class="plano-comp-valor">${formatadorBRL.format(real)}</span><span class="plano-comp-diferenca ${cls}">${diffLabel}</span></div>`;
  }).join("");

  container.innerHTML = header + linhas;
}

// --- SIMULAÇÃO ---
function configurarSimulacaoPlano() {
  const btn = document.getElementById("btn-simular");
  const input = document.getElementById("simulacao-valor");
  const resultado = document.getElementById("plano-resultado-simulacao");
  if (!btn || !input || !resultado) return;

  btn.onclick = () => {
    const valor = parseFloat(input.value) || 0;
    if (valor <= 0) return;

    resultado.innerHTML = `
      <div class="plano-sim-result">
        <div class="plano-sim-card">
          <div class="plano-sim-periodo">Em 12 meses</div>
          <div class="plano-sim-valor">${formatadorBRL.format(valor * 12)}</div>
        </div>
        <div class="plano-sim-card">
          <div class="plano-sim-periodo">Em 24 meses</div>
          <div class="plano-sim-valor">${formatadorBRL.format(valor * 24)}</div>
        </div>
        <div class="plano-sim-card">
          <div class="plano-sim-periodo">Em 60 meses</div>
          <div class="plano-sim-valor">${formatadorBRL.format(valor * 60)}</div>
        </div>
      </div>
    `;
  };
}

function renderizarListaPlanos() {
  const container = document.getElementById("lista-planos");
  if (!container) return;

  if (planosCarregados.length === 0) {
    container.innerHTML = '<div class="plano-vazio">Nenhum plano criado. Crie um plano para organizar seus objetivos!</div>';
    return;
  }

  container.innerHTML = planosCarregados.map((plano) => {
    const temPrazo = !!plano.data_limite;
    const dataFormatada = temPrazo ? new Date(plano.data_limite + "T12:00:00").toLocaleDateString("pt-BR") : "";
    const statusLabel = { ativo: "Ativo", concluido: "Concluído", cancelado: "Cancelado" }[plano.status] || plano.status;
    const prioridadeLabel = { alta: "Alta", media: "Média", baixa: "Baixa" }[plano.prioridade] || plano.prioridade;

    return `
      <div class="plano-card-item" data-id="${plano.id}">
        <div class="plano-card-topo">
          <div class="plano-card-icone" style="background: ${plano.cor}22">${plano.icone}</div>
          <div class="plano-card-info">
            <div class="plano-card-nome">${escaparHtml(plano.nome)} ${plano.compartilhado ? '<span class="plano-badge-compartilhado">Compartilhado</span>' : ""}</div>
            ${plano.descricao ? `<div class="plano-card-desc">${escaparHtml(plano.descricao)}</div>` : ""}
          </div>
          <span class="plano-status-badge status-${plano.status}">${statusLabel}</span>
        </div>
        <div class="plano-card-barra">
          <div class="plano-card-barra-fill" style="width: ${plano.percentual}%; background: ${plano.cor}"></div>
        </div>
        <div class="plano-card-detalhes">
          <span>
            <span class="plano-card-valores">${formatadorBRL.format(valorMonetario(plano, "depositado"))} / ${formatadorBRL.format(valorMonetario(plano, "valor_alvo"))}</span>
            ${temPrazo ? ` · Prazo: ${dataFormatada}` : ""}
          </span>
          <span class="plano-card-prioridade prioridade-${plano.prioridade}">${prioridadeLabel}</span>
        </div>
        ${plano.status === "ativo" && plano.parcela_mensal ? `<div class="plano-card-detalhes"><span>Guarda mensal necessária</span><span class="plano-card-badge">~${formatadorBRL.format(plano.parcela_mensal)}/mês</span></div>` : ""}
        ${plano.status === "ativo" ? `
        <div class="plano-card-acoes">
          <button type="button" class="btn-link-adicionar plano-btn-depositar" data-id="${plano.id}">Depositar</button>
          <button type="button" class="btn-link-adicionar plano-btn-editar-plano" data-id="${plano.id}">Editar</button>
          <button type="button" class="btn-link-adicionar plano-btn-concluir" data-id="${plano.id}">Concluir</button>
          <button type="button" class="btn-link-adicionar plano-btn-cancelar" data-id="${plano.id}" style="color: var(--cor-despesa)">Cancelar</button>
        </div>` : ""}
      </div>
    `;
  }).join("");

  container.querySelectorAll(".plano-btn-depositar").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      abrirModalPlanoDeposito(Number(btn.dataset.id));
    });
  });

  container.querySelectorAll(".plano-btn-editar-plano").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const plano = planosCarregados.find((p) => p.id === Number(btn.dataset.id));
      if (plano) abrirModalPlano(plano);
    });
  });

  container.querySelectorAll(".plano-btn-concluir").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!(await pedirConfirmacao("Marcar este plano como concluído?"))) return;
      await atualizarStatusPlano(Number(btn.dataset.id), "concluido");
    });
  });

  container.querySelectorAll(".plano-btn-cancelar").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!(await pedirConfirmacao("Cancelar este plano?", { textoConfirmar: "Cancelar plano", perigo: true }))) return;
      await atualizarStatusPlano(Number(btn.dataset.id), "cancelado");
    });
  });
}

async function atualizarStatusPlano(id, status) {
  try {
    const resposta = await CadimusPlanningApi.atualizarStatusPlano(id, status);
    if (tratarSessaoExpirada(resposta)) return;
    if (resposta.ok) {
      mostrarToast(status === "concluido" ? "Plano concluído!" : "Plano cancelado.", "info");
      await carregarPlanos();
      renderizarListaPlanos();
      renderizarDistribuicaoPlano(obterUsuarioLogado().salario || 0);
    }
  } catch (erro) {
    console.error("Erro ao atualizar plano:", erro);
  }
}

// --- MODAL PLANO ---
function configurarModalPlano() {
  const modal = document.getElementById("modal-plano");
  const btnNovo = document.getElementById("btn-novo-plano");
  const btnFechar = document.getElementById("btn-fechar-modal-plano");
  const form = document.getElementById("form-plano");

  if (!btnNovo || !btnFechar || !form) return;

  btnNovo.addEventListener("click", () => abrirModalPlano(null));
  btnFechar.addEventListener("click", () => { modal.style.display = "none"; liberarFoco(); });

  document.querySelectorAll(".plano-icone-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".plano-icone-btn").forEach((b) => b.classList.remove("selecionado"));
      btn.classList.add("selecionado");
      document.getElementById("plano-icone").value = btn.dataset.icone;
    });
  });

  document.querySelectorAll(".plano-cor-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".plano-cor-btn").forEach((b) => b.classList.remove("selecionado"));
      btn.classList.add("selecionado");
      document.getElementById("plano-cor").value = btn.dataset.cor;
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const idEdicao = document.getElementById("plano-editando-id").value;
    const dados = {
      nome: document.getElementById("plano-nome").value.trim(),
      descricao: document.getElementById("plano-descricao").value.trim(),
      ...montarPayloadMonetario("plano-valor-alvo", "valor_alvo"),
      data_limite: document.getElementById("plano-data-limite").value || null,
      prioridade: document.getElementById("plano-prioridade").value,
      icone: document.getElementById("plano-icone").value,
      cor: document.getElementById("plano-cor").value,
      compartilhado: document.getElementById("plano-compartilhado").checked,
    };

    if (!dados.nome) return mostrarToast("Informe o nome do plano.", "erro");
    if (!dados.valor_alvo || dados.valor_alvo <= 0) return mostrarToast("Informe um valor alvo válido.", "erro");

    try {
      let resposta;
      if (idEdicao) {
        resposta = await CadimusPlanningApi.salvarPlano(dados, idEdicao);
      } else {
        resposta = await CadimusPlanningApi.salvarPlano(dados);
      }

      if (tratarSessaoExpirada(resposta)) return;
      if (resposta.ok) {
        mostrarToast(idEdicao ? "Plano atualizado!" : "Plano criado!", "sucesso");
        modal.style.display = "none";
        liberarFoco();
        await carregarPlanos();
        renderizarListaPlanos();
        renderizarDistribuicaoPlano(obterUsuarioLogado().salario || 0);
      } else {
        const erro = await resposta.json();
        mostrarToast(erro.erro || "Erro ao salvar plano.", "erro");
      }
    } catch (erro) {
      console.error("Erro ao salvar plano:", erro);
    }
  });
}

function abrirModalPlano(plano) {
  const modal = document.getElementById("modal-plano");
  const titulo = document.getElementById("titulo-modal-plano");
  const form = document.getElementById("form-plano");

  if (!modal || !form) return;

  form.reset();
  document.getElementById("plano-editando-id").value = "";
  document.querySelectorAll(".plano-icone-btn").forEach((b) => b.classList.remove("selecionado"));
  document.querySelectorAll(".plano-cor-btn").forEach((b) => b.classList.remove("selecionado"));

  if (plano) {
    titulo.textContent = "Editar plano";
    document.getElementById("plano-editando-id").value = plano.id;
    document.getElementById("plano-nome").value = plano.nome;
    document.getElementById("plano-descricao").value = plano.descricao || "";
    document.getElementById("plano-valor-alvo").value = valorMonetario(plano, "valor_alvo");
    document.getElementById("plano-data-limite").value = plano.data_limite || "";
    document.getElementById("plano-prioridade").value = plano.prioridade;
    document.getElementById("plano-icone").value = plano.icone;
    document.getElementById("plano-cor").value = plano.cor;
    document.getElementById("plano-compartilhado").checked = plano.compartilhado === 1;

    const iconeBtn = document.querySelector(`.plano-icone-btn[data-icone="${plano.icone}"]`);
    if (iconeBtn) iconeBtn.classList.add("selecionado");
    const corBtn = document.querySelector(`.plano-cor-btn[data-cor="${plano.cor}"]`);
    if (corBtn) corBtn.classList.add("selecionado");
  } else {
    titulo.textContent = "Novo plano";
    document.getElementById("plano-icone").value = "🎯";
    document.getElementById("plano-cor").value = "#6366f1";
    document.getElementById("plano-compartilhado").checked = false;
    const btnPadrao = document.querySelector('.plano-icone-btn[data-icone="🎯"]');
    if (btnPadrao) btnPadrao.classList.add("selecionado");
    const corPadrao = document.querySelector('.plano-cor-btn[data-cor="#6366f1"]');
    if (corPadrao) corPadrao.classList.add("selecionado");
  }

  modal.style.display = "flex";
  capturarFoco(modal);
}

// --- MODAL DEPÓSITO PLANO ---
function configurarModalPlanoDeposito() {
  const modal = document.getElementById("modal-plano-deposito");
  const btnFechar = document.getElementById("btn-fechar-modal-plano-deposito");
  const form = document.getElementById("form-plano-deposito");

  if (!btnFechar || !form) return;

  btnFechar.addEventListener("click", () => { modal.style.display = "none"; liberarFoco(); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const planoId = document.getElementById("plano-dep-id").value;
    const valorPayload = montarPayloadMonetario("plano-dep-valor");
    const valor = valorPayload.valor;
    const descricao = document.getElementById("plano-dep-descricao").value.trim();

    if (!valor || valor <= 0) return mostrarToast("Informe um valor válido.", "erro");

    try {
      const resposta = await CadimusPlanningApi.criarDepositoPlano({
        planoId,
        valor,
        valorCentavos: valorPayload.valor_centavos,
        descricao,
      });

      if (tratarSessaoExpirada(resposta)) return;
      if (resposta.ok) {
        mostrarToast("Depósito registrado!", "sucesso");
        document.getElementById("plano-dep-valor").value = "";
        document.getElementById("plano-dep-descricao").value = "";
        await carregarPlanos();
        const plano = planosCarregados.find((p) => p.id === Number(planoId));
        if (plano) preencherModalDepositoPlano(plano);
        renderizarListaPlanos();
        renderizarDistribuicaoPlano(obterUsuarioLogado().salario || 0);
      } else {
        const erro = await resposta.json();
        mostrarToast(erro.erro || "Erro ao registrar depósito.", "erro");
      }
    } catch (erro) {
      console.error("Erro ao registrar depósito:", erro);
    }
  });
}

async function abrirModalPlanoDeposito(planoId) {
  const modal = document.getElementById("modal-plano-deposito");
  if (!modal) return;

  const plano = planosCarregados.find((p) => p.id === planoId);
  if (!plano) return;

  preencherModalDepositoPlano(plano);

  const { results: depositos } = await CadimusPlanningApi.listarDepositosPlano(planoId)
    .then((r) => r.json())
    .then((dados) => ({ results: Array.isArray(dados) ? dados : [] }))
    .catch(() => ({ results: [] }));

  const lista = document.getElementById("lista-plano-depositos");
  if (lista) {
    if (depositos.length === 0) {
      lista.innerHTML = '<div class="plano-vazio" style="padding: 0.5rem">Nenhum depósito ainda.</div>';
    } else {
      lista.innerHTML = depositos.map((d) => `
        <div class="historico-fixa-linha">
          <div class="historico-fixa-info">
            <span class="historico-fixa-desc">${escaparHtml(d.descricao || "Depósito")}</span>
            <span class="historico-fixa-data">${new Date(d.criado_em).toLocaleDateString("pt-BR")}</span>
          </div>
        <span class="historico-fixa-valor">+${formatadorBRL.format(valorMonetario(d))}</span>
        </div>
      `).join("");
    }
  }

  modal.style.display = "flex";
  capturarFoco(modal);
}

function preencherModalDepositoPlano(plano) {
  document.getElementById("plano-dep-id").value = plano.id;
  document.getElementById("plano-dep-valor-depositado").textContent = formatadorBRL.format(valorMonetario(plano, "depositado"));
  document.getElementById("plano-dep-valor-objetivo").textContent = formatadorBRL.format(valorMonetario(plano, "valor_alvo"));
  document.getElementById("plano-dep-barra-progresso").style.width = `${plano.percentual}%`;
  document.getElementById("plano-dep-info-progresso").textContent = `${plano.percentual}% concluído`;
  document.querySelector(".plano-deposito-icone").textContent = plano.icone;
  document.querySelector(".plano-deposito-nome").textContent = plano.nome;
  document.querySelector(".plano-deposito-icone").style.background = `${plano.cor}22`;
}

// --- METAS NO PLANEJAMENTO ---
function configurarMetaPlano() {
  const btnNovaMeta = document.getElementById("btn-nova-meta-plano");
  if (!btnNovaMeta) return;
  btnNovaMeta.addEventListener("click", () => abrirModalMeta("", "", null));
}

function renderizarMetasPlano() {
  const container = document.getElementById("plano-lista-metas");
  if (!container) return;

  if (typeof metasCarregadas === "undefined" || metasCarregadas.length === 0) {
    container.innerHTML = '<div class="plano-vazio">Nenhuma meta criada ainda.</div>';
    return;
  }

  container.innerHTML = metasCarregadas.map((meta) => {
    const valorLimite = valorMonetario(meta, "valor_limite");
    const totalDepositado = valorMonetario(meta, "total_depositado");
    const percentual = valorLimite > 0 ? Math.min(100, Math.round((totalDepositado / valorLimite) * 100)) : 0;
    const temPrazo = !!meta.data_limite;

    return `
      <div class="plano-meta-item" data-id="${meta.id}">
        <div class="plano-meta-topo">
          <span class="plano-meta-categoria">${escaparHtml(meta.categoria)}</span>
          <span class="plano-meta-valor">${formatadorBRL.format(totalDepositado)} / ${formatadorBRL.format(valorLimite)}</span>
        </div>
        <div class="plano-meta-barra">
          <div class="plano-meta-preenchimento" style="width: ${percentual}%"></div>
        </div>
        <div class="plano-meta-detalhes">
          <span>${percentual}% concluído${temPrazo ? ` · Prazo: ${new Date(meta.data_limite + "T12:00:00").toLocaleDateString("pt-BR")}` : ""}</span>
          ${temPrazo && meta.falta > 0 ? `<span class="plano-meta-badge-semana">~${formatadorBRL.format(valorMonetario(meta, "guarda_semanal"))}/sem.</span>` : ""}
        </div>
        <div class="plano-meta-acoes">
          <button type="button" class="btn-link-adicionar plano-btn-depositar" data-id="${meta.id}" data-categoria="${escaparHtml(meta.categoria)}">Depositar</button>
          <button type="button" class="btn-link-adicionar plano-btn-editar" data-categoria="${escaparHtml(meta.categoria)}" data-valor="${valorMonetario(meta, "valor_limite")}" data-datalimite="${meta.data_limite || ""}">Editar</button>
        </div>
      </div>
    `;
  }).join("");

  container.querySelectorAll(".plano-btn-depositar").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      abrirModalDeposito(Number(btn.dataset.id), btn.dataset.categoria);
    });
  });

  container.querySelectorAll(".plano-btn-editar").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      abrirModalMeta(btn.dataset.categoria, btn.dataset.valor, btn.dataset.datalimite || null);
    });
  });
}

// Abas e preferências do admin/configurações ficam em admin-settings-ui.js.

// --- FOTO DE PERFIL: redimensiona e comprime no navegador antes de enviar ---
// Evita mandar fotos de celular (que podem vir com vários MB) pro backend;
// aqui já sai como base64 pequeno, do tamanho certo pra um avatar.
function comprimirImagemParaBase64(arquivo, ladoMaximo = 256, qualidade = 0.8) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    leitor.onload = () => {
      const imagem = new Image();
      imagem.onerror = () => reject(new Error("Arquivo não é uma imagem válida."));
      imagem.onload = () => {
        const escala = Math.min(1, ladoMaximo / Math.max(imagem.width, imagem.height));
        const largura = Math.round(imagem.width * escala);
        const altura = Math.round(imagem.height * escala);

        const canvas = document.createElement("canvas");
        canvas.width = largura;
        canvas.height = altura;
        canvas.getContext("2d").drawImage(imagem, 0, 0, largura, altura);

        resolve(canvas.toDataURL("image/jpeg", qualidade));
      };
      imagem.src = leitor.result;
    };
    leitor.readAsDataURL(arquivo);
  });
}

function definirPreviewFoto(dataUrl) {
  const preview = document.getElementById("preview-foto-perfil");
  const vazio = document.getElementById("avatar-vazio");
  const btnRemover = document.getElementById("btn-remover-foto");
  document.getElementById("nova-foto-perfil").value = dataUrl || "";

  // Sanitizar URL (data URLs de preview são permitidos, http/https também)
  const urlSegura = dataUrl && (dataUrl.startsWith("data:") || sanitizarUrl(dataUrl)) ? dataUrl : "";

  if (urlSegura) {
    preview.src = urlSegura;
    preview.style.display = "block";
    vazio.style.display = "none";
    btnRemover.style.display = "inline-block";
  } else {
    preview.src = "";
    preview.style.display = "none";
    vazio.style.display = "flex";
    btnRemover.style.display = "none";
  }
}

// Usuários e convites do admin ficam em admin-users-ui.js.

// Categorias do admin ficam em admin-categories-ui.js.

// ==========================================
// [29] EXPORTAÇÃO GLOBAL
// ==========================================

window.carregarLancamentos = carregarLancamentos;
window.apagarLancamento = apagarLancamento;
window.alternarStatusLancamento = alternarStatusLancamento;
window.editarLancamento = editarLancamento;
window.carregarCarteiras = carregarCarteiras;

// Renomeação de categorias fica em admin-categories-ui.js.

// Estrutura e carregamento dos relatórios ficam em reports-shell-ui.js.

// KPIs e gráficos dos relatórios ficam em reports-charts-ui.js.

// Tabelas, comparativos e insights dos relatórios ficam em reports-tables-ui.js.

// Exportação dos relatórios fica em reports-export-ui.js.
