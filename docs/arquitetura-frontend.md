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

## Próxima evolução possível

Quando o frontend estiver mais estável, a próxima melhoria estrutural pode ser migrar gradualmente para módulos ES (`import`/`export`) ou para um empacotador como Vite. Até lá, manter o `main.js` como mapa central reduz risco e facilita manutenção.
