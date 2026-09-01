// ==========================================
// dashboard-card-detail-summary.js - Render dos cards de resumo
// ==========================================

function criarResumoSaldoDetalheCard(resumo) {
  const transferencias = obterTransferenciasDetalheCard();
  const linhas = [
    { nome: "Receitas pagas", valor: resumo.totalReceitas, classe: "texto-receita", sinal: "+" },
    { nome: "Despesas do período", valor: resumo.totalDespesas, classe: "texto-despesa", sinal: "−" },
    { nome: "Transferências enviadas", valor: resumo.totalTransferenciasSaida, classe: "texto-despesa", sinal: "−" },
    { nome: "Transferências recebidas", valor: resumo.totalTransferenciasEntrada, classe: "texto-receita", sinal: "+" },
  ].filter((item) => item.valor > 0);

  const saldoClasse = resumo.saldoCalculado >= 0 ? "texto-receita" : "texto-despesa";
  return `
    <div class="detalhe-card-formula">
      ${linhas.length ? linhas.map((item) => `
        <div class="detalhe-card-formula-linha">
          <span>${item.nome}</span>
          <strong class="${item.classe}">${item.sinal} ${formatadorBRL.format(item.valor)}</strong>
        </div>
      `).join("") : `<p class="detalhe-card-vazio">Sem movimento no período selecionado.</p>`}
      <div class="detalhe-card-formula-total">
        <span>Saldo calculado</span>
        <strong class="${saldoClasse}">${formatadorBRL.format(resumo.saldoCalculado)}</strong>
      </div>
      ${transferencias.length ? `<small>${transferencias.length} transferência(s) considerada(s) no período.</small>` : ""}
    </div>
  `;
}

function criarListaLancamentosDetalheCard(lancamentos, config) {
  const ordenados = ordenarLancamentosDetalheCard(lancamentos);
  const primeiros = ordenados.slice(0, 8);

  if (!primeiros.length) {
    return `<p class="detalhe-card-vazio">Nada encontrado para este card no período atual.</p>`;
  }

  return `
    <div class="detalhe-card-lista">
      ${primeiros.map((lancamento) => {
        const status = obterStatusDetalheCard(lancamento);
        const valor = valorMonetario(lancamento);
        const sinal = lancamento.tipo === "receita" ? "+" : "−";
        const classeValor = lancamento.tipo === "receita" ? "texto-receita" : "texto-despesa";
        return `
          <div class="detalhe-card-item">
            <div class="detalhe-card-item-info">
              <strong>${escaparHtml(lancamento.descricao || "Lançamento")}</strong>
              <small>${formatarDataDetalheCard(lancamento.data_compra)} · ${escaparHtml(lancamento.categoria || "Sem categoria")}</small>
            </div>
            <div class="detalhe-card-item-valor">
              <span class="${classeValor}">${sinal} ${formatadorBRL.format(valor)}</span>
              <em class="${status.classe}">${status.texto}</em>
            </div>
          </div>
        `;
      }).join("")}
      ${ordenados.length > primeiros.length ? `<div class="detalhe-card-mais">+${ordenados.length - primeiros.length} lançamento(s) na lista completa</div>` : ""}
    </div>
  `;
}

function criarCategoriasDetalheCard(lancamentos) {
  const categorias = agruparPorCategoriaDetalheCard(lancamentos);
  if (!categorias.length) return "";

  return `
    <div class="detalhe-card-categorias">
      <span class="detalhe-card-secao-titulo">Maiores categorias</span>
      ${categorias.map(([categoria, valor]) => `
        <div class="detalhe-card-categoria">
          <span>${escaparHtml(categoria)}</span>
          <strong>${formatadorBRL.format(valor)}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function criarSubtotalStatusDetalheCard(tipo, lancamentos) {
  if (tipo !== "despesas" && tipo !== "pendentes") return "";
  const grupos = agruparPorStatusDetalheCard(lancamentos);
  const partes = [];
  if (grupos.pagos) partes.push(`<span>Pagas <strong>${formatadorBRL.format(grupos.pagos)}</strong></span>`);
  if (grupos.pendentes) partes.push(`<span>Pendentes <strong>${formatadorBRL.format(grupos.pendentes)}</strong></span>`);
  if (!partes.length) return "";
  return `<div class="detalhe-card-subtotais">${partes.join("")}</div>`;
}

function criarListaAnaliticaLancamentosDetalhe(lancamentos, titulo = "Lançamentos") {
  const ordenados = ordenarLancamentosDetalheCard(lancamentos).slice(0, 8);
  return `
    <div class="detalhe-analise-bloco">
      <span class="detalhe-card-secao-titulo">${titulo}</span>
      ${ordenados.length ? ordenados.map((lancamento) => {
        const status = obterStatusDetalheCard(lancamento);
        const valor = valorMonetario(lancamento);
        const sinal = lancamento.tipo === "receita" ? "+" : "−";
        const classe = lancamento.tipo === "receita" ? "texto-receita" : "texto-despesa";
        return criarLinhaAnaliseDetalhe({
          titulo: lancamento.descricao || "Lançamento",
          detalhe: `${formatarDataDetalheCard(lancamento.data_compra)} · ${lancamento.categoria || "Sem categoria"} · ${status.texto}`,
          valor: `${sinal} ${formatadorBRL.format(valor)}`,
          classe,
        });
      }).join("") : `<p class="detalhe-card-vazio">Nada encontrado neste período.</p>`}
      ${lancamentos.length > ordenados.length ? `<div class="detalhe-card-mais">+${lancamentos.length - ordenados.length} lançamento(s) na lista completa</div>` : ""}
    </div>
  `;
}

function criarDetalheResumoTopoAnalitico(tipo, resumo, lancamentos) {
  const total = tipo === "saldo" ? Number(resumo.saldoCalculado || 0) : somarLancamentosDetalheCard(lancamentos);
  const maiorLancamento = [...lancamentos].sort((a, b) => valorMonetario(b) - valorMonetario(a))[0];
  const pagos = lancamentos.filter((l) => l.status === "pago");
  const pendentes = lancamentos.filter((l) => l.status !== "pago");
  const totalPago = somarLancamentosDetalheCard(pagos);
  const totalPendente = somarLancamentosDetalheCard(pendentes);
  const media = lancamentos.length ? total / lancamentos.length : 0;
  const categorias = agruparPorCategoriaDetalheCard(lancamentos);
  const saldoClasse = Number(resumo.saldoCalculado || 0) >= 0 ? "texto-receita" : "texto-despesa";

  if (tipo === "saldo") {
    return {
      subtitulo: "Composição completa do saldo do período.",
      html: `
        <div class="detalhe-analise-grid">
          ${criarMetricaDetalheCard("Receitas pagas", formatadorBRL.format(resumo.totalReceitas || 0), "texto-receita")}
          ${criarMetricaDetalheCard("Despesas", formatadorBRL.format(resumo.totalDespesas || 0), "texto-despesa")}
          ${criarMetricaDetalheCard("A pagar", formatadorBRL.format(resumo.totalPendente || 0), "texto-pendente")}
          ${criarMetricaDetalheCard("Saldo", formatadorBRL.format(resumo.saldoCalculado || 0), saldoClasse)}
        </div>
        <div class="detalhe-analise-bloco">
          <span class="detalhe-card-secao-titulo">Cálculo do saldo</span>
          ${criarLinhaAnaliseDetalhe({ titulo: "Entradas pagas", valor: `+ ${formatadorBRL.format(resumo.totalReceitas || 0)}`, classe: "texto-receita" })}
          ${criarLinhaAnaliseDetalhe({ titulo: "Saídas pagas e pendentes", valor: `− ${formatadorBRL.format(resumo.totalDespesas || 0)}`, classe: "texto-despesa" })}
          ${Number(resumo.totalTransferenciasSaida || 0) > 0 ? criarLinhaAnaliseDetalhe({ titulo: "Transferências enviadas", valor: `− ${formatadorBRL.format(resumo.totalTransferenciasSaida || 0)}`, classe: "texto-despesa" }) : ""}
          ${Number(resumo.totalTransferenciasEntrada || 0) > 0 ? criarLinhaAnaliseDetalhe({ titulo: "Transferências recebidas", valor: `+ ${formatadorBRL.format(resumo.totalTransferenciasEntrada || 0)}`, classe: "texto-receita" }) : ""}
          ${criarLinhaAnaliseDetalhe({ titulo: "Resultado do período", detalhe: "Receitas - despesas - saídas + entradas", valor: formatadorBRL.format(resumo.saldoCalculado || 0), classe: saldoClasse })}
        </div>
        <div class="detalhe-analise-insight">
          ${Number(resumo.saldoCalculado || 0) >= 0
            ? "O período está positivo. Esse é um bom momento para antecipar pendências ou guardar parte da sobra."
            : "O período está negativo. O melhor foco agora é entender as maiores despesas e reduzir novas saídas."}
        </div>
      `,
    };
  }

  const tituloLista = tipo === "receitas"
    ? "Receitas que compõem o card"
    : tipo === "pendentes"
      ? "Compromissos pendentes"
      : "Despesas que compõem o card";
  const insight = tipo === "receitas"
    ? (lancamentos.length ? "Estas são as entradas já pagas/recebidas no período. Receitas pendentes não entram no total para evitar inflar o saldo." : "Nenhuma receita paga encontrada no período selecionado.")
    : tipo === "pendentes"
      ? (pendentes.length ? "Esse valor ainda precisa sair do caixa. Priorize atrasados e vencimentos mais próximos." : "Sem compromissos pendentes neste período.")
      : (pendentes.length ? "Este total inclui despesas pagas e pendentes, para mostrar o compromisso real do período." : "Estas são as despesas registradas para o período selecionado.");

  return {
    subtitulo: tipo === "receitas"
      ? "Entradas pagas/recebidas que compõem o total."
      : tipo === "pendentes"
        ? "Compromissos em aberto, incluindo atrasados e próximos vencimentos."
        : "Saídas pagas e pendentes que explicam o total do card.",
    html: `
      <div class="detalhe-analise-grid">
        ${criarMetricaDetalheCard("Total", formatadorBRL.format(total), tipo === "receitas" ? "texto-receita" : tipo === "pendentes" ? "texto-pendente" : "texto-despesa")}
        ${criarMetricaDetalheCard("Registros", String(lancamentos.length))}
        ${criarMetricaDetalheCard("Média", formatadorBRL.format(media))}
        ${criarMetricaDetalheCard("Maior item", maiorLancamento ? formatadorBRL.format(valorMonetario(maiorLancamento)) : "—", tipo === "receitas" ? "texto-receita" : "texto-despesa")}
        ${tipo === "despesas" ? criarMetricaDetalheCard("Pagas", formatadorBRL.format(totalPago), "texto-receita") : ""}
        ${tipo === "despesas" || tipo === "pendentes" ? criarMetricaDetalheCard("Pendentes", formatadorBRL.format(totalPendente), "texto-pendente") : ""}
      </div>
      ${criarListaAnaliticaLancamentosDetalhe(lancamentos, tituloLista)}
      <div class="detalhe-analise-insight">
        ${insight}
        ${categorias.length && tipo !== "receitas" ? ` Maior categoria: <strong>${escaparHtml(categorias[0][0])}</strong> com <strong>${formatadorBRL.format(categorias[0][1])}</strong>.` : ""}
      </div>
    `,
  };
}

