// ==========================================
// wallets-context-ui.js - Contexto, seleção e abas de carteiras
// ==========================================

let carteirasDoUsuario = [];
let ultimaRequisicaoCarteiras = 0;
let fecharMenuCarteiraAtivo = null;
let menuCarteiraFlutuanteAtivo = null;
let botaoTransferenciaCarteiraConfigurado = false;
const dependenciasCarteiras = {};
const scriptsCarteirasCarregados = new Set();

function carregarScriptsCarteiras(chave, scripts) {
  if (dependenciasCarteiras[chave]) return dependenciasCarteiras[chave];
  const scriptsPendentes = scripts.filter((script) => !scriptsCarteirasCarregados.has(script));
  if (scriptsPendentes.length === 0) return Promise.resolve();

  dependenciasCarteiras[chave] = CadimusPageLoader.carregar(scriptsPendentes).then(() => {
    scriptsPendentes.forEach((script) => scriptsCarteirasCarregados.add(script));
  }).catch((erro) => {
    delete dependenciasCarteiras[chave];
    throw erro;
  });
  return dependenciasCarteiras[chave];
}

function removerFechamentoMenuCarteira() {
  if (!fecharMenuCarteiraAtivo) return;
  document.removeEventListener("click", fecharMenuCarteiraAtivo);
  fecharMenuCarteiraAtivo = null;
}

function removerMenuCarteiraFlutuante() {
  removerFechamentoMenuCarteira();
  if (!menuCarteiraFlutuanteAtivo) return;
  menuCarteiraFlutuanteAtivo.classList.remove("aberto");
  menuCarteiraFlutuanteAtivo.style.visibility = "";
  menuCarteiraFlutuanteAtivo.remove();
  menuCarteiraFlutuanteAtivo = null;
}

function obterNomeCarteiraExibicao(carteira) {
  const nome = String(carteira?.nome || "Carteira").trim();
  if (carteira?.tipo !== "compartilhada") return nome;
  return nome.replace(/\s*\((compartilhada|compartilhado)\)\s*$/i, "").trim() || nome;
}

async function carregarModuloCarteirasCompleto() {
  await Promise.all([
    carregarModuloCarteiraModal(),
    carregarModuloMembrosCarteira(),
    carregarModuloTransferenciaCarteira(),
    carregarModuloOrcamentoCarteira(),
    carregarModuloCartoesCreditoCarteira(),
  ]);
}

async function carregarModuloCarteiraModal() {
  await carregarScriptsCarteiras("modal-carteira", ["wallets-modal-ui.js?v=100"]);
  chamarInicializadorCadimus("configurarModalCarteira");
}

async function carregarModuloMembrosCarteira() {
  await carregarScriptsCarteiras("membros-carteira", ["wallets-members-ui.js?v=100"]);
  chamarInicializadorCadimus("configurarModalGerenciarMembros");
}

async function carregarModuloTransferenciaCarteira() {
  await carregarScriptsCarteiras("transferencia-carteira", ["wallets-transfer-ui.js?v=101"]);
  chamarInicializadorCadimus("configurarModalTransferencia");
}

async function carregarModuloOrcamentoCarteira() {
  await carregarScriptsCarteiras("orcamento-carteira", ["wallets-budget-modal-ui.js?v=100"]);
  chamarInicializadorCadimus("configurarModalOrcamento");
}

async function carregarModuloCartoesCreditoCarteira() {
  await carregarScriptsCarteiras("cartoes-carteira", ["cards-api.js?v=100", "wallets-card-ui.js?v=100"]);
  chamarInicializadorCadimus("configurarModalCartaoCredito");
}

async function abrirModalCarteiraSobDemanda() {
  try {
    await carregarModuloCarteiraModal();
    if (typeof abrirModalCarteira === "function") abrirModalCarteira();
  } catch (erro) {
    console.error("Erro ao carregar módulo de carteira:", erro);
    mostrarToast("Não foi possível abrir a carteira agora.", "erro");
  }
}

async function abrirGerenciamentoMembrosSobDemanda(carteira) {
  try {
    await carregarModuloMembrosCarteira();
    if (typeof abrirModalGerenciarMembros === "function") await abrirModalGerenciarMembros(carteira);
  } catch (erro) {
    console.error("Erro ao carregar gerenciamento de carteira:", erro);
    mostrarToast("Não foi possível abrir a configuração da carteira agora.", "erro");
  }
}

function configurarBotaoTransferenciaCarteira() {
  const btnTransferencia = document.getElementById("btn-transferencia");
  if (!btnTransferencia || botaoTransferenciaCarteiraConfigurado) return;
  botaoTransferenciaCarteiraConfigurado = true;

  btnTransferencia.addEventListener("click", async () => {
    try {
      await carregarModuloTransferenciaCarteira();
      if (typeof abrirModalTransferencia === "function") await abrirModalTransferencia();
    } catch (erro) {
      console.error("Erro ao carregar transferência:", erro);
      mostrarToast("Não foi possível abrir a transferência agora.", "erro");
    }
  });
}

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
  removerMenuCarteiraFlutuante();

  const valorAtual = inputOculto.value;
  const aindaExiste = carteirasDoUsuario.some((c) => String(c.id) === String(valorAtual));

  container.innerHTML = "";

  carteirasDoUsuario.forEach((carteira) => {
    const nomeExibicao = obterNomeCarteiraExibicao(carteira);
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
    btn.title = carteira.tipo === "compartilhada" ? `${nomeExibicao} · compartilhada` : `${nomeExibicao} · só sua`;
    if (aindaExiste && String(carteira.id) === String(valorAtual)) {
      btn.classList.add("ativo");
    }
    if (carteira.tipo === "compartilhada") {
      btn.classList.add("tab-compartilhada");
    }

    const svgIcone = carteira.tipo === "compartilhada"
      ? `<svg class="tab-carteira-icone" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
      : `<svg class="tab-carteira-icone" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

    btn.innerHTML = `
      ${svgIcone}
      <span class="tab-carteira-texto">
        <span class="tab-carteira-nome">${escaparHtml(nomeExibicao)}</span>
        ${carteira.tipo === "compartilhada" ? '<span class="tab-carteira-tipo">Compartilhada</span>' : ""}
      </span>
    `;
    btn.addEventListener("click", () => selecionarCarteira(carteira.id));
    wrapper.appendChild(btn);

    container.appendChild(wrapper);
  });

  const separador = document.createElement("div");
  separador.className = "tab-carteira-separador";
  container.appendChild(separador);

  const acoesWrapper = document.createElement("div");
  acoesWrapper.className = "carteira-acoes-wrapper";

  const btnAcoes = document.createElement("button");
  btnAcoes.type = "button";
  btnAcoes.className = "tab-carteira-add";
  btnAcoes.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
  btnAcoes.title = "Criar ou configurar carteira";
  btnAcoes.setAttribute("aria-label", "Criar ou configurar carteira");
  btnAcoes.setAttribute("aria-haspopup", "menu");
  btnAcoes.setAttribute("aria-expanded", "false");

  const menu = document.createElement("div");
  menu.className = "carteira-acoes-menu";
  menu.setAttribute("role", "menu");
  menu.innerHTML = `
    <button type="button" role="menuitem" data-carteira-acao="nova">
      <span class="carteira-menu-icone">+</span>
      <span>Nova carteira</span>
    </button>
    <button type="button" role="menuitem" data-carteira-acao="configurar">
      <span class="carteira-menu-icone">⚙</span>
      <span>Configurar atual</span>
    </button>
  `;

  function fecharMenuCarteira() {
    acoesWrapper.classList.remove("aberto");
    btnAcoes.setAttribute("aria-expanded", "false");
    removerMenuCarteiraFlutuante();
  }

  function posicionarMenuCarteira() {
    const margem = 12;
    const botao = btnAcoes.getBoundingClientRect();

    menu.style.visibility = "hidden";
    menu.style.left = "0px";
    menu.style.top = "0px";
    menu.classList.add("aberto");

    const larguraMenu = menu.offsetWidth || 188;
    const alturaMenu = menu.offsetHeight || 96;
    const left = Math.min(Math.max(margem, botao.right - larguraMenu), window.innerWidth - larguraMenu - margem);
    const topAbaixo = botao.bottom + 8;
    const topAcima = botao.top - alturaMenu - 8;
    const top = topAbaixo + alturaMenu + margem <= window.innerHeight ? topAbaixo : Math.max(margem, topAcima);

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.style.visibility = "";
  }

  btnAcoes.addEventListener("click", (evento) => {
    evento.stopPropagation();
    const aberto = acoesWrapper.classList.toggle("aberto");
    btnAcoes.setAttribute("aria-expanded", String(aberto));
    if (aberto) {
      removerMenuCarteiraFlutuante();
      document.body.appendChild(menu);
      menuCarteiraFlutuanteAtivo = menu;
      posicionarMenuCarteira();
      fecharMenuCarteiraAtivo = (eventoDocumento) => {
        if (!acoesWrapper.contains(eventoDocumento.target) && !menu.contains(eventoDocumento.target)) fecharMenuCarteira();
      };
      setTimeout(() => document.addEventListener("click", fecharMenuCarteiraAtivo), 0);
    } else {
      removerMenuCarteiraFlutuante();
    }
  });

  menu.addEventListener("click", (evento) => {
    evento.stopPropagation();
    const item = evento.target.closest("[data-carteira-acao]");
    if (!item) return;
    const acao = item.dataset.carteiraAcao;
    fecharMenuCarteira();
    if (acao === "nova") {
      abrirModalCarteiraSobDemanda();
      return;
    }

    const carteira = obterCarteiraSelecionada();
    if (!carteira) {
      mostrarToast("Selecione uma carteira primeiro.", "info");
      return;
    }
    if (carteira.papel !== "admin") {
      mostrarToast("Você não pode configurar esta carteira.", "info");
      return;
    }
    void abrirGerenciamentoMembrosSobDemanda(carteira);
  });

  acoesWrapper.appendChild(btnAcoes);
  container.appendChild(acoesWrapper);

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

window.carregarCarteiras = carregarCarteiras;
window.obterCarteiraSelecionada = obterCarteiraSelecionada;
window.selecionarCarteira = selecionarCarteira;
window.carregarModuloCarteirasCompleto = carregarModuloCarteirasCompleto;
window.carregarModuloCarteiraModal = carregarModuloCarteiraModal;
window.carregarModuloMembrosCarteira = carregarModuloMembrosCarteira;
window.carregarModuloTransferenciaCarteira = carregarModuloTransferenciaCarteira;
window.carregarModuloOrcamentoCarteira = carregarModuloOrcamentoCarteira;
window.carregarModuloCartoesCreditoCarteira = carregarModuloCartoesCreditoCarteira;
window.configurarBotaoTransferenciaCarteira = configurarBotaoTransferenciaCarteira;
