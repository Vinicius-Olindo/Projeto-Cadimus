// ==========================================
// ui-period-filter.js - Seletor/filtro de mês
// ==========================================

// --- SELETOR DE MÊS (setas, sem depender do calendário nativo do navegador) ---
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
