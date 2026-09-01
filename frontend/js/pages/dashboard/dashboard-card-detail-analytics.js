// ==========================================
// dashboard-card-detail-analytics.js - Render dos cards analiticos
// ==========================================

function clonarCardAnaliticoParaDetalhe(card) {
  const clone = card.cloneNode(true);
  clone.removeAttribute("id");
  clone.removeAttribute("style");
  clone.removeAttribute("role");
  clone.removeAttribute("tabindex");
  clone.removeAttribute("title");
  clone.removeAttribute("aria-label");
  clone.classList.remove("dashboard-card-detalhe-atalho", "dashboard-card-editavel", "arrastando");
  clone.classList.add("detalhe-card-clone");
  delete clone.dataset.cardAnalitico;
  delete clone.dataset.cardAnaliticoTitulo;

  clone.querySelectorAll("[id]").forEach((elemento) => elemento.removeAttribute("id"));
  clone.querySelectorAll(".dashboard-layout-card-acoes, .dashboard-card-drag-handle").forEach((elemento) => elemento.remove());
  clone.querySelectorAll("button, a, input, select, textarea").forEach((elemento) => {
    if (elemento.matches(".btn-link-adicionar, .btn-editar, .btn-excluir, .btn-duplicar")) {
      elemento.remove();
      return;
    }
    elemento.setAttribute("tabindex", "-1");
  });

  return clone;
}

function criarDetalheCategoriasAnalitico() {
  const resumo = obterResumoAtualDetalheCard();
  const categorias = Object.entries(resumo.totaisPorCategoria || {}).sort((a, b) => b[1] - a[1]);
  const total = categorias.reduce((soma, [, valor]) => soma + valor, 0);
  const maior = categorias[0];

  return {
    subtitulo: "Ranking de despesas do período, participação no total e concentração dos gastos.",
    html: `
      <div class="detalhe-analise-grid">
        ${criarMetricaDetalheCard("Total em despesas", formatadorBRL.format(total), "texto-despesa")}
        ${criarMetricaDetalheCard("Categorias", String(categorias.length))}
        ${criarMetricaDetalheCard("Maior peso", maior ? escaparHtml(maior[0]) : "—")}
      </div>
      <div class="detalhe-analise-bloco">
        <span class="detalhe-card-secao-titulo">Distribuição</span>
        ${categorias.length ? categorias.slice(0, 8).map(([categoria, valor]) => {
          const pct = total > 0 ? (valor / total) * 100 : 0;
          return criarLinhaAnaliseDetalhe({
            titulo: categoria,
            detalhe: `${pct.toFixed(1)}% do total`,
            valor: formatadorBRL.format(valor),
            classe: "texto-despesa",
            progresso: pct,
          });
        }).join("") : `<p class="detalhe-card-vazio">Sem despesas no período selecionado.</p>`}
      </div>
      <div class="detalhe-analise-insight">
        ${maior && total > 0
          ? `A categoria <strong>${escaparHtml(maior[0])}</strong> concentra <strong>${((maior[1] / total) * 100).toFixed(0)}%</strong> das despesas do período.`
          : "Quando houver despesas, este painel mostra onde o dinheiro está mais concentrado."}
      </div>
    `,
  };
}

function criarDetalheCartoesAnalitico() {
  const cartoes = obterArrayGlobalDetalhe("cartoesCreditoCarregados");
  const totalLimite = cartoes.reduce((soma, cartao) => soma + valorMonetario(cartao, "limite"), 0);
  const totalUsado = cartoes.reduce((soma, cartao) => soma + valorMonetario(cartao, "gasto_atual"), 0);
  const disponivel = Math.max(0, totalLimite - totalUsado);
  const pctUso = totalLimite > 0 ? (totalUsado / totalLimite) * 100 : 0;
  const cartoesOrdenados = [...cartoes].sort((a, b) => {
    const limiteA = valorMonetario(a, "limite");
    const limiteB = valorMonetario(b, "limite");
    const pctA = limiteA > 0 ? valorMonetario(a, "gasto_atual") / limiteA : 0;
    const pctB = limiteB > 0 ? valorMonetario(b, "gasto_atual") / limiteB : 0;
    return pctB - pctA;
  });

  return {
    subtitulo: "Uso consolidado dos cartões, limite disponível e cartões que merecem atenção.",
    html: `
      <div class="detalhe-analise-grid">
        ${criarMetricaDetalheCard("Limite total", formatadorBRL.format(totalLimite))}
        ${criarMetricaDetalheCard("Usado", formatadorBRL.format(totalUsado), "texto-despesa")}
        ${criarMetricaDetalheCard("Disponível", formatadorBRL.format(disponivel), "texto-receita")}
        ${criarMetricaDetalheCard("Uso médio", `${pctUso.toFixed(0)}%`, pctUso >= 80 ? "texto-despesa" : pctUso >= 60 ? "texto-pendente" : "texto-receita")}
      </div>
      <div class="detalhe-analise-bloco">
        <span class="detalhe-card-secao-titulo">Cartões</span>
        ${cartoesOrdenados.length ? cartoesOrdenados.map((cartao) => {
          const limite = valorMonetario(cartao, "limite");
          const usado = valorMonetario(cartao, "gasto_atual");
          const pct = limite > 0 ? (usado / limite) * 100 : 0;
          const classe = pct >= 80 ? "texto-despesa" : pct >= 60 ? "texto-pendente" : "texto-receita";
          const detalhe = `Fecha dia ${cartao.dia_fechamento || "—"} · vence dia ${cartao.dia_vencimento || "—"}${cartao.parcelas_ativas ? ` · ${cartao.parcelas_ativas} parcela(s)` : ""}`;
          return criarLinhaAnaliseDetalhe({
            titulo: cartao.nome || "Cartão",
            detalhe,
            valor: `${formatadorBRL.format(usado)} / ${formatadorBRL.format(limite)}`,
            classe,
            progresso: pct,
          });
        }).join("") : `<p class="detalhe-card-vazio">Nenhum cartão cadastrado nesta carteira.</p>`}
      </div>
      <div class="detalhe-analise-insight">
        ${pctUso >= 80
          ? "Atenção: o uso dos cartões está alto. Vale evitar novas compras no crédito até virar a fatura."
          : pctUso >= 60
            ? "Uso moderado dos cartões. Ainda há espaço, mas já vale acompanhar as próximas parcelas."
            : "Uso dos cartões sob controle neste período."}
      </div>
    `,
  };
}

function criarDetalheRiscosAnalitico() {
  const resumo = obterResumoAtualDetalheCard();
  const lancamentos = obterLancamentosDetalheCard("pendentes");
  const hoje = new Date().toISOString().slice(0, 10);
  const atrasados = lancamentos.filter((l) => String(l.data_compra || "") < hoje);
  const totalAtrasado = atrasados.reduce((soma, l) => soma + valorMonetario(l), 0);
  const orcamentos = obterArrayGlobalDetalhe("orcamentosCarregados").map(obterResumoOrcamentoMensal).filter((o) => o.progressoReal >= 80);
  const cartoes = obterArrayGlobalDetalhe("cartoesCreditoCarregados").filter((cartao) => {
    const limite = valorMonetario(cartao, "limite");
    return limite > 0 && (valorMonetario(cartao, "gasto_atual") / limite) * 100 >= 80;
  });
  const totalRiscos = atrasados.length + orcamentos.length + cartoes.length;

  return {
    subtitulo: "Pendências, limites e orçamentos que podem pressionar o mês.",
    html: `
      <div class="detalhe-analise-grid">
        ${criarMetricaDetalheCard("Riscos ativos", String(totalRiscos), totalRiscos ? "texto-despesa" : "texto-receita")}
        ${criarMetricaDetalheCard("Atrasado", formatadorBRL.format(totalAtrasado), totalAtrasado ? "texto-despesa" : "texto-receita")}
        ${criarMetricaDetalheCard("A pagar", formatadorBRL.format(resumo.totalPendente || 0), "texto-pendente")}
      </div>
      <div class="detalhe-analise-bloco">
        <span class="detalhe-card-secao-titulo">Pontos de atenção</span>
        ${[
          ...atrasados.slice(0, 4).map((l) => criarLinhaAnaliseDetalhe({
            titulo: l.descricao || "Lançamento atrasado",
            detalhe: `${formatarDataDetalheCard(l.data_compra)} · ${l.categoria || "Sem categoria"}`,
            valor: formatadorBRL.format(valorMonetario(l)),
            classe: "texto-despesa",
          })),
          ...orcamentos.slice(0, 4).map((o) => criarLinhaAnaliseDetalhe({
            titulo: `${o.categoria} no orçamento`,
            detalhe: `${Math.round(o.progressoReal)}% usado`,
            valor: `${formatadorBRL.format(o.gasto)} / ${formatadorBRL.format(o.limite)}`,
            classe: o.progressoReal >= 100 ? "texto-despesa" : "texto-pendente",
            progresso: o.progressoReal,
          })),
          ...cartoes.slice(0, 4).map((cartao) => {
            const limite = valorMonetario(cartao, "limite");
            const usado = valorMonetario(cartao, "gasto_atual");
            const pct = limite > 0 ? (usado / limite) * 100 : 0;
            return criarLinhaAnaliseDetalhe({
              titulo: `${cartao.nome || "Cartão"} perto do limite`,
              detalhe: `${pct.toFixed(0)}% do limite usado`,
              valor: formatadorBRL.format(usado),
              classe: "texto-despesa",
              progresso: pct,
            });
          }),
        ].join("") || `<p class="detalhe-card-vazio">Nenhum risco importante agora.</p>`}
      </div>
      <div class="detalhe-analise-insight">
        ${totalRiscos
          ? "Melhor próxima ação: resolver atrasados primeiro, depois revisar cartões e categorias acima do orçamento."
          : "O período não mostra riscos fortes agora. Continue acompanhando antes de assumir novas parcelas."}
      </div>
    `,
  };
}

function criarDetalheSaudeAnalitico() {
  const resumo = obterResumoAtualDetalheCard();
  const receitas = Number(resumo.totalReceitas || 0);
  const despesas = Number(resumo.totalDespesas || 0);
  const taxa = receitas > 0 ? ((receitas - despesas) / receitas) * 100 : 0;
  const comprometimento = receitas > 0 ? (despesas / receitas) * 100 : 0;
  const categorias = Object.keys(resumo.totaisPorCategoria || {}).length;
  const pendentes = Number(resumo.totalPendente || 0);
  const score = document.getElementById("score-valor")?.textContent?.trim() || "—";
  const status = document.getElementById("score-status")?.textContent?.trim() || "—";

  return {
    subtitulo: "Leitura dos principais sinais financeiros do período.",
    html: `
      <div class="detalhe-analise-grid">
        ${criarMetricaDetalheCard("Score", score)}
        ${criarMetricaDetalheCard("Status", status)}
        ${criarMetricaDetalheCard("Taxa de poupança", `${taxa.toFixed(0)}%`, taxa >= 10 ? "texto-receita" : "texto-despesa")}
        ${criarMetricaDetalheCard("Comprometimento", `${comprometimento.toFixed(0)}%`, comprometimento <= 80 ? "texto-receita" : "texto-despesa")}
      </div>
      <div class="detalhe-analise-bloco">
        <span class="detalhe-card-secao-titulo">Critérios analisados</span>
        ${criarLinhaAnaliseDetalhe({ titulo: "Receitas vs despesas", detalhe: `${formatadorBRL.format(receitas)} entrando · ${formatadorBRL.format(despesas)} saindo`, valor: `${taxa.toFixed(0)}%`, classe: taxa >= 10 ? "texto-receita" : "texto-despesa", progresso: Math.max(0, taxa) })}
        ${criarLinhaAnaliseDetalhe({ titulo: "Controle de gastos", detalhe: "Quanto da receita foi comprometida", valor: `${comprometimento.toFixed(0)}%`, classe: comprometimento <= 80 ? "texto-receita" : "texto-despesa", progresso: comprometimento })}
        ${criarLinhaAnaliseDetalhe({ titulo: "Diversificação", detalhe: `${categorias} categoria(s) com despesa`, valor: categorias >= 3 ? "ok" : "baixo", classe: categorias >= 3 ? "texto-receita" : "texto-pendente" })}
        ${criarLinhaAnaliseDetalhe({ titulo: "Pendências", detalhe: "Compromissos ainda em aberto", valor: formatadorBRL.format(pendentes), classe: pendentes > 0 ? "texto-pendente" : "texto-receita" })}
      </div>
      <div class="detalhe-analise-insight">
        ${taxa < 10 && receitas > 0
          ? "Próximo foco: abrir mais folga entre entrada e saída. Uma sobra mínima de 10% já melhora bastante a saúde do mês."
          : comprometimento > 80
            ? "O mês está com bastante receita comprometida. Evite novas despesas até revisar os maiores grupos."
            : "Leitura geral positiva. Mantenha revisão semanal para não deixar pendências acumularem."}
      </div>
    `,
  };
}

function criarDetalheFluxoAnalitico(cardId) {
  const resumo = obterResumoAtualDetalheCard();
  const saldo = Number(resumo.saldoCalculado || 0);
  const diferenca = Number(resumo.totalReceitas || 0) - Number(resumo.totalDespesas || 0);

  return {
    subtitulo: cardId === "card-comparativo"
      ? "Comparação entre fôlego financeiro e volume de despesas."
      : "Leitura da evolução recente com o mês selecionado em destaque.",
    html: `
      <div class="detalhe-analise-grid">
        ${criarMetricaDetalheCard("Receitas", formatadorBRL.format(resumo.totalReceitas || 0), "texto-receita")}
        ${criarMetricaDetalheCard("Despesas", formatadorBRL.format(resumo.totalDespesas || 0), "texto-despesa")}
        ${criarMetricaDetalheCard("Saldo", formatadorBRL.format(saldo), saldo >= 0 ? "texto-receita" : "texto-despesa")}
      </div>
      <div class="detalhe-analise-bloco">
        <span class="detalhe-card-secao-titulo">Composição do mês</span>
        ${criarLinhaAnaliseDetalhe({ titulo: "Entradas pagas", valor: formatadorBRL.format(resumo.totalReceitas || 0), classe: "texto-receita" })}
        ${criarLinhaAnaliseDetalhe({ titulo: "Saídas pagas e pendentes", valor: formatadorBRL.format(resumo.totalDespesas || 0), classe: "texto-despesa" })}
        ${criarLinhaAnaliseDetalhe({ titulo: "Diferença operacional", detalhe: "Receitas menos despesas", valor: formatadorBRL.format(diferenca), classe: diferenca >= 0 ? "texto-receita" : "texto-despesa" })}
      </div>
      <div class="detalhe-analise-insight">
        ${saldo >= 0
          ? "O mês ainda está positivo. Use essa folga para antecipar pendências ou guardar antes de aumentar gastos."
          : "O mês está negativo. O melhor movimento agora é revisar despesas maiores e pendências abertas."}
      </div>
    `,
  };
}

function criarDetalheAnaliticoDashboard(card) {
  const id = card?.dataset?.cardAnalitico || card?.id || "";
  if (id === "resumo-categorias") return criarDetalheCategoriasAnalitico();
  if (id === "card-cartoes-credito") return criarDetalheCartoesAnalitico();
  if (id === "card-riscos-financeiros") return criarDetalheRiscosAnalitico();
  if (id === "card-score") return criarDetalheSaudeAnalitico();
  if (id === "card-tendencia" || id === "card-comparativo") return criarDetalheFluxoAnalitico(id);
  return null;
}

