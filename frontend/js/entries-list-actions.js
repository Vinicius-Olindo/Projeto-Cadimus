// ==========================================
// entries-list-actions.js - Eventos e acoes da lista de lancamentos
// ==========================================

function configurarBuscaLancamentos() {
  const campo = document.getElementById("busca-lancamento");
  if (!campo) return;

  let timeoutBusca;
  campo.addEventListener("input", (evento) => {
    clearTimeout(timeoutBusca);
    timeoutBusca = setTimeout(() => {
      termoBuscaAtual = evento.target.value;
      agendarRenderizacaoListaLancamentos({ resetarPagina: true });
    }, 160);
  });

  ["filtro-tipo", "filtro-status", "filtro-categoria-lancamento"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", () => {
        agendarRenderizacaoListaLancamentos({ resetarPagina: true });
      });
    }
  });

  const containerLancamentos = document.getElementById("lista-lancamentos");
  if (containerLancamentos) {
    containerLancamentos.addEventListener("click", (e) => {
      const alvo = e.target.closest("[data-action]");
      if (!alvo) return;
      const acao = alvo.dataset.action;
      const id = Number(alvo.dataset.id);
      if (acao === "editar") editarLancamento(id);
      else if (acao === "duplicar") duplicarLancamento(id);
      else if (acao === "apagar") apagarLancamento(id);
      else if (acao === "status") alternarStatusLancamento(id, alvo.dataset.statusAtual);
      else if (acao === "novo-lancamento") abrirModalNovoLancamento();
      else if (acao === "limpar-filtros") limparFiltros();
    });
  }

  const cardPendente = document.getElementById("resumo-pendente-item");
  if (cardPendente) {
    cardPendente.addEventListener("click", filtrarLancamentosPendentes);
    cardPendente.addEventListener("keydown", (evento) => {
      if (evento.key !== "Enter" && evento.key !== " ") return;
      evento.preventDefault();
      filtrarLancamentosPendentes();
    });
  }

  const cardReceitas = document.getElementById("resumo-receitas-item");
  if (cardReceitas) {
    cardReceitas.addEventListener("click", limparFiltrosPeloResumo);
    cardReceitas.addEventListener("keydown", (evento) => {
      if (evento.key !== "Enter" && evento.key !== " ") return;
      evento.preventDefault();
      limparFiltrosPeloResumo();
    });
  }

  const paginacaoLancamentos = document.getElementById("lancamentos-paginacao");
  if (paginacaoLancamentos) {
    paginacaoLancamentos.addEventListener("click", (e) => {
      const botao = e.target.closest("button[data-pagina]");
      if (!botao || botao.disabled) return;
      irParaPaginaLancamentos(Number(botao.dataset.pagina));
    });

    paginacaoLancamentos.addEventListener("change", (e) => {
      const seletor = e.target.closest("#lancamentos-por-pagina-select");
      if (!seletor) return;
      const novoValor = Number(seletor.value);
      if (!OPCOES_LANCAMENTOS_POR_PAGINA.includes(novoValor)) return;
      lancamentosPorPagina = novoValor;
      gravarLocalStorageSeguro(CHAVE_LANCAMENTOS_POR_PAGINA, String(novoValor));
      agendarRenderizacaoListaLancamentos({ resetarPagina: true });
    });
  }
}
