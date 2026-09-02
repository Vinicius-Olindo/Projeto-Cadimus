// modal-feedback-components.js - Modais leves de aviso/confirmacao
const MODAIS_FEEDBACK_HTML = String.raw`
    <!-- MODAL: ESQUECI MINHA SENHA -->
    <div id="modal-esqueci-senha" class="modal-overlay" role="dialog" aria-modal="true" style="display: none">
      <div class="modal-content">
        <h3>Esqueci minha senha</h3>
        <form id="form-esqueci-senha">
          <div class="campo">
            <label for="esqueci-email">E-mail cadastrado</label>
            <input type="email" id="esqueci-email" placeholder="seu@email.com" required />
          </div>
          <button type="submit" id="btn-enviar-recuperacao">Enviar link de recuperação</button>
          <button type="button" id="btn-fechar-modal-esqueci-senha">Cancelar</button>
        </form>
      </div>
    </div>

    <!-- MODAL: AVISO (substitui alert()) -->
    <div id="modal-aviso" class="modal-overlay" role="dialog" aria-modal="true" style="display: none">
      <div class="modal-content modal-compacto">
        <p id="aviso-texto" class="modal-aviso-texto"></p>
        <button type="button" id="btn-aviso-ok">OK</button>
      </div>
    </div>

    <!-- MODAL: CONFIRMAÇÃO (substitui confirm()) -->
    <div id="modal-confirmacao" class="modal-overlay" role="dialog" aria-modal="true" style="display: none">
      <div class="modal-content modal-compacto">
        <p id="confirmacao-texto" class="modal-aviso-texto"></p>
        <div class="modal-confirmacao-acoes">
          <button type="button" id="btn-confirmacao-confirmar">Confirmar</button>
          <button type="button" id="btn-confirmacao-cancelar">Cancelar</button>
        </div>
      </div>
    </div>
`;

function montarComponentesFeedback() {
  const raiz = document.getElementById("modal-components-root");
  if (!raiz) return;
  raiz.insertAdjacentHTML("beforeend", MODAIS_FEEDBACK_HTML);
}

montarComponentesFeedback();
