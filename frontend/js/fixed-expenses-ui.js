// ==========================================
// fixed-expenses-ui.js - Despesas fixas
// ==========================================
// ==========================================
// [8] DESPESAS FIXAS
// ==========================================

let despesasFixasCarregadas = [];

function sincronizarVencimentoFixaComCartao() {
  const campoDia = document.getElementById("fixa-dia");
  const selectCartao = document.getElementById("fixa-cartao-credito");
  if (!campoDia || !selectCartao) return;

  const opcaoSelecionada = selectCartao.selectedOptions?.[0];
  const diaVencimento = opcaoSelecionada?.dataset?.diaVencimento || "";

  if (selectCartao.value && diaVencimento) {
    campoDia.value = diaVencimento;
    campoDia.readOnly = true;
    campoDia.classList.add("campo-bloqueado-cartao");
    campoDia.title = "Vencimento definido pelo cartão selecionado.";
  } else {
    campoDia.readOnly = false;
    campoDia.classList.remove("campo-bloqueado-cartao");
    campoDia.title = "";
  }
}

function fecharModalDespesaFixa() {
  const modal = document.getElementById("modal-despesas-fixas");
  const form = document.getElementById("form-despesa-fixa");

  modal.style.display = "none";
  liberarFoco();
  form.reset();
  document.getElementById("fixa-editando-id").value = "";
  document.getElementById("titulo-modal-fixa").innerText = "Despesas fixas";
  document.getElementById("btn-salvar-fixa").innerText = "Salvar";
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
  document.getElementById("btn-salvar-fixa").innerText = "Salvar";
  await popularSelectCategorias(document.getElementById("fixa-categoria"));
  await popularSelectCartoesCredito?.(document.getElementById("fixa-cartao-credito"), carteiraId);
  sincronizarVencimentoFixaComCartao();
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
  definirValorInputMonetario("fixa-valor", valorMonetario(fixa));
  document.getElementById("fixa-dia").value = fixa.dia_vencimento;
  document.getElementById("fixa-categoria").value = fixa.categoria;
  document.getElementById("fixa-meio-pagamento").value = fixa.meio_pagamento;
  document.getElementById("fixa-tipo").value = fixa.tipo;
  await popularSelectCartoesCredito?.(document.getElementById("fixa-cartao-credito"), fixa.carteira_id, fixa.cartao_credito_id || "");
  document.getElementById("fixa-cartao-credito").value = fixa.cartao_credito_id || "";
  document.getElementById("fixa-meio-pagamento")?.dispatchEvent(new Event("change"));
  sincronizarVencimentoFixaComCartao();

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

  configurarCampoCartaoCredito?.({
    campoId: "campo-cartao-fixa",
    selectId: "fixa-cartao-credito",
    meioId: "fixa-meio-pagamento",
    tipoId: "fixa-tipo",
  });

  document.getElementById("fixa-cartao-credito")?.addEventListener("change", sincronizarVencimentoFixaComCartao);
  document.getElementById("fixa-meio-pagamento")?.addEventListener("change", sincronizarVencimentoFixaComCartao);
  document.getElementById("fixa-tipo")?.addEventListener("change", sincronizarVencimentoFixaComCartao);

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
        cartao_credito_id: document.getElementById("fixa-cartao-credito")?.value || null,
      };
      if (!idEdicao) corpo.carteira_id = carteiraId; // carteira só é definida na criação, não muda na edição

      const resposta = await CadimusScheduledApi.salvarFixa(corpo, idEdicao || null);

      if (tratarSessaoExpirada(resposta)) return;

      if (resposta.ok) {
        fecharModalDespesaFixa();
        carregarPainelDespesasFixas();
        await recarregarLancamentosAposMutacao();
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
      btnSalvar.innerText = idEdicao ? "Salvar edição" : "Salvar";
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
      div.className = `linha-item linha-usuario lancamento-recorrente-card lancamento-recorrente-fixa ${classeDestaque}`.trim();
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
