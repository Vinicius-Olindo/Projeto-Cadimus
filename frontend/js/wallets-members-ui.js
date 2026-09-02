// ==========================================
// wallets-members-ui.js - Membros de carteiras compartilhadas
// ==========================================

async function abrirModalGerenciarMembros(carteira) {
  const modal = document.getElementById("modal-gerenciar-membros");
  const lista = document.getElementById("lista-gerenciar-membros");
  const campoMembros = document.getElementById("campo-gerenciar-membros");
  const btnSalvarMembros = document.getElementById("btn-salvar-membros");
  const titulo = document.getElementById("titulo-gerenciar-membros");
  const inputCarteiraId = document.getElementById("gerenciar-membros-carteira-id");
  const btnExcluirCarteira = document.getElementById("btn-excluir-carteira");

  if (!modal || !lista || !campoMembros || !btnSalvarMembros || !titulo || !inputCarteiraId || !btnExcluirCarteira) {
    mostrarToast("Configuração de carteira indisponível nesta tela.", "info");
    return;
  }
  if (!carteira || carteira.papel !== "admin") {
    mostrarToast("Você não pode configurar esta carteira.", "info");
    return;
  }

  titulo.innerText = `Configurações de "${carteira.nome}"`;
  inputCarteiraId.value = carteira.id;
  btnExcluirCarteira.dataset.nome = carteira.nome;
  modal.style.display = "flex";
  trapFoco(modal);

  // Carteira individual não tem com quem compartilhar — só mostra a zona de excluir
  if (carteira.tipo !== "compartilhada") {
    campoMembros.style.display = "none";
    btnSalvarMembros.style.display = "none";
    return;
  }
  campoMembros.style.display = "";
  btnSalvarMembros.style.display = "";
  lista.innerHTML = `<span class="dica-campo">Carregando...</span>`;

  try {
    const [respostaMembros, respostaColegas] = await Promise.all([
      CadimusWalletsApi.listarMembros(carteira.id),
      CadimusWalletsApi.listarColegas(),
    ]);

    if (tratarSessaoExpirada(respostaMembros) || tratarSessaoExpirada(respostaColegas)) return;

    const dadosMembros = await respostaMembros.json();
    const colegas = await respostaColegas.json();

    if (!respostaMembros.ok) {
      lista.innerHTML = `<span class="dica-campo">${dadosMembros.erro || "Erro ao carregar membros."}</span>`;
      return;
    }

    const idsAtuais = new Set(dadosMembros.membros.map((m) => m.id));
    const idsAdmins = new Set(dadosMembros.membros.filter((m) => m.papel === "admin").map((m) => m.id));

    if (colegas.length === 0) {
      lista.innerHTML = `<span class="dica-campo">Não há outros usuários cadastrados ainda.</span>`;
      return;
    }

    lista.innerHTML = colegas
      .map((colega) => {
        const jaAdmin = idsAdmins.has(colega.id);
        const marcado = idsAtuais.has(colega.id);
        const nome = colega.nome || colega.nome_usuario || "Usuário";
        const papel = jaAdmin ? "Admin" : marcado ? "Membro" : "Sem acesso";
        const descricaoPapel = jaAdmin
          ? "Controle total da carteira"
          : marcado
            ? "Pode acompanhar e lançar"
            : "Marque para compartilhar";
        return `
          <label class="opcao-membro opcao-membro-card ${jaAdmin ? "opcao-membro-desabilitada" : ""}">
            <input type="checkbox" class="checkbox-gerenciar-membro" value="${colega.id}" ${marcado ? "checked" : ""} ${jaAdmin ? "disabled" : ""} />
            <span class="opcao-membro-info">
              <strong>${escaparHtml(nome)}</strong>
              <small>${descricaoPapel}</small>
            </span>
            <span class="opcao-membro-papel ${jaAdmin ? "opcao-membro-papel-admin" : marcado ? "opcao-membro-papel-membro" : ""}">${papel}</span>
          </label>
        `;
      })
      .join("");
  } catch (erro) {
    lista.innerHTML = `<span class="dica-campo">Falha na comunicação com o servidor.</span>`;
  }
}

function configurarModalGerenciarMembros() {
  const modal = document.getElementById("modal-gerenciar-membros");
  const btnFechar = document.getElementById("btn-fechar-modal-membros");
  const btnSalvar = document.getElementById("btn-salvar-membros");
  const btnExcluir = document.getElementById("btn-excluir-carteira");

  if (!modal || !btnFechar || !btnSalvar || !btnExcluir) return;

  btnFechar.addEventListener("click", () => {
    modal.style.display = "none";
    liberarFoco();
  });

  btnExcluir.addEventListener("click", async () => {
    const carteiraId = document.getElementById("gerenciar-membros-carteira-id").value;
    const nome = btnExcluir.dataset.nome || "esta carteira";
    if (!carteiraId) return;

    const confirmou = await pedirConfirmacao(
      `Excluir "${nome}"? Todos os lançamentos, transferências, orçamentos, cartões, recorrências, despesas fixas e metas dela serão apagados para sempre.`,
      { textoConfirmar: "Excluir", perigo: true },
    );
    if (!confirmou) return;

    btnExcluir.disabled = true;
    btnExcluir.innerText = "Excluindo...";

    try {
      const resposta = await CadimusWalletsApi.excluirCarteira(carteiraId);

      if (tratarSessaoExpirada(resposta)) return;

      if (resposta.ok) {
        modal.style.display = "none";
        liberarFoco();
        carteirasDoUsuario = await (await CadimusWalletsApi.listarCarteiras()).json();
        renderizarTabsCarteira();
        mostrarToast("Carteira excluída", "info");
      } else {
        const erro = await resposta.json();
        await mostrarAviso(`Erro: ${erro.erro}`);
      }
    } catch (erro) {
      await mostrarAviso("Falha na comunicação com o servidor.");
    } finally {
      btnExcluir.disabled = false;
      btnExcluir.innerText = "Excluir esta carteira";
    }
  });

  btnSalvar.addEventListener("click", async () => {
    const carteiraId = document.getElementById("gerenciar-membros-carteira-id").value;
    if (!carteiraId) return;

    const membros = Array.from(document.querySelectorAll(".checkbox-gerenciar-membro:checked:not(:disabled)")).map((chk) => Number(chk.value));

    btnSalvar.disabled = true;
    btnSalvar.innerText = "Salvando...";

    try {
      const resposta = await CadimusWalletsApi.atualizarMembros(carteiraId, membros);

      if (tratarSessaoExpirada(resposta)) return;

      if (resposta.ok) {
        modal.style.display = "none";
        liberarFoco();
        mostrarToast("Membros atualizados");
      } else {
        const erro = await resposta.json();
        await mostrarAviso(`Erro: ${erro.erro}`);
      }
    } catch (erro) {
      await mostrarAviso("Falha na comunicação com o servidor.");
    } finally {
      btnSalvar.disabled = false;
      btnSalvar.innerText = "Salvar";
    }
  });
}
