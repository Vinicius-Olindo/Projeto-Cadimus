// ==========================================
// app-header-component.js - Cabeçalho principal do app
// ==========================================

(function () {
  function renderizarAppHeader() {
    const root = document.getElementById("app-header-root");
    if (!root || root.dataset.renderizado === "1") return;

    root.innerHTML = `
        <header class="top-bar">
          <div class="top-bar-linha1">
            <div class="header-logo-wrapper">
              <img src="assets/logo.png" alt="Cadimus" />
              <span>Cadimus</span>
            </div>
            <div class="acoes-topo">
              <div class="acoes-topo-grupo acoes-topo-grupo-financeiro" aria-label="Atalhos financeiros">
              <button id="btn-despesas-fixas" class="btn-topo-icone" title="Despesas fixas">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 2l4 4-4 4" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <path d="M7 22l-4-4 4-4" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
                <span class="btn-topo-label">Fixas</span>
              </button>
              <button id="btn-compras-parceladas" class="btn-topo-icone" title="Compras parceladas">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 3h16v18l-3-2-2 2-2-2-2 2-2-2-2 2-3-2Z" />
                  <path d="M8 8h8M8 12h8M8 16h4" />
                </svg>
                <span class="btn-topo-label">Parceladas</span>
              </button>
              <button id="btn-bonificacoes" class="btn-topo-icone" title="Bonificações recorrentes">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="8" width="18" height="13" rx="2" />
                  <path d="M12 8v13" />
                  <path d="M3 12h18" />
                  <path d="M7.5 8a2.5 2.5 0 1 1 4.5-1.5V8" />
                  <path d="M16.5 8A2.5 2.5 0 1 0 12 6.5V8" />
                </svg>
                <span class="btn-topo-label">Bonificação</span>
              </button>
              <button id="btn-cartoes-credito" class="btn-topo-icone" title="Cartões de crédito">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                <span class="btn-topo-label">Cartões</span>
              </button>
              </div>
              <div class="acoes-topo-grupo acoes-topo-grupo-operacao" aria-label="Busca e alertas">
              <button id="btn-busca-global" class="btn-topo-icone" title="Busca global (Ctrl+K)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <span class="btn-topo-label">Buscar</span>
              </button>
              <button id="btn-notificacoes" class="btn-topo-icone" title="Notificações">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <span class="btn-topo-label">Alertas</span>
                <span class="notificacao-badge" id="notificacao-badge"></span>
              </button>
              </div>
              <button id="btn-admin" style="display:none"></button>
              <button id="btn-importar-extrato" style="display:none"></button>
              <button id="btn-exportar-extrato" style="display:none"></button>
              <div class="acoes-topo-grupo acoes-topo-grupo-layout" aria-label="Layout do dashboard">
                <button id="btn-editar-layout-dashboard" class="btn-topo-icone btn-topo-destaque" title="Editar layout do dashboard" aria-pressed="false">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                  <span class="btn-topo-label">Layout</span>
                </button>
                <div class="acoes-topo-divider"></div>
                <button id="btn-cancelar-layout-dashboard" class="btn-topo-icone btn-topo-icone-only btn-cancelar-layout-dashboard" title="Cancelar edição de layout" aria-label="Cancelar edição de layout" hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
                <div class="acoes-topo-divider acoes-topo-divider-cancelar-layout" hidden></div>
                <button id="btn-resetar-layout-dashboard" class="btn-topo-icone btn-topo-icone-only btn-resetar-layout-dashboard" title="Restaurar layout padrão" aria-label="Restaurar layout padrão">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 12a9 9 0 1 0 3-6.7" />
                    <path d="M3 4v6h6" />
                  </svg>
                </button>
              </div>
              <div class="acoes-topo-divider"></div>
              <div class="avatar-dropdown-wrapper">
                <button id="btn-avatar-perfil" class="btn-avatar-perfil" title="Meu perfil" aria-label="Perfil do usuário">
                  <div id="avatar-usuario-logado" class="avatar-topo avatar-vazio" title=""></div>
                </button>
                <div id="dropdown-avatar" class="dropdown-avatar" style="display: none">
                  <div class="dropdown-avatar-header">
                    <div id="dropdown-avatar-img" class="dropdown-avatar-foto avatar-vazio"></div>
                    <div class="dropdown-avatar-info">
                      <span class="dropdown-avatar-nome" id="dropdown-avatar-nome">Usuário</span>
                      <span class="dropdown-avatar-email" id="dropdown-avatar-email"></span>
                    </div>
                  </div>
                  <div class="dropdown-avatar-divider"></div>
                  <button type="button" class="dropdown-avatar-item" id="dropdown-btn-config">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>
                    Configurações
                  </button>
                  <div class="dropdown-avatar-divider"></div>
                  <button type="button" class="dropdown-avatar-item" id="dropdown-btn-importar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    Importar extrato
                  </button>
                  <button type="button" class="dropdown-avatar-item" id="dropdown-btn-exportar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Exportar lançamentos
                  </button>
                  <button type="button" class="dropdown-avatar-item" id="dropdown-btn-relatorio">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    Relatório PDF
                  </button>
                  <div class="dropdown-avatar-divider"></div>
                  <button type="button" class="dropdown-avatar-item dropdown-avatar-sair" id="dropdown-btn-sair">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Sair
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="top-bar-linha2">
            <div class="carteira-tabs" id="carteira-tabs" role="tablist" aria-label="Selecionar carteira"></div>
            <input type="hidden" id="seletor-carteira" value="" />
            <div class="seletor-mes">
              <button type="button" id="btn-mes-anterior" aria-label="Mês anterior">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <span id="rotulo-mes" title="Voltar para o mês atual"></span>
              <button type="button" id="btn-mes-seguinte" aria-label="Próximo mês">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
            <input type="hidden" id="filtro-mes" value="" />
          </div>
        </header>
    `.trim();
    root.dataset.renderizado = "1";
  }

  window.renderizarAppHeader = renderizarAppHeader;

  renderizarAppHeader();
  document.addEventListener("DOMContentLoaded", renderizarAppHeader);
})();
