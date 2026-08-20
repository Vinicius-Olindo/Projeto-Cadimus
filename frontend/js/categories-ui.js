// ==========================================
// categories-ui.js - Utilitários de categorias no frontend
// ==========================================

// ==========================================
// [12] CATEGORIAS (Utilitários)
// ==========================================

// --- CATEGORIAS (carrega em qualquer select e permite cadastrar novas) ---
async function popularSelectCategorias(select) {
  if (!select) return;

  try {
    const resposta = await CadimusAdminApi.listarCategorias();
    if (tratarSessaoExpirada(resposta)) return;
    if (!resposta.ok) return;

    const categorias = await resposta.json();
    const opcaoNova = select.querySelector('option[value="__nova__"]');

    // Remove opções antigas (menos a de placeholder e a de "+ Nova categoria", se existir)
    select.querySelectorAll("option[data-categoria]").forEach((op) => op.remove());

    categorias.forEach((cat) => {
      const opcao = document.createElement("option");
      opcao.value = cat.nome;
      opcao.textContent = cat.nome;
      opcao.dataset.categoria = "true";
      select.insertBefore(opcao, opcaoNova || null);
    });
  } catch (erro) {
    console.error("Erro ao carregar categorias:", erro);
  }
}

function carregarCategorias() {
  popularSelectCategorias(document.getElementById("categoria"));
  popularSelectFiltroCategorias();
}

async function popularSelectFiltroCategorias() {
  const select = document.getElementById("filtro-categoria-lancamento");
  if (!select) return;

  try {
    const resposta = await CadimusAdminApi.listarCategorias();
    if (tratarSessaoExpirada(resposta)) return;
    if (!resposta.ok) return;

    const categorias = await resposta.json();

    select.querySelectorAll("option[data-categoria]").forEach((op) => op.remove());

    categorias.forEach((cat) => {
      const opcao = document.createElement("option");
      opcao.value = cat.nome;
      opcao.textContent = cat.nome;
      opcao.dataset.categoria = "true";
      select.appendChild(opcao);
    });
  } catch (erro) {
    console.error("Erro ao carregar categorias do filtro:", erro);
  }
}

function adicionarOpcaoSelect(select, nome) {
  if (!select || !nome) return;
  const opcaoNova = select.querySelector('option[value="__nova__"]');
  const jaExiste = Array.from(select.options).some((op) => op.value.toLowerCase() === nome.toLowerCase());
  if (jaExiste) return;

  const opcao = document.createElement("option");
  opcao.value = nome;
  opcao.textContent = nome;
  opcao.dataset.categoria = "true";
  select.insertBefore(opcao, opcaoNova || null);
}

function adicionarCategoriaAoSelect(nome) {
  adicionarOpcaoSelect(document.getElementById("categoria"), nome);
}
