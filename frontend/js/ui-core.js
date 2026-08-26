// ==========================================
// ui-core.js - Helpers visuais, filtros e tema
// ==========================================

// Se a API responder 401 (sessão inválida/expirada), desloga e volta pro login
function tratarSessaoExpirada(resposta) {
  if (resposta.status === 401) {
    limparSessao();
    alternarTelas(false);
    mostrarAviso("Sua sessão expirou. Faça login novamente."); // não bloqueia: a função precisa continuar síncrona
    return true;
  }
  return false;
}

function formatarDataHoraLegado(dataISO) {
  if (!dataISO) return "—";
  try {
    const normalizado = dataISO.replace(" ", "T");
    const d = new Date(normalizado);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

// ==========================================
// FOCUS TRAP — mantém o Tab preso dentro do modal aberto
// ==========================================
let modalFocoAtivo = null;
let trapHandler = null;

function trapFoco(modal) {
  liberarFoco();
  modalFocoAtivo = modal;
  const anterior = document.activeElement;

  function aoTeclar(e) {
    if (e.key === "Escape") {
      const btnFechar = modal.querySelector("[id^='btn-fechar-modal'], #btn-aviso-ok, #btn-confirmacao-cancelar, #btn-fechar-modal-meta");
      if (btnFechar) btnFechar.click();
      return;
    }
    if (e.key !== "Tab") return;

    const alvos = modal.querySelectorAll(
      'button:not([disabled]):not([style*="display: none"]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (alvos.length === 0) return;

    const primeiro = alvos[0];
    const ultimo = alvos[alvos.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      }
    } else {
      if (document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    }
  }

  trapHandler = aoTeclar;
  document.addEventListener("keydown", aoTeclar);

  requestAnimationFrame(() => {
    const focavel = modal.querySelector(
      'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
    );
    if (focavel) focavel.focus();
  });

  return () => {
    document.removeEventListener("keydown", aoTeclar);
    trapHandler = null;
    modalFocoAtivo = null;
    if (anterior && anterior.focus) anterior.focus();
  };
}

function liberarFoco() {
  if (trapHandler) {
    document.removeEventListener("keydown", trapHandler);
    trapHandler = null;
    modalFocoAtivo = null;
  }
}

// ==========================================
// TOAST — notificação flutuante de feedback
// ==========================================
function mostrarToast(mensagem, tipo = "sucesso", duracao = 2500) {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${tipo}`;
  toast.textContent = mensagem;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-saindo");
    toast.addEventListener("animationend", () => toast.remove());
  }, duracao);
}

// ==========================================
// AVISO E CONFIRMAÇÃO EM MODAL (no lugar de alert()/confirm() nativos)
// ==========================================
function mostrarAviso(mensagem) {
  return new Promise((resolve) => {
    const modal = document.getElementById("modal-aviso");
    const texto = document.getElementById("aviso-texto");
    const btnOk = document.getElementById("btn-aviso-ok");
    if (!modal || !texto || !btnOk) {
      resolve();
      return;
    }

    texto.textContent = mensagem;
    modal.style.display = "flex";
    const liberar = trapFoco(modal);

    function aoFechar() {
      modal.style.display = "none";
      liberar();
      btnOk.removeEventListener("click", aoFechar);
      resolve();
    }

    btnOk.addEventListener("click", aoFechar);
  });
}

function pedirConfirmacao(mensagem, opcoes = {}) {
  return new Promise((resolve) => {
    const modal = document.getElementById("modal-confirmacao");
    const texto = document.getElementById("confirmacao-texto");
    const btnConfirmar = document.getElementById("btn-confirmacao-confirmar");
    const btnCancelar = document.getElementById("btn-confirmacao-cancelar");
    if (!modal || !texto || !btnConfirmar || !btnCancelar) {
      resolve(false);
      return;
    }

    texto.textContent = mensagem;
    btnConfirmar.textContent = opcoes.textoConfirmar || "Confirmar";
    btnConfirmar.classList.toggle("confirmacao-perigo", Boolean(opcoes.perigo));
    modal.style.display = "flex";
    const liberar = trapFoco(modal);

    function limpar() {
      modal.style.display = "none";
      liberar();
      btnConfirmar.removeEventListener("click", aoConfirmar);
      btnCancelar.removeEventListener("click", aoCancelar);
    }
    function aoConfirmar() {
      limpar();
      resolve(true);
    }
    function aoCancelar() {
      limpar();
      resolve(false);
    }

    btnConfirmar.addEventListener("click", aoConfirmar);
    btnCancelar.addEventListener("click", aoCancelar);
  });
}

// ==========================================
// PWA - Registro do Service Worker
// ==========================================
const CADIMUS_CACHE_ATUAL = "cadimus-cache-v11";

function limparCachesCadimusAntigos() {
  if (!("caches" in window)) return;

  caches.keys()
    .then((chaves) => Promise.all(
      chaves
        .filter((chave) => chave.startsWith("cadimus-cache-") && chave !== CADIMUS_CACHE_ATUAL)
        .map((chave) => caches.delete(chave)),
    ))
    .catch((erro) => console.warn("Não foi possível limpar caches antigos do Cadimus:", erro));
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js")
      .then((registro) => {
        registro.update?.();
        limparCachesCadimusAntigos();
      })
      .catch((erro) => {
        console.error("Erro ao registrar o service worker:", erro);
      });
  });
} else {
  limparCachesCadimusAntigos();
}

document.addEventListener("DOMContentLoaded", () => {
  const ehCadastroConvite = verificarCadastroConvite();
  if (ehCadastroConvite) return;

  inicializarFiltroMes();
  inicializarDarkMode();
  configurarInputsMonetarios();
  configurarMonitoresDeFiltro();
  configurarBuscaLancamentos();
  configurarNotificacoes();
  configurarLote();
  configurarPopupNota();
  configurarComparativoPeriodo();
  configurarModal();
  configurarModalCarteira();
  configurarModalGerenciarMembros();
  configurarModalDespesasFixas();
  configurarModalComprasParceladas();
  configurarModalMeta();
  configurarModalDeposito();
  configurarModalRenomearCategoria();
  configurarPainelAdmin();
  configurarPlano();
  configurarModalTransferencia();
  configurarModalOrcamento();
  configurarModalCartaoCredito();
  configurarRelatorios();
  configurarDashboardLayout();

  // Botão de transferência
  const btnTransferencia = document.getElementById("btn-transferencia");
  if (btnTransferencia) {
    btnTransferencia.addEventListener("click", () => window.abrirModalTransferencia());
  }

  // Botão de novo orçamento
  const btnNovoOrcamento = document.getElementById("btn-novo-orcamento");
  if (btnNovoOrcamento) {
    btnNovoOrcamento.addEventListener("click", () => window.abrirModalOrcamento());
  }

  // Botão de novo cartão de crédito
  const btnNovoCartao = document.getElementById("btn-novo-cartao");
  if (btnNovoCartao) {
    btnNovoCartao.addEventListener("click", () => window.abrirModalCartao());
  }

  // Botão de cartões de crédito no header
  const btnCartoesCredito = document.getElementById("btn-cartoes-credito");
  if (btnCartoesCredito) {
    btnCartoesCredito.addEventListener("click", () => {
      // Se já tem cartões, scrolla para o painel; senão abre modal de novo
      if (cartoesCreditoCarregados.length > 0) {
        const card = document.getElementById("card-cartoes-credito");
        if (card && card.style.display !== "none") {
          card.scrollIntoView({ behavior: "smooth" });
          return;
        }
      }
      window.abrirModalCartao();
    });
  }

  // Botão de relatório PDF
  const btnRelatorioPdf = document.getElementById("btn-relatorio-pdf");
  if (btnRelatorioPdf) {
    btnRelatorioPdf.addEventListener("click", gerarRelatorioPDF);
  }

  // PWA: instalação na tela inicial
  configurarInstallBanner();
});

// --- PWA INSTALL BANNER ---
let deferredInstallPrompt = null;

function configurarInstallBanner() {
  window.addEventListener("beforeinstallprompt", (e) => {
    if (!deveMostrarBannerInstalacao()) return;
    e.preventDefault();
    deferredInstallPrompt = e;
    mostrarBannerInstalacao();
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    ocultarBannerInstalacao();
    mostrarToast("App instalado com sucesso!", "sucesso");
  });
}

function deveMostrarBannerInstalacao() {
  if (lerLocalStorageSeguro("cadimus_install_dismissed") === "1") return false;
  if (typeof obterUsuarioLogado !== "function") return false;
  const usuario = obterUsuarioLogado();
  return Boolean(usuario?.id);
}

function mostrarBannerInstalacao() {
  if (!deveMostrarBannerInstalacao()) return;
  if (typeof obterUsuarioLogado !== "function") return;
  const usuario = obterUsuarioLogado();
  if (!usuario) return;

  let banner = document.getElementById("pwa-install-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "pwa-install-banner";
    banner.className = "pwa-install-banner";
    banner.innerHTML = `
      <span class="pwa-install-texto">📱 Instale o Gestor Financeiro na sua tela inicial</span>
      <div class="pwa-install-acoes">
        <button type="button" class="pwa-install-btn" id="pwa-install-btn">Instalar</button>
        <button type="button" class="pwa-install-dismiss" id="pwa-install-dismiss">Agora não</button>
      </div>
    `;
    document.body.appendChild(banner);

    document.getElementById("pwa-install-btn").addEventListener("click", async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === "accepted") {
        mostrarToast("Instalando app...");
      }
      deferredInstallPrompt = null;
      ocultarBannerInstalacao();
    });

    document.getElementById("pwa-install-dismiss").addEventListener("click", () => {
      gravarLocalStorageSeguro("cadimus_install_dismissed", "1");
      ocultarBannerInstalacao();
    });
  }
}

function ocultarBannerInstalacao() {
  const banner = document.getElementById("pwa-install-banner");
  if (banner) banner.remove();
}

// --- ONBOARDING INTERATIVO (Tour Guiado) ---
const ONBOARDING_STEPS = [
  { alvo: ".seletor-mes", titulo: "Navegue pelos meses", texto: "Use as setas para ver lançamentos de outros meses." },
  { alvo: ".carteira-tabs", titulo: "Suas carteiras", texto: "Clique para trocar de conta ou criar uma nova." },
  { alvo: "#btn-novo-gasto", titulo: "Novo lançamento", texto: "Adicione receitas e despesas aqui." },
  { alvo: "#btn-transferencia", titulo: "Transferências", texto: "Transfira valores entre suas carteiras." },
  { alvo: "#btn-notificacoes", titulo: "Alertas", texto: "Notificações de vencimentos aparecem aqui." },
];

function iniciarOnboarding() {
  if (lerLocalStorageSeguro("cadimus_onboarding_done") === "1") return;
  const usuario = obterUsuarioLogado();
  if (!usuario) return;

  // Só iniciar se estiver no dashboard (não na tela de login)
  const dashboard = document.getElementById("dashboard-section");
  if (!dashboard || dashboard.style.display === "none") return;

  const firstLogin = !lerLocalStorageSeguro("cadimus_onboarding_seen_" + usuario.id);
  if (!firstLogin && lerLocalStorageSeguro("cadimus_onboarding_done") !== "0") return;

  gravarLocalStorageSeguro("cadimus_onboarding_seen_" + usuario.id, "1");
  gravarLocalStorageSeguro("cadimus_onboarding_done", "0");

  let stepIdx = 0;

  function showStep(idx) {
    removerOnboarding();

    if (idx >= ONBOARDING_STEPS.length) {
      gravarLocalStorageSeguro("cadimus_onboarding_done", "1");
      removerOnboarding();
      return;
    }

    const step = ONBOARDING_STEPS[idx];
    const alvo = document.querySelector(step.alvo);
    if (!alvo || alvo.offsetParent === null) { showStep(idx + 1); return; }

    const rect = alvo.getBoundingClientRect();
    const overlay = document.createElement("div");
    overlay.className = "onboarding-overlay";
    overlay.innerHTML = `
      <div class="onboarding-tooltip" style="top:${rect.bottom + 10}px; left:${Math.min(rect.left, window.innerWidth - 300)}px;">
        <div class="onboarding-tooltip-titulo">${step.titulo}</div>
        <div class="onboarding-tooltip-texto">${step.texto}</div>
        <div class="onboarding-tooltip-nav">
          <span class="onboarding-progresso">${idx + 1} / ${ONBOARDING_STEPS.length}</span>
          <div class="onboarding-botoes">
            <button type="button" class="onboarding-btn onboarding-pular">Pular</button>
            <button type="button" class="onboarding-btn onboarding-proximo">Próximo</button>
          </div>
        </div>
      </div>
      <div class="onboarding-highlight" style="top:${rect.top - 4}px; left:${rect.left - 4}px; width:${rect.width + 8}px; height:${rect.height + 8}px;"></div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector(".onboarding-proximo").addEventListener("click", () => showStep(idx + 1));
    overlay.querySelector(".onboarding-pular").addEventListener("click", () => {
      gravarLocalStorageSeguro("cadimus_onboarding_done", "1");
      removerOnboarding();
    });
  }

  function removerOnboarding() {
    document.querySelectorAll(".onboarding-overlay").forEach((el) => el.remove());
  }

  // Iniciar após a renderização do dashboard
  setTimeout(() => showStep(0), 1200);
}

// Expor para chamada externa
window.iniciarOnboarding = iniciarOnboarding;

// --- SELETOR DE MÊS (setas, sem depender do calendário nativo do navegador) ---
// ==========================================
// [2] ESTADO GLOBAL
// ==========================================
const NOMES_MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function inicializarFiltroMes() {
  const campoMes = document.getElementById("filtro-mes");
  if (!campoMes) return;

  const hoje = new Date();
  definirMesExibido(hoje.getFullYear(), hoje.getMonth(), { disparaEvento: false });

  const btnAnterior = document.getElementById("btn-mes-anterior");
  const btnSeguinte = document.getElementById("btn-mes-seguinte");
  const btnPlanoAnterior = document.getElementById("btn-plano-mes-anterior");
  const btnPlanoSeguinte = document.getElementById("btn-plano-mes-seguinte");
  const rotulo = document.getElementById("rotulo-mes");
  const rotuloPlano = document.getElementById("plano-rotulo-mes");

  btnAnterior?.addEventListener("click", () => navegarMes(-1));
  btnSeguinte?.addEventListener("click", () => navegarMes(1));
  btnPlanoAnterior?.addEventListener("click", () => navegarMes(-1));
  btnPlanoSeguinte?.addEventListener("click", () => navegarMes(1));
  rotulo?.addEventListener("click", () => {
    const agora = new Date();
    definirMesExibido(agora.getFullYear(), agora.getMonth());
    animarTrocaDePeriodo("agora");
  });
  rotuloPlano?.addEventListener("click", () => {
    const agora = new Date();
    definirMesExibido(agora.getFullYear(), agora.getMonth());
    animarTrocaDePeriodo("agora");
  });
}

function definirMesExibido(ano, mesIndiceZero, opcoes = {}) {
  const campoMes = document.getElementById("filtro-mes");
  const rotulo = document.getElementById("rotulo-mes");
  if (!campoMes) return;

  const mesTexto = String(mesIndiceZero + 1).padStart(2, "0");
  campoMes.value = `${ano}-${mesTexto}`;
  campoMes.dataset.ano = String(ano);
  campoMes.dataset.mes = String(mesIndiceZero);

  if (rotulo) rotulo.textContent = `${NOMES_MESES[mesIndiceZero]} de ${ano}`;
  const rotuloPlano = document.getElementById("plano-rotulo-mes");
  if (rotuloPlano) rotuloPlano.textContent = `${NOMES_MESES[mesIndiceZero]} de ${ano}`;

  if (opcoes.disparaEvento !== false) {
    campoMes.dispatchEvent(new Event("change"));
  }
}

function navegarMes(delta) {
  const campoMes = document.getElementById("filtro-mes");
  if (!campoMes) return;

  let ano = Number(campoMes.dataset.ano);
  let mes = Number(campoMes.dataset.mes) + delta;

  if (mes < 0) {
    mes = 11;
    ano -= 1;
  } else if (mes > 11) {
    mes = 0;
    ano += 1;
  }

  definirMesExibido(ano, mes);
  animarTrocaDePeriodo(delta > 0 ? "frente" : "tras");
}

// Reforça a metáfora do caderno: o conteúdo desliza como se estivesse virando a página
function animarTrocaDePeriodo(direcao) {
  const container = document.getElementById("conteudo-periodo");
  if (!container || prefereMovimentoReduzido()) return;

  container.classList.remove("anim-frente", "anim-tras", "anim-agora");
  void container.offsetWidth; // força reflow pra poder reiniciar a mesma animação em sequência
  container.classList.add(`anim-${direcao}`);
}

function prefereMovimentoReduzido() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// --- MONITORES DE EVENTO (OUVINTES) ---
function configurarMonitoresDeFiltro() {
  const seletorCarteira = document.getElementById("seletor-carteira");
  const filtroMes = document.getElementById("filtro-mes");

  if (seletorCarteira) {
    seletorCarteira.addEventListener("change", async () => {
      await carregarLancamentos();
      if (typeof atualizarPlanejamentoVisivel === "function") {
        await atualizarPlanejamentoVisivel();
      }
    });
  }
  if (filtroMes) {
    filtroMes.addEventListener("change", async () => {
      await carregarLancamentos();
      if (typeof atualizarPlanejamentoVisivel === "function") {
        await atualizarPlanejamentoVisivel();
      }
    });
  }
}

// ==========================================
// [5] FILTROS: Mês, Período, Dark Mode
// ==========================================

// --- MODO ESCURO ---
const ICONE_LUA = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>';
const ICONE_SOL =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';

function inicializarDarkMode() {
  const areaAcoes = document.querySelector(".acoes-topo");
  if (!areaAcoes) return;

  const btnTheme = document.createElement("button");
  btnTheme.id = "btn-theme-toggle";
  btnTheme.className = "tema-switch";
  btnTheme.title = "Alternar tema";
  btnTheme.setAttribute("type", "button");
  btnTheme.setAttribute("aria-label", "Alternar entre modo claro e escuro");

  areaAcoes.insertBefore(btnTheme, document.querySelector(".avatar-dropdown-wrapper"));

  if (lerLocalStorageSeguro("cadimus_tema") === "dark") {
    document.body.classList.add("dark-mode");
  }
  atualizarSeletorTemaTopo();

  btnTheme.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    gravarLocalStorageSeguro("cadimus_tema", document.body.classList.contains("dark-mode") ? "dark" : "light");
    atualizarSeletorTemaTopo();
    sincronizarToggleTema();
  });
}

function atualizarSeletorTemaTopo() {
  const btnTheme = document.getElementById("btn-theme-toggle");
  if (!btnTheme) return;

  const estaEscuro = document.body.classList.contains("dark-mode");
  btnTheme.classList.toggle("tema-switch-escuro", estaEscuro);
  btnTheme.setAttribute("aria-pressed", String(estaEscuro));
  btnTheme.title = estaEscuro ? "Tema escuro ativo. Clique para usar tema claro." : "Tema claro ativo. Clique para usar tema escuro.";
  btnTheme.innerHTML = `
    <span class="tema-switch-trilho" aria-hidden="true">
      <span class="tema-switch-opcao tema-switch-sol">${ICONE_SOL}</span>
      <span class="tema-switch-opcao tema-switch-lua">${ICONE_LUA}</span>
      <span class="tema-switch-thumb"></span>
    </span>
  `;
}
