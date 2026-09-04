// ==========================================
// note-popup-ui.js - Popup de nota dos lançamentos
// ==========================================

let popupNotaConfigurado = false;

function criarPopupNotaSeNecessario() {
  let popup = document.getElementById("popup-nota");
  if (popup) return popup;

  popup = document.createElement("div");
  popup.id = "popup-nota";
  popup.className = "popup-nota-overlay";
  popup.innerHTML = `
    <div class="popup-nota-conteudo">
      <div class="popup-nota-header">
        <span class="popup-nota-titulo">Nota</span>
        <button type="button" class="popup-nota-fechar" id="popup-nota-fechar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="popup-nota-descricao" id="popup-nota-descricao"></div>
      <div class="popup-nota-texto" id="popup-nota-texto"></div>
    </div>
  `;
  document.body.appendChild(popup);

  document.getElementById("popup-nota-fechar")?.addEventListener("click", fecharPopupNota);
  popup.addEventListener("click", (ev) => {
    if (ev.target === popup) fecharPopupNota();
  });

  return popup;
}

function abrirPopupNota(nota, descricao = "") {
  if (!nota) return;

  const popup = criarPopupNotaSeNecessario();
  document.getElementById("popup-nota-descricao").textContent = descricao || "";
  document.getElementById("popup-nota-texto").textContent = nota;
  popup.style.display = "flex";
}

function configurarPopupNota() {
  if (popupNotaConfigurado) return;
  popupNotaConfigurado = true;

  document.addEventListener("click", (e) => {
    const alvo = e.target.closest(".item-nota-clique");
    if (!alvo) return;

    e.preventDefault();
    e.stopPropagation();
    abrirPopupNota(alvo.dataset.nota, alvo.dataset.descricao);
  });
}

function fecharPopupNota() {
  const popup = document.getElementById("popup-nota");
  if (popup) popup.style.display = "none";
}
