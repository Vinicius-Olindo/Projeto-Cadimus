// ==========================================
// admin-settings-ui.js - Abas e preferências do admin/configurações
// ==========================================
const dependenciasSettingsAdmin = {};
const scriptsSettingsAdminCarregados = new Set();
let modalRecorrenciaSettingsConfigurado = false;

function carregarScriptsSettingsAdmin(chave, scripts) {
  if (dependenciasSettingsAdmin[chave]) return dependenciasSettingsAdmin[chave];
  const scriptsPendentes = scripts.filter((script) => !scriptsSettingsAdminCarregados.has(script));
  if (scriptsPendentes.length === 0) return Promise.resolve();

  dependenciasSettingsAdmin[chave] = CadimusPageLoader.carregar(scriptsPendentes).then(() => {
    scriptsPendentes.forEach((script) => scriptsSettingsAdminCarregados.add(script));
  }).catch((erro) => {
    delete dependenciasSettingsAdmin[chave];
    throw erro;
  });
  return dependenciasSettingsAdmin[chave];
}

async function carregarDependenciasPainelSettings(painelId) {
  if (painelId === "sp-cartoes") {
    await carregarScriptsSettingsAdmin("cartoes", ["cards-api.js?v=100"]);
    return;
  }

  if (painelId === "sp-metas") {
    await carregarScriptsSettingsAdmin("metas", ["goals-api.js?v=100"]);
    return;
  }

  if (painelId === "sp-orcamentos") {
    await carregarScriptsSettingsAdmin("orcamentos", ["budgets-api.js?v=100"]);
    return;
  }

  if (painelId === "sp-recorrentes") {
    await carregarScriptsSettingsAdmin("recorrentes", [
      "scheduled-api.js?v=100",
      "recorrentes.js?v=105",
    ]);
    if (!modalRecorrenciaSettingsConfigurado && typeof configurarModalRecorrencia === "function") {
      configurarModalRecorrencia();
      modalRecorrenciaSettingsConfigurado = true;
    }
  }
}

async function carregarModuloCartoesSettings() {
  await carregarScriptsSettingsAdmin("cartoes", ["cards-api.js?v=100"]);
  await carregarModuloCarteirasSettings();
}

async function carregarModuloCarteirasSettings() {
  if (typeof carregarModuloCarteirasCompleto === "function") {
    await carregarModuloCarteirasCompleto();
    return;
  }

  await carregarScriptsSettingsAdmin("carteiras-ui", [
    "wallets-modal-ui.js?v=100",
    "wallets-transfer-ui.js?v=101",
    "wallets-budget-modal-ui.js?v=100",
    "wallets-card-ui.js?v=100",
    "wallets-members-ui.js?v=100",
  ]);
  chamarInicializadorCadimus("configurarModalCarteira");
  chamarInicializadorCadimus("configurarModalGerenciarMembros");
  chamarInicializadorCadimus("configurarModalTransferencia");
  chamarInicializadorCadimus("configurarModalOrcamento");
  chamarInicializadorCadimus("configurarModalCartaoCredito");
}

async function carregarModuloMetasSettings() {
  await carregarScriptsSettingsAdmin("metas-ui", [
    "goals-api.js?v=100",
    "goals-ui.js?v=101",
  ]);
  chamarInicializadorCadimus("configurarModalMeta");
  chamarInicializadorCadimus("configurarModalDeposito");
}

async function carregarModuloOrcamentosSettings() {
  await carregarScriptsSettingsAdmin("orcamentos", ["budgets-api.js?v=100"]);
  await carregarModuloCarteirasSettings();
}

function avisarFalhaDependenciaSettings(erro) {
  console.error("Erro ao carregar módulo do admin:", erro);
  mostrarToast("Não foi possível carregar esta ação agora.", "erro");
}

function configurarSubAbasAdmin() {
  const navItems = document.querySelectorAll(".settings-nav-item");

  function abrirPainelSettings(painelId) {
    const item = document.querySelector(`.settings-nav-item[data-settings-painel="${painelId}"]`);
    if (item) item.click();
  }

  async function carregarPainelSettings(painelId) {
    try {
      await carregarDependenciasPainelSettings(painelId);
    } catch (erro) {
      console.error("Erro ao carregar dependências do painel:", erro);
      mostrarToast("Não foi possível carregar esta seção agora.", "erro");
      return;
    }

    if (painelId === "sp-categorias") carregarListaCategorias();
    if (painelId === "sp-usuarios") carregarUsuarios();
    if (painelId === "sp-recorrentes") carregarPainelRecorrentes();
    if (painelId === "sp-perfil") preencherPerfilAtual();
    if (painelId === "sp-tema") sincronizarToggleTema();
    if (painelId === "sp-contas") carregarSettingsContas();
    if (painelId === "sp-cartoes") carregarSettingsCartoes();
    if (painelId === "sp-metas") carregarSettingsMetas();
    if (painelId === "sp-orcamentos") carregarSettingsOrcamentos();
  }

  document.querySelectorAll("[data-settings-atalho]").forEach((atalho) => {
    atalho.addEventListener("click", () => abrirPainelSettings(atalho.dataset.settingsAtalho));
  });

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      navItems.forEach((t) => t.classList.remove("ativo"));
      item.classList.add("ativo");

      document.querySelectorAll(".settings-painel").forEach((p) => (p.style.display = "none"));
      const painel = document.getElementById(item.dataset.settingsPainel);
      if (painel) painel.style.display = "block";

      carregarPainelSettings(item.dataset.settingsPainel);
    });
  });

  const searchInput = document.getElementById("settings-search");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const q = searchInput.value.toLowerCase();
      navItems.forEach((item) => {
        const texto = item.textContent.toLowerCase();
        item.style.display = texto.includes(q) || q === "" ? "" : "none";
      });
    });
  }

  document.querySelectorAll(".settings-tema-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tema = btn.dataset.tema;
      const nomeTema = tema === "escuro" ? "Escuro" : tema === "claro" ? "Claro" : "Automático";
      if (tema === "escuro") {
        document.body.classList.add("dark-mode");
        gravarLocalStorageSeguro("cadimus_tema", "dark");
      } else if (tema === "claro") {
        document.body.classList.remove("dark-mode");
        gravarLocalStorageSeguro("cadimus_tema", "light");
      } else {
        removerLocalStorageSeguro("cadimus_tema");
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
          document.body.classList.add("dark-mode");
        } else {
          document.body.classList.remove("dark-mode");
        }
      }
      if (typeof atualizarMetaThemeColor === "function") atualizarMetaThemeColor();
      sincronizarToggleTema();
      atualizarSeletorTemaTopo();
      mostrarToast(`Tema "${nomeTema}" salvo`);
    });
  });

  // Toggle: animações
  const toggleAnimacoes = document.getElementById("toggle-animacoes");
  if (toggleAnimacoes) {
    if (lerLocalStorageSeguro("cadimus_animacoes") === "false") {
      toggleAnimacoes.checked = false;
      document.body.classList.add("sem-animacoes");
    }
    toggleAnimacoes.addEventListener("change", () => {
      if (toggleAnimacoes.checked) {
        document.body.classList.remove("sem-animacoes");
        gravarLocalStorageSeguro("cadimus_animacoes", "true");
        mostrarToast("Animações ativadas");
      } else {
        document.body.classList.add("sem-animacoes");
        gravarLocalStorageSeguro("cadimus_animacoes", "false");
        mostrarToast("Animações desativadas");
      }
    });
  }

  // Toggle: ocultar valores financeiros
  const toggleOcultar = document.getElementById("toggle-ocultar-valores");
  if (toggleOcultar) {
    if (lerLocalStorageSeguro("cadimus_ocultar_valores") === "true") {
      toggleOcultar.checked = true;
      document.body.classList.add("ocultar-valores");
    }
    toggleOcultar.addEventListener("change", () => {
      if (toggleOcultar.checked) {
        document.body.classList.add("ocultar-valores");
        gravarLocalStorageSeguro("cadimus_ocultar_valores", "true");
        mostrarToast("Valores ocultos com sucesso");
      } else {
        document.body.classList.remove("ocultar-valores");
        gravarLocalStorageSeguro("cadimus_ocultar_valores", "false");
        mostrarToast("Valores visíveis novamente");
      }
    });
  }

  const itemAtivo = document.querySelector(".settings-nav-item.ativo");
  if (itemAtivo?.dataset.settingsPainel) {
    carregarPainelSettings(itemAtivo.dataset.settingsPainel);
  }
}

// --- Settings: Contas (Carteiras) ---
async function carregarSettingsContas() {
  const container = document.getElementById("lista-carteiras-settings");
  if (!container) return;
  container.innerHTML = '<span class="dica-campo">Carregando...</span>';
  try {
    const resposta = await CadimusWalletsApi.listarCarteiras();
    if (tratarSessaoExpirada(resposta)) return;
    if (!resposta.ok) return;
    const carteiras = await resposta.json();
    if (carteiras.length === 0) {
      container.innerHTML = '<div class="estado-vazio-admin"><div class="icone-vazio">👛</div><p>Nenhuma carteira encontrada.<br>Crie uma carteira pessoal ou compartilhada para separar seus saldos.</p></div>';
      return;
    }
    container.innerHTML = carteiras.map(c => `
      <div class="settings-mini-card settings-wallet-card">
        <div class="settings-mini-card-topo">
          <div class="settings-categoria-nome">
            <span class="settings-categoria-icone">□</span>
            <div>
              <span class="settings-mini-card-label">Carteira ${c.tipo === "compartilhada" ? "compartilhada" : "pessoal"}</span>
              <strong>${escaparHtml(c.nome)}</strong>
            </div>
          </div>
          <span class="item-status ${c.tipo === "compartilhada" ? "status-pendente" : "status-pago"}">${c.tipo === "compartilhada" ? "Compartilhada" : "Pessoal"}</span>
        </div>
      </div>
    `).join("");
  } catch (erro) {
    container.innerHTML = '<span class="dica-campo">Erro ao carregar.</span>';
  }
}

const btnNovaCarteiraSettings = document.getElementById("btn-nova-carteira-settings");
if (btnNovaCarteiraSettings) {
  btnNovaCarteiraSettings.addEventListener("click", async () => {
    try {
      await carregarModuloCarteirasSettings();
      if (typeof abrirModalCarteira === "function") abrirModalCarteira();
    } catch (erro) {
      avisarFalhaDependenciaSettings(erro);
    }
  });
}

// --- Settings: Cartões ---
async function carregarSettingsCartoes() {
  const container = document.getElementById("lista-cartoes-settings");
  if (!container) return;
  container.innerHTML = '<span class="dica-campo">Carregando...</span>';
  try {
    const carteiraId = document.getElementById("seletor-carteira")?.value;
    const resposta = await CadimusCardsApi.listar({ carteira_id: carteiraId || "" });
    if (tratarSessaoExpirada(resposta)) return;
    if (!resposta.ok) return;
    const cartoes = await resposta.json();
    if (cartoes.length === 0) {
      container.innerHTML = '<div class="estado-vazio-admin"><div class="icone-vazio">💳</div><p>Nenhum cartão cadastrado.<br>Cadastre cartões para acompanhar limite, fechamento e vencimento.</p></div>';
      return;
    }
    container.innerHTML = cartoes.map(c => `
      <div class="settings-mini-card settings-card-credit">
        <div class="settings-mini-card-topo">
          <div class="settings-categoria-nome">
            <span class="settings-categoria-icone">▣</span>
            <div>
              <span class="settings-mini-card-label">Cartão de crédito</span>
              <strong>${escaparHtml(c.nome)}</strong>
            </div>
          </div>
          <span class="item-status status-pago">Ativo</span>
        </div>
        <div class="settings-mini-card-meta">
          <span>Fecha dia <strong>${c.dia_fechamento || "—"}</strong></span>
          <span>Vence dia <strong>${c.dia_vencimento || "—"}</strong></span>
        </div>
      </div>
    `).join("");
  } catch (erro) {
    container.innerHTML = '<span class="dica-campo">Erro ao carregar.</span>';
  }
}

const btnNovoCartaoSettings = document.getElementById("btn-novo-cartao-settings");
if (btnNovoCartaoSettings) {
  btnNovoCartaoSettings.addEventListener("click", async () => {
    try {
      await carregarModuloCartoesSettings();
      if (typeof abrirModalCartao === "function") abrirModalCartao(false);
    } catch (erro) {
      avisarFalhaDependenciaSettings(erro);
    }
  });
}

// --- Settings: Metas ---
async function carregarSettingsMetas() {
  const container = document.getElementById("lista-metas-settings");
  if (!container) return;
  container.innerHTML = '<span class="dica-campo">Carregando...</span>';
  try {
    const carteiraId = document.getElementById("seletor-carteira")?.value;
    const resposta = await CadimusGoalsApi.listarMetas({ carteira_id: carteiraId || "" });
    if (tratarSessaoExpirada(resposta)) return;
    if (!resposta.ok) return;
    const metas = await resposta.json();
    if (metas.length === 0) {
      container.innerHTML = '<div class="estado-vazio-admin"><div class="icone-vazio">🎯</div><p>Nenhuma meta definida.<br>Crie uma meta para acompanhar seu limite mensal por categoria.</p></div>';
      return;
    }
    container.innerHTML = metas.map(m => {
      const valorAtual = valorMonetario(m, "valor_atual");
      const valorMeta = valorMonetario(m, "meta_valor") || valorMonetario(m, "valor_limite");
      const pct = valorMeta > 0 ? Math.min(100, Math.round((valorAtual / valorMeta) * 100)) : 0;
      return `
        <div class="settings-mini-card settings-meta-card">
          <div class="settings-mini-card-topo">
            <div>
              <span class="settings-mini-card-label">Meta mensal</span>
              <strong>${escaparHtml(m.categoria)}</strong>
            </div>
            <span class="item-status status-pendente">${pct}%</span>
          </div>
          <div class="settings-progress">
            <span style="width: ${pct}%"></span>
          </div>
          <div class="settings-mini-card-meta">
            <span>${formatadorBRL.format(valorAtual)}</span>
            <span>${formatadorBRL.format(valorMeta)}</span>
          </div>
        </div>
      `;
    }).join("");
  } catch (erro) {
    container.innerHTML = '<span class="dica-campo">Erro ao carregar.</span>';
  }
}

const btnNovaMetaSettings = document.getElementById("btn-nova-meta-settings");
if (btnNovaMetaSettings) {
  btnNovaMetaSettings.addEventListener("click", async () => {
    try {
      await carregarModuloMetasSettings();
      if (typeof abrirModalMeta === "function") await abrirModalMeta("", "", "");
    } catch (erro) {
      avisarFalhaDependenciaSettings(erro);
    }
  });
}

// --- Settings: Orçamentos ---
async function carregarSettingsOrcamentos() {
  const container = document.getElementById("lista-orcamentos-settings");
  if (!container) return;
  container.innerHTML = '<span class="dica-campo">Carregando...</span>';
  try {
    const carteiraId = document.getElementById("seletor-carteira")?.value;
    const hoje = new Date();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const ano = hoje.getFullYear();
    const resposta = await CadimusBudgetsApi.listar({ carteira_id: carteiraId || "", mes, ano });
    if (tratarSessaoExpirada(resposta)) return;
    if (!resposta.ok) return;
    const orcamentos = await resposta.json();
    if (orcamentos.length === 0) {
      container.innerHTML = '<div class="estado-vazio-admin"><div class="icone-vazio">◔</div><p>Nenhum orçamento para este mês.<br>Defina limites por categoria para comparar planejado e realizado.</p></div>';
      return;
    }
    container.innerHTML = orcamentos.map(o => {
      const pct = o.limite > 0 ? Math.min(100, Math.round((o.gasto / o.limite) * 100)) : 0;
      const cor = pct >= 90 ? "var(--cor-despesa)" : pct >= 70 ? "var(--cor-pendente)" : "var(--cor-receita)";
      return `
        <div class="settings-mini-card settings-budget-card">
          <div class="settings-mini-card-topo">
            <div>
              <span class="settings-mini-card-label">Orçamento mensal</span>
              <strong>${escaparHtml(o.categoria)}</strong>
            </div>
            <span class="item-status ${pct >= 90 ? "status-atrasado" : pct >= 70 ? "status-pendente" : "status-pago"}">${pct}%</span>
          </div>
          <div class="settings-progress">
            <span style="width: ${pct}%; background: ${cor}"></span>
          </div>
          <div class="settings-mini-card-meta">
            <span>Gasto <strong>${formatadorBRL.format(o.gasto)}</strong></span>
            <span>Limite <strong>${formatadorBRL.format(o.limite)}</strong></span>
          </div>
        </div>
      `;
    }).join("");
  } catch (erro) {
    container.innerHTML = '<span class="dica-campo">Erro ao carregar.</span>';
  }
}

const btnNovoOrcamentoSettings = document.getElementById("btn-novo-orcamento-settings");
if (btnNovoOrcamentoSettings) {
  btnNovoOrcamentoSettings.addEventListener("click", async () => {
    try {
      await carregarModuloOrcamentosSettings();
      if (typeof abrirModalOrcamento === "function") abrirModalOrcamento();
    } catch (erro) {
      avisarFalhaDependenciaSettings(erro);
    }
  });
}

async function preencherPerfilAtual() {
  const el = (id) => document.getElementById(id);
  try {
    const res = await CadimusAdminApi.buscarMeuPerfil();
    if (!res.ok) throw new Error("Erro ao buscar perfil");
    const usuario = await res.json();
    if (el("novo-nome")) el("novo-nome").value = usuario.nome || "";
    if (el("novo-email")) el("novo-email").value = usuario.email || "";
    if (el("novo-telefone")) el("novo-telefone").value = usuario.telefone || "";
    if (el("novo-usuario")) el("novo-usuario").value = usuario.nome_usuario || "";
    if (el("novo-salario")) definirValorInputMonetario("novo-salario", usuario.salario);
    if (el("novo-perfil")) el("novo-perfil").value = usuario.perfil || "comum";
    if (el("usuario-editando-id")) el("usuario-editando-id").value = usuario.id;
    if (el("nova-senha")) el("nova-senha").value = "";
    if (el("dica-senha")) el("dica-senha").style.display = "none";
    if (el("btn-cancelar-edicao")) el("btn-cancelar-edicao").style.display = "none";
    definirPreviewFoto(usuario.foto_perfil || null);
  } catch (erro) {
    console.error("Erro ao preencher perfil:", erro);
  }
}

function sincronizarToggleTema() {
  const temaSalvo = lerLocalStorageSeguro("cadimus_tema");
  document.querySelectorAll(".settings-tema-btn").forEach((btn) => {
    btn.classList.remove("ativo");
    if (temaSalvo === "dark" && btn.dataset.tema === "escuro") btn.classList.add("ativo");
    else if (temaSalvo === "light" && btn.dataset.tema === "claro") btn.classList.add("ativo");
    else if (!temaSalvo && btn.dataset.tema === "auto") btn.classList.add("ativo");
  });
}

// ==========================================
// ZONA DE PERIGO: apagar todos os dados financeiros (só superadmin)
// ==========================================
const FRASE_CONFIRMACAO_ZERAR = "APAGAR TUDO";

function configurarZonaDePerigo() {
  const btnAbrir = document.getElementById("btn-abrir-zerar-dados");
  const modal = document.getElementById("modal-zerar-dados");
  const btnFechar = document.getElementById("btn-fechar-modal-zerar-dados");
  const btnConfirmar = document.getElementById("btn-confirmar-zerar-dados");
  const campoConfirmacao = document.getElementById("confirmacao-zerar-dados");
  const campoSenha = document.getElementById("senha-zerar-dados");
  const erroZerar = document.getElementById("erro-zerar-dados");

  if (!btnAbrir || !modal || !btnFechar || !btnConfirmar || !campoConfirmacao || !campoSenha) return;

  function atualizarBotaoConfirmarZerar() {
    btnConfirmar.disabled = campoConfirmacao.value !== FRASE_CONFIRMACAO_ZERAR || campoSenha.value.trim().length === 0;
  }

  function definirErroZerarDados(mensagem = "") {
    if (!erroZerar) return;
    erroZerar.textContent = mensagem;
    erroZerar.style.display = mensagem ? "block" : "none";
  }

  function fecharModalZerarDados() {
    modal.style.display = "none";
    liberarFoco();
    campoConfirmacao.value = "";
    campoSenha.value = "";
    definirErroZerarDados();
    atualizarBotaoConfirmarZerar();
  }

  btnAbrir.addEventListener("click", () => {
    campoConfirmacao.value = "";
    campoSenha.value = "";
    definirErroZerarDados();
    atualizarBotaoConfirmarZerar();
    modal.style.display = "flex";
    trapFoco(modal);
    setTimeout(() => campoConfirmacao.focus(), 50);
  });

  btnFechar.addEventListener("click", fecharModalZerarDados);

  campoConfirmacao.addEventListener("input", () => {
    definirErroZerarDados();
    atualizarBotaoConfirmarZerar();
  });
  campoSenha.addEventListener("input", () => {
    definirErroZerarDados();
    atualizarBotaoConfirmarZerar();
  });

  btnConfirmar.addEventListener("click", async () => {
    if (campoConfirmacao.value !== FRASE_CONFIRMACAO_ZERAR || !campoSenha.value.trim()) return;

    btnConfirmar.disabled = true;
    btnConfirmar.innerText = "Apagando...";
    definirErroZerarDados();

    try {
      const resposta = await CadimusAdminApi.zerarDados({
        confirmacao: campoConfirmacao.value,
        senha: campoSenha.value,
      });

      if (tratarSessaoExpirada(resposta)) return;

      if (resposta.ok) {
        fecharModalZerarDados();
        cacheTendencia.clear();
        cacheComparativo6.clear();
        await mostrarAviso("Todos os dados financeiros foram apagados. As categorias voltaram ao padrão.");
        carregarListaCategorias();
        if (typeof atualizarDashboardAposMudanca === "function") {
          atualizarDashboardAposMudanca({
            tipo: "admin",
            recarregarLista: true,
            entidadesAfetadas: ["despesas-fixas", "compras-parceladas", "bonificacoes", "orcamentos", "metas", "cartoes"],
          });
        } else {
          await recarregarLancamentosAposMutacao();
        }
      } else {
        const erro = await resposta.json();
        definirErroZerarDados(erro?.erro || "Não foi possível apagar os dados.");
      }
    } catch (erro) {
      console.error(erro);
      definirErroZerarDados("Erro de conexão ao apagar os dados.");
    } finally {
      btnConfirmar.innerText = "Apagar tudo permanentemente";
      atualizarBotaoConfirmarZerar();
    }
  });
}
