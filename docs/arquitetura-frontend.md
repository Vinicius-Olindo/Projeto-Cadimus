# Arquitetura do frontend

## Decisão atual

O `frontend/js/main.js` deve ser mantido como mapa central do frontend.

Ele não deve voltar a concentrar regras de negócio, renderização de telas ou fluxos grandes de interface. O papel dele é orientar a leitura do projeto e manter pequenas pontes globais necessárias para compatibilidade entre os módulos atuais.

## Regra prática

Ao criar ou alterar funcionalidades:

- APIs ficam em `frontend/js/*-api.js`;
- telas e interações ficam em `frontend/js/*-ui.js`;
- formatação e utilitários compartilhados ficam em arquivos de utilidade, como `money-utils.js`, `money-ui.js` e `ui-formatters.js`;
- o `main.js` recebe no máximo comentários de localização ou exportações globais realmente necessárias.

## Módulos atuais

O frontend está dividido por domínio:

- `*-api.js`: comunicação com backend;
- `*-ui.js`: renderização, eventos e fluxos de interface;
- `*-loader.js`: lista de scripts carregados por página;
- `app-header-component.js`: cabeçalho compartilhado;
- `app-footer-component.js`: rodapé compartilhado;
- `app-version.js`: versão exibida no rodapé;
- `money-utils.js` e `money-ui.js`: conversão e payload monetário;
- `ui-core.js`: inicialização, tema, filtros base e helpers visuais;
- `dashboard-layout-ui.js`: modo de edição e ordem dos cards analíticos do dashboard;
- `main.js`: mapa central e pequenas exportações globais.

## Páginas separadas

O `index.html` não deve voltar a concentrar todos os fluxos.

Fluxos isolados devem permanecer em páginas próprias:

- `login.html`: autenticação;
- `cadastro.html`: cadastro por convite;
- `redefinir-senha.html`: redefinição de senha;
- `planejamento.html`: planejamento financeiro;
- `relatorios.html`: relatórios financeiros;
- `configuracoes.html`: configurações/admin.

## CSS

O CSS usa `frontend/css/style.css` como índice de módulos via `@import`, mantendo a ordem de cascata do arquivo global original.

- `variables.css`: tokens visuais e tema base;
- `base.css`: reset, layout geral e topo;
- `components/`: botões, modais, formulários, gráficos, toast, onboarding e peças reutilizáveis;
- `pages/`: estilos específicos de dashboard, lançamentos, login, admin, planejamento, relatórios e configurações;
- `layout/`, `themes/` e `utilities/`: rodapé, ajustes de tema e regras utilitárias.

## Cache de assets

Quando qualquer arquivo carregado por `frontend/index.html` mudar, atualizar o parâmetro `?v=` correspondente para forçar a staging a buscar a versão nova.

Referência atual de CSS:

- CSS principal: `css/style.css?v=191`;
- CSS de relatórios importado por `style.css`: `pages/reports.css?v=101`;
- CSS de planejamento importado por `style.css`: `pages/planning.css?v=101`.

Para a versão exibida no rodapé, use o script:

```bash
node scripts/bump-version.mjs 1.1.1-staging
```

Ele atualiza `frontend/js/app-version.js` e incrementa o cache `app-version.js?v=` nas páginas/loaders.

## Entradas monetárias

Campos de valor financeiro devem usar entrada textual com `inputmode="decimal"` e a máscara central de `money-ui.js`.

- A UI exibe o padrão brasileiro (`R$ 0,00`).
- O payload continua sendo montado em reais e centavos por `montarPayloadMonetario`.
- Campos numéricos não monetários, como dia, ano e quantidade de parcelas, continuam como `type="number"`.

## Paginação de lançamentos

A lista de lançamentos usa paginação local no frontend.

- O backend ainda carrega o lote do mês/período selecionado.
- A UI exibe 20 lançamentos por página por padrão.
- O usuário pode escolher 10, 20, 30 ou 50 lançamentos por página; a preferência fica salva no navegador.
- Dentro da página atual, os lançamentos são agrupados por data real: `Hoje`, `Ontem` ou `dd mmm aaaa`.
- Busca e filtros continuam aplicados antes da paginação.
- Totais do dashboard continuam calculados sobre o lote completo, não apenas sobre a página visível.

## Layout editável do dashboard

O dashboard possui um modo de edição local para reorganizar os cards analíticos.

- O botão "Layout" ativa/desativa o modo de edição.
- Os cards podem ser movidos entre áreas do dashboard.
- Ao mover um card da direita para a esquerda, ele deve manter o mesmo tamanho visual que tinha antes.
- Ao sair do modo de edição, a ordem é salva no navegador.
- A ordem é separada por usuário.
- O botão de reset restaura o layout padrão.
- Nesta etapa, o layout ainda não é salvo no backend.

## Próxima evolução possível

Quando o frontend estiver mais estável, a próxima melhoria estrutural pode ser migrar gradualmente para módulos ES (`import`/`export`) ou para um empacotador como Vite. Até lá, manter o `main.js` como mapa central reduz risco e facilita manutenção.
