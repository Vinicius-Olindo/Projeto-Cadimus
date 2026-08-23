// ==========================================
// recorrentes.js — Lançamentos com frequência customizável
// ==========================================

let recorrentesCarregadas = [];

// ==========================================
// CARREGAR LISTA
// ==========================================
async function carregarPainelRecorrentes() {
  const container = document.getElementById("lista-recorrentes-admin");
  const badge = document.getElementById("badge-recorrentes");
  const carteiraId = document.getElementById("seletor-carteira").value;
  if (!container || !carteiraId) return;

  try {
    const resposta = await CadimusScheduledApi.listarRecorrentes({ carteira_id: carteiraId });
    if (tratarSessaoExpirada(resposta)) return;
    if (!resposta.ok) return;

    recorrentesCarregadas = await resposta.json();

    if (badge) badge.textContent = recorrentesCarregadas.length;

    if (recorrentesCarregadas.length === 0) {
      container.innerHTML = '<div class="estado-vazio-admin"><div class="icone-vazio">🔄</div><p>Nenhuma recorrência cadastrada.</p></div>';
      return;
    }

    container.innerHTML = "";

    const NOMES_FREQUENCIA = { diaria: "Diária", semanal: "Semanal", quinzenal: "Quinzenal", mensal: "Mensal", trimestral: "Trimestral", anual: "Anual" };
    const NOMES_DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    recorrentesCarregadas.forEach((rec) => {
      const valorFormatado = formatadorBRL.format(valorMonetario(rec));
      const nomeFreq = NOMES_FREQUENCIA[rec.frequencia] || rec.frequencia || "Mensal";
      let detalhe = nomeFreq;
      if (rec.frequencia === "diaria") {
        detalhe += " · todos os dias";
      } else if (rec.frequencia === "semanal") {
        detalhe += ` · ${NOMES_DIAS[rec.dia_semana || 0]}`;
      } else {
        detalhe += ` · Dia ${rec.dia_mes || 1}`;
      }

      const classeTipo = rec.tipo === "receita" ? "settings-recorrente-receita" : "settings-recorrente-despesa";
      const div = document.createElement("div");
      div.className = `settings-mini-card settings-recorrente-card ${classeTipo}`;
      div.innerHTML = `
        <div class="settings-mini-card-topo">
          <div>
            <span class="settings-mini-card-label">${escaparHtml(rec.categoria || "Recorrência")}</span>
            <strong>${escaparHtml(rec.descricao)}</strong>
          </div>
          <span class="item-status ${rec.ativo ? "status-pago" : "status-pendente"}">${rec.ativo ? "Ativa" : "Pausada"}</span>
        </div>
        <div class="settings-mini-card-meta">
          <span>${detalhe}</span>
          <strong>${rec.tipo === "receita" ? "+" : "−"} ${valorFormatado}</strong>
        </div>
        <div class="settings-mini-card-acoes">
          <button type="button" class="fixa-btn btn-editar-recorrencia" data-id="${rec.id}">Editar</button>
          <button type="button" class="fixa-btn btn-alternar-recorrencia" data-id="${rec.id}">${rec.ativo ? "Pausar" : "Ativar"}</button>
          <button type="button" class="fixa-btn-excluir btn-excluir-recorrencia" data-id="${rec.id}">Excluir</button>
        </div>
      `;
      container.appendChild(div);
    });

    container.querySelectorAll(".btn-editar-recorrencia").forEach((btn) => {
      btn.addEventListener("click", () => editarRecorrencia(Number(btn.dataset.id)));
    });
    container.querySelectorAll(".btn-alternar-recorrencia").forEach((btn) => {
      btn.addEventListener("click", () => alternarRecorrencia(Number(btn.dataset.id)));
    });
    container.querySelectorAll(".btn-excluir-recorrencia").forEach((btn) => {
      btn.addEventListener("click", () => excluirRecorrencia(Number(btn.dataset.id)));
    });
  } catch (erro) {
    console.error("Erro ao carregar recorrências:", erro);
  }
}

// ==========================================
// MODAL
// ==========================================
async function abrirModalRecorrencia(predefinicoes = {}) {
  const modal = document.getElementById("modal-recorrencia");
  if (!modal) return;

  const carteiraId = document.getElementById("seletor-carteira").value;
  if (!carteiraId) {
    await mostrarAviso("Aguarde suas carteiras carregarem antes de cadastrar uma recorrência.");
    return;
  }

  document.getElementById("recorrencia-editando-id").value = "";
  document.getElementById("titulo-modal-recorrencia").innerText = predefinicoes.titulo || "Nova recorrência";
  document.getElementById("btn-salvar-recorrencia").innerText = "Salvar";
  document.getElementById("form-recorrencia").reset();
  document.getElementById("form-recorrencia").dataset.contexto = predefinicoes.contexto || "";
  document.getElementById("recorrencia-data-inicio").value = new Date().toISOString().slice(0, 10);
  document.getElementById("recorrencia-descricao").placeholder = predefinicoes.placeholderDescricao || "Ex: Academia";
  document.getElementById("recorrencia-tipo").value = predefinicoes.tipo || "despesa";
  document.getElementById("recorrencia-frequencia").value = predefinicoes.frequencia || "mensal";
  document.getElementById("recorrencia-tipo").disabled = predefinicoes.contexto === "bonificacao";

  await popularSelectCategorias(document.getElementById("recorrencia-categoria"));
  if (predefinicoes.categoria) {
    adicionarOpcaoSelect(document.getElementById("recorrencia-categoria"), predefinicoes.categoria);
    document.getElementById("recorrencia-categoria").value = predefinicoes.categoria;
  }
  if (predefinicoes.meioPagamento) {
    document.getElementById("recorrencia-meio-pagamento").value = predefinicoes.meioPagamento;
  }

  document.getElementById("recorrencia-frequencia").dispatchEvent(new Event("change"));
  const campoTipo = document.getElementById("recorrencia-tipo")?.closest(".campo");
  if (campoTipo) campoTipo.style.display = predefinicoes.contexto === "bonificacao" ? "none" : "";
  modal.style.display = "flex";
  trapFoco(modal);
}

function configurarModalRecorrencia() {
  const modal = document.getElementById("modal-recorrencia");
  const btnAbrir = document.getElementById("btn-nova-recorrencia-admin");
  const btnFechar = document.getElementById("btn-fechar-modal-recorrencia");
  const form = document.getElementById("form-recorrencia");
  const selFrequencia = document.getElementById("recorrencia-frequencia");
  const campoDiaSemana = document.getElementById("campo-dia-semana");
  const campoDiaMes = document.getElementById("campo-dia-mes");

  if (!modal || !btnFechar || !form) return;

  btnAbrir?.addEventListener("click", () => abrirModalRecorrencia());

  btnFechar.addEventListener("click", () => {
    modal.style.display = "none";
    document.getElementById("recorrencia-tipo").disabled = false;
    document.getElementById("form-recorrencia").dataset.contexto = "";
    liberarFoco();
  });

  selFrequencia.addEventListener("change", () => {
    const val = selFrequencia.value;
    if (val === "diaria") {
      campoDiaSemana.style.display = "none";
      campoDiaMes.style.display = "none";
    } else if (val === "semanal") {
      campoDiaSemana.style.display = "block";
      campoDiaMes.style.display = "none";
    } else {
      campoDiaSemana.style.display = "none";
      campoDiaMes.style.display = "block";
    }
  });

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const idEdicao = document.getElementById("recorrencia-editando-id").value;
    const carteiraId = document.getElementById("seletor-carteira").value;
    const btnSalvar = document.getElementById("btn-salvar-recorrencia");
    btnSalvar.disabled = true;
    btnSalvar.innerText = idEdicao ? "Salvando..." : "Salvando...";

    const frequencia = document.getElementById("recorrencia-frequencia").value;

    try {
      const valorCentavos = obterCentavosMonetarios("recorrencia-valor");
      const categoria = document.getElementById("recorrencia-categoria").value;
      const ehBonificacao = categoria.toLowerCase() === "bonificação" || form.dataset.contexto === "bonificacao";
      const corpo = {
        descricao: document.getElementById("recorrencia-descricao").value.trim(),
        valor: window.CadimusMoney.centavosParaReais(valorCentavos),
        valor_centavos: valorCentavos,
        tipo: ehBonificacao ? "receita" : document.getElementById("recorrencia-tipo").value,
        frequencia,
        dia_semana: frequencia === "semanal" ? parseInt(document.getElementById("recorrencia-dia-semana").value) : null,
        dia_mes: ["mensal", "trimestral", "anual"].includes(frequencia) ? parseInt(document.getElementById("recorrencia-dia-mes").value) : null,
        data_inicio: document.getElementById("recorrencia-data-inicio").value,
        data_fim: document.getElementById("recorrencia-data-fim").value || null,
        categoria,
        meio_pagamento: document.getElementById("recorrencia-meio-pagamento").value,
      };
      if (!idEdicao) corpo.carteira_id = carteiraId;

      const resposta = await CadimusScheduledApi.salvarRecorrente(corpo, idEdicao || null);

      if (tratarSessaoExpirada(resposta)) return;

      if (resposta.ok) {
        modal.style.display = "none";
        document.getElementById("recorrencia-tipo").disabled = false;
        form.dataset.contexto = "";
        liberarFoco();
        carregarPainelRecorrentes();
        await recarregarLancamentosAposMutacao();
        mostrarToast(idEdicao ? "Recorrência atualizada" : "Recorrência criada");
      } else {
        const erro = await resposta.json();
        await mostrarAviso(`Erro: ${erro.erro}`);
      }
    } catch (erro) {
      console.error(erro);
      await mostrarAviso("Erro de conexão ao salvar recorrência.");
    } finally {
      btnSalvar.disabled = false;
      btnSalvar.innerText = idEdicao ? "Salvar edição" : "Salvar";
    }
  });
}

// ==========================================
// EDITAR
// ==========================================
async function editarRecorrencia(id) {
  const rec = recorrentesCarregadas.find((r) => r.id === id);
  if (!rec) return;

  const modal = document.getElementById("modal-recorrencia");
  if (!modal) return;

  await popularSelectCategorias(document.getElementById("recorrencia-categoria"));
  adicionarOpcaoSelect(document.getElementById("recorrencia-categoria"), rec.categoria);

  document.getElementById("recorrencia-editando-id").value = rec.id;
  document.getElementById("form-recorrencia").dataset.contexto = rec.categoria?.toLowerCase() === "bonificação" ? "bonificacao" : "";
  document.getElementById("recorrencia-descricao").value = rec.descricao;
  definirValorInputMonetario("recorrencia-valor", valorMonetario(rec));
  document.getElementById("recorrencia-tipo").value = rec.tipo;
  document.getElementById("recorrencia-tipo").disabled = rec.categoria?.toLowerCase() === "bonificação";
  document.getElementById("recorrencia-frequencia").value = rec.frequencia;
  document.getElementById("recorrencia-dia-semana").value = rec.dia_semana || 0;
  document.getElementById("recorrencia-dia-mes").value = rec.dia_mes || 1;
  document.getElementById("recorrencia-data-inicio").value = rec.data_inicio;
  document.getElementById("recorrencia-data-fim").value = rec.data_fim || "";
  document.getElementById("recorrencia-categoria").value = rec.categoria;
  document.getElementById("recorrencia-meio-pagamento").value = rec.meio_pagamento;

  // Ajusta campos de dia
  const selFrequencia = document.getElementById("recorrencia-frequencia");
  selFrequencia.dispatchEvent(new Event("change"));
  const campoTipo = document.getElementById("recorrencia-tipo")?.closest(".campo");
  if (campoTipo) campoTipo.style.display = rec.categoria?.toLowerCase() === "bonificação" ? "none" : "";

  document.getElementById("titulo-modal-recorrencia").innerText = `Editando "${rec.descricao}"`;
  document.getElementById("btn-salvar-recorrencia").innerText = "Salvar edição";
  modal.style.display = "flex";
  trapFoco(modal);
}

// ==========================================
// ALTERNAR ATIVO/INATIVO
// ==========================================
async function alternarRecorrencia(id) {
  const alvo = recorrentesCarregadas.find((r) => r.id === id);
  if (!alvo) return;

  try {
    const resposta = await CadimusScheduledApi.atualizarRecorrente(id, { ativo: !alvo.ativo });

    if (tratarSessaoExpirada(resposta)) return;

    if (resposta.ok) {
      carregarPainelRecorrentes();
      mostrarToast(alvo.ativo ? "Recorrência pausada" : "Recorrência ativada", "info");
    } else {
      const erro = await resposta.json();
      await mostrarAviso(`Erro: ${erro.erro}`);
    }
  } catch (erro) {
    await mostrarAviso("Erro de conexão.");
  }
}

// ==========================================
// EXCLUIR
// ==========================================
async function excluirRecorrencia(id) {
  if (!(await pedirConfirmacao("Excluir esta recorrência? Lançamentos já gerados continuam na lista.", { textoConfirmar: "Excluir", perigo: true }))) return;

  try {
    const resposta = await CadimusScheduledApi.excluirRecorrente(id);

    if (tratarSessaoExpirada(resposta)) return;

    if (resposta.ok) {
      carregarPainelRecorrentes();
      mostrarToast("Recorrência excluída", "info");
    } else {
      const erro = await resposta.json();
      await mostrarAviso(`Erro: ${erro.erro}`);
    }
  } catch (erro) {
    await mostrarAviso("Erro de conexão.");
  }
}

document.addEventListener("DOMContentLoaded", configurarModalRecorrencia);
