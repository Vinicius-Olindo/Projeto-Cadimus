// ==========================================
// admin-categories-ui.js - Categorias do admin
// ==========================================
// --- PAINEL: CATEGORIAS (admin) ---
function configurarFormularioCategoria() {
  const form = document.getElementById("form-nova-categoria");
  if (!form) return;

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const campo = document.getElementById("nome-nova-categoria");
    const nome = campo.value.trim();
    if (!nome) return;

    const btn = form.querySelector("button");
    btn.disabled = true;
    btn.innerText = "Adicionando...";

    try {
      const resposta = await CadimusAdminApi.criarCategoria(nome);

      if (tratarSessaoExpirada(resposta)) return;

      if (resposta.ok) {
        form.reset();
        carregarListaCategorias();
        mostrarToast("Categoria criada");
      } else {
        const erro = await resposta.json();
        await mostrarAviso(`Erro: ${erro.erro}`);
      }
    } catch (erro) {
      await mostrarAviso("Erro de conexão ao cadastrar categoria.");
    } finally {
      btn.disabled = false;
      btn.innerText = "Adicionar";
    }
  });
}

async function carregarListaCategorias() {
  const container = document.getElementById("lista-categorias");
  const badge = document.getElementById("badge-categorias");
  const campoBusca = document.getElementById("busca-categorias");
  if (!container) return;

  container.innerHTML = '<div class="estado-vazio-admin"><div class="icone-vazio">🏷️</div><p>Carregando categorias...</p></div>';

  try {
    const resposta = await CadimusAdminApi.listarCategorias();
    if (tratarSessaoExpirada(resposta)) return;
    const categorias = await resposta.json();

    if (badge) badge.textContent = categorias.length;
    container.innerHTML = "";

    if (categorias.length === 0) {
      container.innerHTML = '<div class="estado-vazio-admin"><div class="icone-vazio">🏷️</div><p>Nenhuma categoria cadastrada.<br>Crie a primeira acima.</p></div>';
      return;
    }

    function renderizarListaCategorias(filtro) {
      container.innerHTML = "";
      const termo = (filtro || "").toLowerCase();
      const filtradas = termo ? categorias.filter((c) => c.nome.toLowerCase().includes(termo)) : categorias;

      if (filtradas.length === 0) {
        container.innerHTML = '<div class="estado-vazio-admin"><div class="icone-vazio">🔍</div><p>Nenhuma categoria encontrada para "' + escaparHtml(termo) + '"</p></div>';
        return;
      }

      filtradas.forEach((cat) => {
        const div = document.createElement("div");
        div.className = "linha-item linha-usuario";
        div.innerHTML = `
          <div class="item-info-principal linha-usuario-info">
            <span class="item-descricao">${escaparHtml(cat.nome)}</span>
          </div>
          <div class="item-valores">
            <button type="button" class="btn-editar-usuario" data-id="${cat.id}" data-nome="${escaparHtml(cat.nome)}" title="Renomear categoria">Editar</button>
            <button type="button" class="btn-excluir-conta" data-id="${cat.id}" title="Excluir categoria">Excluir</button>
          </div>
        `;
        container.appendChild(div);
      });

      container.querySelectorAll(".btn-editar-usuario").forEach((btn) => {
        btn.addEventListener("click", () => abrirModalRenomearCategoria(Number(btn.dataset.id), btn.dataset.nome));
      });
      container.querySelectorAll(".btn-excluir-conta").forEach((btn) => {
        btn.addEventListener("click", () => excluirCategoria(Number(btn.dataset.id), btn));
      });
    }

    renderizarListaCategorias("");
    if (campoBusca) {
      campoBusca.oninput = () => renderizarListaCategorias(campoBusca.value);
    }
  } catch (erro) {
    container.innerHTML = '<div class="estado-vazio-admin" style="color: var(--cor-despesa);"><div class="icone-vazio">⚠️</div><p>Erro ao carregar categorias.</p></div>';
  }
}

async function excluirCategoria(id, botao) {
  if (!(await pedirConfirmacao("Excluir esta categoria da lista? Lançamentos que já usam ela não são afetados.", { textoConfirmar: "Excluir", perigo: true }))) return;

  botao.disabled = true;
  botao.innerText = "Excluindo...";

  try {
    const resposta = await CadimusAdminApi.excluirCategoria(id);

    if (tratarSessaoExpirada(resposta)) return;

    if (resposta.ok) {
      carregarListaCategorias();
      mostrarToast("Categoria excluída", "info");
    } else {
      const erro = await resposta.json();
      await mostrarAviso(`Não foi possível excluir: ${erro.erro}`);
      botao.disabled = false;
      botao.innerText = "Excluir";
    }
  } catch (erro) {
    await mostrarAviso("Erro ao se conectar com o servidor.");
    botao.disabled = false;
    botao.innerText = "Excluir";
  }
}

// --- RENOMEAR CATEGORIA (aplica em massa nos lançamentos e despesas fixas existentes) ---
function abrirModalRenomearCategoria(id, nomeAtual) {
  const modal = document.getElementById("modal-renomear-categoria");
  if (!modal) return;

  document.getElementById("categoria-renomear-id").value = id;
  document.getElementById("categoria-novo-nome").value = nomeAtual;
  modal.style.display = "flex";
  trapFoco(modal);
}

function configurarModalRenomearCategoria() {
  const modal = document.getElementById("modal-renomear-categoria");
  const form = document.getElementById("form-renomear-categoria");
  const btnFechar = document.getElementById("btn-fechar-modal-renomear-categoria");

  if (!modal || !form || !btnFechar) return;

  btnFechar.addEventListener("click", () => {
    modal.style.display = "none";
    liberarFoco();
  });

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const id = document.getElementById("categoria-renomear-id").value;
    const novoNome = document.getElementById("categoria-novo-nome").value.trim();
    const btnSalvar = document.getElementById("btn-salvar-renomear-categoria");

    btnSalvar.disabled = true;
    btnSalvar.innerText = "Renomeando...";

    try {
      const resposta = await CadimusAdminApi.renomearCategoria(id, novoNome);

      if (tratarSessaoExpirada(resposta)) return;

      if (resposta.ok) {
        modal.style.display = "none";
        liberarFoco();
        carregarListaCategorias();
        mostrarToast("Categoria renomeada");
      } else {
        const erro = await resposta.json();
        await mostrarAviso(`Erro: ${erro.erro}`);
      }
    } catch (erro) {
      await mostrarAviso("Erro de conexão ao renomear categoria.");
    } finally {
      btnSalvar.disabled = false;
      btnSalvar.innerText = "Renomear";
    }
  });
}
