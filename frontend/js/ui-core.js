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
// PWA - Registro do Service Worker
// ==========================================
const CADIMUS_CACHE_ATUAL = "cadimus-cache-v12";

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
  if (document.body?.dataset?.cadimusPage === "redefinir-senha") {
    inicializarDarkMode();
    return;
  }

  const ehCadastroConvite = typeof verificarCadastroConvite === "function" ? verificarCadastroConvite() : false;
  if (ehCadastroConvite) return;

  const chamarSeExistir = (nome) => {
    const fn = window[nome] || globalThis[nome];
    if (typeof fn === "function") fn();
  };

  inicializarFiltroMes();
  inicializarDarkMode();
  chamarSeExistir("configurarInputsMonetarios");
  configurarMonitoresDeFiltro();
  chamarSeExistir("configurarBuscaLancamentos");
  chamarSeExistir("configurarNotificacoes");
  chamarSeExistir("configurarLote");
  chamarSeExistir("configurarPopupNota");
  chamarSeExistir("configurarComparativoPeriodo");
  chamarSeExistir("configurarBuscaGlobal");
  chamarSeExistir("configurarModal");
  chamarSeExistir("configurarModalCarteira");
  chamarSeExistir("configurarModalGerenciarMembros");
  chamarSeExistir("configurarModalDespesasFixas");
  chamarSeExistir("configurarModalComprasParceladas");
  chamarSeExistir("configurarModalMeta");
  chamarSeExistir("configurarModalDeposito");
  chamarSeExistir("configurarModalRenomearCategoria");
  chamarSeExistir("configurarPainelAdmin");
  chamarSeExistir("configurarPlano");
  chamarSeExistir("configurarModalTransferencia");
  chamarSeExistir("configurarModalOrcamento");
  chamarSeExistir("configurarModalCartaoCredito");
  chamarSeExistir("configurarRelatorios");
  chamarSeExistir("configurarDashboardLayout");
  chamarSeExistir("configurarVisoesDashboard");

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
