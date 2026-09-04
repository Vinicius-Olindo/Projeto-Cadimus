// ==========================================
// import-export-loader.js - Carga sob demanda de importação/exportação
// ==========================================

let modaisImportExportPromise = null;
let importacaoPromise = null;
let exportacaoPromise = null;
let botaoImportarSobDemandaConfigurado = false;
let botaoExportarSobDemandaConfigurado = false;

async function carregarModaisImportExportSobDemanda() {
  if (document.getElementById("modal-importar") && document.getElementById("modal-exportar")) return;

  if (!modaisImportExportPromise) {
    modaisImportExportPromise = CadimusPageLoader.carregar(["import-export-modal-components.js?v=101"]);
  }

  await modaisImportExportPromise;
}

async function carregarImportacaoSobDemanda() {
  if (!importacaoPromise) {
    importacaoPromise = carregarModaisImportExportSobDemanda()
      .then(() => CadimusPageLoader.carregar(["importar.js?v=102"]))
      .then(() => {
        if (typeof configurarModalImportacao !== "function") {
          throw new Error("Módulo de importação não ficou disponível após o carregamento.");
        }
        configurarModalImportacao();
      });
  }

  await importacaoPromise;
}

async function carregarExportacaoSobDemanda() {
  if (!exportacaoPromise) {
    exportacaoPromise = carregarModaisImportExportSobDemanda()
      .then(() => CadimusPageLoader.carregar(["exportar.js?v=101"]))
      .then(() => {
        if (typeof configurarModalExportacao !== "function") {
          throw new Error("Módulo de exportação não ficou disponível após o carregamento.");
        }
        configurarModalExportacao();
      });
  }

  await exportacaoPromise;
}

async function abrirImportacaoSobDemanda(evento) {
  evento?.preventDefault();
  const btn = document.getElementById("btn-importar-extrato");
  btn?.removeEventListener("click", abrirImportacaoSobDemanda);
  botaoImportarSobDemandaConfigurado = false;

  try {
    await carregarImportacaoSobDemanda();
    btn?.click();
  } catch (erro) {
    console.error("Erro ao carregar importação:", erro);
    mostrarToast?.("Não foi possível abrir a importação agora.", "erro");
    configurarImportExportSobDemanda();
  }
}

async function abrirExportacaoSobDemanda(evento) {
  evento?.preventDefault();
  const btn = document.getElementById("btn-exportar-extrato");
  btn?.removeEventListener("click", abrirExportacaoSobDemanda);
  botaoExportarSobDemandaConfigurado = false;

  try {
    await carregarExportacaoSobDemanda();
    btn?.click();
  } catch (erro) {
    console.error("Erro ao carregar exportação:", erro);
    mostrarToast?.("Não foi possível abrir a exportação agora.", "erro");
    configurarImportExportSobDemanda();
  }
}

function configurarImportExportSobDemanda() {
  const btnImportar = document.getElementById("btn-importar-extrato");
  if (btnImportar && !botaoImportarSobDemandaConfigurado) {
    btnImportar.addEventListener("click", abrirImportacaoSobDemanda);
    botaoImportarSobDemandaConfigurado = true;
  }

  const btnExportar = document.getElementById("btn-exportar-extrato");
  if (btnExportar && !botaoExportarSobDemandaConfigurado) {
    btnExportar.addEventListener("click", abrirExportacaoSobDemanda);
    botaoExportarSobDemandaConfigurado = true;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", configurarImportExportSobDemanda);
} else {
  configurarImportExportSobDemanda();
}

window.carregarImportacaoSobDemanda = carregarImportacaoSobDemanda;
window.carregarExportacaoSobDemanda = carregarExportacaoSobDemanda;
window.configurarImportExportSobDemanda = configurarImportExportSobDemanda;
