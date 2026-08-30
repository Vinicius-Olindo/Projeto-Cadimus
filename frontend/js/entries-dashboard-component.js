(() => {
  "use strict";

  function renderizarEntriesDashboard() {
    const root = document.getElementById("entries-dashboard-root");
    if (!root) return;

    const html = `
          <!-- COLUNA ESQUERDA: comparativo + lançamentos -->
          <div class="area-lancamentos">
            <div class="card card-hoje-dashboard" id="card-hoje-dashboard">
              <div class="hoje-dashboard-topo">
                <div>
                  <span class="hoje-dashboard-eyebrow">Hoje</span>
                  <h3 id="hoje-dashboard-titulo">Seu dia financeiro</h3>
                  <p id="hoje-dashboard-resumo">Resumo rápido do que precisa de atenção agora.</p>
                </div>
                <span class="hoje-dashboard-data" id="hoje-dashboard-data">--/--</span>
              </div>
              <div class="hoje-dashboard-grid">
                <div class="hoje-dashboard-kpi">
                  <span>Vencendo hoje</span>
                  <strong id="hoje-kpi-vencendo">0</strong>
                </div>
                <div class="hoje-dashboard-kpi">
                  <span>Atrasados</span>
                  <strong id="hoje-kpi-atrasados">0</strong>
                </div>
                <div class="hoje-dashboard-kpi">
                  <span>Pendente hoje</span>
                  <strong id="hoje-kpi-pendente">R$ 0,00</strong>
                </div>
                <div class="hoje-dashboard-kpi hoje-dashboard-kpi-saldo">
                  <span>Saldo do mês</span>
                  <strong id="hoje-kpi-saldo">R$ 0,00</strong>
                </div>
              </div>
              <div class="hoje-dashboard-lista" id="hoje-dashboard-lista"></div>
              <div class="hoje-dashboard-acoes">
                <button type="button" id="hoje-btn-novo" class="btn-hoje-primario">+ Novo lançamento</button>
                <button type="button" id="hoje-btn-pendentes" class="btn-hoje-secundario">Ver pendências</button>
                <button type="button" id="hoje-btn-buscar" class="btn-hoje-secundario">Buscar</button>
              </div>
            </div>

            <div class="card card-calendario-financeiro" id="card-calendario-financeiro" style="display: none">
              <div class="calendario-financeiro-topo">
                <div>
                  <span class="hoje-dashboard-eyebrow">Calendário</span>
                  <h3>Agenda financeira</h3>
                  <p id="calendario-financeiro-resumo">Despesas, receitas e pendências distribuídas pelo mês.</p>
                </div>
              </div>
              <div class="calendario-financeiro-semana" aria-hidden="true">
                <span>Seg</span>
                <span>Ter</span>
                <span>Qua</span>
                <span>Qui</span>
                <span>Sex</span>
                <span>Sáb</span>
                <span>Dom</span>
              </div>
              <div class="calendario-financeiro-grid" id="calendario-financeiro-grid"></div>
              <div class="calendario-financeiro-legenda">
                <span><i class="legenda-receita"></i> Receita</span>
                <span><i class="legenda-despesa"></i> Despesa</span>
                <span><i class="legenda-pendente"></i> Pendente</span>
              </div>
            </div>

            <div class="card card-comparativo-periodo" id="card-comparativo-periodo">
              <div class="comparativo-periodo-header">
                <span class="comparativo-periodo-titulo">Comparar períodos</span>
                <div class="comparativo-periodo-seletor">
                  <button type="button" class="periodo-btn ativo" data-periodo="mes">Mês</button>
                  <button type="button" class="periodo-btn" data-periodo="trimestre">Trimestre</button>
                  <button type="button" class="periodo-btn" data-periodo="ano">Ano</button>
                </div>
              </div>
              <div class="comparativo-periodo-conteudo" id="comparativo-periodo-conteudo">
                <div class="periodo-coluna">
                  <span class="periodo-rotulo" id="periodo-atual-rotulo">Este mês</span>
                  <div class="periodo-metricas">
                    <div class="periodo-metrica">
                      <span class="periodo-metrica-rotulo">Receitas</span>
                      <span class="periodo-metrica-valor texto-receita" id="periodo-atual-receitas">R$ 0,00</span>
                    </div>
                    <div class="periodo-metrica">
                      <span class="periodo-metrica-rotulo">Despesas</span>
                      <span class="periodo-metrica-valor texto-despesa" id="periodo-atual-despesas">R$ 0,00</span>
                    </div>
                    <div class="periodo-metrica periodo-metrica-destaque">
                      <span class="periodo-metrica-rotulo">Saldo</span>
                      <span class="periodo-metrica-valor" id="periodo-atual-saldo">R$ 0,00</span>
                    </div>
                  </div>
                </div>
                <div class="periodo-seta">
                  <div class="periodo-seta-linha"></div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </div>
                <div class="periodo-coluna">
                  <span class="periodo-rotulo" id="periodo-anterior-rotulo">Mês passado</span>
                  <div class="periodo-metricas">
                    <div class="periodo-metrica">
                      <span class="periodo-metrica-rotulo">Receitas</span>
                      <span class="periodo-metrica-valor texto-receita" id="periodo-anterior-receitas">R$ 0,00</span>
                    </div>
                    <div class="periodo-metrica">
                      <span class="periodo-metrica-rotulo">Despesas</span>
                      <span class="periodo-metrica-valor texto-despesa" id="periodo-anterior-despesas">R$ 0,00</span>
                    </div>
                    <div class="periodo-metrica periodo-metrica-destaque">
                      <span class="periodo-metrica-rotulo">Saldo</span>
                      <span class="periodo-metrica-valor" id="periodo-anterior-saldo">R$ 0,00</span>
                    </div>
                  </div>
                </div>
                <div class="periodo-variacao" id="periodo-variacao">
                  <span class="periodo-variacao-label">Variação</span>
                  <span class="periodo-variacao-valor" id="periodo-variacao-saldo"></span>
                  <span class="periodo-variacao-detalhe" id="periodo-variacao-detalhe">vs período anterior</span>
                </div>
              </div>
              <div class="comparativo-periodo-visual" id="comparativo-periodo-visual"></div>
            </div>

            <div class="card-lancamentos-bloco" id="card-lancamentos">
              <div class="lancamentos-cabecalho">
                <h3>Lançamentos</h3>
                <div class="botoes-cabecalho">
                  <button id="btn-transferencia" class="btn-secundario" hidden>↔ Transferir</button>
                  <button id="btn-novo-gasto">+ Novo lançamento</button>
                </div>
              </div>
              <div class="lote-barra" id="lote-barra" style="display: none">
                <span class="lote-contador" id="lote-contador">0 selecionados</span>
                <div class="lote-acoes">
                  <select id="lote-status">
                    <option value="">Alterar status...</option>
                    <option value="pago">Marcar como Pago</option>
                    <option value="pendente">Marcar como Pendente</option>
                  </select>
                  <select id="lote-categoria">
                    <option value="">Alterar categoria...</option>
                  </select>
                  <button type="button" class="lote-btn-aplicar" id="lote-btn-aplicar">Aplicar</button>
                  <button type="button" class="lote-btn-cancelar" id="lote-btn-cancelar">Cancelar</button>
                </div>
              </div>
              <div class="busca-lancamentos">
                <input type="search" id="busca-lancamento" placeholder="Buscar por descrição ou categoria..." />
                <div class="filtros-lancamentos">
                  <select id="filtro-tipo">
                    <option value="">Todos os tipos</option>
                    <option value="receita">Receita</option>
                    <option value="despesa">Despesa</option>
                  </select>
                  <select id="filtro-status">
                    <option value="">Todos os status</option>
                    <option value="pago">Pago</option>
                    <option value="pendente">A pagar</option>
                    <option value="atrasado">Contas atrasadas</option>
                    <option value="nao_atrasado">Não atrasadas</option>
                  </select>
                  <select id="filtro-categoria-lancamento">
                    <option value="">Todas as categorias</option>
                  </select>
                </div>
              </div>
              <div class="lista-lancamentos" id="lista-lancamentos"></div>
              <div class="lancamentos-paginacao" id="lancamentos-paginacao" aria-label="Paginação de lançamentos"></div>
            </div>
          </div>
    `;

    root.outerHTML = html.trim();
  }

  window.renderizarEntriesDashboard = renderizarEntriesDashboard;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderizarEntriesDashboard, { once: true });
  } else {
    renderizarEntriesDashboard();
  }
})();
