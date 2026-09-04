// ==========================================
// batch-selection-ui.js - Edição em lote de lançamentos
// ==========================================

let idsSelecionadosLote = new Set();
let loteConfigurado = false;

function configurarLote() {
  if (loteConfigurado) return;

  const container = document.getElementById("lista-lancamentos");
  const barra = document.getElementById("lote-barra");
  const btnAplicar = document.getElementById("lote-btn-aplicar");
  const btnCancelar = document.getElementById("lote-btn-cancelar");
  const selectStatus = document.getElementById("lote-status");
  const selectCategoria = document.getElementById("lote-categoria");

  if (!container || !barra) return;
  loteConfigurado = true;

  container.addEventListener("change", (e) => {
    if (!e.target.classList.contains("lote-check")) return;
    const id = Number(e.target.dataset.id);
    const linha = e.target.closest(".linha-item");

    if (e.target.checked) {
      idsSelecionadosLote.add(id);
      linha?.classList.add("selecionada");
    } else {
      idsSelecionadosLote.delete(id);
      linha?.classList.remove("selecionada");
    }

    atualizarBarraLote();
  });

  btnCancelar?.addEventListener("click", limparSelecaoLote);

  btnAplicar?.addEventListener("click", async () => {
    const novoStatus = selectStatus.value;
    const novaCategoria = selectCategoria.value;

    if (!novoStatus && !novaCategoria) {
      await mostrarAviso("Selecione ao menos uma ação (status ou categoria).");
      return;
    }

    btnAplicar.disabled = true;
    btnAplicar.textContent = "Aplicando...";

    try {
      const corpo = { ids: Array.from(idsSelecionadosLote) };
      if (novoStatus) corpo.status = novoStatus;
      if (novaCategoria) corpo.categoria = novaCategoria;

      const resposta = await CadimusEntriesApi.atualizarEmLote(corpo);

      if (tratarSessaoExpirada(resposta)) return;

      const resultado = await resposta.json();

      if (!resposta.ok) {
        await mostrarAviso(resultado.erro || "Erro ao atualizar.");
        return;
      }

      mostrarToast(resultado.mensagem || "Lançamentos atualizados!", "sucesso");
      limparSelecaoLote();
      if (typeof atualizarDashboardAposMudanca === "function") {
        atualizarDashboardAposMudanca({
          tipo: "lote",
          recarregarLista: true,
          entidadesAfetadas: ["bonificacoes", "orcamentos", "metas", "cartoes"],
        });
      } else {
        await recarregarLancamentosAposMutacao();
      }
    } catch (erro) {
      await mostrarAviso("Erro de conexão ao atualizar em lote.");
    } finally {
      btnAplicar.disabled = false;
      btnAplicar.textContent = "Aplicar";
      selectStatus.value = "";
      selectCategoria.value = "";
    }
  });
}

function atualizarBarraLote() {
  const barra = document.getElementById("lote-barra");
  const contador = document.getElementById("lote-contador");
  if (!barra || !contador) return;

  const qtd = idsSelecionadosLote.size;
  barra.style.display = qtd > 0 ? "flex" : "none";
  contador.textContent = `${qtd} selecionado${qtd !== 1 ? "s" : ""}`;
}

function limparSelecaoLote() {
  idsSelecionadosLote.clear();
  document.querySelectorAll(".lote-check").forEach((ck) => {
    ck.checked = false;
    ck.closest(".linha-item")?.classList.remove("selecionada");
  });
  atualizarBarraLote();
}

function popularSelectLoteCategorias() {
  const select = document.getElementById("lote-categoria");
  if (!select) return;

  const categorias = new Set(ultimoLoteLancamentos.map((l) => l.categoria));
  select.querySelectorAll("option[data-cat-lote]").forEach((op) => op.remove());

  Array.from(categorias).sort().forEach((cat) => {
    const opcao = document.createElement("option");
    opcao.value = cat;
    opcao.textContent = cat;
    opcao.dataset.catLote = "true";
    select.appendChild(opcao);
  });
}
