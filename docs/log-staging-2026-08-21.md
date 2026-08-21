# Log de staging — 2026-08-21

Branch: `staging`  
Ambiente: `https://staging.cadimus.pages.dev`

## Resumo

Rodada de estabilização e organização do frontend após auditoria do projeto.

Todas as alterações foram feitas e enviadas exclusivamente para `origin/staging`.

## Principais mudanças

### Frontend modularizado

- O antigo `main.js` foi reduzido e preservado como mapa central.
- APIs foram separadas em arquivos `*-api.js`.
- Interfaces foram separadas em arquivos `*-ui.js`.
- Helpers monetários ficaram em `money-utils.js` e `money-ui.js`.
- A decisão foi documentada em `docs/arquitetura-frontend.md`.

### Lançamentos

- Lista de lançamentos ganhou paginação local.
- Cada página mostra 20 lançamentos por padrão.
- Usuário pode escolher 10, 20, 30 ou 50 lançamentos por página, com preferência salva no navegador.
- Agrupamentos genéricos foram trocados por data real, mantendo `Hoje` e `Ontem` como atalhos de leitura.
- Lista de lançamentos recebeu redesign em cards compactos, com metadados, valor e ações mais bem agrupados.
- Lista de lançamentos passou a exibir autor com avatar e nome, facilitando identificação em carteiras compartilhadas.
- Linhas de lançamentos foram ajustadas para valores financeiros muito altos não deformarem chips, autor e ações.
- Edições, exclusões, status, importações, transferências e rotinas financeiras agora invalidam caches dos gráficos antes de recarregar o dashboard.
- Busca e filtros continuam funcionando antes da paginação.
- Totais do dashboard continuam usando todos os lançamentos carregados, não apenas a página atual.

### Dashboard

- Gráficos receberam melhorias de leitura, contraste e resumo contextual.
- Donut de categorias mostra total e valores por categoria.
- Card "Para onde foi o dinheiro" recebeu redesign com donut mais limpo, maior categoria destacada e ranking por percentual/valor.
- Evolução mensal usa saldo real (`receitas - despesas`) vs despesas, com resumo do mês selecionado e eixo menos poluído.
- Barras de saldo vs despesas receberam resumo do mês, menos rótulos repetidos e destaque visual no mês selecionado.
- Resumos dos gráficos foram ajustados para não vazar quando valores financeiros são muito longos.
- Card "Saldo vs Despesas" recebeu resumo redesenhado com KPIs separados para saldo e despesas.
- Cards analíticos da coluna direita ganharam modo de edição de layout com drag-and-drop local.
- Modo de edição de layout recebeu banner explicativo, estado de botão "Salvar layout" e handle visual nos cards.
- Modo de edição de layout recebeu opção de cancelar e botões ↑/↓ para reorganizar cards sem arrastar.
- Cards principais de receitas, despesas e saldo do período ganharam descrições curtas de contexto.
- Card "A pagar" ganhou descrição curta de contexto para compromissos pendentes.
- Card "Saúde financeira" foi simplificado com diagnóstico curto e pílulas dos principais critérios, mantendo a fórmula do score; textos das pílulas foram padronizados em branco para melhorar contraste.
- Logo do header/login deixou de usar filtro invertido e passou a ser exibida como selo com fundo consistente nos temas claro e escuro.

### Notificações

- Central de notificações persistidas/histórico revisada.
- Badge vermelho some ao abrir alertas e pode voltar no dia seguinte se a pendência continuar.
- Textos com acentuação quebrada foram corrigidos.

### UI e CSS

- Seletor claro/escuro foi melhorado.
- Espaçamento entre alertas, seletor de tema e avatar foi ajustado.
- Tela de configurações passou a aproveitar melhor telas largas, com lista de usuários em grid e detalhes separados por login, e-mail, criação e último acesso.
- Card "Saldo do período" foi alinhado ao padrão visual dos demais indicadores e evita quebra do valor monetário.
- Bonificações recorrentes ganharam card próprio no dashboard, atalho de cadastro e suporte a frequência diária.
- Fluxo de bonificação foi travado como receita, com texto "Bonificação" no atalho e migration para frequência diária em recorrências.
- Atalho de Bonificação foi padronizado visualmente com os demais botões financeiros do topo.
- Campos de valores financeiros passaram a exibir e aceitar o padrão brasileiro `R$ 0,00`.
- Cards e linhas de lançamentos foram ajustados para acomodar valores financeiros muito altos sem cortar o texto.
- Botões de layout do dashboard foram agrupados e padronizados com os demais controles do topo.
- Trecho inválido/duplicado em `style.css` foi removido.
- Comentário `ORÇAMENTOS MENTAIS` corrigido para `ORÇAMENTOS MENSAIS`.

## Validação executada

- Sintaxe dos scripts do frontend com `node --check`.
- Testes automatizados do backend com `npm test`.
- Backend validado com 35/35 testes passando nas rodadas finais.
- Branch confirmada limpa e sincronizada com `origin/staging` após cada envio.

## Observações

- A staging é o ambiente de testes. A `main` não foi alterada nesta rodada.
- Próxima etapa recomendada: continuar homologação visual/manual na staging e corrigir somente bugs reais encontrados no uso.
