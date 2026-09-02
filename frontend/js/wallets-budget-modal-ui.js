// ==========================================
// wallets-budget-modal-ui.js - Modal de orçamento mensal
// ==========================================

function configurarModalOrcamento() {
  const modal = document.getElementById("modal-orcamento");
  const btnFechar = document.getElementById("btn-fechar-modal-orcamento");
  const form = document.getElementById("form-orcamento");
  const selectCategoria = document.getElementById("orcamento-categoria");

  if (!modal || !btnFechar || !form) return;

  // Preencher select de categorias
  async function carregarCategorias() {
    try {
      const resposta = await CadimusAdminApi.listarCategorias();
      if (tratarSessaoExpirada(resposta)) return;
      const categorias = await resposta.json();

      const categoriasDespesa = categorias.filter((c) => c.tipo === "despesa" || !c.tipo);
      selectCategoria.innerHTML = `<option value="" disabled selected>Selecionar categoria</option>`;
      categoriasDespesa.forEach((c) => {
        selectCategoria.innerHTML += `<option value="${escaparHtml(c.nome)}">${escaparHtml(c.nome)}</option>`;
      });
    } catch (erro) {
      console.error("Erro ao carregar categorias:", erro);
    }
  }

  // Abrir modal
  function abrirModalOrcamento(opcoes = {}) {
    const categoriaSelecionada = typeof opcoes.categoria === "string" ? opcoes.categoria : "";
    const selecionarCategoria = () => {
      if (categoriaSelecionada && selectCategoria) {
        selectCategoria.value = categoriaSelecionada;
      }
    };
    Promise.resolve(carregarCategorias()).finally(selecionarCategoria);
    const agora = new Date();
    const mes = Number(opcoes.mes) || agora.getMonth() + 1;
    const ano = Number(opcoes.ano) || agora.getFullYear();
    document.getElementById("orcamento-mes").value = mes;
    document.getElementById("orcamento-ano").value = ano;
    document.getElementById("orcamento-editando-id").value = "";
    document.getElementById("titulo-modal-orcamento").innerText = "Novo orçamento";
    selecionarCategoria();
    modal.style.display = "flex";
    trapFoco(modal);
  }

  // Expor globalmente
  window.abrirModalOrcamento = abrirModalOrcamento;

  // Fechar modal
  btnFechar.addEventListener("click", () => {
    modal.style.display = "none";
    liberarFoco();
    form.reset();
  });

  // Submeter orçamento
  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const btnSalvar = document.getElementById("btn-salvar-orcamento");
    btnSalvar.innerText = "Salvando...";
    btnSalvar.disabled = true;

    try {
      const categoria = selectCategoria.value;
      const valorPayload = montarPayloadMonetario("orcamento-valor");
      const valor = valorPayload.valor;
      const mes = parseInt(document.getElementById("orcamento-mes").value);
      const ano = parseInt(document.getElementById("orcamento-ano").value);
      const carteiraId = document.getElementById("seletor-carteira").value;

      if (!categoria || !valor || !mes || !ano || !carteiraId) {
        await mostrarAviso("Preencha todos os campos.");
        return;
      }

      if (valor < 0) {
        await mostrarAviso("O valor não pode ser negativo.");
        return;
      }

      const resposta = await CadimusBudgetsApi.salvar({
        categoria,
        valor,
        valor_centavos: valorPayload.valor_centavos,
        mes,
        ano,
        carteira_id: Number(carteiraId),
      });

      if (tratarSessaoExpirada(resposta)) return;

      if (resposta.ok) {
        const resultado = await resposta.clone().json().catch(() => null);
        modal.style.display = "none";
        liberarFoco();
        form.reset();
        if (resultado?.orcamento && typeof atualizarOrcamentoNoCard === "function") {
          atualizarOrcamentoNoCard(resultado.orcamento);
        } else if (typeof carregarOrcamentos === "function") {
          carregarOrcamentos();
        }
        if (typeof atualizarPlanejamentoVisivel === "function") {
          atualizarPlanejamentoVisivel({ forcarRender: true });
        }
        mostrarToast("Orçamento salvo com sucesso!");
      } else {
        const erro = await resposta.json();
        await mostrarAviso(`Erro: ${erro.erro}`);
      }
    } catch (erro) {
      await mostrarAviso("Falha na comunicação com o servidor.");
    } finally {
      btnSalvar.innerText = "Salvar orçamento";
      btnSalvar.disabled = false;
    }
  });
}

