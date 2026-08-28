// ==========================================
// wallets-ui.js - Interface de carteiras, transferências e membros
// ==========================================

// ==========================================
// [6] CARTEIRAS: Carregamento, Renderização, Tabs
// ==========================================

// ==========================================
// CARTEIRAS (contas) — carregadas dinamicamente, sem limite fixo
// ==========================================
let carteirasDoUsuario = [];
let ultimaRequisicaoCarteiras = 0;

async function carregarCarteiras() {
  const container = document.getElementById("carteira-tabs");
  const inputOculto = document.getElementById("seletor-carteira");
  if (!container || !inputOculto) return;

  const idDestaRequisicao = ++ultimaRequisicaoCarteiras;

  try {
    const resposta = await CadimusWalletsApi.listarCarteiras();
    if (idDestaRequisicao !== ultimaRequisicaoCarteiras) return;
    if (tratarSessaoExpirada(resposta)) return;
    if (!resposta.ok) return;

    carteirasDoUsuario = await resposta.json();
    if (idDestaRequisicao !== ultimaRequisicaoCarteiras) return;

    renderizarTabsCarteira();
  } catch (erro) {
    console.error("Erro ao carregar carteiras:", erro);
  }
}

function renderizarTabsCarteira() {
  const container = document.getElementById("carteira-tabs");
  const inputOculto = document.getElementById("seletor-carteira");
  if (!container || !inputOculto) return;

  const valorAtual = inputOculto.value;
  const aindaExiste = carteirasDoUsuario.some((c) => String(c.id) === String(valorAtual));

  container.innerHTML = "";

  carteirasDoUsuario.forEach((carteira, indice) => {
    const wrapper = document.createElement("div");
    wrapper.className = "tab-carteira-wrapper";
    wrapper.draggable = true;
    wrapper.dataset.id = carteira.id;

    wrapper.addEventListener("dragstart", (evento) => {
      wrapper.classList.add("arrastando");
      evento.dataTransfer.setData("text/plain", String(carteira.id));
      evento.dataTransfer.effectAllowed = "move";
    });

    wrapper.addEventListener("dragend", () => {
      wrapper.classList.remove("arrastando");
      container.querySelectorAll(".tab-carteira-wrapper").forEach((w) => w.classList.remove("alvo-drop"));
    });

    wrapper.addEventListener("dragover", (evento) => {
      evento.preventDefault();
      evento.dataTransfer.dropEffect = "move";
      wrapper.classList.add("alvo-drop");
    });

    wrapper.addEventListener("dragleave", () => {
      wrapper.classList.remove("alvo-drop");
    });

    wrapper.addEventListener("drop", (evento) => {
      evento.preventDefault();
      wrapper.classList.remove("alvo-drop");
      const idArrastado = evento.dataTransfer.getData("text/plain");
      if (!idArrastado || String(idArrastado) === String(carteira.id)) return;
      reordenarCarteiras(idArrastado, carteira.id);
    });

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tab-carteira";
    btn.dataset.valor = carteira.id;
    btn.title = carteira.tipo === "compartilhada" ? `${carteira.nome} · compartilhada` : `${carteira.nome} · só sua`;
    if (aindaExiste && String(carteira.id) === String(valorAtual)) {
      btn.classList.add("ativo");
    }
    if (carteira.tipo === "compartilhada") {
      btn.classList.add("tab-compartilhada");
    }

    // Ícone do tipo de carteira
    const svgIcone = carteira.tipo === "compartilhada"
      ? `<svg class="tab-carteira-icone" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
      : `<svg class="tab-carteira-icone" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

    btn.innerHTML = svgIcone + `<span class="tab-carteira-nome">${escaparHtml(carteira.nome)}</span>`;
    btn.addEventListener("click", () => selecionarCarteira(carteira.id));
    wrapper.appendChild(btn);

    // Quem é admin da carteira (individual sempre é; compartilhada só quem administra)
    // pode abrir as configurações dela — gerenciar membros (se compartilhada) e excluir.
    if (carteira.papel === "admin") {
      const btnGerenciar = document.createElement("button");
      btnGerenciar.type = "button";
      btnGerenciar.className = "btn-gerenciar-membros";
      btnGerenciar.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>`;
      btnGerenciar.title = `Configurações de "${carteira.nome}"`;
      btnGerenciar.addEventListener("click", (evento) => {
        evento.stopPropagation();
        abrirModalGerenciarMembros(carteira);
      });
      wrapper.appendChild(btnGerenciar);
    }

    container.appendChild(wrapper);
  });

  // Separador visual antes do botão de adicionar
  const separador = document.createElement("div");
  separador.className = "tab-carteira-separador";
  container.appendChild(separador);

  const btnAdd = document.createElement("button");
  btnAdd.type = "button";
  btnAdd.className = "tab-carteira-add";
  btnAdd.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
  btnAdd.title = "Nova carteira";
  btnAdd.setAttribute("aria-label", "Nova carteira");
  btnAdd.addEventListener("click", () => abrirModalCarteira());
  container.appendChild(btnAdd);

  // Se a carteira selecionada não existe mais (ou é a primeira carga), seleciona a primeira disponível
  if (!aindaExiste && carteirasDoUsuario.length > 0) {
    selecionarCarteira(carteirasDoUsuario[0].id);
  }
}

function reordenarCarteiras(idArrastadoStr, idAlvo) {
  const idArrastado = carteirasDoUsuario.find((c) => String(c.id) === String(idArrastadoStr))?.id;
  if (idArrastado === undefined) return;

  const indiceOrigem = carteirasDoUsuario.findIndex((c) => String(c.id) === String(idArrastado));
  const indiceDestino = carteirasDoUsuario.findIndex((c) => String(c.id) === String(idAlvo));
  if (indiceOrigem === -1 || indiceDestino === -1) return;

  const [movida] = carteirasDoUsuario.splice(indiceOrigem, 1);
  carteirasDoUsuario.splice(indiceDestino, 0, movida);

  renderizarTabsCarteira();
  salvarOrdemCarteiras();
}

async function salvarOrdemCarteiras() {
  try {
    const resposta = await CadimusWalletsApi.salvarOrdem(carteirasDoUsuario.map((c) => c.id));
    tratarSessaoExpirada(resposta);
  } catch (erro) {
    // Se falhar, a ordem só não persiste — não vale travar a interface por isso
  }
}

function obterCarteiraSelecionada() {
  const carteiraId = document.getElementById("seletor-carteira")?.value;
  return carteirasDoUsuario.find((carteira) => String(carteira.id) === String(carteiraId)) || null;
}

function atualizarVisibilidadeTransferencia() {
  const btnTransferencia = document.getElementById("btn-transferencia");
  if (!btnTransferencia) return;

  const carteira = obterCarteiraSelecionada();
  const podeTransferir = carteira && carteira.tipo !== "compartilhada";
  btnTransferencia.hidden = !podeTransferir;
  btnTransferencia.setAttribute("aria-hidden", String(!podeTransferir));
}

function selecionarCarteira(id) {
  const inputOculto = document.getElementById("seletor-carteira");
  if (!inputOculto) return;

  inputOculto.value = id;
  document.querySelectorAll(".tab-carteira").forEach((t) => {
    t.classList.toggle("ativo", t.dataset.valor === String(id));
  });
  atualizarVisibilidadeTransferencia();
  inputOculto.dispatchEvent(new Event("change"));
}

// --- MODAL: NOVA CARTEIRA ---
// ==========================================
// [7] MODAIS: Carteira, Transferência, Orçamento, Membros
// ==========================================

function abrirModalCarteira() {
  const modal = document.getElementById("modal-carteira");
  if (modal) {
    modal.style.display = "flex";
    trapFoco(modal);
  }
}

function configurarModalCarteira() {
  const modal = document.getElementById("modal-carteira");
  const btnFechar = document.getElementById("btn-fechar-modal-carteira");
  const form = document.getElementById("form-carteira");
  const selectTipo = document.getElementById("tipo-carteira");
  const campoMembros = document.getElementById("campo-membros-carteira");
  const listaMembros = document.getElementById("lista-membros-carteira");

  if (!modal || !btnFechar || !form) return;

  async function atualizarListaMembros() {
    if (selectTipo.value !== "compartilhada") {
      campoMembros.style.display = "none";
      return;
    }

    campoMembros.style.display = "block";
    listaMembros.innerHTML = `<span class="dica-campo">Carregando...</span>`;

    try {
      const resposta = await CadimusWalletsApi.listarColegas();
      if (tratarSessaoExpirada(resposta)) return;
      const colegas = await resposta.json();

      if (colegas.length === 0) {
        listaMembros.innerHTML = `<span class="dica-campo">Não há outros usuários cadastrados ainda.</span>`;
        return;
      }

      // Vem pré-marcado pra manter a conveniência de quem sempre compartilhou
      // com todo mundo — mas agora dá pra desmarcar quem não deve ter acesso.
      listaMembros.innerHTML = colegas
        .map(
          (colega) => `
        <label class="opcao-membro">
          <input type="checkbox" class="checkbox-membro-carteira" value="${colega.id}" checked />
          ${escaparHtml(colega.nome || colega.nome_usuario)}
        </label>
      `,
        )
        .join("");
    } catch (erro) {
      listaMembros.innerHTML = `<span class="dica-campo">Não foi possível carregar a lista de usuários.</span>`;
    }
  }

  selectTipo?.addEventListener("change", atualizarListaMembros);

  btnFechar.addEventListener("click", () => {
    modal.style.display = "none";
    liberarFoco();
    form.reset();
    campoMembros.style.display = "none";
  });

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const btnSalvar = document.getElementById("btn-salvar-carteira");
    btnSalvar.innerText = "Criando...";
    btnSalvar.disabled = true;

    try {
      const nome = document.getElementById("nome-carteira").value.trim();
      const tipo = document.getElementById("tipo-carteira").value;
      const corpo = { nome, tipo };

      if (tipo === "compartilhada") {
        corpo.membros = Array.from(document.querySelectorAll(".checkbox-membro-carteira:checked")).map((chk) => Number(chk.value));
      }

      const resposta = await CadimusWalletsApi.criarCarteira(corpo);

      if (tratarSessaoExpirada(resposta)) return;

      if (resposta.ok) {
        const novaCarteira = await resposta.json();
        modal.style.display = "none";
        form.reset();
        campoMembros.style.display = "none";
        await carregarCarteiras();
        selecionarCarteira(novaCarteira.id);
        mostrarToast("Carteira criada");
      } else {
        const erro = await resposta.json();
        await mostrarAviso(`Erro ao criar carteira: ${erro.erro}`);
      }
    } catch (erro) {
      console.error(erro);
      await mostrarAviso("Falha na comunicação com o servidor.");
    } finally {
      btnSalvar.innerText = "Criar carteira";
      btnSalvar.disabled = false;
    }
  });
}

// --- MODAL: TRANSFERÊNCIA ENTRE CARTEIRAS ---
function configurarModalTransferencia() {
  const modal = document.getElementById("modal-transferencia");
  const btnFechar = document.getElementById("btn-fechar-modal-transferencia");
  const form = document.getElementById("form-transferencia");
  const selectOrigem = document.getElementById("transferencia-carteira-origem");
  const selectDestino = document.getElementById("transferencia-carteira-destino");

  if (!modal || !btnFechar || !form) return;

  // Preencher selects com as carteiras do usuário
  function preencherSelectsCarteiras() {
    if (!carteirasDoUsuario || carteirasDoUsuario.length === 0) return;

    const opcoesHtml = carteirasDoUsuario
      .map((c) => `<option value="${c.id}">${escaparHtml(c.nome)}</option>`)
      .join("");

    selectOrigem.innerHTML = `<option value="" disabled selected>Selecionar carteira</option>${opcoesHtml}`;
    selectDestino.innerHTML = `<option value="" disabled selected>Selecionar carteira</option>${opcoesHtml}`;
  }

  // Abrir modal
  async function abrirModalTransferencia() {
    const carteiraAtual = obterCarteiraSelecionada();
    if (carteiraAtual?.tipo === "compartilhada") {
      atualizarVisibilidadeTransferencia();
      await mostrarAviso("Transferências ficam disponíveis apenas em carteiras pessoais.");
      return;
    }

    preencherSelectsCarteiras();
    document.getElementById("transferencia-data").valueAsDate = new Date();
    modal.style.display = "flex";
    trapFoco(modal);
  }

  // Expor globalmente para chamar do botão
  window.abrirModalTransferencia = abrirModalTransferencia;

  // Fechar modal
  btnFechar.addEventListener("click", () => {
    modal.style.display = "none";
    liberarFoco();
    form.reset();
  });

  // Submeter transferência
  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const btnSalvar = document.getElementById("btn-salvar-transferencia");
    btnSalvar.innerText = "Transferindo...";
    btnSalvar.disabled = true;

    try {
      const origemId = Number(selectOrigem.value);
      const destinoId = Number(selectDestino.value);
      const valorPayload = montarPayloadMonetario("transferencia-valor");
      const valor = valorPayload.valor;
      const data = document.getElementById("transferencia-data").value;
      const descricao = document.getElementById("transferencia-descricao").value.trim();
      const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      // Validações locais
      if (!origemId || !destinoId) {
        await mostrarAviso("Selecione as carteiras de origem e destino.");
        return;
      }

      if (origemId === destinoId) {
        await mostrarAviso("As carteiras de origem e destino devem ser diferentes.");
        return;
      }

      if (!valor || valor <= 0) {
        await mostrarAviso("Informe um valor válido.");
        return;
      }

      const resposta = await CadimusWalletsApi.transferir({
        valor,
        valorCentavos: valorPayload.valor_centavos,
        data,
        origemId,
        destinoId,
        descricao,
        idempotencyKey,
      });

      if (tratarSessaoExpirada(resposta)) return;

      if (resposta.ok) {
        modal.style.display = "none";
        liberarFoco();
        form.reset();
        await recarregarLancamentosAposMutacao();
        mostrarToast("Transferência realizada com sucesso!");
      } else {
        const erro = await resposta.json();
        await mostrarAviso(`Erro: ${erro.erro}`);
      }
    } catch (erro) {
      await mostrarAviso("Falha na comunicação com o servidor.");
    } finally {
      btnSalvar.innerText = "Transferir";
      btnSalvar.disabled = false;
    }
  });
}

// --- MODAL: ORÇAMENTO MENSAL POR CATEGORIA ---
function configurarModalOrcamento() {
  const modal = document.getElementById("modal-orcamento");
  const btnFechar = document.getElementById("btn-fechar-modal-orcamento");
  const form = document.getElementById("form-orcamento");
  const selectCategoria = document.getElementById("orcamento-categoria");

  if (!modal || !btnFechar || !form) return;

  // Preencher select de categorias
  async function carregarCategorias() {
    try {
      const resposta = await CadimusAdminApi.listarCategorias();
      if (tratarSessaoExpirada(resposta)) return;
      const categorias = await resposta.json();

      const categoriasDespesa = categorias.filter((c) => c.tipo === "despesa" || !c.tipo);
      selectCategoria.innerHTML = `<option value="" disabled selected>Selecionar categoria</option>`;
      categoriasDespesa.forEach((c) => {
        selectCategoria.innerHTML += `<option value="${escaparHtml(c.nome)}">${escaparHtml(c.nome)}</option>`;
      });
    } catch (erro) {
      console.error("Erro ao carregar categorias:", erro);
    }
  }

  // Abrir modal
  function abrirModalOrcamento(opcoes = {}) {
    const categoriaSelecionada = typeof opcoes.categoria === "string" ? opcoes.categoria : "";
    const selecionarCategoria = () => {
      if (categoriaSelecionada && selectCategoria) {
        selectCategoria.value = categoriaSelecionada;
      }
    };
    Promise.resolve(carregarCategorias()).finally(selecionarCategoria);
    const agora = new Date();
    const mes = Number(opcoes.mes) || agora.getMonth() + 1;
    const ano = Number(opcoes.ano) || agora.getFullYear();
    document.getElementById("orcamento-mes").value = mes;
    document.getElementById("orcamento-ano").value = ano;
    document.getElementById("orcamento-editando-id").value = "";
    document.getElementById("titulo-modal-orcamento").innerText = "Novo orçamento";
    selecionarCategoria();
    modal.style.display = "flex";
    trapFoco(modal);
  }

  // Expor globalmente
  window.abrirModalOrcamento = abrirModalOrcamento;

  // Fechar modal
  btnFechar.addEventListener("click", () => {
    modal.style.display = "none";
    liberarFoco();
    form.reset();
  });

  // Submeter orçamento
  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const btnSalvar = document.getElementById("btn-salvar-orcamento");
    btnSalvar.innerText = "Salvando...";
    btnSalvar.disabled = true;

    try {
      const categoria = selectCategoria.value;
      const valorPayload = montarPayloadMonetario("orcamento-valor");
      const valor = valorPayload.valor;
      const mes = parseInt(document.getElementById("orcamento-mes").value);
      const ano = parseInt(document.getElementById("orcamento-ano").value);
      const carteiraId = document.getElementById("seletor-carteira").value;

      if (!categoria || !valor || !mes || !ano || !carteiraId) {
        await mostrarAviso("Preencha todos os campos.");
        return;
      }

      if (valor < 0) {
        await mostrarAviso("O valor não pode ser negativo.");
        return;
      }

      const resposta = await CadimusBudgetsApi.salvar({
        categoria,
        valor,
        valor_centavos: valorPayload.valor_centavos,
        mes,
        ano,
        carteira_id: Number(carteiraId),
      });

      if (tratarSessaoExpirada(resposta)) return;

      if (resposta.ok) {
        modal.style.display = "none";
        liberarFoco();
        form.reset();
        await carregarOrcamentos();
        if (typeof atualizarPlanejamentoVisivel === "function") {
          await atualizarPlanejamentoVisivel({ forcarRender: true });
        }
        mostrarToast("Orçamento salvo com sucesso!");
      } else {
        const erro = await resposta.json();
        await mostrarAviso(`Erro: ${erro.erro}`);
      }
    } catch (erro) {
      await mostrarAviso("Falha na comunicação com o servidor.");
    } finally {
      btnSalvar.innerText = "Salvar orçamento";
      btnSalvar.disabled = false;
    }
  });
}

// --- MODAL: CARTÃO DE CRÉDITO ---
let cartoesCreditoCarregados = [];

async function popularSelectCartoesCredito(select, carteiraId = document.getElementById("seletor-carteira")?.value, valorSelecionado = "") {
  if (!select || !carteiraId || !window.CadimusCardsApi) return;

  select.innerHTML = '<option value="">Nenhum cartão</option>';

  try {
    const resposta = await CadimusCardsApi.listar({ carteira_id: carteiraId });
    if (tratarSessaoExpirada(resposta)) return;
    if (!resposta.ok) return;

    const cartoes = await resposta.json();
    cartoes.forEach((cartao) => {
      const opcao = document.createElement("option");
      opcao.value = String(cartao.id);
      opcao.textContent = `${cartao.nome}${cartao.ultimos4 ? ` •••• ${cartao.ultimos4}` : ""}`;
      opcao.dataset.diaFechamento = cartao.dia_fechamento || "";
      opcao.dataset.diaVencimento = cartao.dia_vencimento || "";
      select.appendChild(opcao);
    });
    select.value = valorSelecionado ? String(valorSelecionado) : "";
  } catch (erro) {
    console.error("Erro ao carregar cartões:", erro);
  }
}

function configurarCampoCartaoCredito({ campoId, selectId, meioId, tipoId }) {
  const campo = document.getElementById(campoId);
  const select = document.getElementById(selectId);
  const meio = document.getElementById(meioId);
  const tipo = tipoId ? document.getElementById(tipoId) : null;
  if (!campo || !select || !meio) return;

  const atualizar = async () => {
    const usaCredito = String(meio.value || "").toLowerCase() === "credito";
    const ehDespesa = !tipo || tipo.value !== "receita";
    const mostrar = usaCredito && ehDespesa;
    campo.style.display = mostrar ? "" : "none";
    if (mostrar) await popularSelectCartoesCredito(select, undefined, select.value);
    else select.value = "";
  };

  meio.addEventListener("change", atualizar);
  tipo?.addEventListener("change", atualizar);
  atualizar();
}

function validarCartaoCreditoObrigatorio({ meioId, selectId, tipoId, mensagem = "Selecione o cartão de crédito usado nesta despesa." }) {
  const meio = document.getElementById(meioId);
  const select = document.getElementById(selectId);
  const tipo = tipoId ? document.getElementById(tipoId) : null;
  const usaCredito = String(meio?.value || "").toLowerCase() === "credito";
  const ehDespesa = !tipo || tipo.value !== "receita";

  if (!usaCredito || !ehDespesa || !select || select.value) return true;

  select.setCustomValidity(mensagem);
  select.reportValidity();
  select.focus();
  setTimeout(() => select.setCustomValidity(""), 1200);
  return false;
}

window.popularSelectCartoesCredito = popularSelectCartoesCredito;
window.configurarCampoCartaoCredito = configurarCampoCartaoCredito;
window.validarCartaoCreditoObrigatorio = validarCartaoCreditoObrigatorio;

function configurarModalCartaoCredito() {
  const modal = document.getElementById("modal-cartao-credito");
  const btnFechar = document.getElementById("btn-fechar-modal-cartao");
  const form = document.getElementById("form-cartao-credito");

  if (!modal || !btnFechar || !form) return;

  function abrirModalCartao(editar) {
    form.reset();
    document.getElementById("cartao-editando-id").value = "";
    document.getElementById("titulo-modal-cartao").innerText = "Novo cartão de crédito";

    if (editar) {
      document.getElementById("cartao-editando-id").value = editar.id;
      document.getElementById("titulo-modal-cartao").innerText = "Editar cartão";
      document.getElementById("cartao-nome").value = editar.nome || "";
      document.getElementById("cartao-bandeira").value = editar.bandeira || "outro";
      document.getElementById("cartao-ultimos4").value = editar.ultimos4 || "";
      document.getElementById("cartao-dia-fechamento").value = editar.dia_fechamento;
      document.getElementById("cartao-dia-vencimento").value = editar.dia_vencimento;
      definirValorInputMonetario("cartao-limite", valorMonetario(editar, "limite"));
    }

    modal.style.display = "flex";
    trapFoco(modal);
  }

  window.abrirModalCartao = abrirModalCartao;

  btnFechar.addEventListener("click", () => {
    modal.style.display = "none";
    liberarFoco();
    form.reset();
  });

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const idEdicao = document.getElementById("cartao-editando-id").value;
    const btnSalvar = document.getElementById("btn-salvar-cartao");
    btnSalvar.disabled = true;
    btnSalvar.innerText = "Salvando...";

    try {
      const carteiraId = document.getElementById("seletor-carteira").value;
      const limitePayload = montarPayloadMonetario("cartao-limite", "limite", { vazioComoZero: true });
      const corpo = {
        nome: document.getElementById("cartao-nome").value.trim(),
        bandeira: document.getElementById("cartao-bandeira").value,
        ultimos4: document.getElementById("cartao-ultimos4").value.trim() || null,
        dia_fechamento: parseInt(document.getElementById("cartao-dia-fechamento").value),
        dia_vencimento: parseInt(document.getElementById("cartao-dia-vencimento").value),
        ...limitePayload,
        carteira_id: Number(carteiraId),
      };

      const resposta = await CadimusCardsApi.salvar(corpo, idEdicao || null);

      if (tratarSessaoExpirada(resposta)) return;

      if (resposta.ok) {
        modal.style.display = "none";
        liberarFoco();
        carregarCartoesCredito();
        mostrarToast(idEdicao ? "Cartão atualizado" : "Cartão criado", "sucesso");
      } else {
        const erro = await resposta.json();
        await mostrarAviso(`Erro: ${erro.erro}`);
      }
    } catch {
      await mostrarAviso("Falha na comunicação com o servidor.");
    } finally {
      btnSalvar.disabled = false;
      btnSalvar.innerText = "Salvar cartão";
    }
  });
}

async function carregarCartoesCredito() {
  const card = document.getElementById("card-cartoes-credito");
  const container = document.getElementById("lista-cartoes-painel");
  const carteiraId = document.getElementById("seletor-carteira")?.value;
  if (!card || !container || !carteiraId) return;

  try {
    const resposta = await CadimusCardsApi.listar({ carteira_id: carteiraId });
    if (tratarSessaoExpirada(resposta)) return;
    if (!resposta.ok) return;

    cartoesCreditoCarregados = await resposta.json();

    if (cartoesCreditoCarregados.length === 0) {
      card.style.display = "none";
      return;
    }

    card.style.display = "flex";
    container.innerHTML = "";

    const NOMES_BANDEIRAS = { visa: "Visa", mastercard: "Mastercard", elo: "Elo", amex: "Amex", outro: "Cartão" };
    const CORES_BANDEIRAS = { visa: "#1a1f71", mastercard: "#eb001b", elo: "#f5a623", amex: "#006fcf", outro: "#666" };

    cartoesCreditoCarregados.forEach((cartao) => {
      const cor = CORES_BANDEIRAS[cartao.bandeira] || CORES_BANDEIRAS.outro;
      const nomeBandeira = NOMES_BANDEIRAS[cartao.bandeira] || "Cartão";
      const limite = valorMonetario(cartao, "limite");
      const gastoAtual = valorMonetario(cartao, "gasto_atual");
      const disponivel = Math.max(0, limite - gastoAtual);
      const pctLimite = limite > 0 ? Math.min((gastoAtual / limite) * 100, 100) : 0;
      const corBarra = pctLimite >= 80 ? "var(--cor-despesa)" : pctLimite >= 50 ? "var(--cor-pendente)" : "var(--cor-receita)";

      const div = document.createElement("div");
      div.className = "cartao-item";
      div.innerHTML = `
        <div class="cartao-item-header">
          <div class="cartao-item-bandeira" style="background:${cor}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--cor-superficie-alta)" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          </div>
          <div class="cartao-item-info">
            <strong>${escaparHtml(cartao.nome)}</strong>
            <span class="cartao-item-detalhe">${nomeBandeira}${cartao.ultimos4 ? " •••• " + cartao.ultimos4 : ""}</span>
          </div>
          <div class="cartao-item-acoes">
            <button type="button" class="cartao-editar-btn" data-id="${cartao.id}" title="Editar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button type="button" class="cartao-apagar-btn" data-id="${cartao.id}" data-nome="${escaparHtml(cartao.nome)}" title="Excluir">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
        <div class="cartao-item-datas">
          <span>Fechamento: dia ${cartao.dia_fechamento}</span>
          <span>Vencimento: dia ${cartao.dia_vencimento}</span>
        </div>
        ${limite > 0 ? `
        <div class="cartao-item-limite">
          <div class="cartao-limite-texto">
            <span>${formatadorBRL.format(gastoAtual)} usado</span>
            <span>${pctLimite.toFixed(0)}% de ${formatadorBRL.format(limite)}</span>
          </div>
          <div class="cartao-limite-barra">
            <div class="cartao-limite-preenchimento" style="width:${pctLimite}%;background:${corBarra}"></div>
          </div>
          <div class="cartao-limite-disponivel">
            <span>Disponível</span>
            <strong>${formatadorBRL.format(disponivel)}</strong>
          </div>
        </div>
        ` : ""}
        ${cartao.parcelas_ativas > 0 ? `<div class="cartao-item-parcelas">${cartao.parcelas_ativas} parcela(s) em aberto</div>` : ""}
      `;
      container.appendChild(div);
    });

    // Eventos de editar
    container.querySelectorAll(".cartao-editar-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.id);
        const cartao = cartoesCreditoCarregados.find((c) => c.id === id);
        if (cartao) abrirModalCartao(cartao);
      });
    });

    // Eventos de apagar
    container.querySelectorAll(".cartao-apagar-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = Number(btn.dataset.id);
        const nome = btn.dataset.nome;
        if (!(await pedirConfirmacao(`Excluir o cartão "${nome}"?`, { textoConfirmar: "Excluir", perigo: true }))) return;

        try {
          const resposta = await CadimusCardsApi.excluir(id);
          if (tratarSessaoExpirada(resposta)) return;
          if (resposta.ok) {
            carregarCartoesCredito();
            mostrarToast("Cartão excluído", "sucesso");
          }
        } catch {
          await mostrarAviso("Erro ao excluir cartão.");
        }
      });
    });
  } catch (erro) {
    console.error("Erro ao carregar cartões:", erro);
  }
}

// --- MODAL: GERENCIAR MEMBROS DE UMA CARTEIRA COMPARTILHADA ---
async function abrirModalGerenciarMembros(carteira) {
  const modal = document.getElementById("modal-gerenciar-membros");
  const lista = document.getElementById("lista-gerenciar-membros");
  const campoMembros = document.getElementById("campo-gerenciar-membros");
  const btnSalvarMembros = document.getElementById("btn-salvar-membros");
  if (!modal || !lista) return;

  document.getElementById("titulo-gerenciar-membros").innerText = `Configurações de "${carteira.nome}"`;
  document.getElementById("gerenciar-membros-carteira-id").value = carteira.id;
  document.getElementById("btn-excluir-carteira").dataset.nome = carteira.nome;
  modal.style.display = "flex";
  trapFoco(modal);

  // Carteira individual não tem com quem compartilhar — só mostra a zona de excluir
  if (carteira.tipo !== "compartilhada") {
    campoMembros.style.display = "none";
    btnSalvarMembros.style.display = "none";
    return;
  }
  campoMembros.style.display = "";
  btnSalvarMembros.style.display = "";
  lista.innerHTML = `<span class="dica-campo">Carregando...</span>`;

  try {
    const [respostaMembros, respostaColegas] = await Promise.all([
      CadimusWalletsApi.listarMembros(carteira.id),
      CadimusWalletsApi.listarColegas(),
    ]);

    if (tratarSessaoExpirada(respostaMembros) || tratarSessaoExpirada(respostaColegas)) return;

    const dadosMembros = await respostaMembros.json();
    const colegas = await respostaColegas.json();

    if (!respostaMembros.ok) {
      lista.innerHTML = `<span class="dica-campo">${dadosMembros.erro || "Erro ao carregar membros."}</span>`;
      return;
    }

    const idsAtuais = new Set(dadosMembros.membros.map((m) => m.id));
    const idsAdmins = new Set(dadosMembros.membros.filter((m) => m.papel === "admin").map((m) => m.id));

    if (colegas.length === 0) {
      lista.innerHTML = `<span class="dica-campo">Não há outros usuários cadastrados ainda.</span>`;
      return;
    }

    lista.innerHTML = colegas
      .map((colega) => {
        const jaAdmin = idsAdmins.has(colega.id);
        const marcado = idsAtuais.has(colega.id);
        return `
          <label class="opcao-membro ${jaAdmin ? "opcao-membro-desabilitada" : ""}">
            <input type="checkbox" class="checkbox-gerenciar-membro" value="${colega.id}" ${marcado ? "checked" : ""} ${jaAdmin ? "disabled" : ""} />
            ${escaparHtml(colega.nome || colega.nome_usuario)}${jaAdmin ? " (admin)" : ""}
          </label>
        `;
      })
      .join("");
  } catch (erro) {
    lista.innerHTML = `<span class="dica-campo">Falha na comunicação com o servidor.</span>`;
  }
}

function configurarModalGerenciarMembros() {
  const modal = document.getElementById("modal-gerenciar-membros");
  const btnFechar = document.getElementById("btn-fechar-modal-membros");
  const btnSalvar = document.getElementById("btn-salvar-membros");
  const btnExcluir = document.getElementById("btn-excluir-carteira");

  if (!modal || !btnFechar || !btnSalvar || !btnExcluir) return;

  btnFechar.addEventListener("click", () => {
    modal.style.display = "none";
    liberarFoco();
  });

  btnExcluir.addEventListener("click", async () => {
    const carteiraId = document.getElementById("gerenciar-membros-carteira-id").value;
    const nome = btnExcluir.dataset.nome || "esta carteira";
    if (!carteiraId) return;

    const confirmou = await pedirConfirmacao(
      `Excluir "${nome}"? Todos os lançamentos, transferências, orçamentos, cartões, recorrências, despesas fixas e metas dela serão apagados para sempre.`,
      { textoConfirmar: "Excluir", perigo: true },
    );
    if (!confirmou) return;

    btnExcluir.disabled = true;
    btnExcluir.innerText = "Excluindo...";

    try {
      const resposta = await CadimusWalletsApi.excluirCarteira(carteiraId);

      if (tratarSessaoExpirada(resposta)) return;

      if (resposta.ok) {
        modal.style.display = "none";
        liberarFoco();
        carteirasDoUsuario = await (await CadimusWalletsApi.listarCarteiras()).json();
        renderizarTabsCarteira();
        mostrarToast("Carteira excluída", "info");
      } else {
        const erro = await resposta.json();
        await mostrarAviso(`Erro: ${erro.erro}`);
      }
    } catch (erro) {
      await mostrarAviso("Falha na comunicação com o servidor.");
    } finally {
      btnExcluir.disabled = false;
      btnExcluir.innerText = "Excluir esta carteira";
    }
  });

  btnSalvar.addEventListener("click", async () => {
    const carteiraId = document.getElementById("gerenciar-membros-carteira-id").value;
    if (!carteiraId) return;

    const membros = Array.from(document.querySelectorAll(".checkbox-gerenciar-membro:checked:not(:disabled)")).map((chk) => Number(chk.value));

    btnSalvar.disabled = true;
    btnSalvar.innerText = "Salvando...";

    try {
      const resposta = await CadimusWalletsApi.atualizarMembros(carteiraId, membros);

      if (tratarSessaoExpirada(resposta)) return;

      if (resposta.ok) {
        modal.style.display = "none";
        liberarFoco();
        mostrarToast("Membros atualizados");
      } else {
        const erro = await resposta.json();
        await mostrarAviso(`Erro: ${erro.erro}`);
      }
    } catch (erro) {
      await mostrarAviso("Falha na comunicação com o servidor.");
    } finally {
      btnSalvar.disabled = false;
      btnSalvar.innerText = "Salvar";
    }
  });
}
