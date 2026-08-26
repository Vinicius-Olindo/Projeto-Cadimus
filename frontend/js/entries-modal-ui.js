// ==========================================
// entries-modal-ui.js - Modal e CRUD de lançamentos
// ==========================================

// ==========================================
// [13] LANÇAMENTOS: Modal, CRUD, Renderização
// ==========================================

// --- CONTROLE DO MODAL DE LANÇAMENTO ---
function fecharModalLancamento() {
  const modal = document.getElementById("modal-lancamento");
  const form = document.getElementById("form-lancamento");
  const campoCategoriaNova = document.getElementById("categoria-nova");
  const atalhos = document.getElementById("lancamento-tipo-rapido");
  const subtitulo = document.getElementById("subtitulo-modal-lancamento");

  modal.style.display = "none";
  liberarFoco();
  form.reset();
  document.getElementById("lancamento-editando-id").value = "";
  document.getElementById("titulo-modal-lancamento").innerText = "Novo lançamento";
  document.getElementById("btn-salvar-lancamento").innerText = "Salvar";
  if (atalhos) atalhos.hidden = false;
  if (subtitulo) {
    subtitulo.hidden = false;
    subtitulo.innerText = "Escolha o tipo de registro e cadastre pelo caminho mais rápido.";
  }
  atalhos?.querySelectorAll("[data-atalho-lancamento]").forEach((btn) => {
    btn.classList.toggle("ativo", btn.dataset.atalhoLancamento === "simples");
  });
  campoCategoriaNova.style.display = "none";
  campoCategoriaNova.required = false;
}

function alternarAtalhosModalLancamento(editando = false) {
  const atalhos = document.getElementById("lancamento-tipo-rapido");
  const subtitulo = document.getElementById("subtitulo-modal-lancamento");
  if (atalhos) atalhos.hidden = editando;
  if (subtitulo) {
    subtitulo.hidden = false;
    subtitulo.innerText = editando
      ? "Atualize os dados deste lançamento."
      : "Escolha o tipo de registro e cadastre pelo caminho mais rápido.";
  }
}

const atalhosFluxoLancamento = [
  {
    tipo: "simples",
    classe: "lancamento-atalho-simples",
    icone: "↕",
    titulo: "Lançamento",
    descricao: "Receita ou despesa única",
  },
  {
    tipo: "parcelada",
    classe: "lancamento-atalho-parcelada",
    icone: "▦",
    titulo: "Parcelada",
    descricao: "Compra em parcelas",
  },
  {
    tipo: "fixa",
    classe: "lancamento-atalho-fixa",
    icone: "↻",
    titulo: "Fixa",
    descricao: "Repete todo mês",
  },
  {
    tipo: "bonificacao",
    classe: "lancamento-atalho-bonificacao",
    icone: "✦",
    titulo: "Bonificação",
    descricao: "Receita recorrente",
  },
];

function montarAtalhosFluxoLancamento(ativo = "simples") {
  return atalhosFluxoLancamento
    .map(
      (atalho) => `
        <button type="button" class="${atalho.tipo === ativo ? "ativo " : ""}lancamento-atalho-card ${atalho.classe}" data-atalho-lancamento="${atalho.tipo}">
          <span class="lancamento-atalho-icone">${atalho.icone}</span>
          <span class="lancamento-atalho-texto">
            <strong>${atalho.titulo}</strong>
            <small>${atalho.descricao}</small>
          </span>
        </button>
      `
    )
    .join("");
}

function atualizarAtalhoFluxoAtivo(container, ativo) {
  container?.querySelectorAll("[data-atalho-lancamento]").forEach((btn) => {
    btn.classList.toggle("ativo", btn.dataset.atalhoLancamento === ativo);
  });
}

function atualizarAtalhosContextuaisLancamento() {
  document.querySelectorAll("[data-atalhos-contextuais-lancamento]").forEach((container) => {
    atualizarAtalhoFluxoAtivo(container, container.dataset.atalhosContextuaisLancamento);
  });
}

function configurarAtalhosContextuaisLancamento() {
  const alvos = [
    { modalId: "modal-compra-parcelada", ativo: "parcelada" },
    { modalId: "modal-despesas-fixas", ativo: "fixa" },
    { modalId: "modal-recorrencia", ativo: "bonificacao" },
  ];

  alvos.forEach(({ modalId, ativo }) => {
    const modal = document.getElementById(modalId);
    const subtitulo = modal?.querySelector(".modal-subtitulo");
    if (!modal || !subtitulo || modal.querySelector("[data-atalhos-contextuais-lancamento]")) return;

    const container = document.createElement("div");
    container.className = "lancamento-tipo-rapido lancamento-tipo-contextual";
    container.setAttribute("data-atalhos-contextuais-lancamento", ativo);
    container.setAttribute("aria-label", "Tipo de lançamento");
    container.innerHTML = montarAtalhosFluxoLancamento(ativo);
    subtitulo.insertAdjacentElement("afterend", container);

    container.addEventListener("click", async (evento) => {
      const botao = evento.target.closest("[data-atalho-lancamento]");
      if (!botao) return;
      evento.preventDefault();
      if (botao.classList.contains("ativo")) return;
      atualizarAtalhoFluxoAtivo(container, botao.dataset.atalhoLancamento);
      await abrirAtalhoLancamentoRapido(botao.dataset.atalhoLancamento);
    });
  });
}

function fecharModaisFluxoLancamento() {
  const modalLancamento = document.getElementById("modal-lancamento");
  if (modalLancamento && modalLancamento.style.display !== "none") {
    fecharModalLancamento();
  }

  ["modal-compra-parcelada", "modal-despesas-fixas", "modal-recorrencia"].forEach((id) => {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = "none";
  });
  atualizarAtalhosContextuaisLancamento();
  liberarFoco();
}

async function abrirModalNovoLancamento() {
  const carteiraAtual = document.getElementById("seletor-carteira").value;
  if (!carteiraAtual) {
    await mostrarAviso("Aguarde suas carteiras carregarem antes de lançar algo.");
    return;
  }

  carregarCategorias();
  await popularSelectCartoesCredito?.(document.getElementById("cartao-credito-lancamento"), carteiraAtual);
  document.getElementById("lancamento-editando-id").value = "";
  document.getElementById("titulo-modal-lancamento").innerText = "Novo lançamento";
  document.getElementById("btn-salvar-lancamento").innerText = "Salvar";
  alternarAtalhosModalLancamento(false);
  document.getElementById("data-compra").valueAsDate = new Date();
  document.getElementById("modal-lancamento").style.display = "flex";
  trapFoco(document.getElementById("modal-lancamento"));
}

async function abrirAtalhoLancamentoRapido(tipo) {
  if (tipo === "simples") {
    fecharModaisFluxoLancamento();
    await abrirModalNovoLancamento();
    return;
  }

  fecharModaisFluxoLancamento();

  if (tipo === "parcelada" && typeof abrirModalComprasParceladas === "function") {
    await abrirModalComprasParceladas();
    return;
  }

  if (tipo === "fixa" && typeof abrirModalDespesasFixas === "function") {
    await abrirModalDespesasFixas();
    return;
  }

  if (tipo === "bonificacao" && typeof abrirModalBonificacao === "function") {
    await abrirModalBonificacao();
    return;
  }

  await mostrarAviso("Esse fluxo ainda não está disponível.");
}

async function editarLancamento(id) {
  const lancamento = ultimoLoteLancamentos.find((l) => l.id === id);
  if (!lancamento) return;

  await popularSelectCategorias(document.getElementById("categoria"));
  adicionarCategoriaAoSelect(lancamento.categoria);

  document.getElementById("lancamento-editando-id").value = lancamento.id;
  document.getElementById("tipo-gasto").value = lancamento.tipo;
  document.getElementById("descricao").value = lancamento.descricao;
  definirValorInputMonetario("valor", valorMonetario(lancamento));
  document.getElementById("data-compra").value = String(lancamento.data_compra).slice(0, 10);
  document.getElementById("categoria").value = lancamento.categoria;
  document.getElementById("meio-pagamento").value = lancamento.meio_pagamento;
  document.getElementById("status-pagamento").value = lancamento.status;
  document.getElementById("nota-lancamento").value = lancamento.nota || "";
  await popularSelectCartoesCredito?.(document.getElementById("cartao-credito-lancamento"), lancamento.carteira_id, lancamento.cartao_credito_id || "");
  document.getElementById("cartao-credito-lancamento").value = lancamento.cartao_credito_id || "";
  document.getElementById("meio-pagamento")?.dispatchEvent(new Event("change"));

  document.getElementById("titulo-modal-lancamento").innerText = "Editar lançamento";
  document.getElementById("btn-salvar-lancamento").innerText = "Salvar edição";
  alternarAtalhosModalLancamento(true);
  document.getElementById("modal-lancamento").style.display = "flex";
  trapFoco(document.getElementById("modal-lancamento"));
}

function configurarModal() {
  const modal = document.getElementById("modal-lancamento");
  const btnNovo = document.getElementById("btn-novo-gasto");
  const btnFechar = document.getElementById("btn-fechar-modal");
  const form = document.getElementById("form-lancamento");
  const selectCategoria = document.getElementById("categoria");
  const campoCategoriaNova = document.getElementById("categoria-nova");
  const atalhosLancamento = document.getElementById("lancamento-tipo-rapido");

  if (!modal || !btnNovo || !btnFechar || !form) return;

  configurarAtalhosContextuaisLancamento();
  configurarCampoCartaoCredito?.({
    campoId: "campo-cartao-lancamento",
    selectId: "cartao-credito-lancamento",
    meioId: "meio-pagamento",
    tipoId: "tipo-gasto",
  });

  selectCategoria?.addEventListener("change", () => {
    const escolheuNova = selectCategoria.value === "__nova__";
    campoCategoriaNova.style.display = escolheuNova ? "block" : "none";
    campoCategoriaNova.required = escolheuNova;
    if (escolheuNova) campoCategoriaNova.focus();
  });

  btnNovo.addEventListener("click", abrirModalNovoLancamento);
  btnFechar.addEventListener("click", fecharModalLancamento);
  atalhosLancamento?.addEventListener("click", async (evento) => {
    const botao = evento.target.closest("[data-atalho-lancamento]");
    if (!botao) return;
    evento.preventDefault();
    if (botao.classList.contains("ativo")) return;
    atalhosLancamento.querySelectorAll("[data-atalho-lancamento]").forEach((item) => item.classList.remove("ativo"));
    botao.classList.add("ativo");
    await abrirAtalhoLancamentoRapido(botao.dataset.atalhoLancamento);
  });

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const idEdicao = document.getElementById("lancamento-editando-id").value;
    const btnSalvar = document.getElementById("btn-salvar-lancamento");
    btnSalvar.innerText = idEdicao ? "Salvando edição..." : "Salvando...";
    btnSalvar.disabled = true;

    try {
      const carteiraId = document.getElementById("seletor-carteira").value;

      // Se o usuário escolheu "+ Nova categoria…", cadastra ela antes de salvar o lançamento
      let nomeCategoria = selectCategoria.value;
      if (nomeCategoria === "__nova__") {
        nomeCategoria = campoCategoriaNova.value.trim();
        if (!nomeCategoria) {
          await mostrarAviso("Digite o nome da nova categoria.");
          btnSalvar.innerText = idEdicao ? "Salvar edição" : "Salvar";
          btnSalvar.disabled = false;
          return;
        }

        const respostaCategoria = await CadimusAdminApi.criarCategoria(nomeCategoria);

        if (tratarSessaoExpirada(respostaCategoria)) return;

        if (!respostaCategoria.ok) {
          const erro = await respostaCategoria.json();
          await mostrarAviso(obterMensagemErroApi(erro, "Não foi possível cadastrar esta categoria agora."));
          btnSalvar.innerText = idEdicao ? "Salvar edição" : "Salvar";
          btnSalvar.disabled = false;
          return;
        }

        const categoriaCriada = await respostaCategoria.json();
        nomeCategoria = categoriaCriada.nome; // usa o nome já normalizado pelo servidor
        adicionarCategoriaAoSelect(nomeCategoria);
      }

      const valorPayload = montarPayloadMonetario("valor");
      const pacoteDados = {
        tipo: document.getElementById("tipo-gasto").value,
        descricao: document.getElementById("descricao").value,
        valor: valorPayload.valor,
        valor_centavos: valorPayload.valor_centavos,
        data_compra: document.getElementById("data-compra").value,
        categoria: nomeCategoria,
        meio_pagamento: document.getElementById("meio-pagamento").value,
        status: document.getElementById("status-pagamento").value,
        carteira_id: carteiraId,
        nota: document.getElementById("nota-lancamento").value.trim(),
        cartao_credito_id: document.getElementById("cartao-credito-lancamento")?.value || null,
      };

      // Verificar orçamento antes de salvar (apenas para despesas novas)
      if (!idEdicao && pacoteDados.tipo === "despesa" && pacoteDados.status === "pago") {
        const orcamento = orcamentosCarregados.find(
          (o) => o.categoria.toLowerCase() === pacoteDados.categoria.toLowerCase()
        );
        if (orcamento && valorMonetario(orcamento, "total_gasto") + pacoteDados.valor > valorMonetario(orcamento)) {
          const excedente = formatadorBRL.format(valorMonetario(orcamento, "total_gasto") + pacoteDados.valor - valorMonetario(orcamento));
          const confirmado = await pedirConfirmacao(
            `Atenção: este lançamento excederá o orçamento de ${pacoteDados.categoria} em ${excedente}.\n\nDeseja salvar mesmo assim?`,
            { textoConfirmar: "Salvar assim mesmo" }
          );
          if (!confirmado) {
            btnSalvar.innerText = "Salvar";
            btnSalvar.disabled = false;
            return;
          }
        }
      }

      const resposta = await CadimusEntriesApi.salvar(pacoteDados, idEdicao || null);

      if (tratarSessaoExpirada(resposta)) return;

      if (resposta.ok) {
        fecharModalLancamento();
        await recarregarLancamentosAposMutacao();
        mostrarToast(idEdicao ? "Lançamento atualizado" : "Lançamento salvo");
      } else {
        const erro = await resposta.json();
        await mostrarAviso(obterMensagemErroApi(erro, "Não foi possível salvar este lançamento agora."));
      }
    } catch (erro) {
      console.error(erro);
      await mostrarAviso("Falha na comunicação com o servidor.");
    } finally {
      btnSalvar.innerText = idEdicao ? "Salvar edição" : "Salvar";
      btnSalvar.disabled = false;
    }
  });
}
