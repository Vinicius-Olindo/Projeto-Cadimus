// ==========================================
// dashboard-side-cards-component.js - Cards laterais do dashboard
// ==========================================

(function () {
  function renderizarDashboardSideCards() {
    const root = document.getElementById("dashboard-side-cards-root");
    if (!root || root.dataset.renderizado === "1") return;

    root.outerHTML = `
          <div class="area-controle">
            <div class="card resumo-categorias" id="resumo-categorias" style="display: none">
              <span class="resumo-categorias-titulo">Para onde foi o dinheiro</span>
              <div class="grafico-categorias-container">
                <div class="grafico-donut" id="grafico-donut"></div>
                <div class="grafico-legenda" id="grafico-legenda"></div>
              </div>
              <div id="lista-categorias-resumo"></div>
            </div>

            <div class="card resumo-categorias" id="card-tendencia" style="display: none">
              <span class="resumo-categorias-titulo">Evolução mensal</span>
              <div id="grafico-tendencia" class="tendencia-grafico"></div>
              <div class="tendencia-legendas" id="tendencia-legendas">
                <span class="tendencia-legenda-item"><span class="tendencia-legenda-cor" style="background:var(--cor-receita)"></span> Saldo</span>
                <span class="tendencia-legenda-item"><span class="tendencia-legenda-cor" style="background:var(--cor-despesa)"></span> Despesas</span>
              </div>
            </div>

            <div class="card resumo-categorias" id="card-comparativo" style="display: none">
              <span class="resumo-categorias-titulo">Saldo vs Despesas (6 meses)</span>
              <div id="grafico-comparativo" class="comparativo-grafico"></div>
            </div>

            <div class="card resumo-categorias" id="card-por-autor" style="display: none">
              <span class="resumo-categorias-titulo">Quem gastou quanto</span>
              <div id="lista-autores-resumo"></div>
            </div>

            <div class="card resumo-categorias" id="card-despesas-fixas" style="display: none">
              <div class="despesas-fixas-cabecalho">
                <span class="resumo-categorias-titulo">Despesas fixas</span>
                <button type="button" id="btn-nova-despesa-fixa" class="btn-link-adicionar">+ Nova</button>
              </div>
              <div id="lista-despesas-fixas-painel"></div>
            </div>

            <div class="card resumo-categorias" id="card-compras-parceladas" style="display: none">
              <div class="despesas-fixas-cabecalho">
                <span class="resumo-categorias-titulo">Compras parceladas</span>
                <button type="button" id="btn-nova-compra-parcelada" class="btn-link-adicionar">+ Nova</button>
              </div>
              <div id="lista-compras-parceladas-painel"></div>
            </div>

            <div class="card resumo-categorias" id="card-bonificacoes" style="display: none">
              <div class="despesas-fixas-cabecalho">
                <span class="resumo-categorias-titulo">Bonificações</span>
                <button type="button" id="btn-nova-bonificacao" class="btn-link-adicionar">+ Nova</button>
              </div>
              <div class="bonificacoes-resumo">
                <div>
                  <span>Previsto no mês</span>
                  <strong id="bonificacoes-previsto">R$ 0,00</strong>
                </div>
                <div>
                  <span>Já recebido</span>
                  <strong id="bonificacoes-recebido">R$ 0,00</strong>
                </div>
                <div>
                  <span>Pendente</span>
                  <strong id="bonificacoes-pendente">R$ 0,00</strong>
                </div>
              </div>
              <div id="lista-bonificacoes-painel"></div>
            </div>

            <div class="card resumo-categorias card-assinaturas" id="card-assinaturas" style="display: none">
              <span class="resumo-categorias-titulo">Resumo por assinatura</span>
              <div class="assinaturas-resumo">
                <div>
                  <span>Mensal</span>
                  <strong id="assinaturas-total-mensal">R$ 0,00</strong>
                </div>
                <div>
                  <span>Projeção anual</span>
                  <strong id="assinaturas-total-anual">R$ 0,00</strong>
                </div>
              </div>
              <p class="assinaturas-subtitulo" id="assinaturas-subtitulo">Assinaturas e mensalidades encontradas nos seus lançamentos.</p>
              <div id="lista-assinaturas-dashboard" class="assinaturas-lista"></div>
            </div>

            <div class="card resumo-categorias metas-mes-destaque" id="card-metas-mes-dashboard" style="display: none">
              <div class="metas-mes-header">
                <div>
                  <span class="resumo-categorias-titulo">Metas do mês</span>
                  <p class="metas-mes-subtitulo">Quanto ainda dá para gastar por categoria.</p>
                </div>
                <button type="button" class="btn-link-adicionar" id="btn-metas-mes-planejamento">Ver planejamento</button>
              </div>
              <div class="metas-mes-resumo">
                <div>
                  <span>Livre no mês</span>
                  <strong id="metas-mes-livre">R$ 0,00</strong>
                </div>
                <div>
                  <span>Em alerta</span>
                  <strong id="metas-mes-alertas">0</strong>
                </div>
              </div>
              <div id="lista-metas-mes-dashboard" class="metas-mes-lista"></div>
            </div>

            <div class="card resumo-categorias" id="card-orcamentos" style="display: none">
              <div class="despesas-fixas-cabecalho">
                <span class="resumo-categorias-titulo">Orçamento do mês</span>
                <button type="button" id="btn-novo-orcamento" class="btn-link-adicionar">+ Novo</button>
              </div>
              <div id="lista-orcamentos-painel"></div>
            </div>

            <div class="card resumo-categorias" id="card-cartoes-credito" style="display: none">
              <div class="despesas-fixas-cabecalho">
                <span class="resumo-categorias-titulo">Cartões de crédito</span>
                <button type="button" id="btn-novo-cartao" class="btn-link-adicionar">+ Novo</button>
              </div>
              <div id="lista-cartoes-painel"></div>
            </div>

            <div class="card resumo-categorias card-riscos-financeiros" id="card-riscos-financeiros" style="display: none">
              <span class="resumo-categorias-titulo">Riscos financeiros</span>
              <div id="lista-riscos-financeiros" class="riscos-financeiros-lista"></div>
            </div>

            <div class="card resumo-categorias card-modelos-lancamento" id="card-modelos-lancamento" style="display: none">
              <span class="resumo-categorias-titulo">Modelos rápidos</span>
              <p class="modelos-lancamento-subtitulo">Atalhos criados a partir dos seus lançamentos mais repetidos.</p>
              <div id="lista-modelos-lancamento" class="modelos-lancamento-lista"></div>
            </div>

            <div class="card resumo-categorias" id="card-score" style="display: none">
              <span class="resumo-categorias-titulo">Saúde financeira</span>
              <div class="score-container">
                <div class="score-ring">
                  <svg viewBox="0 0 120 120" class="score-svg">
                    <circle cx="60" cy="60" r="52" class="score-ring-bg"/>
                    <circle cx="60" cy="60" r="52" class="score-ring-fill" id="score-ring-fill"/>
                  </svg>
                  <div class="score-centro">
                    <div class="score-valor" id="score-valor">0</div>
                    <div class="score-status" id="score-status">—</div>
                  </div>
                </div>
                <div class="score-detalhes" id="score-detalhes"></div>
              </div>
            </div>
          </div>
    `.trim();
  }

  window.renderizarDashboardSideCards = renderizarDashboardSideCards;

  renderizarDashboardSideCards();
  document.addEventListener("DOMContentLoaded", renderizarDashboardSideCards);
})();
