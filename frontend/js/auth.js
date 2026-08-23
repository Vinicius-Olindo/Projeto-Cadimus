// ==========================================
// SANITIZAÇÃO DE URL — previne XSS via CSS injection
// ==========================================
function sanitizarUrl(url) {
  if (!url || typeof url !== "string") return "";
  const trimada = url.trim();
  if (!trimada) return "";

  try {
    const parsed = new URL(trimada);
    if (!["http:", "https:", "data:"].includes(parsed.protocol)) return "";
    return trimada;
  } catch {
    return "";
  }
}

// ==========================================
// SESSÃO via sessionStorage — sobrevive a reload e F5,
// mas é apagada ao fechar a aba/navegador.
// ==========================================
const sessaoMemoria = {
  token: null,
  usuario: null,
};

const TEMPO_LIMITE_INATIVIDADE_MS = 30 * 60 * 1000;
const EVENTOS_ATIVIDADE_SESSAO = ["click", "keydown", "mousemove", "mousedown", "scroll", "touchstart"];
let timerInatividadeSessao = null;
let ultimoRegistroAtividadeSessao = 0;

function lerStorageSeguro(storage, chave, fallback = null) {
  try {
    return storage.getItem(chave);
  } catch {
    return fallback;
  }
}

function gravarStorageSeguro(storage, chave, valor) {
  try {
    storage.setItem(chave, valor);
  } catch {
    // Em contextos restritos, mantém o app funcionando apenas em memória.
  }
}

function removerStorageSeguro(storage, chave) {
  try {
    storage.removeItem(chave);
  } catch {
    // Em contextos restritos, mantém o app funcionando apenas em memória.
  }
}

function lerLocalStorageSeguro(chave, fallback = null) {
  return lerStorageSeguro(localStorage, chave, fallback);
}

function gravarLocalStorageSeguro(chave, valor) {
  gravarStorageSeguro(localStorage, chave, valor);
}

function removerLocalStorageSeguro(chave) {
  removerStorageSeguro(localStorage, chave);
}

function lerSessionStorageSeguro(chave, fallback = null) {
  return lerStorageSeguro(sessionStorage, chave, fallback);
}

function gravarSessionStorageSeguro(chave, valor) {
  gravarStorageSeguro(sessionStorage, chave, valor);
}

function removerSessionStorageSeguro(chave) {
  removerStorageSeguro(sessionStorage, chave);
}

function obterToken() {
  if (sessaoMemoria.token) {
    if (sessaoExpiradaPorInatividade()) {
      limparSessao();
      return null;
    }
    return sessaoMemoria.token;
  }
  const salvo = lerSessionStorageSeguro("sessao");
  if (salvo) {
    try {
      const dados = JSON.parse(salvo);
      if (sessaoExpiradaPorInatividade(dados)) {
        limparSessao();
        return null;
      }
      sessaoMemoria.token = dados.token;
      sessaoMemoria.usuario = dados.usuario;
      return dados.token;
    } catch (e) { /* ignora JSON inválido */ }
  }
  return null;
}

function obterUsuarioLogado() {
  if (sessaoMemoria.usuario) return sessaoMemoria.usuario;
  obterToken();
  return sessaoMemoria.usuario || {};
}

function salvarSessao(token, usuario) {
  sessaoMemoria.token = token;
  sessaoMemoria.usuario = usuario;
  gravarSessionStorageSeguro("sessao", JSON.stringify({ token, usuario, ultimaAtividade: Date.now() }));
  iniciarMonitoramentoInatividade();
}

function limparSessao() {
  sessaoMemoria.token = null;
  sessaoMemoria.usuario = null;
  removerSessionStorageSeguro("sessao");
  pararMonitoramentoInatividade();
}

function lerDadosSessao() {
  try {
    return JSON.parse(lerSessionStorageSeguro("sessao", "{}") || "{}");
  } catch {
    return {};
  }
}

function sessaoExpiradaPorInatividade(dadosSessao = lerDadosSessao()) {
  if (!dadosSessao?.token) return false;
  const ultimaAtividade = Number(dadosSessao.ultimaAtividade || 0);
  return !ultimaAtividade || Date.now() - ultimaAtividade >= TEMPO_LIMITE_INATIVIDADE_MS;
}

function registrarAtividadeSessao({ forcar = false } = {}) {
  if (!sessaoMemoria.token && !lerSessionStorageSeguro("sessao")) return;

  const agora = Date.now();
  if (!forcar && agora - ultimoRegistroAtividadeSessao < 15000) return;
  ultimoRegistroAtividadeSessao = agora;

  const sessao = lerDadosSessao();
  if (!sessao.token) return;
  sessao.ultimaAtividade = agora;
  gravarSessionStorageSeguro("sessao", JSON.stringify(sessao));
  agendarExpiracaoPorInatividade();
}

function agendarExpiracaoPorInatividade() {
  clearTimeout(timerInatividadeSessao);
  const sessao = lerDadosSessao();
  if (!sessao.token) return;

  const ultimaAtividade = Number(sessao.ultimaAtividade || Date.now());
  const restante = Math.max(0, TEMPO_LIMITE_INATIVIDADE_MS - (Date.now() - ultimaAtividade));
  timerInatividadeSessao = setTimeout(expirarSessaoPorInatividade, restante + 250);
}

async function expirarSessaoPorInatividade() {
  if (!sessaoExpiradaPorInatividade()) {
    agendarExpiracaoPorInatividade();
    return;
  }

  try {
    if (obterToken()) await CadimusAuthApi.logout();
  } catch (erro) {
    console.warn("Não foi possível encerrar a sessão expirada no servidor:", erro);
  }

  limparSessao();
  alternarTelas(false);
  if (typeof mostrarAviso === "function") {
    await mostrarAviso("Sua sessão expirou por inatividade. Faça login novamente.");
  }
}

function iniciarMonitoramentoInatividade() {
  pararMonitoramentoInatividade();
  registrarAtividadeSessao({ forcar: true });
  EVENTOS_ATIVIDADE_SESSAO.forEach((evento) => {
    window.addEventListener(evento, registrarAtividadeSessao, { passive: true });
  });
  agendarExpiracaoPorInatividade();
}

function pararMonitoramentoInatividade() {
  clearTimeout(timerInatividadeSessao);
  timerInatividadeSessao = null;
  EVENTOS_ATIVIDADE_SESSAO.forEach((evento) => {
    window.removeEventListener(evento, registrarAtividadeSessao);
  });
}

function atualizarAvatarTopo(usuario) {
  const avatar = document.getElementById("avatar-usuario-logado");
  if (!avatar) return;

  const nomeExibicao = usuario.nome || usuario.nome_usuario || "";
  avatar.title = nomeExibicao;

  const fotoSegura = sanitizarUrl(usuario.foto_perfil);
  if (fotoSegura) {
    avatar.classList.remove("avatar-vazio");
    avatar.style.backgroundImage = `url("${fotoSegura}")`;
    avatar.textContent = "";
  } else {
    avatar.classList.add("avatar-vazio");
    avatar.style.backgroundImage = "";
    avatar.textContent = nomeExibicao.charAt(0).toUpperCase();
  }

  const ddNome = document.getElementById("dropdown-avatar-nome");
  const ddEmail = document.getElementById("dropdown-avatar-email");
  const ddFoto = document.getElementById("dropdown-avatar-img");
  if (ddNome) ddNome.textContent = nomeExibicao;
  if (ddEmail) ddEmail.textContent = usuario.usuario || "";
  if (ddFoto) {
    ddFoto.title = nomeExibicao;
    if (fotoSegura) {
      ddFoto.classList.remove("avatar-vazio");
      ddFoto.style.backgroundImage = `url("${fotoSegura}")`;
      ddFoto.textContent = "";
    } else {
      ddFoto.classList.add("avatar-vazio");
      ddFoto.style.backgroundImage = "";
      ddFoto.textContent = nomeExibicao.charAt(0).toUpperCase();
    }
  }
}

function alternarTelas(estaLogado) {
  const sLogin = document.getElementById("login-section");
  const sDash = document.getElementById("dashboard-section");
  const sAdmin = document.getElementById("admin-section");
  const bAdmin = document.getElementById("btn-admin");
  const footer = document.getElementById("app-footer");

  if (estaLogado) {
    sLogin.style.display = "none";
    sDash.style.display = "block";
    sAdmin.style.display = "none";
    if (footer) footer.style.display = "flex";

    const u = obterUsuarioLogado();
    if (bAdmin) bAdmin.style.display = u.perfil === "superadmin" ? "inline-block" : "none";
    atualizarAvatarTopo(u);
    if (window.carregarCarteiras) window.carregarCarteiras();

    // Busca dados completos do usuário para atualizar avatar (foto pode não estar na sessão)
    async function atualizarAvatarCompleto() {
      try {
        const res = await CadimusAdminApi.buscarMeuPerfil();
        if (!res.ok) return;
        const dados = await res.json();
        // Atualiza sessão com dados completos
        const sessao = JSON.parse(lerSessionStorageSeguro("sessao", "{}") || "{}");
        if (sessao.usuario) {
          sessao.usuario.foto_perfil = dados.foto_perfil;
          sessao.usuario.email = dados.email;
          sessao.usuario.telefone = dados.telefone;
          sessao.usuario.salario = dados.salario;
          sessao.ultimaAtividade = sessao.ultimaAtividade || Date.now();
          gravarSessionStorageSeguro("sessao", JSON.stringify(sessao));
        }
        atualizarAvatarTopo(dados);
      } catch (erro) {
        console.error("Erro ao atualizar avatar:", erro);
      }
    }
    atualizarAvatarCompleto();

    // Onboarding: só após login bem-sucedido
    if (window.iniciarOnboarding) {
      setTimeout(() => window.iniciarOnboarding(), 1500);
    }
  } else {
    sLogin.style.display = "flex"; // Garante o centro da tela
    sDash.style.display = "none";
    sAdmin.style.display = "none";
    if (footer) footer.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const fLogin = document.getElementById("login-form");
  if (fLogin) {
    fLogin.addEventListener("submit", async (e) => {
      e.preventDefault();
      const usuario = document.getElementById("usuario").value;
      const senha = document.getElementById("senha").value;
      const res = await CadimusAuthApi.login({ usuario, senha });
      const d = await res.json();
      if (res.ok) {
        salvarSessao(d.token, d.usuario);
        alternarTelas(true);
      } else {
        if (typeof mostrarAviso === "function") {
          await mostrarAviso(d.erro);
        } else {
          alert(d.erro); // segurança: se por algum motivo main.js não carregou ainda
        }
      }
    });
  }

  const btnAvatar = document.getElementById("btn-avatar-perfil");
  const dropdownAvatar = document.getElementById("dropdown-avatar");
  if (btnAvatar && dropdownAvatar) {
    btnAvatar.addEventListener("click", (e) => {
      e.stopPropagation();
      const aberto = dropdownAvatar.style.display === "block";
      dropdownAvatar.style.display = aberto ? "none" : "block";
    });

    document.addEventListener("click", (e) => {
      if (!dropdownAvatar.contains(e.target) && e.target !== btnAvatar && !btnAvatar.contains(e.target)) {
        dropdownAvatar.style.display = "none";
      }
    });

    document.getElementById("dropdown-btn-config")?.addEventListener("click", () => {
      dropdownAvatar.style.display = "none";
      abrirConfiguracoesAdmin();
    });

    document.getElementById("dropdown-btn-importar")?.addEventListener("click", () => {
      dropdownAvatar.style.display = "none";
      document.getElementById("btn-importar-extrato")?.click();
    });

    document.getElementById("dropdown-btn-exportar")?.addEventListener("click", () => {
      dropdownAvatar.style.display = "none";
      document.getElementById("btn-exportar-extrato")?.click();
    });

    document.getElementById("dropdown-btn-relatorio")?.addEventListener("click", () => {
      dropdownAvatar.style.display = "none";
      const secaoDash = document.getElementById("dashboard-section");
      const secaoRel = document.getElementById("relatorios-section");
      if (secaoDash && secaoRel) {
        secaoDash.style.display = "none";
        secaoRel.style.display = "flex";
        secaoRel.style.flexDirection = "column";
        if (window.inicializarFiltrosRelatorio) window.inicializarFiltrosRelatorio();
        if (window.carregarDadosRelatorio) window.carregarDadosRelatorio();
      }
    });

    document.getElementById("dropdown-btn-sair")?.addEventListener("click", async () => {
      dropdownAvatar.style.display = "none";
      const token = obterToken();
      if (token) {
        try {
          await CadimusAuthApi.logout();
        } catch (erro) {
          console.error("Erro ao encerrar sessão no servidor:", erro);
        }
      }
      limparSessao();
      alternarTelas(false);
    });
  }

  // ==========================================
  // ESQUECI MINHA SENHA
  // ==========================================
  const modalEsqueciSenha = document.getElementById("modal-esqueci-senha");
  const formEsqueciSenha = document.getElementById("form-esqueci-senha");

  document.getElementById("link-esqueci-senha")?.addEventListener("click", () => {
    if (modalEsqueciSenha) {
      modalEsqueciSenha.style.display = "flex";
      trapFoco(modalEsqueciSenha);
    }
  });

  document.getElementById("btn-fechar-modal-esqueci-senha")?.addEventListener("click", () => {
    if (modalEsqueciSenha) {
      modalEsqueciSenha.style.display = "none";
      liberarFoco();
    }
    formEsqueciSenha?.reset();
  });

  formEsqueciSenha?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("esqueci-email").value.trim();
    const btnEnviar = document.getElementById("btn-enviar-recuperacao");

    btnEnviar.disabled = true;
    btnEnviar.innerText = "Enviando...";

    try {
      const res = await CadimusAuthApi.solicitarRecuperacaoSenha(email);
      const d = await res.json();

      if (modalEsqueciSenha) modalEsqueciSenha.style.display = "none";
      formEsqueciSenha.reset();
      await mostrarAviso(res.ok ? d.mensagem : d.erro);
    } catch (erro) {
      await mostrarAviso("Falha na comunicação com o servidor.");
    } finally {
      btnEnviar.disabled = false;
      btnEnviar.innerText = "Enviar link de recuperação";
    }
  });

  // ==========================================
  // REDEFINIR SENHA (link do e-mail: ?token=...)
  // ==========================================
  const tokenRecuperacao = new URLSearchParams(window.location.search).get("token");
  const sRedefinir = document.getElementById("redefinir-senha-section");
  const sLoginInicial = document.getElementById("login-section");

  if (tokenRecuperacao && sRedefinir && sLoginInicial) {
    sLoginInicial.style.display = "none";
    sRedefinir.style.display = "flex";
  }

  document.getElementById("link-voltar-login")?.addEventListener("click", () => {
    if (sRedefinir) sRedefinir.style.display = "none";
    if (sLoginInicial) sLoginInicial.style.display = "flex";
    window.history.replaceState({}, "", window.location.pathname);
  });

  // Mostrar/ocultar senha (funciona em qualquer campo de senha da página,
  // não só na tela de redefinir — basta ter o botão .btn-toggle-senha do lado)
  document.querySelectorAll(".btn-toggle-senha").forEach((botao) => {
    botao.addEventListener("click", () => {
      const alvo = document.getElementById(botao.dataset.alvo);
      if (!alvo) return;
      const mostrando = alvo.type === "text";
      alvo.type = mostrando ? "password" : "text";
      botao.setAttribute("aria-label", mostrando ? "Mostrar senha" : "Ocultar senha");
      botao.textContent = mostrando ? "Ver" : "Ocultar";
    });
  });

  // Avisa em tempo real se "nova senha" e "confirmar senha" não coincidem,
  // em vez de só descobrir isso depois de tentar salvar
  const campoNovaSenha = document.getElementById("redefinir-nova-senha");
  const campoConfirmarSenha = document.getElementById("redefinir-confirmar-senha");
  const avisoSenhasDiferentes = document.getElementById("aviso-senhas-diferentes");

  function verificarSenhasCoincidem() {
    if (!campoNovaSenha || !campoConfirmarSenha || !avisoSenhasDiferentes) return true;
    const diferentes = campoConfirmarSenha.value.length > 0 && campoNovaSenha.value !== campoConfirmarSenha.value;
    avisoSenhasDiferentes.style.display = diferentes ? "block" : "none";
    return !diferentes;
  }

  campoNovaSenha?.addEventListener("input", verificarSenhasCoincidem);
  campoConfirmarSenha?.addEventListener("input", verificarSenhasCoincidem);

  document.getElementById("form-redefinir-senha")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const novaSenha = campoNovaSenha.value;
    const confirmar = campoConfirmarSenha.value;
    const btnSalvar = document.getElementById("btn-salvar-nova-senha");

    if (!verificarSenhasCoincidem()) {
      return;
    }

    btnSalvar.disabled = true;
    btnSalvar.innerText = "Salvando...";

    try {
      const res = await CadimusAuthApi.redefinirSenha({ token: tokenRecuperacao, novaSenha });
      const d = await res.json();

      await mostrarAviso(res.ok ? d.mensagem : d.erro);

      if (res.ok) {
        window.history.replaceState({}, "", window.location.pathname);
        if (sRedefinir) sRedefinir.style.display = "none";
        if (sLoginInicial) sLoginInicial.style.display = "flex";
      }
    } catch (erro) {
      await mostrarAviso("Falha na comunicação com o servidor.");
    } finally {
      btnSalvar.disabled = false;
      btnSalvar.innerText = "Salvar nova senha";
    }
  });

  // Verifica se há sessão salva (sessionStorage sobrevive a reload)
  const tokenSessao = obterToken();
  if (tokenSessao) {
    iniciarMonitoramentoInatividade();
    alternarTelas(true);
  } else {
    alternarTelas(false);
  }
});

function abrirConfiguracoesAdmin() {
  const secaoDashboard = document.getElementById("dashboard-section");
  const secaoAdmin = document.getElementById("admin-section");
  if (!secaoDashboard || !secaoAdmin) return;
  secaoDashboard.style.display = "none";
  secaoAdmin.style.display = "flex";
  secaoAdmin.style.flexDirection = "column";
  if (typeof carregarUsuarios === "function") carregarUsuarios();
}

function abrirPerfilUsuario() {
  const secaoDashboard = document.getElementById("dashboard-section");
  const secaoAdmin = document.getElementById("admin-section");
  if (!secaoDashboard || !secaoAdmin) return;
  secaoDashboard.style.display = "none";
  secaoAdmin.style.display = "flex";
  secaoAdmin.style.flexDirection = "column";

  const usuario = obterUsuarioLogado();
  if (!usuario) return;

  const tentarSelecionar = () => {
    const lista = document.getElementById("lista-usuarios");
    if (!lista) return;
    const btnEditar = lista.querySelector(`.btn-editar-usuario[data-id="${usuario.id}"]`);
    if (btnEditar) {
      btnEditar.click();
    } else if (typeof entrarModoEdicaoUsuario === "function") {
      entrarModoEdicaoUsuario(usuario);
    }
  };

  if (typeof carregarUsuarios === "function") {
    carregarUsuarios();
    setTimeout(tentarSelecionar, 500);
  } else {
    tentarSelecionar();
  }
}
