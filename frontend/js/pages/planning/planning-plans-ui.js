// ==========================================
// planning-plans-ui.js - Lista, modal e depósitos de planos
// ==========================================
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
      await atualizarPlanejamentoVisivel({ forcarRender: true });
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
        await atualizarPlanejamentoVisivel({ forcarRender: true });
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
    definirValorInputMonetario("plano-valor-alvo", valorMonetario(plano, "valor_alvo"));
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
        await atualizarPlanejamentoVisivel({ forcarRender: true });
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
