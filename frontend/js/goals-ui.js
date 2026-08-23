// ==========================================
// goals-ui.js - Metas e depósitos
// ==========================================
// ==========================================
// [11] METAS E DEPÓSITOS
// ==========================================

// ==========================================
// METAS POR CATEGORIA (ex: "Quero gastar no máximo R$500 com Delivery")
// ==========================================
let metasCarregadas = [];

async function carregarMetas() {
  const carteiraId = document.getElementById("seletor-carteira").value;
  if (!carteiraId) return;

  try {
    const resposta = await CadimusGoalsApi.listarMetas({ carteira_id: carteiraId });
    if (tratarSessaoExpirada(resposta)) return;
    if (!resposta.ok) return;
    metasCarregadas = await resposta.json();
  } catch (erro) {
    console.error("Erro ao carregar metas:", erro);
  }
}

function obterMetaPorCategoria(categoria) {
  return metasCarregadas.find((m) => m.categoria === categoria);
}

async function abrirModalMeta(categoria, valorAtual, dataLimite) {
  const modal = document.getElementById("modal-meta");
  if (!modal) return;

  const categoriaInicial = categoria || "";
  const inputCategoria = document.getElementById("meta-categoria-nome");
  const labelCategoria = document.getElementById("meta-categoria-label");
  const campoCategoriaSelect = document.getElementById("campo-meta-categoria-select");
  const selectCategoria = document.getElementById("meta-categoria-select");

  inputCategoria.value = categoriaInicial;

  if (categoriaInicial) {
    if (campoCategoriaSelect) campoCategoriaSelect.style.display = "none";
    labelCategoria.textContent = `Categoria: ${categoriaInicial}`;
  } else {
    labelCategoria.textContent = "Escolha uma categoria para acompanhar";
    if (campoCategoriaSelect && selectCategoria) {
      campoCategoriaSelect.style.display = "block";
      await popularSelectCategorias(selectCategoria);
      selectCategoria.value = "";
      selectCategoria.onchange = () => {
        inputCategoria.value = selectCategoria.value;
        const metaExistente = obterMetaPorCategoria(selectCategoria.value);
        if (metaExistente) {
          definirValorInputMonetario("meta-valor", valorMonetario(metaExistente, "valor_limite"));
          document.getElementById("meta-data-limite").value = metaExistente.data_limite || "";
          document.getElementById("btn-remover-meta").style.display = "inline-block";
        } else {
          definirValorInputMonetario("meta-valor", "");
          document.getElementById("meta-data-limite").value = "";
          document.getElementById("btn-remover-meta").style.display = "none";
        }
      };
    }
  }

  definirValorInputMonetario("meta-valor", valorAtual);
  document.getElementById("meta-data-limite").value = dataLimite || "";
  document.getElementById("btn-remover-meta").style.display = categoriaInicial && valorAtual ? "inline-block" : "none";
  modal.style.display = "flex";
  trapFoco(modal);
}

function configurarModalMeta() {
  const modal = document.getElementById("modal-meta");
  const form = document.getElementById("form-meta");
  const btnFechar = document.getElementById("btn-fechar-modal-meta");
  const btnRemover = document.getElementById("btn-remover-meta");

  if (!modal || !form || !btnFechar || !btnRemover) return;

  btnFechar.addEventListener("click", () => {
    modal.style.display = "none";
    liberarFoco();
  });

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const carteiraId = document.getElementById("seletor-carteira").value;
    const categoria = document.getElementById("meta-categoria-nome").value;
    if (!categoria) {
      await mostrarAviso("Selecione uma categoria para salvar a meta.");
      return;
    }

    const valorLimitePayload = montarPayloadMonetario("meta-valor", "valor_limite");
    const valorLimite = valorLimitePayload.valor_limite;
    const dataLimite = document.getElementById("meta-data-limite").value || null;
    const btnSalvar = document.getElementById("btn-salvar-meta");

    btnSalvar.disabled = true;
    btnSalvar.innerText = "Salvando...";

    try {
      const resposta = await CadimusGoalsApi.salvarMeta({ carteira_id: carteiraId, categoria, valor_limite: valorLimite, valor_limite_centavos: valorLimitePayload.valor_limite_centavos, data_limite: dataLimite });

      if (tratarSessaoExpirada(resposta)) return;

      if (resposta.ok) {
        modal.style.display = "none";
        await carregarMetas();
        await recarregarLancamentosAposMutacao();
      } else {
        const erro = await resposta.json();
        await mostrarAviso(`Erro: ${erro.erro}`);
      }
    } catch (erro) {
      await mostrarAviso("Erro de conexão ao salvar meta.");
    } finally {
      btnSalvar.disabled = false;
      btnSalvar.innerText = "Salvar meta";
    }
  });

  btnRemover.addEventListener("click", async () => {
    const categoria = document.getElementById("meta-categoria-nome").value;
    const meta = obterMetaPorCategoria(categoria);
    if (!meta) return;
    if (!(await pedirConfirmacao(`Remover a meta de "${categoria}"?`, { textoConfirmar: "Remover", perigo: true }))) return;

    try {
      const resposta = await CadimusGoalsApi.excluirMeta(meta.id);

      if (tratarSessaoExpirada(resposta)) return;

      if (resposta.ok) {
        modal.style.display = "none";
        liberarFoco();
        await carregarMetas();
        await recarregarLancamentosAposMutacao();
        mostrarToast("Meta removida", "info");
      } else {
        const erro = await resposta.json();
        await mostrarAviso(`Erro: ${erro.erro}`);
      }
    } catch (erro) {
      await mostrarAviso("Erro de conexão ao remover meta.");
    }
  });
}


// --- DEPÓSITOS EM METAS ---
let metaDepositandoId = null;

async function abrirModalDeposito(metaId, categoria) {
  const modal = document.getElementById("modal-meta-deposito");
  const titulo = document.getElementById("titulo-meta-deposito");
  const inputMetaId = document.getElementById("deposito-meta-id");
  const inputValor = document.getElementById("deposito-valor");
  const inputDescricao = document.getElementById("deposito-descricao");
  const lista = document.getElementById("lista-depositos");
  if (!modal) return;

  metaDepositandoId = metaId;
  titulo.textContent = `Depósito — ${categoria}`;
  inputMetaId.value = metaId;
  inputValor.value = "";
  inputDescricao.value = "";

  modal.style.display = "flex";
  trapFoco(modal);

  await carregarDadosDeposito(metaId);
  await carregarListaDepositos(metaId);
}

async function carregarDadosDeposito(metaId) {
  const meta = metasCarregadas.find((m) => m.id === metaId);
  if (!meta) return;

  const valorDepositado = await obterTotalDepositado(metaId);
  const valorMeta = valorMonetario(meta, "valor_limite");
  const percentual = Math.min((valorDepositado / valorMeta) * 100, 100);

  document.getElementById("deposito-valor-depositado").textContent = formatadorBRL.format(valorDepositado);
  document.getElementById("deposito-valor-meta").textContent = formatadorBRL.format(valorMeta);

  const barra = document.getElementById("deposito-barra-progresso");
  barra.style.width = `${percentual}%`;
  barra.className = `meta-deposito-progresso-barra ${percentual >= 100 ? "barra-estourou" : ""}`;

  const info = document.getElementById("deposito-info-progresso");
  const restante = valorMeta - valorDepositado;
  if (restante <= 0) {
    info.textContent = "Meta atingida!";
  } else {
    info.textContent = `Faltam ${formatadorBRL.format(restante)} (${Math.round(percentual)}%)`;
  }
}

async function obterTotalDepositado(metaId) {
  try {
    const resposta = await CadimusGoalsApi.listarDepositos(metaId);
    if (!resposta.ok) return 0;
    const depositos = await resposta.json();
    return somarValoresMonetarios(depositos);
  } catch {
    return 0;
  }
}

async function carregarListaDepositos(metaId) {
  const container = document.getElementById("lista-depositos");
  if (!container) return;

  try {
    const resposta = await CadimusGoalsApi.listarDepositos(metaId);
    if (!resposta.ok) {
      container.innerHTML = '<p class="historico-fixa-vazio">Erro ao carregar.</p>';
      return;
    }

    const depositos = await resposta.json();

    if (depositos.length === 0) {
      container.innerHTML = '<p class="historico-fixa-vazio">Nenhum depósito ainda.</p>';
      return;
    }

    container.innerHTML = "";
    depositos.forEach((d) => {
      const data = new Date(d.criado_em).toLocaleDateString("pt-BR");
      const linha = document.createElement("div");
      linha.className = "historico-deposito-linha";
      linha.innerHTML = `
        <span class="historico-deposito-data">${data}</span>
        <span class="historico-deposito-desc">${escaparHtml(d.descricao || "Depósito")}</span>
        <span class="historico-deposito-valor">+ ${formatadorBRL.format(valorMonetario(d))}</span>
        <button type="button" class="historico-deposito-excluir" data-id="${d.id}" title="Excluir">×</button>
      `;
      container.appendChild(linha);
    });

    container.querySelectorAll(".historico-deposito-excluir").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await excluirDeposito(Number(btn.dataset.id), metaId);
      });
    });
  } catch {
    container.innerHTML = '<p class="historico-fixa-vazio">Erro de conexão.</p>';
  }
}

async function excluirDeposito(depositoId, metaId) {
  if (!(await pedirConfirmacao("Excluir este depósito?", { textoConfirmar: "Excluir", perigo: true }))) return;

  try {
    const resposta = await CadimusGoalsApi.excluirDeposito(depositoId);
    if (resposta.ok) {
      await carregarDadosDeposito(metaId);
      await carregarListaDepositos(metaId);
      mostrarToast("Depósito excluído", "info");
    }
  } catch {
    await mostrarAviso("Erro de conexão.");
  }
}

function configurarModalDeposito() {
  const modal = document.getElementById("modal-meta-deposito");
  const btnFechar = document.getElementById("btn-fechar-modal-meta-deposito");
  const form = document.getElementById("form-meta-deposito");

  if (!modal || !btnFechar || !form) return;

  btnFechar.addEventListener("click", () => {
    modal.style.display = "none";
    liberarFoco();
    metaDepositandoId = null;
  });

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const metaId = Number(document.getElementById("deposito-meta-id").value);
    const valorPayload = montarPayloadMonetario("deposito-valor");
    const valor = valorPayload.valor;
    const descricao = document.getElementById("deposito-descricao").value.trim();
    const btn = document.getElementById("btn-confirmar-deposito");

    if (!Number.isFinite(valor) || valor <= 0) return;

    btn.disabled = true;
    btn.innerText = "Salvando...";

    try {
      const resposta = await CadimusGoalsApi.criarDeposito({
        metaId,
        valor,
        valorCentavos: valorPayload.valor_centavos,
        descricao,
      });

      if (tratarSessaoExpirada(resposta)) return;

      if (resposta.ok) {
        document.getElementById("deposito-valor").value = "";
        document.getElementById("deposito-descricao").value = "";
        await carregarDadosDeposito(metaId);
        await carregarListaDepositos(metaId);
        mostrarToast("Depósito registrado!");
      } else {
        const erro = await resposta.json();
        await mostrarAviso(`Erro: ${erro.erro}`);
      }
    } catch {
      await mostrarAviso("Erro de conexão ao depositar.");
    } finally {
      btn.disabled = false;
      btn.innerText = "Depositar";
    }
  });
}
