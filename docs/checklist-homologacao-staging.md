# Checklist de homologacao da staging

Data de criacao: 2026-08-14

Use este roteiro antes de promover qualquer mudanca da `staging` para a `main`.

## 1. Frontend tela por tela

- Login, cadastro/convite e recuperacao de senha carregam sem erro visual.
- Dashboard exibe receitas, despesas, saldo, pendentes e categorias usando os valores corretos.
- Lista de lancamentos mostra valor, status, autor, filtros e agrupamentos corretamente.
- Transferencias aparecem nas carteiras de origem e destino sem duplicar saldo.
- Orcamentos comparam gasto e limite usando centavos como fonte.
- Metas e depositos somam e exibem valores corretamente.
- Cartoes mostram limite, gasto atual e percentual sem usar valor legado como fonte primaria.
- Importacao e exportacao preservam centavos.
- Relatorios e PDF batem com os totais do painel.

## 2. Fluxos de exclusao e apagamento

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

## 3. Permissoes de carteira compartilhada

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

## 4. Teste manual com dados ficticios

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

## 5. Criterios para liberar a staging

- `npm test` do backend passando.
- Sem erro de sintaxe nos scripts principais do frontend.
- Checklist manual acima executado pelo menos uma vez.
- Nenhum dado financeiro divergente entre tela, exportacao e relatorio.
- Nenhuma permissao indevida encontrada nos cenarios de carteira.
- Branch `staging` sincronizada com `origin/staging`.

