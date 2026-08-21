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
- Busca e filtros continuam funcionando antes da paginação.
- Totais do dashboard continuam usando todos os lançamentos carregados, não apenas a página atual.

### Dashboard

- Gráficos receberam melhorias de leitura e contraste.
- Donut de categorias mostra total e valores por categoria.
- Card "Para onde foi o dinheiro" recebeu redesign com donut mais limpo, maior categoria destacada e ranking por percentual/valor.
- Evolução mensal usa saldo real (`receitas - despesas`) vs despesas.
- Barras e linhas receberam escala visual mais clara.
- Cards analíticos da coluna direita ganharam modo de edição de layout com drag-and-drop local.
- Cards principais de receitas, despesas e saldo do período ganharam descrições curtas de contexto.
- Card "A pagar" ganhou descrição curta de contexto para compromissos pendentes.
- Card "Saúde financeira" foi simplificado com diagnóstico curto e pílulas dos principais critérios, mantendo a fórmula do score.

### Notificações

- Central de notificações persistidas/histórico revisada.
- Badge vermelho some ao abrir alertas e pode voltar no dia seguinte se a pendência continuar.
- Textos com acentuação quebrada foram corrigidos.

### UI e CSS

- Seletor claro/escuro foi melhorado.
- Espaçamento entre alertas, seletor de tema e avatar foi ajustado.
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
