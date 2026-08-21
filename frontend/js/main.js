// ==========================================
// main.js - Controle de Interface, UI e Filtros
// ==========================================
//
// ESTRUTURA DO ARQUIVO:
// [1]   CONSTANTES E HELPERS GLOBAIS
// [2]   ESTADO GLOBAL
// [3]   UI: Focus Trap, Toast, Aviso, Confirmação
// [4]   INICIALIZAÇÃO (DOMContentLoaded)
// [5]   FILTROS: Mês, Período, Dark Mode
// [6]   CARTEIRAS: Carregamento, Renderização, Tabs
// [7]   MODAIS: Carteira, Transferência, Orçamento, Membros
// [8]   DESPESAS FIXAS
// [9]   COMPRAS PARCELADAS
// [10]  ORÇAMENTOS MENSAIS
// [11]  METAS E DEPÓSITOS
// [12]  CATEGORIAS (Utilitários)
// [13]  LANÇAMENTOS: Modal, CRUD, Renderização
// [14]  ANIMAÇÕES
// [15]  RENDERIZAÇÃO: Lista de Lançamentos, Grupos
// [16]  NOTIFICAÇÕES
// [17]  EDIÇÃO EM LOTE
// [18]  POPUP DE NOTA
// [19]  COMPARATIVO POR PERÍODO
// [20]  CARREGAMENTO PRINCIPAL (carregarLancamentos)
// [21]  DASHBOARD: Resumo Categorias, Autores, KPIs
// [22]  STATUS: Alternar Pago/Pendente
// [23]  COMPARAÇÃO MÊS A MÊS
// [24]  TENDÊNCIA E GRÁFICOS
// [25]  TAXA DE POUPANÇA
// [26]  APAGAR LANÇAMENTO
// [27]  ADMIN: Painel, Usuários, Categorias
// [28]  PLANEJAMENTO: Planos Financeiros
// [29]  EXPORTAÇÃO GLOBAL
// ==========================================

// ==========================================
// [1] CONSTANTES E HELPERS GLOBAIS
// ==========================================

function obterCentavosMonetarios(campoId, opcoes = {}) {
  const { vazioComoZero = false, ...opcoesDinheiro } = opcoes;
  const campo = document.getElementById(campoId);
  const valor = campo?.value;
  if (vazioComoZero && (valor === null || valor === undefined || String(valor).trim() === "")) {
    return 0;
  }
  return window.CadimusMoney.reaisParaCentavos(valor, opcoesDinheiro);
}

function montarPayloadMonetario(campoId, nomeCampo = "valor", opcoes = {}) {
  const centavos = obterCentavosMonetarios(campoId, opcoes);
  return {
    [nomeCampo]: window.CadimusMoney.centavosParaReais(centavos),
    [`${nomeCampo}_centavos`]: centavos,
  };
}

function valorMonetario(registro, nomeCampo = "valor") {
  const nomeCentavos = `${nomeCampo}_centavos`;
  if (Number.isInteger(registro?.[nomeCentavos])) {
    return window.CadimusMoney.centavosParaReais(registro[nomeCentavos]);
  }
  return Number(registro?.[nomeCampo]) || 0;
}

function centavosMonetarios(registro, nomeCampo = "valor") {
  const nomeCentavos = `${nomeCampo}_centavos`;
  if (Number.isInteger(registro?.[nomeCentavos])) {
    return registro[nomeCentavos];
  }
  return window.CadimusMoney.reaisParaCentavos(valorMonetario(registro, nomeCampo), { permitirNegativo: true });
}

function somarValoresMonetarios(registros, nomeCampo = "valor") {
  return registros.reduce((total, registro) => total + valorMonetario(registro, nomeCampo), 0);
}

window.valorMonetario = valorMonetario;
window.centavosMonetarios = centavosMonetarios;
window.somarValoresMonetarios = somarValoresMonetarios;

// Helpers visuais, filtros e tema ficam em ui-core.js.

// Interface de carteiras, transferências e membros fica em wallets-ui.js.

// Despesas fixas ficam em fixed-expenses-ui.js.

// Compras parceladas ficam em installments-ui.js.

// ==========================================
// [10] ORÇAMENTOS MENSAIS
// ==========================================

// --- PAINEL DE ORÇAMENTOS ---
let orcamentosCarregados = [];

async function carregarOrcamentos() {
  const card = document.getElementById("card-orcamentos");
  const container = document.getElementById("lista-orcamentos-painel");
  const carteiraId = document.getElementById("seletor-carteira").value;
  if (!card || !container || !carteiraId) return;

  const inputMes = document.getElementById("filtro-mes").value;
  if (!inputMes) {
    card.style.display = "none";
    return;
  }

  const [ano, mes] = inputMes.split("-");

  try {
    const resposta = await CadimusBudgetsApi.listar({ carteira_id: carteiraId, mes, ano });

    if (tratarSessaoExpirada(resposta)) return;
    if (!resposta.ok) {
      card.style.display = "none";
      return;
    }

    orcamentosCarregados = await resposta.json();

    if (orcamentosCarregados.length === 0) {
      card.style.display = "none";
      return;
    }

    card.style.display = "flex";
    container.innerHTML = "";

    orcamentosCarregados.forEach((orc) => {
      const div = document.createElement("div");
      div.className = "orcamento-item";

      const corBarra = orc.status === "estourado" ? "var(--cor-despesa)" : orc.status === "alerta" ? "var(--cor-pendente)" : "var(--cor-receita)";

      div.innerHTML = `
        <div class="orcamento-cabecalho">
          <span class="orcamento-categoria">${escaparHtml(orc.categoria)}</span>
          <span class="orcamento-status status-${orc.status}">${orc.progresso_real.toFixed(0)}%</span>
        </div>
        <div class="orcamento-barra-fundo">
          <div class="orcamento-barra-progresso" style="width: ${orc.progresso}%; background: ${corBarra}"></div>
        </div>
        <div class="orcamento-valores">
          <span class="orcamento-gasto">${formatadorBRL.format(valorMonetario(orc, "total_gasto"))} / ${formatadorBRL.format(valorMonetario(orc))}</span>
          <span class="orcamento-saldo">${orc.saldo > 0 ? `Restam ${formatadorBRL.format(orc.saldo)}` : "Estourado!"}</span>
        </div>
        <button type="button" class="orcamento-btn-excluir" data-id="${orc.id}" title="Excluir orçamento">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        </button>
      `;

      container.appendChild(div);
    });

    // Botão de excluir
    container.querySelectorAll(".orcamento-btn-excluir").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const confirmado = await pedirConfirmacao("Tem certeza que deseja excluir este orçamento?");
        if (!confirmado) return;

        try {
          const resp = await CadimusBudgetsApi.excluir(btn.dataset.id);

          if (tratarSessaoExpirada(resp)) return;

          if (resp.ok) {
            carregarOrcamentos();
            mostrarToast("Orçamento excluído.");
          } else {
            const erro = await resp.json();
            await mostrarAviso(`Erro: ${erro.erro}`);
          }
        } catch (e) {
          await mostrarAviso("Erro de conexão.");
        }
      });
    });
  } catch (erro) {
    console.error("Erro ao carregar orçamentos:", erro);
    card.style.display = "none";
  }
}

// Ações e histórico de compras parceladas ficam em installments-ui.js.

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

function abrirModalMeta(categoria, valorAtual, dataLimite) {
  const modal = document.getElementById("modal-meta");
  if (!modal) return;

  document.getElementById("meta-categoria-nome").value = categoria;
  document.getElementById("meta-categoria-label").textContent = `Categoria: ${categoria}`;
  document.getElementById("meta-valor").value = valorAtual || "";
  document.getElementById("meta-data-limite").value = dataLimite || "";
  document.getElementById("btn-remover-meta").style.display = valorAtual ? "inline-block" : "none";
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
        carregarLancamentos();
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
        carregarLancamentos();
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


// Utilitários de categorias ficam em categories-ui.js.

// Modal e CRUD de lançamentos ficam em entries-modal-ui.js.

// Listagem, filtros e animações de lançamentos ficam em entries-list-ui.js.

// Central de notificações fica em notifications-ui.js.

// Edição em lote e popup de nota ficam em batch-note-ui.js.

// Comparativo por período fica em period-comparison-ui.js.

// Carregamento principal de lançamentos fica em entries-loader-ui.js.

// Resumos do dashboard financeiro ficam em dashboard-summary-ui.js.

// Status, comparação mensal e autores ficam em dashboard-insights-ui.js.

// Gráficos do dashboard financeiro ficam em dashboard-charts-ui.js.

// Saúde financeira do dashboard fica em dashboard-health-ui.js.

// Relatório PDF do dashboard fica em dashboard-pdf-ui.js.

// Ações sensíveis de lançamentos ficam em entries-actions-ui.js.

// ==========================================
// [27] ADMIN: Painel, Usuários, Categorias
// ==========================================

// Entrada do painel admin/configurações fica em admin-shell-ui.js.

// Estrutura inicial do planejamento fica em planning-shell-ui.js.

// Indicadores e cards do planejamento ficam em planning-dashboard-ui.js.

// Lista, modal e depósitos de planos ficam em planning-plans-ui.js.

// Metas dentro do planejamento ficam em planning-goals-ui.js.

// Abas e preferências do admin/configurações ficam em admin-settings-ui.js.

// --- FOTO DE PERFIL: redimensiona e comprime no navegador antes de enviar ---
// Evita mandar fotos de celular (que podem vir com vários MB) pro backend;
// aqui já sai como base64 pequeno, do tamanho certo pra um avatar.
function comprimirImagemParaBase64(arquivo, ladoMaximo = 256, qualidade = 0.8) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    leitor.onload = () => {
      const imagem = new Image();
      imagem.onerror = () => reject(new Error("Arquivo não é uma imagem válida."));
      imagem.onload = () => {
        const escala = Math.min(1, ladoMaximo / Math.max(imagem.width, imagem.height));
        const largura = Math.round(imagem.width * escala);
        const altura = Math.round(imagem.height * escala);

        const canvas = document.createElement("canvas");
        canvas.width = largura;
        canvas.height = altura;
        canvas.getContext("2d").drawImage(imagem, 0, 0, largura, altura);

        resolve(canvas.toDataURL("image/jpeg", qualidade));
      };
      imagem.src = leitor.result;
    };
    leitor.readAsDataURL(arquivo);
  });
}

function definirPreviewFoto(dataUrl) {
  const preview = document.getElementById("preview-foto-perfil");
  const vazio = document.getElementById("avatar-vazio");
  const btnRemover = document.getElementById("btn-remover-foto");
  document.getElementById("nova-foto-perfil").value = dataUrl || "";

  // Sanitizar URL (data URLs de preview são permitidos, http/https também)
  const urlSegura = dataUrl && (dataUrl.startsWith("data:") || sanitizarUrl(dataUrl)) ? dataUrl : "";

  if (urlSegura) {
    preview.src = urlSegura;
    preview.style.display = "block";
    vazio.style.display = "none";
    btnRemover.style.display = "inline-block";
  } else {
    preview.src = "";
    preview.style.display = "none";
    vazio.style.display = "flex";
    btnRemover.style.display = "none";
  }
}

// Usuários e convites do admin ficam em admin-users-ui.js.

// Categorias do admin ficam em admin-categories-ui.js.

// ==========================================
// [29] EXPORTAÇÃO GLOBAL
// ==========================================

window.carregarLancamentos = carregarLancamentos;
window.apagarLancamento = apagarLancamento;
window.alternarStatusLancamento = alternarStatusLancamento;
window.editarLancamento = editarLancamento;
window.carregarCarteiras = carregarCarteiras;

// Renomeação de categorias fica em admin-categories-ui.js.

// Estrutura e carregamento dos relatórios ficam em reports-shell-ui.js.

// KPIs e gráficos dos relatórios ficam em reports-charts-ui.js.

// Tabelas, comparativos e insights dos relatórios ficam em reports-tables-ui.js.

// Exportação dos relatórios fica em reports-export-ui.js.
