# Plano de migração: dinheiro em centavos inteiros

## Objetivo

Migrar o CADIMUS para armazenar e calcular todos os valores monetários como inteiros em centavos, eliminando riscos de ponto flutuante em dados financeiros reais.

Exemplo:

- R$ 10,50 -> `1050`
- R$ 1.000,00 -> `100000`
- R$ 333,34 -> `33334`

## Por que isso é necessário

Hoje o sistema ainda usa campos `REAL` em várias tabelas financeiras. Mesmo com correções pontuais de arredondamento, `REAL` continua sujeito a imprecisões típicas de ponto flutuante, como somas, divisões, filtros e agregações retornarem diferenças invisíveis de centavos.

Para um produto financeiro, a regra deve ser simples: o banco guarda centavos inteiros; a interface apenas formata para reais.

## Escopo da migração

### Tabelas afetadas

- `lancamentos.valor`
- `despesas_fixas.valor`
- `compras_parceladas.valor_parcela`
- `compras_parceladas.valor_total`
- `metas_categoria.valor_limite`
- `meta_depositos.valor`
- `planos.valor_alvo`
- `planos.parcela_mensal`, se persistido futuramente
- `plano_depositos.valor`
- `transferencias.valor`
- `orcamentos.valor`
- `cartoes_credito.limite`
- qualquer novo campo financeiro criado depois desta migração

### Código afetado

- rotas de backend;
- utilitários de geração automática;
- relatórios;
- importação/exportação;
- frontend;
- PDF/CSV/JSON;
- cálculos de dashboard;
- testes financeiros.

## Convenção final

### Banco

Todo valor monetário persistido deve usar sufixo `_centavos` e tipo `INTEGER`.

Exemplos:

- `valor_centavos INTEGER NOT NULL`
- `valor_total_centavos INTEGER NOT NULL`
- `limite_centavos INTEGER NOT NULL`

### API

Durante a transição, a API pode aceitar reais por compatibilidade, mas deve normalizar internamente.

Contrato recomendado:

- entrada legada: `valor: 10.5`
- entrada nova preferida: `valor_centavos: 1050`
- saída temporária: devolver ambos durante rollout:
  - `valor: 10.5`
  - `valor_centavos: 1050`

Depois do rollout completo, remover gradualmente o campo legado da escrita, mantendo leitura compatível se necessário.

### Frontend

O frontend deve converter valores digitados para centavos antes de enviar ao backend.

Funções padrão:

- `reaisParaCentavos(valor)`
- `centavosParaReais(centavos)`
- `formatarCentavosBRL(centavos)`

Nunca calcular dinheiro diretamente com `Number` em reais quando o resultado será persistido.

## Fases de implementação

### Fase 1 — Preparação segura

1. Criar utilitário monetário compartilhado no backend:
   - `normalizarCentavos(valor, valorCentavos)`
   - `reaisParaCentavos(valor)`
   - `centavosParaReais(centavos)`
   - `somarCentavos(lista)`
2. Criar utilitário equivalente no frontend.
3. Adicionar testes unitários para:
   - vírgula brasileira;
   - string decimal;
   - número decimal;
   - centavos já inteiros;
   - valores inválidos;
   - negativos, quando permitidos.

### Fase 2 — Migration aditiva

Criar uma migration que adiciona colunas novas sem remover as antigas.

Exemplo:

```sql
ALTER TABLE lancamentos ADD COLUMN valor_centavos INTEGER;
UPDATE lancamentos SET valor_centavos = ROUND(valor * 100) WHERE valor_centavos IS NULL;
```

Repetir para todas as tabelas financeiras.

Nesta fase, nada antigo é apagado.

### Fase 3 — Escrita dupla temporária

Atualizar o backend para gravar os dois campos:

- campo legado em reais;
- campo novo em centavos.

Exemplo:

```js
const valorCentavos = normalizarCentavos(dados.valor, dados.valor_centavos);
const valor = centavosParaReais(valorCentavos);
```

Isso permite rollback mais fácil caso algo inesperado apareça.

### Fase 4 — Leitura preferencial por centavos

Atualizar consultas e cálculos para usar `_centavos`.

Áreas prioritárias:

1. saldo;
2. transferências;
3. orçamento;
4. compras parceladas;
5. metas;
6. relatórios;
7. cartões;
8. importação/exportação.

Durante essa fase, a API ainda pode devolver `valor` calculado a partir de `valor_centavos` para não quebrar frontend antigo.

### Fase 5 — Frontend por centavos

Atualizar formulários e renderizações:

- entradas monetárias convertem para centavos;
- previews de parcelamento usam centavos;
- dashboard soma centavos;
- relatórios agregam centavos;
- exportações exibem reais formatados, mas baseiam cálculo em centavos.

### Fase 6 — Testes de regressão financeira

Expandir a suíte automatizada para cobrir:

- R$ 1.000 / 3;
- R$ 10,00 / 6;
- soma de 0,10 + 0,20;
- transferências entre carteiras;
- orçamento por categoria/carteira;
- importação com vírgula decimal;
- relatório por período;
- metas e depósitos;
- cartão com limite e parcelas.

Critério: nenhuma comparação financeira deve depender de igualdade entre floats.

### Fase 7 — Corte final

Depois de validar produção/staging:

1. parar de aceitar escrita legada onde for seguro;
2. remover cálculos com campos `REAL`;
3. criar migration final, se necessário, para reconstruir tabelas sem colunas antigas;
4. manter backup antes do corte;
5. documentar versão do schema.

## Ordem recomendada dos módulos

1. Utilitários monetários e testes.
2. `lancamentos`.
3. `transferencias`.
4. `orcamentos`.
5. `compras_parceladas`.
6. `despesas_fixas`.
7. `metas` e `meta_depositos`.
8. `cartoes_credito`.
9. `planos` e `plano_depositos`.
10. relatórios/exportações/importações.
11. frontend inteiro.

## Regras de segurança

- Não remover campos antigos na primeira migration.
- Não migrar sem backup.
- Não confiar no frontend para normalização.
- Não aceitar `NaN`, `Infinity`, string vazia ou moeda malformada.
- Não arredondar várias vezes no mesmo fluxo.
- Divisão de parcelas sempre deve distribuir centavos e preservar soma total.
- Logs de auditoria não devem armazenar valores financeiros completos.

## Critérios de pronto

A migração estará completa quando:

- todos os campos persistidos usarem `_centavos INTEGER`;
- todos os cálculos financeiros usarem inteiros;
- testes cobrirem os principais fluxos;
- relatórios e dashboards baterem com os lançamentos;
- importação/exportação preservarem centavos;
- frontend não depender mais de `Number` em reais para valores persistidos;
- migrations antigas estiverem documentadas e reversíveis via backup.

## Próximo passo recomendado

Implementar a Fase 1:

1. criar `backend/src/utils/dinheiro.js`;
2. criar testes do utilitário;
3. criar `frontend/js/money-utils.js`;
4. começar escrita dupla por `lancamentos`, por ser a entidade central do sistema.
