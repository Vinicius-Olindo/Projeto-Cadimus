// ui-onboarding.js - Tour guiado do dashboard
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
