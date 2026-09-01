// ==========================================
// dashboard-card-details-ui.js - Detalhes dos cards de resumo
// ==========================================

const DETALHE_CARD_TIPOS = {
  receitas: {
    titulo: "Receitas do período",
    subtitulo: "Entradas pagas que compõem o total do card.",
    classeValor: "texto-receita",
    sinal: "+",
    filtro: { tipo: "receita", status: "pago" },
    filtroTexto: "Ver receitas na lista",
  },
  despesas: {
    titulo: "Despesas do período",
    subtitulo: "Saídas pagas e pendentes que compõem o total do card.",
    classeValor: "texto-despesa",
    sinal: "−",
    filtro: { tipo: "despesa", status: "" },
    filtroTexto: "Ver despesas na lista",
  },
  pendentes: {
    titulo: "Compromissos a pagar",
    subtitulo: "Despesas ainda pendentes neste período.",
    classeValor: "texto-pendente",
    sinal: "−",
    filtro: { tipo: "", status: "pendente" },
    filtroTexto: "Ver pendentes na lista",
  },
  saldo: {
    titulo: "Composição do saldo",
    subtitulo: "Resumo do cálculo usado no saldo do período.",
    classeValor: "",
    sinal: "",
    filtro: { tipo: "", status: "" },
    filtroTexto: "Ver lançamentos do período",
  },
};

function obterLancamentosDetalheCard(tipo) {
  const lancamentos = typeof ultimoLoteLancamentos !== "undefined" && Array.isArray(ultimoLoteLancamentos) ? ultimoLoteLancamentos : [];
  if (tipo === "receitas") return lancamentos.filter((l) => l.tipo === "receita" && l.status === "pago");
  if (tipo === "despesas") return lancamentos.filter((l) => l.tipo === "despesa");
  if (tipo === "pendentes") return lancamentos.filter((l) => l.status !== "pago");
  return lancamentos;
}

function obterTransferenciasDetalheCard() {
  return typeof ultimoLoteTransferencias !== "undefined" && Array.isArray(ultimoLoteTransferencias) ? ultimoLoteTransferencias : [];
}

function ordenarLancamentosDetalheCard(lancamentos) {
  return [...lancamentos].sort((a, b) => String(b.data_compra || "").localeCompare(String(a.data_compra || "")));
}

function formatarDataDetalheCard(data) {
  if (!data) return "Sem data";
  const [ano, mes, dia] = String(data).slice(0, 10).split("-");
  if (!ano || !mes || !dia) return String(data);
  return `${dia}/${mes}/${ano}`;
}

function obterStatusDetalheCard(lancamento) {
  if (lancamento.status === "pago") return { texto: "Pago", classe: "status-pago" };
  const data = String(lancamento.data_compra || "");
  const hoje = new Date().toISOString().slice(0, 10);
  if (data && data < hoje) return { texto: "Atrasado", classe: "status-atrasado" };
  return { texto: "Pendente", classe: "status-pendente" };
}

function somarLancamentosDetalheCard(lancamentos) {
  return lancamentos.reduce((total, lancamento) => total + valorMonetario(lancamento), 0);
}

function agruparPorStatusDetalheCard(lancamentos) {
  return lancamentos.reduce((grupos, lancamento) => {
    const chave = lancamento.status === "pago" ? "pagos" : "pendentes";
    grupos[chave] = (grupos[chave] || 0) + valorMonetario(lancamento);
    return grupos;
  }, {});
}

function agruparPorCategoriaDetalheCard(lancamentos) {
  const mapa = lancamentos.reduce((grupos, lancamento) => {
    const categoria = lancamento.categoria || "Sem categoria";
    grupos[categoria] = (grupos[categoria] || 0) + valorMonetario(lancamento);
    return grupos;
  }, {});

  return Object.entries(mapa)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
}

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

function garantirModalDetalheCard() {
  let modal = document.getElementById("modal-detalhe-card-dashboard");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "modal-detalhe-card-dashboard";
  modal.className = "modal-overlay modal-detalhe-card-dashboard";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "detalhe-card-titulo");
  modal.style.display = "none";
  modal.innerHTML = `
    <div class="modal-content detalhe-card-content">
      <div class="detalhe-card-topo">
        <div>
          <span class="detalhe-card-eyebrow">Detalhe do card</span>
          <h3 id="detalhe-card-titulo">Resumo</h3>
          <p id="detalhe-card-subtitulo"></p>
        </div>
        <button type="button" class="btn-fechar-modal detalhe-card-fechar" id="btn-fechar-modal-detalhe-card" data-detalhe-card-fechar aria-label="Fechar detalhes">×</button>
      </div>
      <div id="detalhe-card-corpo"></div>
      <div class="detalhe-card-acoes">
        <button type="button" class="btn-secundario" id="btn-detalhe-card-filtrar">Ver na lista</button>
        <button type="button" class="btn-secundario" id="btn-detalhe-card-fechar" data-detalhe-card-fechar>Fechar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.addEventListener("click", (evento) => {
    const botaoFechar = evento.target.closest("[data-detalhe-card-fechar]");
    if (botaoFechar && modal.contains(botaoFechar)) {
      evento.preventDefault();
      evento.stopPropagation();
      fecharModalDetalheCard();
      return;
    }

    if (evento.target === modal) {
      evento.preventDefault();
      fecharModalDetalheCard();
    }
  });
  modal.querySelector("#btn-detalhe-card-filtrar")?.addEventListener("click", aplicarFiltroDetalheCard);

  return modal;
}

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

function obterArrayGlobalDetalhe(nome) {
  if (nome === "cartoesCreditoCarregados" && typeof cartoesCreditoCarregados !== "undefined" && Array.isArray(cartoesCreditoCarregados)) return cartoesCreditoCarregados;
  if (nome === "orcamentosCarregados" && typeof orcamentosCarregados !== "undefined" && Array.isArray(orcamentosCarregados)) return orcamentosCarregados;
  if (nome === "despesasFixasCarregadas" && typeof despesasFixasCarregadas !== "undefined" && Array.isArray(despesasFixasCarregadas)) return despesasFixasCarregadas;
  if (nome === "comprasParceladasCarregadas" && typeof comprasParceladasCarregadas !== "undefined" && Array.isArray(comprasParceladasCarregadas)) return comprasParceladasCarregadas;
  if (nome === "bonificacoesCarregadas" && typeof bonificacoesCarregadas !== "undefined" && Array.isArray(bonificacoesCarregadas)) return bonificacoesCarregadas;
  return [];
}

function criarMetricaDetalheCard(rotulo, valor, classe = "") {
  return `
    <div class="detalhe-analise-metrica">
      <span>${rotulo}</span>
      <strong class="${classe}">${valor}</strong>
    </div>
  `;
}

function criarLinhaAnaliseDetalhe({ titulo, detalhe = "", valor = "", classe = "", progresso = null }) {
  const largura = Number.isFinite(Number(progresso)) ? Math.max(0, Math.min(100, Number(progresso))) : null;
  return `
    <div class="detalhe-analise-linha">
      <div class="detalhe-analise-linha-topo">
        <span>
          <strong>${escaparHtml(titulo)}</strong>
          ${detalhe ? `<small>${escaparHtml(detalhe)}</small>` : ""}
        </span>
        ${valor ? `<b class="${classe}">${valor}</b>` : ""}
      </div>
      ${largura !== null ? `
        <div class="detalhe-analise-barra" aria-hidden="true">
          <span class="${classe}" style="width:${largura}%"></span>
        </div>
      ` : ""}
    </div>
  `;
}

function obterResumoAtualDetalheCard() {
  return typeof calcularResumoLancamentosLocal === "function"
    ? calcularResumoLancamentosLocal()
    : { totalReceitas: 0, totalDespesas: 0, totalPendente: 0, saldoCalculado: 0, totaisPorCategoria: {} };
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

function abrirModalCardAnaliticoDashboard(card) {
  if (!card) return;

  const modal = garantirModalDetalheCard();
  const titulo = modal.querySelector("#detalhe-card-titulo");
  const subtitulo = modal.querySelector("#detalhe-card-subtitulo");
  const corpo = modal.querySelector("#detalhe-card-corpo");
  const btnFiltrar = modal.querySelector("#btn-detalhe-card-filtrar");
  const tituloCard = card.dataset.cardAnaliticoTitulo
    || card.querySelector(".resumo-categorias-titulo")?.textContent?.trim()
    || "Detalhe do card";
  const detalheAnalitico = criarDetalheAnaliticoDashboard(card);

  if (titulo) titulo.textContent = tituloCard;
  if (subtitulo) subtitulo.textContent = detalheAnalitico?.subtitulo || "Resumo detalhado do card selecionado.";
  if (btnFiltrar) btnFiltrar.style.display = "none";
  if (corpo) {
    if (detalheAnalitico) {
      corpo.innerHTML = detalheAnalitico.html;
    } else {
      corpo.innerHTML = "";
      corpo.appendChild(clonarCardAnaliticoParaDetalhe(card));
    }
  }

  modal.dataset.tipo = "";
  modal.dataset.cardAnalitico = card.dataset.cardAnalitico || "";
  modal.style.display = "flex";
  if (typeof trapFoco === "function") trapFoco(modal);
}

function fecharModalDetalheCard() {
  const modal = document.getElementById("modal-detalhe-card-dashboard");
  if (!modal) return;
  if (typeof liberarFoco === "function") liberarFoco();
  modal.style.display = "none";
  modal.dataset.tipo = "";
  modal.dataset.cardAnalitico = "";
}

function abrirModalDetalheCard(tipo) {
  const config = DETALHE_CARD_TIPOS[tipo];
  if (!config) return;

  const modal = garantirModalDetalheCard();
  const titulo = modal.querySelector("#detalhe-card-titulo");
  const subtitulo = modal.querySelector("#detalhe-card-subtitulo");
  const corpo = modal.querySelector("#detalhe-card-corpo");
  const btnFiltrar = modal.querySelector("#btn-detalhe-card-filtrar");
  const resumo = typeof calcularResumoLancamentosLocal === "function" ? calcularResumoLancamentosLocal() : {};
  const lancamentos = obterLancamentosDetalheCard(tipo);
  const total = tipo === "saldo" ? Number(resumo.saldoCalculado || 0) : somarLancamentosDetalheCard(lancamentos);
  const classeTotal = tipo === "saldo"
    ? total >= 0 ? "texto-receita" : "texto-despesa"
    : config.classeValor;

  if (titulo) titulo.textContent = config.titulo;
  if (subtitulo) subtitulo.textContent = config.subtitulo;
  if (btnFiltrar) {
    btnFiltrar.textContent = config.filtroTexto;
    btnFiltrar.style.display = "";
  }
  if (corpo) {
    corpo.innerHTML = `
      <div class="detalhe-card-total">
        <span>Total</span>
        <strong class="${classeTotal}">${formatadorBRL.format(total)}</strong>
      </div>
      ${tipo === "saldo" ? criarResumoSaldoDetalheCard(resumo) : `
        ${criarSubtotalStatusDetalheCard(tipo, lancamentos)}
        ${criarCategoriasDetalheCard(lancamentos)}
        ${criarListaLancamentosDetalheCard(lancamentos, config)}
      `}
    `;
  }

  modal.dataset.tipo = tipo;
  modal.style.display = "flex";
  if (typeof trapFoco === "function") trapFoco(modal);
}

function aplicarFiltroDetalheCard() {
  const tipo = document.getElementById("modal-detalhe-card-dashboard")?.dataset?.tipo;
  const config = DETALHE_CARD_TIPOS[tipo];
  if (!config) return;

  const campoBusca = document.getElementById("busca-lancamento");
  const filtroTipo = document.getElementById("filtro-tipo");
  const filtroStatus = document.getElementById("filtro-status");
  const filtroCategoria = document.getElementById("filtro-categoria-lancamento");

  if (campoBusca) campoBusca.value = "";
  if (filtroTipo) filtroTipo.value = config.filtro.tipo;
  if (filtroStatus) filtroStatus.value = config.filtro.status;
  if (filtroCategoria) filtroCategoria.value = "";
  if (typeof termoBuscaAtual !== "undefined") termoBuscaAtual = "";
  if (typeof resetarPaginacaoLancamentos === "function") resetarPaginacaoLancamentos();
  if (typeof renderizarListaLancamentos === "function") renderizarListaLancamentos();
  fecharModalDetalheCard();
  document.querySelector(".lancamentos-cabecalho")?.scrollIntoView({ behavior: "smooth", block: "start" });
  if (typeof mostrarToast === "function") mostrarToast("Lista filtrada pelo card", "info");
}

function configurarDetalhesCardsDashboard() {
  document.querySelectorAll("[data-resumo-card]").forEach((card) => {
    const tipo = card.dataset.resumoCard;
    if (!DETALHE_CARD_TIPOS[tipo]) return;

    card.addEventListener("click", (evento) => {
      evento.preventDefault();
      evento.stopImmediatePropagation();
      abrirModalDetalheCard(tipo);
    }, true);

    card.addEventListener("keydown", (evento) => {
      if (evento.key !== "Enter" && evento.key !== " ") return;
      evento.preventDefault();
      evento.stopImmediatePropagation();
      abrirModalDetalheCard(tipo);
    }, true);
  });

  document.addEventListener("click", (evento) => {
    const card = evento.target.closest("[data-card-analitico]");
    if (!card || document.body.classList.contains("dashboard-layout-modo-ativo")) return;
    if (evento.target.closest("button, a, input, select, textarea, label, [data-action], [data-risco-acao]")) return;
    evento.preventDefault();
    abrirModalCardAnaliticoDashboard(card);
  });

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && document.getElementById("modal-detalhe-card-dashboard")?.style.display !== "none") {
      evento.preventDefault();
      fecharModalDetalheCard();
      return;
    }

    if (evento.key !== "Enter" && evento.key !== " ") return;
    const card = evento.target.closest("[data-card-analitico]");
    if (!card || document.body.classList.contains("dashboard-layout-modo-ativo")) return;
    if (evento.target.closest("button, a, input, select, textarea, label, [data-action], [data-risco-acao]")) return;
    evento.preventDefault();
    abrirModalCardAnaliticoDashboard(card);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", configurarDetalhesCardsDashboard);
} else {
  configurarDetalhesCardsDashboard();
}
