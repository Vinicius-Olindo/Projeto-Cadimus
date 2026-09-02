// ==========================================
// global-search-ui.js - Busca global rápida
// ==========================================

let buscaGlobalAberta = false;

function normalizarTermoBuscaGlobal(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function obterColecaoSeguraBuscaGlobal(nomeGlobal) {
  if (nomeGlobal === "ultimoLoteLancamentos") {
    return typeof ultimoLoteLancamentos !== "undefined" && Array.isArray(ultimoLoteLancamentos) ? ultimoLoteLancamentos : [];
  }
  if (nomeGlobal === "carteirasCarregadas") {
    return typeof carteirasCarregadas !== "undefined" && Array.isArray(carteirasCarregadas) ? carteirasCarregadas : [];
  }
  if (nomeGlobal === "cartoesCreditoCarregados") {
    return typeof cartoesCreditoCarregados !== "undefined" && Array.isArray(cartoesCreditoCarregados) ? cartoesCreditoCarregados : [];
  }
  if (nomeGlobal === "metasCarregadas") {
    return typeof metasCarregadas !== "undefined" && Array.isArray(metasCarregadas) ? metasCarregadas : [];
  }
  if (nomeGlobal === "orcamentosCarregados") {
    return typeof orcamentosCarregados !== "undefined" && Array.isArray(orcamentosCarregados) ? orcamentosCarregados : [];
  }
  return [];
}

function criarModalBuscaGlobal() {
  if (document.getElementById("modal-busca-global")) return;

  const modal = document.createElement("div");
  modal.id = "modal-busca-global";
  modal.className = "modal-overlay modal-busca-global";
  modal.style.display = "none";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.innerHTML = `
    <div class="busca-global-box">
      <div class="busca-global-topo">
        <div>
          <span class="busca-global-eyebrow">Busca global</span>
          <h3>Encontre rápido no Cadimus</h3>
        </div>
        <button type="button" class="busca-global-fechar" id="btn-fechar-busca-global" aria-label="Fechar busca">×</button>
      </div>
      <div class="busca-global-campo">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input type="search" id="input-busca-global" placeholder="Buscar lançamentos, cartões, carteiras, metas..." autocomplete="off" />
        <span>Ctrl K</span>
      </div>
      <div class="busca-global-resultados" id="busca-global-resultados"></div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.addEventListener("click", (evento) => {
    if (evento.target === modal) fecharBuscaGlobal();
  });
  document.getElementById("btn-fechar-busca-global")?.addEventListener("click", fecharBuscaGlobal);
  document.getElementById("input-busca-global")?.addEventListener("input", renderizarResultadosBuscaGlobal);
}

async function prepararDadosBuscaGlobal() {
  const tarefas = [];
  if (typeof carregarOrcamentos === "function") tarefas.push(carregarOrcamentos());
  if (typeof carregarMetas === "function") tarefas.push(carregarMetas());
  await window.carregarModuloCartoesCreditoCarteira?.();
  if (typeof carregarCartoesCredito === "function") tarefas.push(carregarCartoesCredito());
  await Promise.allSettled(tarefas);
}

function criarItemBuscaGlobal({ tipo, titulo, detalhe, palavras, acao }) {
  return {
    tipo,
    titulo: titulo || "Sem título",
    detalhe: detalhe || "",
    palavras: normalizarTermoBuscaGlobal(`${tipo} ${titulo || ""} ${detalhe || ""} ${palavras || ""}`),
    acao,
  };
}

function montarItensBuscaGlobal() {
  const itens = [];
  const usuario = obterUsuarioLogado();

  obterColecaoSeguraBuscaGlobal("ultimoLoteLancamentos").forEach((lancamento) => {
    itens.push(criarItemBuscaGlobal({
      tipo: "Lançamento",
      titulo: lancamento.descricao || lancamento.categoria || `Lançamento #${lancamento.id}`,
      detalhe: `${lancamento.tipo || "movimento"} · ${lancamento.categoria || "sem categoria"} · ${formatadorBRL.format(valorMonetario(lancamento))}`,
      palavras: `${lancamento.status || ""} ${lancamento.data_compra || ""}`,
      acao: () => {
        if (typeof editarLancamento === "function" && lancamento.id) editarLancamento(lancamento.id);
      },
    }));
  });

  obterColecaoSeguraBuscaGlobal("carteirasCarregadas").forEach((carteira) => {
    itens.push(criarItemBuscaGlobal({
      tipo: "Carteira",
      titulo: carteira.nome || `Carteira #${carteira.id}`,
      detalhe: carteira.tipo ? `Tipo: ${carteira.tipo}` : "Carteira financeira",
      palavras: carteira.id,
      acao: () => selecionarCarteiraBuscaGlobal(carteira.id),
    }));
  });

  obterColecaoSeguraBuscaGlobal("cartoesCreditoCarregados").forEach((cartao) => {
    itens.push(criarItemBuscaGlobal({
      tipo: "Cartão",
      titulo: cartao.nome || `Cartão #${cartao.id}`,
      detalhe: `${cartao.bandeira || "cartão"}${cartao.ultimos4 ? ` •••• ${cartao.ultimos4}` : ""} · limite ${formatadorBRL.format(valorMonetario(cartao, "limite"))}`,
      palavras: `${cartao.dia_fechamento || ""} ${cartao.dia_vencimento || ""}`,
      acao: async () => {
        await window.carregarModuloCartoesCreditoCarteira?.();
        if (typeof abrirModalCartao === "function") abrirModalCartao(cartao);
      },
    }));
  });

  obterColecaoSeguraBuscaGlobal("metasCarregadas").forEach((meta) => {
    itens.push(criarItemBuscaGlobal({
      tipo: "Meta",
      titulo: meta.categoria || `Meta #${meta.id}`,
      detalhe: `${formatadorBRL.format(valorMonetario(meta, "total_depositado"))} de ${formatadorBRL.format(valorMonetario(meta, "valor_limite"))}`,
      palavras: `${meta.data_limite || ""}`,
      acao: () => {
        if (typeof abrirModalDeposito === "function" && meta.id) abrirModalDeposito(meta.id, meta.categoria);
      },
    }));
  });

  obterColecaoSeguraBuscaGlobal("orcamentosCarregados").forEach((orcamento) => {
    itens.push(criarItemBuscaGlobal({
      tipo: "Orçamento",
      titulo: orcamento.categoria || `Orçamento #${orcamento.id}`,
      detalhe: `${formatadorBRL.format(valorMonetario(orcamento, "total_gasto"))} de ${formatadorBRL.format(valorMonetario(orcamento))}`,
      palavras: `${orcamento.mes || ""} ${orcamento.ano || ""}`,
      acao: async () => {
        await window.carregarModuloOrcamentoCarteira?.();
        window.abrirModalOrcamento?.({ categoria: orcamento.categoria, mes: orcamento.mes, ano: orcamento.ano });
      },
    }));
  });

  if (usuario) {
    itens.push(criarItemBuscaGlobal({
      tipo: "Usuário",
      titulo: usuario.nome || usuario.nome_usuario || "Meu usuário",
      detalhe: usuario.email || usuario.perfil || "Perfil logado",
      palavras: `${usuario.id || ""} ${usuario.nome_usuario || ""}`,
      acao: () => {
        document.getElementById("dropdown-btn-config")?.click();
      },
    }));
  }

  return itens;
}

function selecionarCarteiraBuscaGlobal(carteiraId) {
  const seletor = document.getElementById("seletor-carteira");
  if (!seletor || !carteiraId) return;
  seletor.value = String(carteiraId);
  if (typeof renderizarTabsCarteiras === "function") renderizarTabsCarteiras();
  if (typeof carregarLancamentos === "function") carregarLancamentos();
}

function renderizarResultadosBuscaGlobal() {
  const container = document.getElementById("busca-global-resultados");
  const input = document.getElementById("input-busca-global");
  if (!container || !input) return;

  const termo = normalizarTermoBuscaGlobal(input.value);
  const itens = montarItensBuscaGlobal();
  const resultados = termo
    ? itens.filter((item) => item.palavras.includes(termo)).slice(0, 24)
    : itens.slice(0, 12);

  if (resultados.length === 0) {
    container.innerHTML = '<div class="busca-global-vazio">Nada encontrado. Tente buscar por categoria, carteira, valor, status ou descrição.</div>';
    return;
  }

  container.innerHTML = resultados.map((item, indice) => `
    <button type="button" class="busca-global-resultado" data-indice="${indice}">
      <span class="busca-global-tipo">${escaparHtml(item.tipo)}</span>
      <span class="busca-global-info">
        <strong>${escaparHtml(item.titulo)}</strong>
        <small>${escaparHtml(item.detalhe)}</small>
      </span>
    </button>
  `).join("");

  container.querySelectorAll(".busca-global-resultado").forEach((botao) => {
    botao.addEventListener("click", () => {
      const item = resultados[Number(botao.dataset.indice)];
      fecharBuscaGlobal();
      item?.acao?.();
    });
  });
}

async function abrirBuscaGlobal() {
  criarModalBuscaGlobal();
  const modal = document.getElementById("modal-busca-global");
  const input = document.getElementById("input-busca-global");
  const container = document.getElementById("busca-global-resultados");
  if (!modal || !input || !container) return;

  buscaGlobalAberta = true;
  modal.style.display = "flex";
  container.innerHTML = '<div class="busca-global-vazio"><span class="spinner"></span> Atualizando dados rápidos...</div>';
  input.value = "";
  input.focus();

  await prepararDadosBuscaGlobal();
  if (!buscaGlobalAberta) return;
  renderizarResultadosBuscaGlobal();
}

function fecharBuscaGlobal() {
  const modal = document.getElementById("modal-busca-global");
  if (modal) modal.style.display = "none";
  buscaGlobalAberta = false;
}

function configurarBuscaGlobal() {
  criarModalBuscaGlobal();
  document.getElementById("btn-busca-global")?.addEventListener("click", abrirBuscaGlobal);

  document.addEventListener("keydown", (evento) => {
    const alvo = evento.target;
    if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "k") {
      evento.preventDefault();
      abrirBuscaGlobal();
      return;
    }
    if (evento.key === "Escape" && buscaGlobalAberta) {
      fecharBuscaGlobal();
    }
  });
}
