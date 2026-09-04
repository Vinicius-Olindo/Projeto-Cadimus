// ==========================================
// entries-modal-loader.js - Carga sob demanda do modal de lançamentos
// ==========================================

let moduloModalLancamentoPromise = null;
let moduloModalLancamentoCarregado = false;
let botaoNovoLancamentoSobDemandaConfigurado = false;

const MODULO_MODAL_LANCAMENTO_SRC = "pages/entries/entries-modal-ui.js?v=122";

let configurarModalProxy = null;
let abrirModalNovoLancamentoProxy = null;
let editarLancamentoProxy = null;
let duplicarLancamentoProxy = null;
let abrirModalModeloLancamentoProxy = null;

function removerAtalhoNovoLancamentoSobDemanda() {
  const btnNovo = document.getElementById("btn-novo-gasto");
  if (!btnNovo || !abrirModalNovoLancamentoProxy) return;

  btnNovo.removeEventListener("click", abrirModalNovoLancamentoProxy);
  botaoNovoLancamentoSobDemandaConfigurado = false;
}

function obterFuncaoRealLancamento(nome, proxy) {
  const fn = window[nome] || globalThis[nome];
  return typeof fn === "function" && fn !== proxy ? fn : null;
}

async function carregarModuloModalLancamento() {
  if (moduloModalLancamentoCarregado) return;

  if (!moduloModalLancamentoPromise) {
    moduloModalLancamentoPromise = CadimusPageLoader.carregar([MODULO_MODAL_LANCAMENTO_SRC])
      .then(() => {
        const modalPronto = obterFuncaoRealLancamento("abrirModalNovoLancamento", abrirModalNovoLancamentoProxy);
        if (!modalPronto) {
          throw new Error("Modal de lançamento não ficou disponível após o carregamento.");
        }

        moduloModalLancamentoCarregado = true;
        chamarInicializadorCadimus("configurarModal");
        removerAtalhoNovoLancamentoSobDemanda();
      })
      .catch((erro) => {
        moduloModalLancamentoPromise = null;
        moduloModalLancamentoCarregado = false;
        console.error("Erro ao carregar modal de lançamento:", erro);
        mostrarToast?.("Não foi possível abrir o lançamento agora.", "erro");
        throw erro;
      });
  }

  await moduloModalLancamentoPromise;
}

function configurarModal() {
  if (moduloModalLancamentoCarregado || botaoNovoLancamentoSobDemandaConfigurado) return;

  const btnNovo = document.getElementById("btn-novo-gasto");
  if (!btnNovo || !abrirModalNovoLancamentoProxy) return;

  btnNovo.addEventListener("click", abrirModalNovoLancamentoProxy);
  botaoNovoLancamentoSobDemandaConfigurado = true;
}

async function abrirModalNovoLancamento() {
  await carregarModuloModalLancamento();
  const abrirReal = obterFuncaoRealLancamento("abrirModalNovoLancamento", abrirModalNovoLancamentoProxy);
  return abrirReal?.();
}

async function editarLancamento(id) {
  await carregarModuloModalLancamento();
  const editarReal = obterFuncaoRealLancamento("editarLancamento", editarLancamentoProxy);
  return editarReal?.(id);
}

async function duplicarLancamento(id) {
  await carregarModuloModalLancamento();
  const duplicarReal = obterFuncaoRealLancamento("duplicarLancamento", duplicarLancamentoProxy);
  return duplicarReal?.(id);
}

async function abrirModalModeloLancamento(modelo = {}) {
  await carregarModuloModalLancamento();
  const abrirModeloReal = obterFuncaoRealLancamento("abrirModalModeloLancamento", abrirModalModeloLancamentoProxy);
  return abrirModeloReal?.(modelo);
}

configurarModalProxy = configurarModal;
abrirModalNovoLancamentoProxy = abrirModalNovoLancamento;
editarLancamentoProxy = editarLancamento;
duplicarLancamentoProxy = duplicarLancamento;
abrirModalModeloLancamentoProxy = abrirModalModeloLancamento;

window.carregarModuloModalLancamento = carregarModuloModalLancamento;
window.configurarModal = configurarModalProxy;
window.abrirModalNovoLancamento = abrirModalNovoLancamentoProxy;
window.editarLancamento = editarLancamentoProxy;
window.duplicarLancamento = duplicarLancamentoProxy;
window.abrirModalModeloLancamento = abrirModalModeloLancamentoProxy;
