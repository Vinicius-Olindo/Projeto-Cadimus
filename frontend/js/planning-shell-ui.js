// ==========================================
// planning-shell-ui.js - Estrutura inicial do planejamento
// ==========================================
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
        gravarLocalStorageSeguro("usuario", JSON.stringify(usuario));
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
