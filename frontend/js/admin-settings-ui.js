// ==========================================
// admin-settings-ui.js - Abas e preferências do admin/configurações
// ==========================================
function configurarSubAbasAdmin() {
  const navItems = document.querySelectorAll(".settings-nav-item");

  function carregarPainelSettings(painelId) {
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
      container.innerHTML = '<span class="dica-campo">Nenhuma carteira encontrada.</span>';
      return;
    }
    container.innerHTML = carteiras.map(c => `
      <div class="linha-item linha-usuario" style="border-bottom:1px solid var(--cor-pauta-fraca)">
        <div class="fixa-conteudo">
          <span class="item-descricao">${escaparHtml(c.nome)}</span>
          <span class="item-categoria">${c.tipo === "compartilhada" ? "Compartilhada" : "Pessoal"}</span>
        </div>
      </div>
    `).join("");
  } catch (erro) {
    container.innerHTML = '<span class="dica-campo">Erro ao carregar.</span>';
  }
}

const btnNovaCarteiraSettings = document.getElementById("btn-nova-carteira-settings");
if (btnNovaCarteiraSettings) {
  btnNovaCarteiraSettings.addEventListener("click", () => {
    abrirModalCarteira();
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
      container.innerHTML = '<span class="dica-campo">Nenhum cartão cadastrado.</span>';
      return;
    }
    container.innerHTML = cartoes.map(c => `
      <div class="linha-item linha-usuario" style="border-bottom:1px solid var(--cor-pauta-fraca)">
        <div class="fixa-conteudo">
          <span class="item-descricao">${escaparHtml(c.nome)}</span>
          <span class="item-categoria">Fecha dia ${c.dia_fechamento || "—"} · Vence dia ${c.dia_vencimento || "—"}</span>
        </div>
      </div>
    `).join("");
  } catch (erro) {
    container.innerHTML = '<span class="dica-campo">Erro ao carregar.</span>';
  }
}

const btnNovoCartaoSettings = document.getElementById("btn-novo-cartao-settings");
if (btnNovoCartaoSettings) {
  btnNovoCartaoSettings.addEventListener("click", () => {
    abrirModalCartao(false);
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
    await abrirModalMeta("", "", "");
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
      container.innerHTML = '<span class="dica-campo">Nenhum orçamento para este mês.</span>';
      return;
    }
    container.innerHTML = orcamentos.map(o => {
      const pct = o.limite > 0 ? Math.min(100, Math.round((o.gasto / o.limite) * 100)) : 0;
      const cor = pct >= 90 ? "var(--cor-despesa)" : pct >= 70 ? "var(--cor-pendente)" : "var(--cor-receita)";
      return `
        <div class="linha-item linha-usuario" style="border-bottom:1px solid var(--cor-pauta-fraca)">
          <div class="fixa-conteudo">
            <span class="item-descricao">${escaparHtml(o.categoria)}</span>
            <span class="item-categoria">${formatadorBRL.format(o.gasto)} / ${formatadorBRL.format(o.limite)} (${pct}%)</span>
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
  btnNovoOrcamentoSettings.addEventListener("click", () => {
    abrirModalOrcamento();
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

  if (!btnAbrir || !modal || !btnFechar || !btnConfirmar || !campoConfirmacao) return;

  btnAbrir.innerText = "Limpeza global desativada";
  btnAbrir.title = "A limpeza global foi removida do fluxo normal por segurança.";
  btnAbrir.addEventListener("click", async () => {
    await mostrarAviso("A limpeza global de dados foi desativada por segurança. Para manutenção, use uma rotina administrativa isolada, com backup e auditoria.");
  });
  return;

  function fecharModalZerarDados() {
    modal.style.display = "none";
    liberarFoco();
    campoConfirmacao.value = "";
    btnConfirmar.disabled = true;
  }

  btnAbrir.addEventListener("click", () => {
    campoConfirmacao.value = "";
    btnConfirmar.disabled = true;
    modal.style.display = "flex";
    trapFoco(modal);
  });

  btnFechar.addEventListener("click", fecharModalZerarDados);

  campoConfirmacao.addEventListener("input", () => {
    btnConfirmar.disabled = campoConfirmacao.value !== FRASE_CONFIRMACAO_ZERAR;
  });

  btnConfirmar.addEventListener("click", async () => {
    if (campoConfirmacao.value !== FRASE_CONFIRMACAO_ZERAR) return;

    btnConfirmar.disabled = true;
    btnConfirmar.innerText = "Apagando...";

    try {
      const resposta = await CadimusAdminApi.zerarDados(campoConfirmacao.value);

      if (tratarSessaoExpirada(resposta)) return;

      if (resposta.ok) {
        fecharModalZerarDados();
        cacheTendencia.clear();
        cacheComparativo6.clear();
        await mostrarAviso("Todos os dados financeiros foram apagados. As categorias voltaram ao padrão.");
        carregarListaCategorias();
        await recarregarLancamentosAposMutacao();
      } else {
        const erro = await resposta.json();
        await mostrarAviso(`Erro: ${erro.erro}`);
      }
    } catch (erro) {
      console.error(erro);
      await mostrarAviso("Erro de conexão ao apagar os dados.");
    } finally {
      btnConfirmar.innerText = "Apagar tudo permanentemente";
      btnConfirmar.disabled = campoConfirmacao.value !== FRASE_CONFIRMACAO_ZERAR;
    }
  });
}
