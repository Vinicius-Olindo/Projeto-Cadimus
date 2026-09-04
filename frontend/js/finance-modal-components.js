// ==========================================
// finance-modal-components.js - Componentes HTML dos modais financeiros
// ==========================================

const FINANCE_MODAIS_HTML = String.raw`
    <!-- MODAL: TRANSFERÊNCIA ENTRE CARTEIRAS -->
    <div id="modal-transferencia" class="modal-overlay" role="dialog" aria-modal="true" style="display: none">
      <div class="modal-content">
        <h3>Transferir entre carteiras</h3>
        <form id="form-transferencia">
          <div class="campo">
            <label for="transferencia-carteira-origem">Carteira de origem</label>
            <select id="transferencia-carteira-origem" required>
              <option value="" disabled selected>Selecionar carteira</option>
            </select>
          </div>

          <div class="campo">
            <label for="transferencia-carteira-destino">Carteira de destino</label>
            <select id="transferencia-carteira-destino" required>
              <option value="" disabled selected>Selecionar carteira</option>
            </select>
          </div>

          <div class="linha-form-dupla">
            <div class="campo">
              <label for="transferencia-valor">Valor</label>
              <input type="text" id="transferencia-valor" inputmode="decimal" autocomplete="off" placeholder="R$ 0,00" required />
            </div>
            <div class="campo">
              <label for="transferencia-data">Data</label>
              <input type="date" id="transferencia-data" required />
            </div>
          </div>

          <div class="campo">
            <label for="transferencia-descricao">Descrição <span class="campo-optional">(opcional)</span></label>
            <input type="text" id="transferencia-descricao" placeholder="Ex: Transferência para poupança..." />
          </div>

          <button type="submit" id="btn-salvar-transferencia">Transferir</button>
          <button type="button" id="btn-fechar-modal-transferencia">Cancelar</button>
        </form>
      </div>
    </div>

    <!-- MODAL: ORÇAMENTO MENSAL -->
    <div id="modal-orcamento" class="modal-overlay" role="dialog" aria-modal="true" style="display: none">
      <div class="modal-content">
        <h3 id="titulo-modal-orcamento">Orçamento mensal</h3>
        <form id="form-orcamento">
          <input type="hidden" id="orcamento-editando-id" value="" />

          <div class="campo">
            <label for="orcamento-categoria">Categoria</label>
            <select id="orcamento-categoria" required>
              <option value="" disabled selected>Selecionar categoria</option>
            </select>
          </div>

          <div class="linha-form-dupla">
            <div class="campo">
              <label for="orcamento-valor">Limite mensal (R$)</label>
              <input type="text" id="orcamento-valor" inputmode="decimal" autocomplete="off" placeholder="R$ 0,00" required />
            </div>
            <div class="campo">
              <label for="orcamento-mes">Mês</label>
              <select id="orcamento-mes" required>
                <option value="1">Janeiro</option>
                <option value="2">Fevereiro</option>
                <option value="3">Março</option>
                <option value="4">Abril</option>
                <option value="5">Maio</option>
                <option value="6">Junho</option>
                <option value="7">Julho</option>
                <option value="8">Agosto</option>
                <option value="9">Setembro</option>
                <option value="10">Outubro</option>
                <option value="11">Novembro</option>
                <option value="12">Dezembro</option>
              </select>
            </div>
          </div>

          <div class="campo">
            <label for="orcamento-ano">Ano</label>
            <input type="number" id="orcamento-ano" min="2020" max="2099" required />
          </div>

          <button type="submit" id="btn-salvar-orcamento">Salvar orçamento</button>
          <button type="button" id="btn-fechar-modal-orcamento">Cancelar</button>
        </form>
      </div>
    </div>

    <!-- MODAL: CARTÃO DE CRÉDITO -->
    <div id="modal-cartao-credito" class="modal-overlay" role="dialog" aria-modal="true" style="display: none">
      <div class="modal-content">
        <h3 id="titulo-modal-cartao">Novo cartão de crédito</h3>
        <form id="form-cartao-credito">
          <input type="hidden" id="cartao-editando-id" value="" />

          <div class="campo">
            <label for="cartao-nome">Nome (ex: Nubank XP)</label>
            <input type="text" id="cartao-nome" placeholder="Meu cartão" required />
          </div>

          <div class="campo">
            <label for="cartao-bandeira">Bandeira</label>
            <select id="cartao-bandeira">
              <option value="visa">Visa</option>
              <option value="mastercard">Mastercard</option>
              <option value="elo">Elo</option>
              <option value="amex">American Express</option>
              <option value="outro" selected>Outro</option>
            </select>
          </div>

          <div class="campo">
            <label for="cartao-ultimos4">Últimos 4 dígitos (opcional)</label>
            <input type="text" id="cartao-ultimos4" maxlength="4" pattern="\d{4}" placeholder="1234" />
          </div>

          <div class="campo-linha">
            <div class="campo">
              <label for="cartao-dia-fechamento">Dia fechamento</label>
              <input type="number" id="cartao-dia-fechamento" min="1" max="31" required />
            </div>
            <div class="campo">
              <label for="cartao-dia-vencimento">Dia vencimento</label>
              <input type="number" id="cartao-dia-vencimento" min="1" max="31" required />
            </div>
          </div>

          <div class="campo">
            <label for="cartao-limite">Limite (opcional)</label>
            <input type="text" id="cartao-limite" inputmode="decimal" autocomplete="off" placeholder="R$ 0,00" />
          </div>

          <button type="submit" id="btn-salvar-cartao">Salvar cartão</button>
          <button type="button" id="btn-fechar-modal-cartao">Cancelar</button>
        </form>
      </div>
    </div>

    <!-- MODAL: NOVA CARTEIRA -->
    <div id="modal-carteira" class="modal-overlay" role="dialog" aria-modal="true" style="display: none">
      <div class="modal-content">
        <h3>Nova carteira</h3>
        <form id="form-carteira">
          <div class="campo">
            <label for="nome-carteira">Nome</label>
            <input type="text" id="nome-carteira" placeholder="Ex: Viagem, Cartão de crédito" required />
          </div>
          <div class="campo">
            <label for="tipo-carteira">Tipo</label>
            <select id="tipo-carteira">
              <option value="individual">Só minha</option>
              <option value="compartilhada">Compartilhada</option>
            </select>
          </div>
          <div class="campo" id="campo-membros-carteira" style="display: none">
            <label>Compartilhar com</label>
            <div id="lista-membros-carteira" class="lista-membros-carteira">
              <span class="dica-campo">Carregando...</span>
            </div>
          </div>
          <button type="submit" id="btn-salvar-carteira">Criar carteira</button>
          <button type="button" id="btn-fechar-modal-carteira">Cancelar</button>
        </form>
      </div>
    </div>

    <!-- MODAL: CONFIGURAÇÕES DA CARTEIRA (membros + excluir) -->
    <div id="modal-gerenciar-membros" class="modal-overlay" role="dialog" aria-modal="true" style="display: none">
      <div class="modal-content">
        <h3 id="titulo-gerenciar-membros">Gerenciar membros</h3>
        <input type="hidden" id="gerenciar-membros-carteira-id" value="" />
        <div class="campo" id="campo-gerenciar-membros">
          <label>Quem tem acesso</label>
          <div class="modo-familia-resumo" id="modo-familia-resumo">
            <div>
              <strong>Admin</strong>
              <span>Gerencia membros, edita e exclui a carteira.</span>
            </div>
            <div>
              <strong>Membro</strong>
              <span>Acompanha e movimenta a carteira compartilhada.</span>
            </div>
          </div>
          <div id="lista-gerenciar-membros" class="lista-membros-carteira">
            <span class="dica-campo">Carregando...</span>
          </div>
        </div>
        <div class="modal-carteira-acoes">
          <button type="button" id="btn-fechar-modal-membros" class="btn-secundario">Cancelar</button>
          <button type="button" id="btn-salvar-membros" class="btn-primario">Salvar</button>
        </div>
        <div class="zona-perigo-carteira">
          <button type="button" id="btn-excluir-carteira">Excluir esta carteira</button>
        </div>
      </div>
    </div>

    <!-- MODAL: DESPESAS FIXAS -->
    <div id="modal-despesas-fixas" class="modal-overlay" role="dialog" aria-modal="true" style="display: none">
      <div class="modal-content">
        <h3 id="titulo-modal-fixa">Despesas fixas</h3>
        <p class="modal-subtitulo">Lançadas automaticamente todo mês, nesta carteira, sempre no mesmo valor.</p>

        <form id="form-despesa-fixa">
          <input type="hidden" id="fixa-editando-id" value="" />
          <div class="campo">
            <label for="fixa-descricao">Descrição</label>
            <input type="text" id="fixa-descricao" placeholder="Ex: Aluguel" required />
          </div>

          <div class="linha-form-dupla">
            <div class="campo">
              <label for="fixa-valor">Valor</label>
              <input type="text" id="fixa-valor" inputmode="decimal" autocomplete="off" placeholder="R$ 0,00" required />
            </div>
            <div class="campo">
              <label for="fixa-dia">Dia de vencimento</label>
              <input type="number" id="fixa-dia" min="1" max="28" placeholder="Ex: 5" required />
            </div>
          </div>

          <div class="campo">
            <label for="fixa-categoria">Categoria</label>
            <select id="fixa-categoria" required>
              <option value="" disabled selected>Escolher</option>
            </select>
          </div>

          <div class="linha-form-dupla">
            <div class="campo">
              <label for="fixa-meio-pagamento">Meio de pagamento</label>
              <select id="fixa-meio-pagamento" required>
                <option value="" disabled selected>Escolher</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="pix">Pix</option>
                <option value="debito">Débito</option>
                <option value="credito">Crédito</option>
              </select>
            </div>
            <div class="campo">
              <label for="fixa-tipo">Tipo</label>
              <select id="fixa-tipo">
                <option value="despesa">Despesa</option>
                <option value="receita">Receita</option>
              </select>
            </div>
          </div>

          <div class="campo campo-cartao-credito" id="campo-cartao-fixa" style="display: none">
            <label for="fixa-cartao-credito">Cartão de crédito</label>
            <select id="fixa-cartao-credito">
              <option value="">Nenhum cartão</option>
            </select>
            <span class="dica-campo">Use para despesas fixas pagas no cartão.</span>
          </div>

          <button type="submit" id="btn-salvar-fixa">Salvar</button>
        </form>

        <button type="button" id="btn-fechar-modal-fixas">Cancelar</button>
      </div>
    </div>

    <!-- MODAL: HISTÓRICO DE PAGAMENTOS (DESPESA FIXA) -->
    <div id="modal-historico-fixa" class="modal-overlay" role="dialog" aria-modal="true" style="display: none">
      <div class="modal-content modal-historico">
        <h3 id="titulo-historico-fixa">Histórico de pagamentos</h3>
        <div id="historico-fixa-lista" class="historico-fixa-lista"></div>
        <button type="button" id="btn-fechar-modal-historico-fixa">Fechar</button>
      </div>
    </div>

    <!-- MODAL: HISTÓRICO DE PARCELAS -->
    <div id="modal-historico-parcela" class="modal-overlay" role="dialog" aria-modal="true" style="display: none">
      <div class="modal-content modal-historico">
        <h3 id="titulo-historico-parcela">Histórico de parcelas</h3>
        <div id="historico-parcela-lista" class="historico-fixa-lista"></div>
        <button type="button" id="btn-fechar-modal-historico-parcela">Fechar</button>
      </div>
    </div>

    <!-- MODAL: LANÇAMENTO RECORRENTE -->
    <div id="modal-recorrencia" class="modal-overlay" role="dialog" aria-modal="true" style="display: none">
      <div class="modal-content">
        <h3 id="titulo-modal-recorrencia">Nova recorrência</h3>
        <p class="modal-subtitulo">Gera lançamentos automaticamente com a frequência escolhida.</p>

        <form id="form-recorrencia">
          <input type="hidden" id="recorrencia-editando-id" value="" />
          <div class="campo">
            <label for="recorrencia-descricao">Descrição</label>
            <input type="text" id="recorrencia-descricao" placeholder="Ex: Academia" required />
          </div>

          <div class="linha-form-dupla">
            <div class="campo">
              <label for="recorrencia-valor">Valor</label>
              <input type="text" id="recorrencia-valor" inputmode="decimal" autocomplete="off" placeholder="R$ 0,00" required />
            </div>
            <div class="campo">
              <label for="recorrencia-tipo">Tipo</label>
              <select id="recorrencia-tipo">
                <option value="despesa">Despesa</option>
                <option value="receita">Receita</option>
              </select>
            </div>
          </div>

          <div class="linha-form-dupla">
            <div class="campo">
              <label for="recorrencia-frequencia">Frequência</label>
              <select id="recorrencia-frequencia" required>
                <option value="diaria">Diária</option>
                <option value="semanal">Semanal</option>
                <option value="quinzenal">Quinzenal</option>
                <option value="mensal" selected>Mensal</option>
                <option value="trimestral">Trimestral</option>
                <option value="anual">Anual</option>
              </select>
            </div>
            <div class="campo" id="campo-dia-semana" style="display: none">
              <label for="recorrencia-dia-semana">Dia da semana</label>
              <select id="recorrencia-dia-semana">
                <option value="0">Domingo</option>
                <option value="1">Segunda</option>
                <option value="2">Terça</option>
                <option value="3">Quarta</option>
                <option value="4">Quinta</option>
                <option value="5">Sexta</option>
                <option value="6">Sábado</option>
              </select>
            </div>
            <div class="campo" id="campo-dia-mes">
              <label for="recorrencia-dia-mes">Dia do mês</label>
              <input type="number" id="recorrencia-dia-mes" min="1" max="28" value="1" required />
            </div>
          </div>

          <div class="linha-form-dupla">
            <div class="campo">
              <label for="recorrencia-data-inicio">Data de início</label>
              <input type="date" id="recorrencia-data-inicio" required />
            </div>
            <div class="campo">
              <label for="recorrencia-data-fim">Data de fim (opcional)</label>
              <input type="date" id="recorrencia-data-fim" />
            </div>
          </div>

          <div class="campo">
            <label for="recorrencia-categoria">Categoria</label>
            <select id="recorrencia-categoria" required>
              <option value="" disabled selected>Escolher</option>
            </select>
          </div>

          <div class="campo">
            <label for="recorrencia-meio-pagamento">Meio de pagamento</label>
            <select id="recorrencia-meio-pagamento" required>
              <option value="" disabled selected>Escolher</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="pix">Pix</option>
              <option value="debito">Débito</option>
              <option value="credito">Crédito</option>
            </select>
          </div>

          <button type="submit" id="btn-salvar-recorrencia">Salvar</button>
        </form>

        <button type="button" id="btn-fechar-modal-recorrencia">Cancelar</button>
      </div>
    </div>

    <!-- MODAL: COMPRA PARCELADA -->
    <div id="modal-compra-parcelada" class="modal-overlay" role="dialog" aria-modal="true" style="display: none">
      <div class="modal-content">
        <h3>Compra parcelada</h3>
        <p class="modal-subtitulo">Gera uma parcela por mês, sozinha, até completar o total (ex: 3/10).</p>

        <form id="form-compra-parcelada">
          <div class="campo">
            <label for="parcelada-descricao">Descrição</label>
            <input type="text" id="parcelada-descricao" placeholder="Ex: Notebook" required />
          </div>

          <div class="linha-form-dupla">
            <div class="campo">
              <label for="parcelada-valor-total">Valor total da compra</label>
              <input type="text" id="parcelada-valor-total" inputmode="decimal" autocomplete="off" placeholder="R$ 0,00" required />
            </div>
            <div class="campo">
              <label for="parcelada-total">Total de parcelas</label>
              <input type="number" id="parcelada-total" min="2" max="60" placeholder="Ex: 10" required />
            </div>
          </div>
          <p class="parcelada-preview" id="parcelada-preview" style="display: none"></p>

          <div class="linha-form-dupla">
            <div class="campo">
              <label for="parcelada-dia">Dia de vencimento</label>
              <input type="number" id="parcelada-dia" min="1" max="28" placeholder="Ex: 15" required />
            </div>
            <div class="campo">
              <label for="parcelada-mes-inicio">1ª parcela</label>
              <input type="month" id="parcelada-mes-inicio" required />
            </div>
          </div>

          <div class="campo">
            <label for="parcelada-categoria">Categoria</label>
            <select id="parcelada-categoria" required>
              <option value="" disabled selected>Escolher</option>
            </select>
          </div>

          <div class="campo">
            <label for="parcelada-meio-pagamento">Meio de pagamento</label>
            <select id="parcelada-meio-pagamento" required>
              <option value="" disabled selected>Escolher</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="pix">Pix</option>
              <option value="debito">Débito</option>
              <option value="credito">Crédito</option>
            </select>
          </div>

          <div class="campo campo-cartao-credito" id="campo-cartao-parcelada" style="display: none">
            <label for="parcelada-cartao-credito">Cartão de crédito</label>
            <select id="parcelada-cartao-credito">
              <option value="">Nenhum cartão</option>
            </select>
            <span class="dica-campo">A compra parcelada usa o limite pelo valor total.</span>
          </div>

          <button type="submit" id="btn-salvar-parcelada">Salvar</button>
        </form>

        <button type="button" id="btn-fechar-modal-parcelada">Cancelar</button>
      </div>
    </div>

    <!-- MODAL: META POR CATEGORIA -->
    <div id="modal-meta" class="modal-overlay" role="dialog" aria-modal="true" style="display: none">
      <div class="modal-content">
        <h3>Meta de gasto</h3>
        <p class="modal-subtitulo" id="meta-categoria-label">Categoria</p>
        <form id="form-meta">
          <input type="hidden" id="meta-categoria-nome" />
          <div class="campo" id="campo-meta-categoria-select" style="display: none">
            <label for="meta-categoria-select">Categoria</label>
            <select id="meta-categoria-select">
              <option value="" disabled selected>Escolher categoria</option>
            </select>
          </div>
          <div class="campo">
            <label for="meta-valor">Limite mensal</label>
            <input type="text" id="meta-valor" inputmode="decimal" autocomplete="off" placeholder="R$ 0,00" required />
          </div>
          <div class="campo">
            <label for="meta-data-limite">Data limite (opcional)</label>
            <input type="date" id="meta-data-limite" />
            <span class="dica-campo">Se definido, o app calcula quanto guardar por semana</span>
          </div>
          <button type="submit" id="btn-salvar-meta">Salvar meta</button>
          <button type="button" id="btn-remover-meta" class="btn-remover-meta" style="display: none">Remover meta</button>
          <button type="button" id="btn-fechar-modal-meta">Cancelar</button>
        </form>
      </div>
    </div>

    <!-- MODAL: DEPÓSITO EM META -->
    <div id="modal-meta-deposito" class="modal-overlay" role="dialog" aria-modal="true" style="display: none">
      <div class="modal-content modal-meta-deposito">
        <h3 id="titulo-meta-deposito">Depósito na meta</h3>

        <div class="meta-deposito-resumo">
          <div>
            <div class="meta-deposito-resumo-label">Depositado</div>
            <div class="meta-deposito-resumo-valor" id="deposito-valor-depositado">R$ 0,00</div>
          </div>
          <div style="text-align: right">
            <div class="meta-deposito-resumo-label">Meta</div>
            <div class="meta-deposito-resumo-valor" id="deposito-valor-meta">R$ 0,00</div>
          </div>
        </div>

        <div class="meta-deposito-progresso">
          <div class="meta-deposito-progresso-barra" id="deposito-barra-progresso" style="width: 0%"></div>
        </div>
        <div class="meta-deposito-info" id="deposito-info-progresso"></div>

        <form id="form-meta-deposito">
          <input type="hidden" id="deposito-meta-id" />
          <div class="campo">
            <label for="deposito-valor">Valor do depósito</label>
            <input type="text" id="deposito-valor" inputmode="decimal" autocomplete="off" placeholder="R$ 0,00" required />
          </div>
          <div class="campo">
            <label for="deposito-descricao">Descrição (opcional)</label>
            <input type="text" id="deposito-descricao" placeholder="Ex: Aporte extra" />
          </div>
          <button type="submit" id="btn-confirmar-deposito" class="btn-meta-depositar">Depositar</button>
        </form>

        <h4 style="font-size: 0.78rem; color: var(--cor-texto-suave); margin-bottom: 8px">Histórico de depósitos</h4>
        <div id="lista-depositos" class="historico-fixa-lista" style="max-height: 180px"></div>

        <button type="button" id="btn-fechar-modal-meta-deposito">Fechar</button>
      </div>
    </div>

    <!-- MODAL: CRIAR/EDITAR PLANO -->
    <div id="modal-renomear-categoria" class="modal-overlay" role="dialog" aria-modal="true" style="display: none">
      <div class="modal-content">
        <h3>Renomear categoria</h3>
        <p class="modal-subtitulo">Atualiza o nome em todos os lançamentos e despesas fixas que já usam essa categoria.</p>
        <form id="form-renomear-categoria">
          <input type="hidden" id="categoria-renomear-id" />
          <div class="campo">
            <label for="categoria-novo-nome">Novo nome</label>
            <input type="text" id="categoria-novo-nome" required />
          </div>
          <button type="submit" id="btn-salvar-renomear-categoria">Renomear</button>
          <button type="button" id="btn-fechar-modal-renomear-categoria">Cancelar</button>
        </form>
      </div>
    </div>
`;

function montarComponentesModaisFinanceiros() {
  const raiz = document.getElementById("modal-components-root");
  if (!raiz || document.getElementById("modal-carteira")) return;
  raiz.insertAdjacentHTML("beforeend", FINANCE_MODAIS_HTML);
}

montarComponentesModaisFinanceiros();
