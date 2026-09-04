// ==========================================
// entries-actions-loader.js - Carga sob demanda de ações sensíveis
// ==========================================

let moduloAcoesLancamentoPromise = null;
let moduloAcoesLancamentoCarregado = false;

const MODULO_ACOES_LANCAMENTO_SRC = "pages/entries/entries-actions-ui.js?v=103";

let apagarLancamentoProxy = null;

function obterAcaoRealLancamento(nome, proxy) {
  const fn = window[nome] || globalThis[nome];
  return typeof fn === "function" && fn !== proxy ? fn : null;
}

async function carregarModuloAcoesLancamento() {
  if (moduloAcoesLancamentoCarregado) return;

  if (!moduloAcoesLancamentoPromise) {
    moduloAcoesLancamentoPromise = CadimusPageLoader.carregar([MODULO_ACOES_LANCAMENTO_SRC])
      .then(() => {
        const apagarPronto = obterAcaoRealLancamento("apagarLancamento", apagarLancamentoProxy);
        if (!apagarPronto) {
          throw new Error("Ação de exclusão não ficou disponível após o carregamento.");
        }

        moduloAcoesLancamentoCarregado = true;
      })
      .catch((erro) => {
        moduloAcoesLancamentoPromise = null;
        moduloAcoesLancamentoCarregado = false;
        console.error("Erro ao carregar ações de lançamento:", erro);
        mostrarToast?.("Não foi possível executar essa ação agora.", "erro");
        throw erro;
      });
  }

  await moduloAcoesLancamentoPromise;
}

async function apagarLancamento(id) {
  await carregarModuloAcoesLancamento();
  const apagarReal = obterAcaoRealLancamento("apagarLancamento", apagarLancamentoProxy);
  return apagarReal?.(id);
}

apagarLancamentoProxy = apagarLancamento;

window.carregarModuloAcoesLancamento = carregarModuloAcoesLancamento;
window.apagarLancamento = apagarLancamentoProxy;
