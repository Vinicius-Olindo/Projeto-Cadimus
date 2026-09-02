// ==========================================
// ui-pwa.js - Service Worker e instalação PWA
// ==========================================

const CADIMUS_CACHE_ATUAL = "cadimus-cache-v12";
let deferredInstallPrompt = null;

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
