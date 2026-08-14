# Decisao sobre campos monetarios REAL legados

Data da decisao: 2026-08-14

## Decisao

Os campos monetarios em centavos inteiros (`*_centavos`) sao a fonte canonica do sistema Cadimus.

Os campos antigos em `REAL` permanecem apenas como camada de compatibilidade para:

- instalacoes que ainda tenham dados antigos;
- clientes/API antigos que ainda enviem ou leiam `valor`, `limite`, `depositado` e equivalentes;
- exportacoes, importacoes ou telas ainda tolerantes ao formato anterior.

Eles nao devem voltar a ser usados como fonte primaria de calculo financeiro.

## Campos legados mantidos por compatibilidade

- `lancamentos.valor`
- `despesas_fixas.valor`
- `compras_parceladas.valor_parcela`
- `compras_parceladas.valor_total`
- `lancamentos_recorrentes.valor`
- `metas_categoria.valor_limite`
- `meta_depositos.valor`
- `planos.valor_alvo`
- `planos.depositado`
- `plano_depositos.valor`
- `transferencias.valor`
- `orcamentos.valor`
- `cartoes_credito.limite`

## Quando podem ser removidos

Os campos `REAL` so podem ser removidos em uma migracao propria de corte final, nunca misturados em uma feature normal.

Antes desse corte, precisamos cumprir todos os criterios abaixo:

1. A migracao `0033_centavos_como_fonte_canonica.sql` precisa estar aplicada e validada no ambiente alvo.
2. Deve existir backup recente e testado antes de qualquer alteracao estrutural.
3. O backend deve continuar escrevendo e lendo corretamente usando os campos `*_centavos`.
4. O frontend, relatorios, importacoes e exportacoes devem preferir centavos para exibicao e calculo.
5. Integracoes externas ou clientes antigos precisam estar migrados para `*_centavos` ou declaradamente fora de suporte.
6. Os testes automatizados de dinheiro, migracao, importacao/exportacao e fluxos criticos precisam passar.
7. Deve haver ao menos um ciclo de release com os gatilhos de compatibilidade ativos, sem divergencia observada entre `REAL` e `*_centavos`.

## Como sera o corte final

Como SQLite/D1 nao remove colunas de forma simples em todos os cenarios, o corte final deve usar uma migracao de reconstruir tabela:

1. criar tabela nova apenas com os campos canonicos;
2. copiar dados a partir dos campos `*_centavos`;
3. recriar indices, chaves e gatilhos necessarios;
4. trocar a tabela antiga pela nova;
5. validar contagens, somas em centavos e fluxos principais.

Enquanto esses criterios nao forem cumpridos, os campos `REAL` continuam no banco, mas tratados como legado.

