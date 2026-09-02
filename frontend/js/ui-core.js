// ==========================================
// ui-core.js - Helpers visuais e inicialização geral
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

  chamarSeExistir("inicializarFiltroMes");
  inicializarDarkMode();
  chamarSeExistir("configurarInputsMonetarios");
  chamarSeExistir("configurarMonitoresDeFiltro");
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
