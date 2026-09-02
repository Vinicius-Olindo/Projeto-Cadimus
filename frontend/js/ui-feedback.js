// ui-feedback.js - Foco de modal, toast, aviso e confirmação
let modalFocoAtivo = null;
let trapHandler = null;

function trapFoco(modal) {
  liberarFoco();
  modalFocoAtivo = modal;
  const anterior = document.activeElement;

  function aoTeclar(e) {
    if (e.key === "Escape") {
      const btnFechar = modal.querySelector("[id^='btn-fechar-modal'], #btn-aviso-ok, #btn-confirmacao-cancelar, #btn-fechar-modal-meta");
      if (btnFechar) btnFechar.click();
      return;
    }
    if (e.key !== "Tab") return;

    const alvos = modal.querySelectorAll(
      'button:not([disabled]):not([style*="display: none"]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (alvos.length === 0) return;

    const primeiro = alvos[0];
    const ultimo = alvos[alvos.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      }
    } else {
      if (document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    }
  }

  trapHandler = aoTeclar;
  document.addEventListener("keydown", aoTeclar);

  requestAnimationFrame(() => {
    const focavel = modal.querySelector(
      'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
    );
    if (focavel) focavel.focus();
  });

  return () => {
    document.removeEventListener("keydown", aoTeclar);
    trapHandler = null;
    modalFocoAtivo = null;
    if (anterior && anterior.focus) anterior.focus();
  };
}

function liberarFoco() {
  if (trapHandler) {
    document.removeEventListener("keydown", trapHandler);
    trapHandler = null;
    modalFocoAtivo = null;
  }
}

function mostrarToast(mensagem, tipo = "sucesso", duracao = 2500) {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${tipo}`;
  toast.textContent = mensagem;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-saindo");
    toast.addEventListener("animationend", () => toast.remove());
  }, duracao);
}

function mostrarAviso(mensagem) {
  return new Promise((resolve) => {
    const modal = document.getElementById("modal-aviso");
    const texto = document.getElementById("aviso-texto");
    const btnOk = document.getElementById("btn-aviso-ok");
    if (!modal || !texto || !btnOk) {
      alert(mensagem);
      resolve();
      return;
    }

    texto.textContent = mensagem;
    modal.style.display = "flex";
    const liberar = trapFoco(modal);

    function aoFechar() {
      modal.style.display = "none";
      liberar();
      btnOk.removeEventListener("click", aoFechar);
      resolve();
    }

    btnOk.addEventListener("click", aoFechar);
  });
}

function pedirConfirmacao(mensagem, opcoes = {}) {
  return new Promise((resolve) => {
    const modal = document.getElementById("modal-confirmacao");
    const texto = document.getElementById("confirmacao-texto");
    const btnConfirmar = document.getElementById("btn-confirmacao-confirmar");
    const btnCancelar = document.getElementById("btn-confirmacao-cancelar");
    if (!modal || !texto || !btnConfirmar || !btnCancelar) {
      resolve(false);
      return;
    }

    texto.textContent = mensagem;
    btnConfirmar.textContent = opcoes.textoConfirmar || "Confirmar";
    btnConfirmar.classList.toggle("confirmacao-perigo", Boolean(opcoes.perigo));
    modal.style.display = "flex";
    const liberar = trapFoco(modal);

    function limpar() {
      modal.style.display = "none";
      liberar();
      btnConfirmar.removeEventListener("click", aoConfirmar);
      btnCancelar.removeEventListener("click", aoCancelar);
    }
    function aoConfirmar() {
      limpar();
      resolve(true);
    }
    function aoCancelar() {
      limpar();
      resolve(false);
    }

    btnConfirmar.addEventListener("click", aoConfirmar);
    btnCancelar.addEventListener("click", aoCancelar);
  });
}
