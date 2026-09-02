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

  chamarSeExistir("configurarInstallBanner");
});
