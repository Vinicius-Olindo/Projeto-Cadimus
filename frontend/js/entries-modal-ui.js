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
  const sugestaoCategoria = document.getElementById("sugestao-categoria-lancamento");

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
  if (sugestaoCategoria) sugestaoCategoria.hidden = true;
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
  document.getElementById("form-lancamento")?.reset();
  await popularSelectCartoesCredito?.(document.getElementById("cartao-credito-lancamento"), carteiraAtual);
  document.getElementById("lancamento-editando-id").value = "";
  document.getElementById("titulo-modal-lancamento").innerText = "Novo lançamento";
  document.getElementById("btn-salvar-lancamento").innerText = "Salvar";
  alternarAtalhosModalLancamento(false);
  document.getElementById("data-compra").valueAsDate = new Date();
  atualizarSugestaoCategoriaLancamento();
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

  await preencherModalLancamento(lancamento, { modo: "editar" });
}

function obterDataLocalISOHoje() {
  const hoje = new Date();
  return [
    hoje.getFullYear(),
    String(hoje.getMonth() + 1).padStart(2, "0"),
    String(hoje.getDate()).padStart(2, "0"),
  ].join("-");
}

function validarAnexoLancamentoNoCliente(url) {
  const texto = String(url || "").trim();
  if (!texto) return true;
  try {
    return new URL(texto).protocol === "https:";
  } catch {
    return false;
  }
}

function obterDescricaoCopiaLancamento(descricao) {
  const texto = String(descricao || "").trim();
  return /\s-\sC[ÓO]PIA$/i.test(texto) ? texto : `${texto} - CÓPIA`;
}

function normalizarTextoSugestaoCategoria(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function encontrarSugestaoCategoriaLancamento(descricao) {
  const termo = normalizarTextoSugestaoCategoria(descricao);
  if (termo.length < 3 || !Array.isArray(ultimoLoteLancamentos)) return null;

  const palavras = termo.split(" ").filter((palavra) => palavra.length >= 3);
  const candidatos = new Map();

  ultimoLoteLancamentos.forEach((lancamento) => {
    const descricaoHistorica = normalizarTextoSugestaoCategoria(lancamento.descricao);
    const categoria = String(lancamento.categoria || "").trim();
    if (!descricaoHistorica || !categoria) return;

    const contemTexto = descricaoHistorica.includes(termo) || termo.includes(descricaoHistorica);
    const palavrasEmComum = palavras.filter((palavra) => descricaoHistorica.includes(palavra)).length;
    if (!contemTexto && palavrasEmComum === 0) return;

    const atual = candidatos.get(categoria) || { categoria, usos: 0, pontos: 0, exemplo: lancamento.descricao || "" };
    atual.usos += 1;
    atual.pontos += (contemTexto ? 4 : 0) + palavrasEmComum;
    candidatos.set(categoria, atual);
  });

  return [...candidatos.values()].sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos;
    return b.usos - a.usos;
  })[0] || null;
}

function sugestaoCategoriaPodeSerAutomatica(sugestao) {
  return Boolean(sugestao && sugestao.usos >= 2 && sugestao.pontos >= 6);
}

function atualizarSugestaoCategoriaLancamento() {
  const campoDescricao = document.getElementById("descricao");
  const campoCategoria = document.getElementById("categoria");
  const botao = document.getElementById("sugestao-categoria-lancamento");
  if (!campoDescricao || !campoCategoria || !botao) return;

  const sugestao = encontrarSugestaoCategoriaLancamento(campoDescricao.value);
  const categoriaAtual = String(campoCategoria.value || "").trim().toLowerCase();
  if (!sugestao || categoriaAtual === sugestao.categoria.toLowerCase()) {
    botao.hidden = true;
    botao.dataset.categoria = "";
    return;
  }

  if (!categoriaAtual && sugestaoCategoriaPodeSerAutomatica(sugestao)) {
    adicionarCategoriaAoSelect(sugestao.categoria);
    campoCategoria.value = sugestao.categoria;
    botao.hidden = false;
    botao.dataset.categoria = sugestao.categoria;
    botao.innerHTML = `Categoria aplicada: <strong>${escaparHtml(sugestao.categoria)}</strong> <span>Alterar se precisar</span>`;
    return;
  }

  botao.hidden = false;
  botao.dataset.categoria = sugestao.categoria;
  botao.innerHTML = `Categoria provável: <strong>${escaparHtml(sugestao.categoria)}</strong> <span>Aplicar</span>`;
}

async function preencherModalLancamento(lancamento, { modo = "editar" } = {}) {
  await popularSelectCategorias(document.getElementById("categoria"));
  adicionarCategoriaAoSelect(lancamento.categoria);

  const duplicando = modo === "duplicar";
  document.getElementById("form-lancamento")?.reset();
  document.getElementById("lancamento-editando-id").value = duplicando ? "" : lancamento.id;
  document.getElementById("tipo-gasto").value = lancamento.tipo;
  document.getElementById("descricao").value = duplicando ? obterDescricaoCopiaLancamento(lancamento.descricao) : lancamento.descricao;
  definirValorInputMonetario("valor", valorMonetario(lancamento));
  document.getElementById("data-compra").value = duplicando ? obterDataLocalISOHoje() : String(lancamento.data_compra).slice(0, 10);
  document.getElementById("categoria").value = lancamento.categoria;
  document.getElementById("meio-pagamento").value = lancamento.meio_pagamento;
  document.getElementById("status-pagamento").value = lancamento.status;
  document.getElementById("nota-lancamento").value = lancamento.nota || "";
  document.getElementById("anexo-url-lancamento").value = lancamento.anexo_url || "";
  document.getElementById("anexo-nome-lancamento").value = lancamento.anexo_nome || "";
  await popularSelectCartoesCredito?.(document.getElementById("cartao-credito-lancamento"), lancamento.carteira_id, lancamento.cartao_credito_id || "");
  document.getElementById("cartao-credito-lancamento").value = lancamento.cartao_credito_id || "";
  document.getElementById("meio-pagamento")?.dispatchEvent(new Event("change"));
  atualizarSugestaoCategoriaLancamento();

  document.getElementById("titulo-modal-lancamento").innerText = duplicando ? "Duplicar lançamento" : "Editar lançamento";
  document.getElementById("btn-salvar-lancamento").innerText = duplicando ? "Salvar cópia" : "Salvar edição";
  alternarAtalhosModalLancamento(true);
  const subtitulo = document.getElementById("subtitulo-modal-lancamento");
  if (subtitulo && duplicando) {
    subtitulo.innerText = "Revise data, valor ou carteira antes de salvar a cópia.";
  }
  document.getElementById("modal-lancamento").style.display = "flex";
  trapFoco(document.getElementById("modal-lancamento"));
}

async function abrirModalModeloLancamento(modelo = {}) {
  const carteiraAtual = document.getElementById("seletor-carteira").value;
  if (!carteiraAtual) {
    await mostrarAviso("Aguarde suas carteiras carregarem antes de lançar algo.");
    return;
  }

  await popularSelectCategorias(document.getElementById("categoria"));
  adicionarCategoriaAoSelect(modelo.categoria);
  document.getElementById("form-lancamento")?.reset();
  await popularSelectCartoesCredito?.(document.getElementById("cartao-credito-lancamento"), carteiraAtual, modelo.cartao_credito_id || "");
  document.getElementById("lancamento-editando-id").value = "";
  document.getElementById("tipo-gasto").value = modelo.tipo || "despesa";
  document.getElementById("descricao").value = modelo.descricao || "";
  definirValorInputMonetario("valor", valorMonetario(modelo));
  document.getElementById("data-compra").valueAsDate = new Date();
  document.getElementById("categoria").value = modelo.categoria || "";
  document.getElementById("meio-pagamento").value = modelo.meio_pagamento || "pix";
  document.getElementById("status-pagamento").value = modelo.status || "pendente";
  document.getElementById("nota-lancamento").value = modelo.nota || "";
  document.getElementById("anexo-url-lancamento").value = "";
  document.getElementById("anexo-nome-lancamento").value = "";
  document.getElementById("cartao-credito-lancamento").value = modelo.cartao_credito_id || "";
  document.getElementById("meio-pagamento")?.dispatchEvent(new Event("change"));
  atualizarSugestaoCategoriaLancamento();
  document.getElementById("titulo-modal-lancamento").innerText = "Novo pelo modelo";
  document.getElementById("btn-salvar-lancamento").innerText = "Salvar lançamento";
  alternarAtalhosModalLancamento(true);
  const subtitulo = document.getElementById("subtitulo-modal-lancamento");
  if (subtitulo) subtitulo.innerText = "Modelo preenchido. Revise data, valor e carteira antes de salvar.";
  document.getElementById("modal-lancamento").style.display = "flex";
  trapFoco(document.getElementById("modal-lancamento"));
}

async function duplicarLancamento(id) {
  const lancamento = ultimoLoteLancamentos.find((l) => l.id === id);
  if (!lancamento) return;

  await preencherModalLancamento(lancamento, { modo: "duplicar" });
}

function configurarModal() {
  const modal = document.getElementById("modal-lancamento");
  const btnNovo = document.getElementById("btn-novo-gasto");
  const btnFechar = document.getElementById("btn-fechar-modal");
  const form = document.getElementById("form-lancamento");
  const selectCategoria = document.getElementById("categoria");
  const campoDescricao = document.getElementById("descricao");
  const sugestaoCategoria = document.getElementById("sugestao-categoria-lancamento");
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
    atualizarSugestaoCategoriaLancamento();
  });

  campoDescricao?.addEventListener("input", atualizarSugestaoCategoriaLancamento);
  sugestaoCategoria?.addEventListener("click", () => {
    const categoria = sugestaoCategoria.dataset.categoria;
    if (!categoria) return;
    adicionarCategoriaAoSelect(categoria);
    selectCategoria.value = categoria;
    campoCategoriaNova.style.display = "none";
    campoCategoriaNova.required = false;
    sugestaoCategoria.hidden = true;
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
        anexo_url: document.getElementById("anexo-url-lancamento")?.value.trim() || null,
        anexo_nome: document.getElementById("anexo-nome-lancamento")?.value.trim() || null,
        cartao_credito_id: document.getElementById("cartao-credito-lancamento")?.value || null,
      };

      if (!validarAnexoLancamentoNoCliente(pacoteDados.anexo_url)) {
        await mostrarAviso("O link do anexo precisa ser uma URL válida começando com https://.");
        btnSalvar.innerText = idEdicao ? "Salvar edição" : "Salvar";
        btnSalvar.disabled = false;
        return;
      }

      if (typeof validarCartaoCreditoObrigatorio === "function" && !validarCartaoCreditoObrigatorio({
        meioId: "meio-pagamento",
        tipoId: "tipo-gasto",
        selectId: "cartao-credito-lancamento",
        mensagem: "Selecione o cartão usado neste lançamento.",
      })) {
        btnSalvar.innerText = idEdicao ? "Salvar edição" : "Salvar";
        btnSalvar.disabled = false;
        return;
      }

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
        const resultado = await resposta.clone().json().catch(() => null);
        fecharModalLancamento();
        if (resultado?.lancamento && typeof atualizarDashboardAposMudanca === "function") {
          atualizarDashboardAposMudanca({
            tipo: "lancamento",
            acao: idEdicao ? "editar" : "criar",
            lancamento: resultado.lancamento,
            resetarPagina: !idEdicao,
          });
        } else if (resultado?.lancamento && typeof aplicarLancamentoAtualizadoLocalmente === "function") {
          aplicarLancamentoAtualizadoLocalmente(resultado.lancamento, { resetarPagina: !idEdicao });
        } else {
          await recarregarLancamentosAposMutacao();
        }
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
