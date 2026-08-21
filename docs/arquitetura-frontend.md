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
- `money-utils.js` e `money-ui.js`: conversão e payload monetário;
- `ui-core.js`: inicialização, tema, filtros base e helpers visuais;
- `dashboard-layout-ui.js`: modo de edição e ordem dos cards analíticos do dashboard;
- `main.js`: mapa central e pequenas exportações globais.

## Cache de assets

Quando qualquer arquivo carregado por `frontend/index.html` mudar, atualizar o parâmetro `?v=` correspondente para forçar a staging a buscar a versão nova.

Referência atual:

- CSS principal: `css/style.css?v=31`;
- scripts principais: `js/*.js?v=86`.

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

O dashboard possui um modo de edição local para reorganizar os cards analíticos da coluna direita.

- O botão "Layout" ativa/desativa o modo de edição.
- Os cards podem ser arrastados dentro da coluna direita.
- Ao sair do modo de edição, a ordem é salva no navegador.
- A ordem é separada por usuário.
- O botão de reset restaura o layout padrão.
- Nesta etapa, o layout ainda não é salvo no backend.

## Próxima evolução possível

Quando o frontend estiver mais estável, a próxima melhoria estrutural pode ser migrar gradualmente para módulos ES (`import`/`export`) ou para um empacotador como Vite. Até lá, manter o `main.js` como mapa central reduz risco e facilita manutenção.
