// ==========================================
// main.js - Mapa central do frontend
// ==========================================
//
// Decisão de arquitetura:
// este arquivo deve continuar pequeno e funcionar como mapa/ponte entre módulos.
// Novas regras de UI devem ir para arquivos específicos em frontend/js/*-ui.js.
//
// ESTRUTURA DO ARQUIVO:
// [1]   CONSTANTES E HELPERS GLOBAIS
// [2]   ESTADO GLOBAL
// [3]   UI: Focus Trap, Toast, Aviso, Confirmação
// [4]   INICIALIZAÇÃO (DOMContentLoaded)
// [5]   FILTROS: Mês, Período, Dark Mode
// [6]   CARTEIRAS: Carregamento, Renderização, Tabs
// [7]   MODAIS: Carteira, Transferência, Orçamento, Membros
// [8]   DESPESAS FIXAS
// [9]   COMPRAS PARCELADAS
// [10]  ORÇAMENTOS MENSAIS
// [11]  METAS E DEPÓSITOS
// [12]  CATEGORIAS (Utilitários)
// [13]  LANÇAMENTOS: Modal, CRUD, Renderização
// [14]  ANIMAÇÕES
// [15]  RENDERIZAÇÃO: Lista de Lançamentos, Grupos
// [16]  NOTIFICAÇÕES
// [17]  EDIÇÃO EM LOTE
// [18]  POPUP DE NOTA
// [19]  COMPARATIVO POR PERÍODO
// [20]  CARREGAMENTO PRINCIPAL (carregarLancamentos)
// [21]  DASHBOARD: Resumo Categorias, Autores, KPIs
// [22]  STATUS: Alternar Pago/Pendente
// [23]  COMPARAÇÃO MÊS A MÊS
// [24]  TENDÊNCIA E GRÁFICOS
// [25]  TAXA DE POUPANÇA
// [26]  APAGAR LANÇAMENTO
// [27]  ADMIN: Painel, Usuários, Categorias
// [28]  PLANEJAMENTO: Planos Financeiros
// [29]  EXPORTAÇÃO GLOBAL
// ==========================================

// ==========================================
// [1] CONSTANTES E HELPERS GLOBAIS
// ==========================================

// Helpers monetários de UI ficam em money-ui.js.

// Helpers visuais, filtros e tema ficam em ui-core.js.

// Interface de carteiras, transferências e membros fica em wallets-ui.js.

// Despesas fixas ficam em fixed-expenses-ui.js.

// Compras parceladas ficam em installments-ui.js.

// Orçamentos mensais ficam em budgets-ui.js.

// Ações e histórico de compras parceladas ficam em installments-ui.js.

// Metas e depósitos ficam em goals-ui.js.

// Utilitários de categorias ficam em categories-ui.js.

// Modal e CRUD de lançamentos ficam em entries-modal-ui.js.

// Listagem, filtros e animações de lançamentos ficam em entries-list-ui.js.

// Central de notificações fica em notifications-ui.js.

// Edição em lote e popup de nota ficam em batch-note-ui.js.

// Comparativo por período fica em period-comparison-ui.js.

// Carregamento principal de lançamentos fica em entries-loader-ui.js.

// Resumos do dashboard financeiro ficam em dashboard-summary-ui.js.

// Status, comparação mensal e autores ficam em dashboard-insights-ui.js.

// Gráficos do dashboard financeiro ficam em dashboard-charts-ui.js.

// Saúde financeira do dashboard fica em dashboard-health-ui.js.

// Relatório PDF do dashboard fica em dashboard-pdf-ui.js.

// Ações sensíveis de lançamentos ficam em entries-actions-ui.js.

// ==========================================
// [27] ADMIN: Painel, Usuários, Categorias
// ==========================================

// Entrada do painel admin/configurações fica em admin-shell-ui.js.

// Estrutura inicial do planejamento fica em planning-shell-ui.js.

// Indicadores e cards do planejamento ficam em planning-dashboard-ui.js.

// Lista, modal e depósitos de planos ficam em planning-plans-ui.js.

// Metas dentro do planejamento ficam em planning-goals-ui.js.

// Abas e preferências do admin/configurações ficam em admin-settings-ui.js.

// Foto de perfil fica em profile-image-ui.js.

// Usuários e convites do admin ficam em admin-users-ui.js.

// Categorias do admin ficam em admin-categories-ui.js.

// ==========================================
// [29] EXPORTAÇÃO GLOBAL
// ==========================================

window.carregarLancamentos = carregarLancamentos;
window.atualizarDashboardAposMudanca = atualizarDashboardAposMudanca;
window.recarregarLancamentosAposMutacao = recarregarLancamentosAposMutacao;
window.aplicarLancamentoAtualizadoLocalmente = aplicarLancamentoAtualizadoLocalmente;
window.removerLancamentoLocalmente = removerLancamentoLocalmente;
window.apagarLancamento = apagarLancamento;
window.alternarStatusLancamento = alternarStatusLancamento;
window.editarLancamento = editarLancamento;
window.duplicarLancamento = duplicarLancamento;
window.carregarCarteiras = carregarCarteiras;
window.atualizarOrcamentoNoCard = atualizarOrcamentoNoCard;

// Renomeação de categorias fica em admin-categories-ui.js.

// Estrutura e carregamento dos relatórios ficam em reports-shell-ui.js.

// KPIs e gráficos dos relatórios ficam em reports-charts-ui.js.

// Tabelas, comparativos e insights dos relatórios ficam em reports-tables-ui.js.

// Exportação dos relatórios fica em reports-export-ui.js.
