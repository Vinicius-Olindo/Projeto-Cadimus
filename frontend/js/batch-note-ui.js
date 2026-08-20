// ==========================================
// batch-note-ui.js - Edição em lote e popup de nota
// ==========================================

// --- EDIÇÃO EM LOTE ---
let idsSelecionadosLote = new Set();

// ==========================================
// [17] EDIÇÃO EM LOTE
// ==========================================

function configurarLote() {
  const container = document.getElementById("lista-lancamentos");
  const barra = document.getElementById("lote-barra");
  const contador = document.getElementById("lote-contador");
  const btnAplicar = document.getElementById("lote-btn-aplicar");
  const btnCancelar = document.getElementById("lote-btn-cancelar");
  const selectStatus = document.getElementById("lote-status");
  const selectCategoria = document.getElementById("lote-categoria");

  if (!container || !barra) return;

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
      await carregarLancamentos();
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

// --- POPUP DE NOTA ---
// ==========================================
// [18] POPUP DE NOTA
// ==========================================

function configurarPopupNota() {
  document.addEventListener("click", (e) => {
    const alvo = e.target.closest(".item-nota-clique");
    if (!alvo) return;

    e.preventDefault();
    e.stopPropagation();

    const nota = alvo.dataset.nota;
    const descricao = alvo.dataset.descricao;
    if (!nota) return;

    let popup = document.getElementById("popup-nota");
    if (!popup) {
      popup = document.createElement("div");
      popup.id = "popup-nota";
      popup.className = "popup-nota-overlay";
      popup.innerHTML = `
        <div class="popup-nota-conteudo">
          <div class="popup-nota-header">
            <span class="popup-nota-titulo">Nota</span>
            <button type="button" class="popup-nota-fechar" id="popup-nota-fechar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="popup-nota-descricao" id="popup-nota-descricao"></div>
          <div class="popup-nota-texto" id="popup-nota-texto"></div>
        </div>
      `;
      document.body.appendChild(popup);

      document.getElementById("popup-nota-fechar").addEventListener("click", fecharPopupNota);
      popup.addEventListener("click", (ev) => {
        if (ev.target === popup) fecharPopupNota();
      });
    }

    document.getElementById("popup-nota-descricao").textContent = descricao || "";
    document.getElementById("popup-nota-texto").textContent = nota;
    popup.style.display = "flex";
  });
}

function fecharPopupNota() {
  const popup = document.getElementById("popup-nota");
  if (popup) popup.style.display = "none";
}
