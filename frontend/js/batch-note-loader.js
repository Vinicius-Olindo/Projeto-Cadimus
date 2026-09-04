// ==========================================
// batch-note-loader.js - Ponte leve para lote e popup de nota
// ==========================================

let moduloLotePromise = null;
let moduloLoteCarregado = false;
let moduloNotaPromise = null;
let moduloNotaCarregado = false;
let loteSobDemandaConfigurado = false;
let popupNotaSobDemandaConfigurado = false;

const MODULO_LOTE_SRC = "batch-selection-ui.js?v=100";
const MODULO_NOTA_SRC = "note-popup-ui.js?v=100";

let configurarLoteProxy = null;
let configurarPopupNotaProxy = null;

function obterFuncaoRealSobDemanda(nome, proxy) {
  const fn = window[nome] || globalThis[nome];
  return typeof fn === "function" && fn !== proxy ? fn : null;
}

function removerAtalhosLoteSobDemanda() {
  const container = document.getElementById("lista-lancamentos");
  container?.removeEventListener("change", acionarLoteSobDemanda);
  document.getElementById("lote-btn-aplicar")?.removeEventListener("click", acionarLoteSobDemanda);
  document.getElementById("lote-btn-cancelar")?.removeEventListener("click", acionarLoteSobDemanda);
  loteSobDemandaConfigurado = false;
}

async function carregarModuloLote() {
  if (moduloLoteCarregado) return;

  if (!moduloLotePromise) {
    moduloLotePromise = CadimusPageLoader.carregar([MODULO_LOTE_SRC])
      .then(() => {
        const configurarReal = obterFuncaoRealSobDemanda("configurarLote", configurarLoteProxy);
        if (!configurarReal) {
          throw new Error("Edição em lote não ficou disponível após o carregamento.");
        }

        moduloLoteCarregado = true;
        removerAtalhosLoteSobDemanda();
        configurarReal();
      })
      .catch((erro) => {
        moduloLotePromise = null;
        moduloLoteCarregado = false;
        console.error("Erro ao carregar edição em lote:", erro);
        mostrarToast?.("Não foi possível carregar a edição em lote agora.", "erro");
        throw erro;
      });
  }

  await moduloLotePromise;
}

async function carregarModuloNota() {
  if (moduloNotaCarregado) return;

  if (!moduloNotaPromise) {
    moduloNotaPromise = CadimusPageLoader.carregar([MODULO_NOTA_SRC])
      .then(() => {
        const configurarReal = obterFuncaoRealSobDemanda("configurarPopupNota", configurarPopupNotaProxy);
        if (!configurarReal) {
          throw new Error("Popup de nota não ficou disponível após o carregamento.");
        }

        moduloNotaCarregado = true;
        document.removeEventListener("click", abrirPopupNotaSobDemanda);
        popupNotaSobDemandaConfigurado = false;
        configurarReal();
      })
      .catch((erro) => {
        moduloNotaPromise = null;
        moduloNotaCarregado = false;
        console.error("Erro ao carregar popup de nota:", erro);
        mostrarToast?.("Não foi possível abrir a nota agora.", "erro");
        throw erro;
      });
  }

  await moduloNotaPromise;
}

function popularSelectLoteCategorias() {
  const select = document.getElementById("lote-categoria");
  if (!select) return;

  const lancamentos =
    typeof ultimoLoteLancamentos !== "undefined"
      ? ultimoLoteLancamentos
      : Array.isArray(window.ultimoLoteLancamentos)
        ? window.ultimoLoteLancamentos
        : [];
  const categorias = new Set(lancamentos.map((l) => l.categoria));
  select.querySelectorAll("option[data-cat-lote]").forEach((op) => op.remove());

  Array.from(categorias).sort().forEach((cat) => {
    const opcao = document.createElement("option");
    opcao.value = cat;
    opcao.textContent = cat;
    opcao.dataset.catLote = "true";
    select.appendChild(opcao);
  });
}

async function acionarLoteSobDemanda(evento) {
  const alvoCheckbox = evento.target.closest?.(".lote-check");
  const alvoBotao = evento.target.closest?.("#lote-btn-aplicar, #lote-btn-cancelar");
  if (!alvoCheckbox && !alvoBotao) return;

  await carregarModuloLote();

  const alvo = alvoCheckbox || alvoBotao;
  const tipoEvento = alvoCheckbox ? "change" : "click";
  alvo.dispatchEvent(new Event(tipoEvento, { bubbles: true }));
}

function configurarLote() {
  if (moduloLoteCarregado || loteSobDemandaConfigurado) return;

  const container = document.getElementById("lista-lancamentos");
  if (!container) return;

  container.addEventListener("change", acionarLoteSobDemanda);
  document.getElementById("lote-btn-aplicar")?.addEventListener("click", acionarLoteSobDemanda);
  document.getElementById("lote-btn-cancelar")?.addEventListener("click", acionarLoteSobDemanda);
  loteSobDemandaConfigurado = true;
}

async function abrirPopupNotaSobDemanda(evento) {
  const alvo = evento.target.closest?.(".item-nota-clique");
  if (!alvo) return;

  evento.preventDefault();
  evento.stopPropagation();

  const nota = alvo.dataset.nota;
  const descricao = alvo.dataset.descricao;
  if (!nota) return;

  await carregarModuloNota();
  const abrirReal = obterFuncaoRealSobDemanda("abrirPopupNota", null);
  abrirReal?.(nota, descricao);
}

function configurarPopupNota() {
  if (moduloNotaCarregado || popupNotaSobDemandaConfigurado) return;

  document.addEventListener("click", abrirPopupNotaSobDemanda);
  popupNotaSobDemandaConfigurado = true;
}

configurarLoteProxy = configurarLote;
configurarPopupNotaProxy = configurarPopupNota;

window.carregarModuloLote = carregarModuloLote;
window.carregarModuloNota = carregarModuloNota;
window.configurarLote = configurarLoteProxy;
window.configurarPopupNota = configurarPopupNotaProxy;
window.popularSelectLoteCategorias = popularSelectLoteCategorias;
