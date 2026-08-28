// ==========================================
// planning-shell-ui.js - Estrutura inicial do planejamento
// ==========================================
// --- PLANEJAMENTO ---
let planosCarregados = [];
let ultimaAtualizacaoPlanejamento = 0;
let planejamentoDependenciasComErro = false;

// ==========================================
// [28] PLANEJAMENTO: Planos Financeiros
// ==========================================

function configurarPlano() {
  const btnPlano = document.getElementById("btn-planejamento");
  const btnVoltar = document.getElementById("btn-voltar-dashboard-plano");
  const secaoDashboard = document.getElementById("dashboard-section");
  const secaoPlano = document.getElementById("planejamento-section");

  if (!btnPlano || !btnVoltar || !secaoDashboard || !secaoPlano) return;

  btnPlano.addEventListener("click", async () => {
    secaoDashboard.style.display = "none";
    secaoPlano.style.display = "flex";
    secaoPlano.style.flexDirection = "column";
    await atualizarPlanejamentoVisivel();
  });

  btnVoltar.addEventListener("click", () => {
    secaoPlano.style.display = "none";
    secaoDashboard.style.display = "block";
    carregarLancamentos();
  });

  configurarTabsPlano();
  configurarAtalhosAcoesPlanejamento();
  configurarSalarioPlano();
  configurarMetaPlano();
  configurarModalPlano();
  configurarModalPlanoDeposito();
}

function planejamentoEstaVisivel() {
  const secaoPlano = document.getElementById("planejamento-section");
  return !!secaoPlano && secaoPlano.style.display !== "none";
}

function mostrarPlanejamentoCarregando() {
  const saudeEl = document.getElementById("plano-resumo-saude");
  const comprometidoEl = document.getElementById("plano-resumo-comprometido");
  const acaoEl = document.getElementById("plano-resumo-acao");
  const conteudoCarregando = '<div class="plano-vazio plano-vazio-carregando"><span class="spinner"></span><span>Atualizando dados do período...</span></div>';

  if (saudeEl) {
    saudeEl.textContent = "Atualizando";
    saudeEl.style.color = "var(--cor-pendente)";
  }
  if (comprometidoEl) comprometidoEl.textContent = "—";
  if (acaoEl) acaoEl.textContent = "Carregando dados";

  [
    "plano-indicadores",
    "plano-lista-orcamentos",
    "plano-lista-metas",
    "plano-lista-receitas",
    "plano-lista-despesas",
    "plano-comparacao",
    "plano-recomendacoes",
  ].forEach((id) => {
    const container = document.getElementById(id);
    if (container) container.innerHTML = conteudoCarregando;
  });
}

function limparEstadoPlanejamentoDependencias() {
  if (typeof ultimoLoteLancamentos !== "undefined") ultimoLoteLancamentos = [];
  if (typeof despesasFixasCarregadas !== "undefined") despesasFixasCarregadas = [];
  if (typeof comprasParceladasCarregadas !== "undefined") comprasParceladasCarregadas = [];
  if (typeof bonificacoesCarregadas !== "undefined") bonificacoesCarregadas = [];
  if (typeof orcamentosCarregados !== "undefined") orcamentosCarregados = [];
  if (typeof metasCarregadas !== "undefined") metasCarregadas = [];
  if (typeof planosCarregados !== "undefined") planosCarregados = [];
}

async function carregarLancamentosPlanejamento() {
  if (typeof CadimusEntriesApi === "undefined") return;

  const carteiraId = document.getElementById("seletor-carteira")?.value;
  if (!carteiraId) return;

  const filtros = { carteira_id: carteiraId };
  const inputMes = document.getElementById("filtro-mes")?.value;

  if (inputMes) {
    const [ano, mes] = inputMes.split("-");
    filtros.ano = ano;
    filtros.mes = mes;
  }

  try {
    const resposta = await CadimusEntriesApi.listarResposta(filtros);
    if (tratarSessaoExpirada(resposta)) return;
    if (!resposta.ok) {
      if (typeof ultimoLoteLancamentos !== "undefined") ultimoLoteLancamentos = [];
      planejamentoDependenciasComErro = true;
      return;
    }

    const dados = await resposta.json();
    if (typeof ultimoLoteLancamentos !== "undefined") {
      ultimoLoteLancamentos = Array.isArray(dados) ? dados : [];
    }
  } catch (erro) {
    console.error("Erro ao carregar lançamentos do planejamento:", erro);
    if (typeof ultimoLoteLancamentos !== "undefined") ultimoLoteLancamentos = [];
    planejamentoDependenciasComErro = true;
  }
}

async function carregarDependenciasPlanejamento() {
  const tarefas = [];

  limparEstadoPlanejamentoDependencias();
  planejamentoDependenciasComErro = false;

  if (typeof CadimusEntriesApi !== "undefined") {
    await carregarLancamentosPlanejamento();
  }

  if (typeof carregarPainelDespesasFixas === "function") tarefas.push(carregarPainelDespesasFixas());
  if (typeof carregarPainelComprasParceladas === "function") tarefas.push(carregarPainelComprasParceladas());
  if (typeof carregarPainelBonificacoes === "function") tarefas.push(carregarPainelBonificacoes());
  if (typeof carregarOrcamentos === "function") tarefas.push(carregarOrcamentos());
  if (typeof carregarMetas === "function") tarefas.push(carregarMetas());
  if (typeof carregarPlanos === "function") tarefas.push(carregarPlanos());

  const resultados = await Promise.allSettled(tarefas);
  if (resultados.some((resultado) => resultado.status === "rejected")) {
    planejamentoDependenciasComErro = true;
  }
}

async function atualizarPlanejamentoVisivel({ forcarRender = false } = {}) {
  if (!forcarRender && !planejamentoEstaVisivel()) return;

  const idAtualizacao = ++ultimaAtualizacaoPlanejamento;
  mostrarPlanejamentoCarregando();
  await carregarDependenciasPlanejamento();
  if (idAtualizacao !== ultimaAtualizacaoPlanejamento) return;
  renderizarPlano();
}

function configurarTabsPlano() {
  document.querySelectorAll("[data-plano-atalho]").forEach((atalho) => {
    atalho.addEventListener("click", () => {
      const painelId = atalho.dataset.planoAtalho;
      const tab = document.querySelector(`.plano-tab[data-painel="${painelId}"]`);
      if (tab) tab.click();
    });
  });

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

async function abrirLancamentoPeloPlanejamento(tipo) {
  if (typeof abrirModalNovoLancamento !== "function") return;

  await abrirModalNovoLancamento();
  const selectTipo = document.getElementById("tipo-gasto");
  if (selectTipo) {
    selectTipo.value = tipo;
    selectTipo.dispatchEvent(new Event("change"));
  }
}

function configurarAtalhosAcoesPlanejamento() {
  document.getElementById("btn-novo-orcamento-plano")?.addEventListener("click", () => {
    if (typeof window.abrirModalOrcamento === "function") window.abrirModalOrcamento();
  });

  document.getElementById("btn-nova-receita-plano")?.addEventListener("click", () => {
    abrirLancamentoPeloPlanejamento("receita");
  });

  document.getElementById("btn-nova-despesa-plano")?.addEventListener("click", () => {
    abrirLancamentoPeloPlanejamento("despesa");
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
    definirValorInputMonetario("plano-salario-input", usuario.salario);
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
    const valor = obterReaisMonetarios("plano-salario-input", { vazioComoZero: true });
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

  atualizarContextoPlanejamento();

  const salarioDisplay = document.getElementById("plano-salario-display");
  if (salarioDisplay) {
    salarioDisplay.textContent = salario > 0 ? formatadorBRL.format(salario) : "Não definido";
  }

  renderizarKPIsPlano(salario);
  atualizarResumoPlanejamento(salario);
  renderizarIndicadoresPlano(salario);
  renderizarAlertasPlano(salario);
  renderizarOrcamentosPlano();
  renderizarMetasPlano();
  renderizarReceitasPlano();
  renderizarDespesasPlano();
  renderizarComparacaoPlano();
  renderizarRecomendacoesPlano(salario);
  configurarSimulacaoPlano();
}

function atualizarContextoPlanejamento() {
  const contexto = document.getElementById("plano-overview-contexto");
  if (!contexto) return;

  const campoMes = document.getElementById("filtro-mes");
  const carteira = typeof obterCarteiraSelecionada === "function" ? obterCarteiraSelecionada() : null;
  const [ano, mes] = campoMes?.value ? campoMes.value.split("-") : [];
  const mesIndice = Number(mes) - 1;
  const nomesMeses = typeof NOMES_MESES !== "undefined" ? NOMES_MESES : [];
  const nomeMes = Number.isInteger(mesIndice) && nomesMeses[mesIndice] ? `${nomesMeses[mesIndice]} de ${ano}` : "período atual";
  const nomeCarteira = carteira?.nome || "carteira selecionada";

  contexto.textContent = `Resumo de ${nomeMes} para ${nomeCarteira}: salário, compromissos, metas, orçamento e simulações no mesmo lugar.`;
}
