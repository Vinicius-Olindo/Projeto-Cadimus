# Checklist de homologação da staging

Criado em: 2026-08-14  
Última revisão: 2026-08-21

Use este roteiro antes de promover qualquer mudanca da `staging` para a `main`.

Ambientes:

- Frontend staging: `https://staging.cadimus.pages.dev`
- Backend staging: `https://cadimus-backend-staging.olinbytedigital.workers.dev`
- Branch obrigatória: `staging`

## 1. Validação automática antes do teste manual

- Rodar `npm test` no backend.
- Confirmar que todos os testes passam.
- Conferir sintaxe dos scripts principais do frontend:
  - `api-client.js`
  - `planning-api.js`
  - `auth.js`
  - `main.js`
  - `importar.js`
  - `exportar.js`
  - `recorrentes.js`
- Confirmar que não existem chamadas antigas diretas para `API_URL` fora do `api-client`.
- Confirmar que a branch local está sincronizada com `origin/staging`.

## 2. Frontend tela por tela

- Login, cadastro/convite e recuperacao de senha carregam sem erro visual.
- Logo do login e do header aparece nítida nos temas claro e escuro.
- Configurações aproveita melhor a largura disponível em desktop e a lista de usuários mostra dados completos sem truncamento indevido.
- Dashboard exibe receitas, despesas, saldo, pendentes e categorias usando os valores corretos.
- Campos de valores financeiros exibem e salvam valores no padrão brasileiro `R$ 0,00`.
- Valores financeiros altos não devem ser cortados nos cards do dashboard nem na lista de lançamentos.
- Card "Saldo do período" mantém valor monetário em uma linha e no mesmo padrão visual dos demais cards de resumo.
- Bonificações recorrentes aparecem no card próprio, com previsto, recebido, pendente e cadastro como receita recorrente.
- Cadastro/edição de bonificação não permite escolher despesa e salva recorrências diárias/semanais/mensais sem erro.
- Modais financeiros usam botões de salvar e cancelar no mesmo padrão visual do modal de cartão.
- Gráficos do dashboard exibem valores legíveis no modo claro/escuro e resumo contextual sem poluir ou vazar da visualização.
- Card "Para onde foi o dinheiro" exibe donut, maior categoria e ranking sem excesso visual.
- Card "Saúde financeira" exibe score, status textual, diagnóstico curto e critérios compactos.
- Gráficos de evolução mensal e saldo vs despesas usam saldo real, despesas e escala clara.
- Card "Saldo vs Despesas" mantém resumo legível com valores separados e sem estouro visual.
- Modo "Layout" permite arrastar cards analíticos, salvar ordem e restaurar padrão.
- Modo "Layout" exibe banner de orientação, botão em estado de salvar e indicação visual nos cards editáveis.
- Modo "Layout" permite cancelar alterações antes de salvar e mover cards com botões ↑/↓.
- Lista de lancamentos mostra valor, status, autor, filtros e agrupamentos por data real corretamente.
- Lista de lancamentos mantém leitura clara em desktop/mobile, com valor, status, autor com foto/nome e ações agrupados.
- Lista de lancamentos suporta valores financeiros altos sem desalinhamento visual.
- Ao editar, apagar ou alterar dados financeiros, lista, totais e gráficos devem atualizar imediatamente sem reaproveitar cache antigo.
- Paginação de lançamentos mostra 20 itens por padrão, permite 10/20/30/50 por página, exibe contador correto e volta para página 1 ao alterar busca/filtros.
- Transferencias aparecem nas carteiras de origem e destino sem duplicar saldo.
- Orcamentos comparam gasto e limite usando centavos como fonte.
- Metas e depositos somam e exibem valores corretamente.
- Cartoes mostram limite, gasto atual e percentual sem usar valor legado como fonte primaria.
- Importacao e exportacao preservam centavos.
- Relatorios e PDF batem com os totais do painel.
- Central de notificações abre, lista histórico, marca alertas como lidos e remove a bolinha vermelha após clique.
- Se a conta vencida não for atualizada, a bolinha volta a aparecer no dia seguinte.
- Textos de notificações aparecem sem caracteres quebrados.
- Seletor claro/escuro mantém espaçamento correto entre alertas e avatar.

## 3. Fluxos de exclusao e apagamento

- Excluir lancamento exige confirmacao e so funciona para criador ou administrador.
- Excluir transferencia exige confirmacao e so funciona para criador ou administrador.
- Excluir orcamento exige confirmacao e so funciona para criador ou administrador.
- Excluir carteira exige usuario admin da carteira e avisa que dados financeiros dependentes serao apagados.
- Excluir carteira remove explicitamente:
  - transferencias;
  - orcamentos;
  - cartoes;
  - recorrencias;
  - despesas fixas;
  - compras parceladas;
  - metas;
  - lancamentos;
  - membros da carteira.
- Botao de apagar dados globais continua restrito a superadmin e exige frase de confirmacao.

## 4. Permissoes de carteira compartilhada

Teste com quatro usuarios/cenarios:

1. Dono/admin da carteira:
   - ve a carteira;
   - edita membros;
   - cria, edita e remove dados financeiros permitidos;
   - consegue excluir a carteira se tiver outra carteira restante.

2. Membro da carteira:
   - ve a carteira;
   - cria lancamentos na carteira;
   - nao consegue gerenciar membros;
   - nao consegue excluir a carteira.

3. Superadmin:
   - consegue administrar registros quando autorizado pelas regras do modulo;
   - nao deve burlar acesso a carteira fora da matriz definida sem regra explicita.

4. Usuario fora da carteira:
   - nao ve a carteira;
   - nao lista membros;
   - nao cria lancamento, transferencia, meta, orcamento, cartao ou regra naquela carteira;
   - nao apaga nem altera registros daquela carteira.

## 5. Teste manual com dados ficticios

Crie uma carteira `Homologacao Staging` e rode:

1. cadastrar uma receita de R$ 100,01;
2. cadastrar uma despesa de R$ 33,33;
3. cadastrar uma compra parcelada de R$ 100,00 em 3 parcelas;
4. criar uma transferencia de R$ 10,01 entre duas carteiras;
5. criar um orcamento mensal e conferir percentual;
6. criar uma meta e dois depositos;
7. importar um CSV com `1.234,56`;
8. exportar CSV/OFX e conferir que `valor_centavos` acompanha o valor exibido;
9. gerar PDF e comparar totais com o dashboard;
10. apagar os dados criados nessa carteira e confirmar que nada ficou visivel.

## 6. Planejamento, planos e depósitos

- Criar um plano privado com valor alvo de R$ 123,45.
- Editar nome, descrição, data limite, cor/ícone e valor alvo.
- Criar um plano compartilhado e confirmar que aparece na área de compartilhados de outro usuário.
- Criar dois depósitos no plano e confirmar soma, percentual, falta e parcela mensal.
- Tentar abrir/depositar em plano de outro usuário pela API e confirmar bloqueio.
- Concluir e cancelar planos ativos.

## 7. Metas e depósitos

- Criar meta por categoria em carteira permitida.
- Depositar em meta e confirmar histórico.
- Confirmar soma por centavos, especialmente valores quebrados como R$ 10,01 e R$ 33,33.
- Tentar criar depósito em meta de carteira sem acesso e confirmar bloqueio.
- Excluir depósito e depois excluir meta.

## 8. Relatórios e filtros de período

- Filtrar por período fechado: primeiro e último dia do mês.
- Filtrar por categoria, tipo e status.
- Confirmar que transferências aparecem separadas dos lançamentos comuns.
- Confirmar que total do relatório bate com dashboard e exportação.
- Validar PDF/CSV/OFX com dados de centavos.

## 9. Critérios para liberar a staging

- `npm test` do backend passando.
- Sem erro de sintaxe nos scripts principais do frontend.
- Checklist manual acima executado pelo menos uma vez.
- Nenhum dado financeiro divergente entre tela, exportacao e relatorio.
- Nenhuma permissao indevida encontrada nos cenarios de carteira.
- Branch `staging` sincronizada com `origin/staging`.
