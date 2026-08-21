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

  modal.style.display = "none";
  liberarFoco();
  form.reset();
  document.getElementById("lancamento-editando-id").value = "";
  document.getElementById("titulo-modal-lancamento").innerText = "Novo lançamento";
  document.getElementById("btn-salvar-lancamento").innerText = "Salvar";
  campoCategoriaNova.style.display = "none";
  campoCategoriaNova.required = false;
}

async function abrirModalNovoLancamento() {
  const carteiraAtual = document.getElementById("seletor-carteira").value;
  if (!carteiraAtual) {
    await mostrarAviso("Aguarde suas carteiras carregarem antes de lançar algo.");
    return;
  }

  carregarCategorias();
  document.getElementById("lancamento-editando-id").value = "";
  document.getElementById("titulo-modal-lancamento").innerText = "Novo lançamento";
  document.getElementById("btn-salvar-lancamento").innerText = "Salvar";
  document.getElementById("data-compra").valueAsDate = new Date();
  document.getElementById("modal-lancamento").style.display = "flex";
  trapFoco(document.getElementById("modal-lancamento"));
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

  document.getElementById("titulo-modal-lancamento").innerText = "Editar lançamento";
  document.getElementById("btn-salvar-lancamento").innerText = "Salvar edição";
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

  if (!modal || !btnNovo || !btnFechar || !form) return;

  selectCategoria?.addEventListener("change", () => {
    const escolheuNova = selectCategoria.value === "__nova__";
    campoCategoriaNova.style.display = escolheuNova ? "block" : "none";
    campoCategoriaNova.required = escolheuNova;
    if (escolheuNova) campoCategoriaNova.focus();
  });

  btnNovo.addEventListener("click", abrirModalNovoLancamento);
  btnFechar.addEventListener("click", fecharModalLancamento);

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
          await mostrarAviso(`Erro ao cadastrar categoria: ${erro.erro}`);
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
        carregarLancamentos();
        mostrarToast(idEdicao ? "Lançamento atualizado" : "Lançamento salvo");
      } else {
        const erro = await resposta.json();
        await mostrarAviso(`Erro ao salvar: ${erro.erro}`);
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
