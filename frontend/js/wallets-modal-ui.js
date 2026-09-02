// ==========================================
// wallets-modal-ui.js - Modal de criação de carteiras
// ==========================================

function abrirModalCarteira() {
  const modal = document.getElementById("modal-carteira");
  if (modal) {
    modal.style.display = "flex";
    trapFoco(modal);
  }
}

function configurarModalCarteira() {
  const modal = document.getElementById("modal-carteira");
  const btnFechar = document.getElementById("btn-fechar-modal-carteira");
  const form = document.getElementById("form-carteira");
  const selectTipo = document.getElementById("tipo-carteira");
  const campoMembros = document.getElementById("campo-membros-carteira");
  const listaMembros = document.getElementById("lista-membros-carteira");

  if (!modal || !btnFechar || !form) return;

  async function atualizarListaMembros() {
    if (selectTipo.value !== "compartilhada") {
      campoMembros.style.display = "none";
      return;
    }

    campoMembros.style.display = "block";
    listaMembros.innerHTML = `<span class="dica-campo">Carregando...</span>`;

    try {
      const resposta = await CadimusWalletsApi.listarColegas();
      if (tratarSessaoExpirada(resposta)) return;
      const colegas = await resposta.json();

      if (colegas.length === 0) {
        listaMembros.innerHTML = `<span class="dica-campo">Não há outros usuários cadastrados ainda.</span>`;
        return;
      }

      // Vem pré-marcado pra manter a conveniência de quem sempre compartilhou
      // com todo mundo — mas agora dá pra desmarcar quem não deve ter acesso.
      listaMembros.innerHTML = colegas
        .map(
          (colega) => `
        <label class="opcao-membro">
          <input type="checkbox" class="checkbox-membro-carteira" value="${colega.id}" checked />
          ${escaparHtml(colega.nome || colega.nome_usuario)}
        </label>
      `,
        )
        .join("");
    } catch (erro) {
      listaMembros.innerHTML = `<span class="dica-campo">Não foi possível carregar a lista de usuários.</span>`;
    }
  }

  selectTipo?.addEventListener("change", atualizarListaMembros);

  btnFechar.addEventListener("click", () => {
    modal.style.display = "none";
    liberarFoco();
    form.reset();
    campoMembros.style.display = "none";
  });

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const btnSalvar = document.getElementById("btn-salvar-carteira");
    btnSalvar.innerText = "Criando...";
    btnSalvar.disabled = true;

    try {
      const nome = document.getElementById("nome-carteira").value.trim();
      const tipo = document.getElementById("tipo-carteira").value;
      const corpo = { nome, tipo };

      if (tipo === "compartilhada") {
        corpo.membros = Array.from(document.querySelectorAll(".checkbox-membro-carteira:checked")).map((chk) => Number(chk.value));
      }

      const resposta = await CadimusWalletsApi.criarCarteira(corpo);

      if (tratarSessaoExpirada(resposta)) return;

      if (resposta.ok) {
        const novaCarteira = await resposta.json();
        modal.style.display = "none";
        form.reset();
        campoMembros.style.display = "none";
        await carregarCarteiras();
        selecionarCarteira(novaCarteira.id);
        mostrarToast("Carteira criada");
      } else {
        const erro = await resposta.json();
        await mostrarAviso(`Erro ao criar carteira: ${erro.erro}`);
      }
    } catch (erro) {
      console.error(erro);
      await mostrarAviso("Falha na comunicação com o servidor.");
    } finally {
      btnSalvar.innerText = "Criar carteira";
      btnSalvar.disabled = false;
    }
  });
}

