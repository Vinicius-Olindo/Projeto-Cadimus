// ==========================================
// modal-components.js - Componentes HTML dos modais principais
// ==========================================

const MODAIS_HTML = String.raw`
    <!-- MODAL: ZERAR TODOS OS DADOS -->
    <!-- MODAL: NOVO LANÇAMENTO -->
    <div id="modal-lancamento" class="modal-overlay" role="dialog" aria-modal="true" style="display: none">
      <div class="modal-content">
        <h3 id="titulo-modal-lancamento">Novo lançamento</h3>
        <p class="modal-subtitulo lancamento-modal-subtitulo" id="subtitulo-modal-lancamento">Escolha o tipo de registro e cadastre pelo caminho mais rápido.</p>
        <div class="lancamento-tipo-rapido" id="lancamento-tipo-rapido" aria-label="Tipo de lançamento">
          <button type="button" class="ativo lancamento-atalho-card lancamento-atalho-simples" data-atalho-lancamento="simples">
            <span class="lancamento-atalho-icone">↕</span>
            <span class="lancamento-atalho-texto">
              <strong>Lançamento</strong>
              <small>Receita ou despesa única</small>
            </span>
          </button>
          <button type="button" class="lancamento-atalho-card lancamento-atalho-parcelada" data-atalho-lancamento="parcelada">
            <span class="lancamento-atalho-icone">▦</span>
            <span class="lancamento-atalho-texto">
              <strong>Parcelada</strong>
              <small>Compra em parcelas</small>
            </span>
          </button>
          <button type="button" class="lancamento-atalho-card lancamento-atalho-fixa" data-atalho-lancamento="fixa">
            <span class="lancamento-atalho-icone">↻</span>
            <span class="lancamento-atalho-texto">
              <strong>Fixa</strong>
              <small>Repete todo mês</small>
            </span>
          </button>
          <button type="button" class="lancamento-atalho-card lancamento-atalho-bonificacao" data-atalho-lancamento="bonificacao">
            <span class="lancamento-atalho-icone">✦</span>
            <span class="lancamento-atalho-texto">
              <strong>Bonificação</strong>
              <small>Receita recorrente</small>
            </span>
          </button>
        </div>
        <form id="form-lancamento">
          <input type="hidden" id="lancamento-editando-id" value="" />
          <div class="campo">
            <label for="tipo-gasto">Tipo</label>
            <select id="tipo-gasto">
              <option value="despesa">Despesa</option>
              <option value="receita">Receita</option>
            </select>
          </div>

          <div class="campo">
            <label for="descricao">Descrição</label>
            <input type="text" id="descricao" placeholder="Ex: Mercado, Salário..." required />
            <button type="button" id="sugestao-categoria-lancamento" class="sugestao-categoria-lancamento" hidden></button>
          </div>

          <div class="linha-form-dupla">
            <div class="campo">
              <label for="valor">Valor</label>
              <input type="text" id="valor" inputmode="decimal" autocomplete="off" placeholder="R$ 0,00" required />
            </div>
            <div class="campo">
              <label for="data-compra">Data</label>
              <input type="date" id="data-compra" required />
            </div>
          </div>

          <div class="campo">
            <label for="categoria">Categoria</label>
            <select id="categoria" required>
              <option value="" disabled selected>Escolher</option>
              <option value="__nova__">+ Nova categoria…</option>
            </select>
            <input type="text" id="categoria-nova" class="campo-condicional" placeholder="Nome da nova categoria" style="display: none; margin-top: 8px" />
          </div>

          <div class="linha-form-dupla">
            <div class="campo">
              <label for="meio-pagamento">Meio de pagamento</label>
              <select id="meio-pagamento" required>
                <option value="" disabled selected>Escolher</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="pix">Pix</option>
                <option value="debito">Débito</option>
                <option value="credito">Crédito</option>
              </select>
            </div>
            <div class="campo">
              <label for="status-pagamento">Status</label>
              <select id="status-pagamento" required>
                <option value="pago">Pago</option>
                <option value="pendente">Pendente</option>
              </select>
            </div>
          </div>

          <div class="campo campo-cartao-credito" id="campo-cartao-lancamento" style="display: none">
            <label for="cartao-credito-lancamento">Cartão de crédito</label>
            <select id="cartao-credito-lancamento">
              <option value="">Nenhum cartão</option>
            </select>
            <span class="dica-campo">Selecione um cartão para abater do limite cadastrado.</span>
          </div>

          <div class="campo">
            <label for="nota-lancamento">Nota <span class="campo-optional">(opcional)</span></label>
            <textarea id="nota-lancamento" rows="2" placeholder="Observações, detalhes, lembretes..."></textarea>
          </div>

          <div class="linha-form-dupla">
            <div class="campo">
              <label for="anexo-nome-lancamento">Nome do anexo <span class="campo-optional">(opcional)</span></label>
              <input type="text" id="anexo-nome-lancamento" maxlength="120" placeholder="Ex: Comprovante Pix" />
            </div>
            <div class="campo">
              <label for="anexo-url-lancamento">Link do anexo <span class="campo-optional">(https)</span></label>
              <input type="url" id="anexo-url-lancamento" maxlength="2048" placeholder="https://..." />
            </div>
          </div>

          <button type="submit" id="btn-salvar-lancamento">Salvar</button>
          <button type="button" id="btn-fechar-modal">Cancelar</button>
        </form>
      </div>
    </div>

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

    <!-- MODAL: CONVIDAR USUÁRIO -->
    <div id="modal-convite" class="modal-overlay" role="dialog" aria-modal="true" style="display: none">
      <div class="modal-content">
        <h3>Convidar usuário</h3>
        <form id="form-convite">
          <div class="campo">
            <label for="convite-nome">Nome completo</label>
            <input type="text" id="convite-nome" placeholder="Nome do convidado" required />
          </div>
          <div class="campo">
            <label for="convite-email">E-mail</label>
            <input type="email" id="convite-email" placeholder="email@exemplo.com" required />
          </div>
          <div class="campo">
            <label for="convite-perfil">Perfil</label>
            <select id="convite-perfil">
              <option value="comum">Comum</option>
              <option value="superadmin">Admin</option>
            </select>
          </div>
          <button type="submit" id="btn-gerar-convite">Gerar convite</button>
          <button type="button" id="btn-fechar-modal-convite">Cancelar</button>
        </form>
        <div id="convite-resultado" style="display: none">
          <h4>Convite gerado!</h4>
          <p>Envie este link para o convidado:</p>
          <div class="campo-link-convite">
            <input type="text" id="convite-link" readonly />
            <button type="button" id="btn-copiar-convite">Copiar</button>
          </div>
          <p class="dica-campo">O link expira em 3 horas.</p>
          <button type="button" id="btn-fechar-convite-resultado">Fechar</button>
        </div>
      </div>
    </div>

    <!-- MODAL: NOTIFICAÇÕES -->
    <div id="modal-notificacoes" class="modal-overlay" role="dialog" aria-modal="true" style="display: none">
      <div class="modal-content modal-notificacoes">
        <div class="painel-notificacoes-header">
          <div>
            <h3>Central de alertas</h3>
            <p class="painel-notificacoes-subtitulo">Histórico e lembretes financeiros</p>
          </div>
          <button type="button" id="btn-fechar-modal-notificacoes" class="btn-fechar-modal" aria-label="Fechar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="painel-notificacoes-controles">
          <div class="notificacao-tabs" role="tablist" aria-label="Filtro de notificações">
            <button type="button" class="notificacao-tab ativo" data-status="nao_lida">Não lidas</button>
            <button type="button" class="notificacao-tab" data-status="todas">Todas</button>
            <button type="button" class="notificacao-tab" data-status="arquivada">Arquivadas</button>
          </div>
          <button type="button" id="btn-marcar-notificacoes-lidas" class="notificacao-acao-secundaria">Marcar lidas</button>
        </div>
        <div class="painel-notificacoes-lista" id="lista-notificacoes"></div>
      </div>
    </div>

    <!-- MODAL: DIA DO CALENDÁRIO -->
    <div id="modal-calendario-dia" class="modal-overlay" role="dialog" aria-modal="true" style="display: none">
      <div class="modal-content modal-calendario-dia">
        <div class="modal-calendario-dia-topo">
          <div>
            <h3 id="calendario-dia-titulo">Agenda do dia</h3>
            <p id="calendario-dia-resumo" class="modal-subtitulo">Lançamentos desta data.</p>
          </div>
          <button type="button" id="btn-fechar-modal-calendario-dia" class="btn-fechar-modal" aria-label="Fechar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div id="calendario-dia-lista" class="calendario-dia-lista"></div>
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

function montarComponentesModais() {
  const raiz = document.getElementById("modal-components-root");
  if (!raiz) return;
  raiz.innerHTML = MODAIS_HTML;
}

montarComponentesModais();
