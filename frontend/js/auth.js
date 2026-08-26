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
    window.dispatchEvent(new CustomEvent("cadimus:usuario-logado", { detail: { usuario: u } }));
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
  const loginSection = document.getElementById("login-section");
  const loginBox = document.getElementById("login-box");
  const campoUsuarioLogin = document.getElementById("usuario");
  const campoSenhaLogin = document.getElementById("senha");
  const feedbackLogin = document.getElementById("login-feedback");
  const avisoCapsLockLogin = document.getElementById("login-capslock");
  const botaoSubmitLogin = fLogin?.querySelector('button[type="submit"]');
  const btnTemaLogin = document.getElementById("login-theme-toggle");
  const fluxoLoginLabel = document.getElementById("login-fluxo-label");
  const fluxoLoginValor = document.getElementById("login-fluxo-valor");
  const barrasFluxoLogin = document.querySelectorAll(".login-painel-grafico span");
  let loginEmAndamento = false;
  const cenariosFluxoLogin = [
    { label: "Fluxo do mês", valor: "R$ 8.420", alturas: ["34%", "58%", "46%", "72%", "62%", "86%"] },
    { label: "Receitas previstas", valor: "R$ 12.350", alturas: ["42%", "64%", "52%", "78%", "74%", "92%"] },
    { label: "Despesas no radar", valor: "R$ 3.180", alturas: ["28%", "44%", "66%", "38%", "58%", "48%"] },
    { label: "Saldo projetado", valor: "R$ 5.240", alturas: ["36%", "54%", "68%", "60%", "76%", "82%"] },
  ];
  let indiceFluxoLogin = 0;
  let timerFluxoLogin = null;
  const reduzirMovimentoLogin = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const ICONE_TEMA_LUA = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>';
  const ICONE_TEMA_SOL = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';

  function definirEstadoLogin(estado, classePulso = "") {
    if (!loginBox) return;
    loginBox.dataset.estado = estado;
    if (!classePulso) return;
    loginBox.classList.remove(classePulso);
    void loginBox.offsetWidth;
    loginBox.classList.add(classePulso);
  }

  function definirCamposLoginInvalidos(invalidos = []) {
    const idsInvalidos = new Set(invalidos);
    campoUsuarioLogin?.setAttribute("aria-invalid", idsInvalidos.has("usuario") ? "true" : "false");
    campoSenhaLogin?.setAttribute("aria-invalid", idsInvalidos.has("senha") ? "true" : "false");
  }

  function definirFeedbackLogin(mensagem = "", camposInvalidos = []) {
    if (!feedbackLogin) return;
    const texto = String(mensagem || "").trim();
    feedbackLogin.textContent = texto;
    feedbackLogin.hidden = !texto;
    definirCamposLoginInvalidos(texto ? camposInvalidos : []);
  }

  function definirCarregamentoLogin(carregando) {
    loginEmAndamento = carregando;
    fLogin?.classList.toggle("login-form-carregando", carregando);
    fLogin?.setAttribute("aria-busy", String(carregando));

    if (!botaoSubmitLogin) return;
    botaoSubmitLogin.disabled = carregando;
    botaoSubmitLogin.setAttribute("aria-disabled", String(carregando));
    botaoSubmitLogin.innerHTML = carregando
      ? '<span class="login-spinner" aria-hidden="true"></span><span>Entrando...</span>'
      : "Entrar";
  }

  function mensagemErroLogin(resposta, dados) {
    if (!resposta) {
      return "Não foi possível conectar ao Cadimus. Confira sua internet e tente novamente.";
    }

    if (resposta.status === 400) return dados?.erro || "Informe usuário e senha para continuar.";
    if (resposta.status === 401) return "Usuário ou senha incorretos. Confira os dados e tente novamente.";
    if (resposta.status === 403) return dados?.erro || "Esta conta não está ativa. Fale com um administrador.";
    if (resposta.status === 429) return "Muitas tentativas de login. Aguarde alguns minutos, confira usuário e senha ou recupere o acesso.";
    if (resposta.status >= 500) return "O servidor do Cadimus não respondeu como esperado. Tente novamente em instantes.";

    return dados?.erro || "Não foi possível entrar agora. Tente novamente.";
  }

  function atualizarEstadoCamposLogin() {
    if (!loginBox || document.activeElement === campoSenhaLogin) return;
    if (document.activeElement === campoUsuarioLogin) {
      definirEstadoLogin("usuario");
      return;
    }
    definirEstadoLogin("idle");
  }

  function aplicarCenarioFluxoLogin(indice) {
    if (!fluxoLoginLabel || !fluxoLoginValor || !barrasFluxoLogin.length) return;
    const cenario = cenariosFluxoLogin[indice % cenariosFluxoLogin.length];
    fluxoLoginValor.classList.add("atualizando");
    setTimeout(() => {
      fluxoLoginLabel.textContent = cenario.label;
      fluxoLoginValor.textContent = cenario.valor;
      barrasFluxoLogin.forEach((barra, i) => {
        barra.style.setProperty("--altura", cenario.alturas[i] || cenario.alturas.at(-1));
      });
      fluxoLoginValor.classList.remove("atualizando");
    }, 220);
  }

  function iniciarFluxoLoginAnimado() {
    if (!fluxoLoginValor || timerFluxoLogin) return;
    timerFluxoLogin = setInterval(() => {
      indiceFluxoLogin = (indiceFluxoLogin + 1) % cenariosFluxoLogin.length;
      aplicarCenarioFluxoLogin(indiceFluxoLogin);
    }, 3200);
  }

  function pararFluxoLoginAnimado() {
    clearInterval(timerFluxoLogin);
    timerFluxoLogin = null;
  }

  function atualizarParallaxLogin(evento) {
    if (!loginBox || reduzirMovimentoLogin) return;
    const rect = loginBox.getBoundingClientRect();
    const centroX = rect.left + rect.width / 2;
    const centroY = rect.top + rect.height / 2;
    const deslocamentoX = ((evento.clientX - centroX) / rect.width) * 14;
    const deslocamentoY = ((evento.clientY - centroY) / rect.height) * 12;
    loginBox.style.setProperty("--login-parallax-x", `${deslocamentoX.toFixed(2)}px`);
    loginBox.style.setProperty("--login-parallax-y", `${deslocamentoY.toFixed(2)}px`);
  }

  function resetarParallaxLogin() {
    if (!loginBox) return;
    loginBox.style.setProperty("--login-parallax-x", "0px");
    loginBox.style.setProperty("--login-parallax-y", "0px");
  }

  function atualizarParallaxFundoLogin(evento) {
    if (!loginSection || reduzirMovimentoLogin) return;
    const rect = loginSection.getBoundingClientRect();
    const centroX = rect.left + rect.width / 2;
    const centroY = rect.top + rect.height / 2;
    const deslocamentoX = ((evento.clientX - centroX) / rect.width) * 28;
    const deslocamentoY = ((evento.clientY - centroY) / rect.height) * 24;
    loginSection.style.setProperty("--login-bg-parallax-x", `${deslocamentoX.toFixed(2)}px`);
    loginSection.style.setProperty("--login-bg-parallax-y", `${deslocamentoY.toFixed(2)}px`);
  }

  function resetarParallaxFundoLogin() {
    if (!loginSection) return;
    loginSection.style.setProperty("--login-bg-parallax-x", "0px");
    loginSection.style.setProperty("--login-bg-parallax-y", "0px");
  }

  function atualizarSeletorTemaLogin() {
    if (!btnTemaLogin) return;
    const estaEscuro = document.body.classList.contains("dark-mode");
    btnTemaLogin.classList.toggle("tema-switch-escuro", estaEscuro);
    btnTemaLogin.setAttribute("aria-pressed", String(estaEscuro));
    btnTemaLogin.title = estaEscuro ? "Tema escuro ativo. Clique para usar tema claro." : "Tema claro ativo. Clique para usar tema escuro.";
    btnTemaLogin.innerHTML = `
      <span class="tema-switch-trilho" aria-hidden="true">
        <span class="tema-switch-opcao tema-switch-sol">${ICONE_TEMA_SOL}</span>
        <span class="tema-switch-opcao tema-switch-lua">${ICONE_TEMA_LUA}</span>
        <span class="tema-switch-thumb"></span>
      </span>
    `;
  }

  function lerTemaLoginSalvo() {
    try {
      return window.localStorage?.getItem("cadimus_tema");
    } catch {
      return lerLocalStorageSeguro("cadimus_tema");
    }
  }

  function gravarTemaLogin(tema) {
    gravarLocalStorageSeguro("cadimus_tema", tema);
    try {
      window.localStorage?.setItem("cadimus_tema", tema);
    } catch {
      // O helper seguro acima já mantém o app funcionando quando storage não está disponível.
    }
  }

  if (lerTemaLoginSalvo() === "dark") {
    document.body.classList.add("dark-mode");
  }
  atualizarSeletorTemaLogin();
  btnTemaLogin?.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    gravarTemaLogin(document.body.classList.contains("dark-mode") ? "dark" : "light");
    atualizarSeletorTemaLogin();
    if (typeof atualizarSeletorTemaTopo === "function") atualizarSeletorTemaTopo();
    if (typeof sincronizarToggleTema === "function") sincronizarToggleTema();
  });

  iniciarFluxoLoginAnimado();
  loginSection?.addEventListener("pointermove", atualizarParallaxFundoLogin);
  loginSection?.addEventListener("pointerleave", resetarParallaxFundoLogin);
  loginBox?.addEventListener("pointermove", atualizarParallaxLogin);
  loginBox?.addEventListener("pointerleave", resetarParallaxLogin);

  campoUsuarioLogin?.addEventListener("focus", () => definirEstadoLogin("usuario"));
  campoUsuarioLogin?.addEventListener("input", () => {
    definirEstadoLogin("usuario");
    definirFeedbackLogin();
    campoUsuarioLogin.setAttribute("aria-invalid", "false");
  });
  campoUsuarioLogin?.addEventListener("blur", atualizarEstadoCamposLogin);
  campoSenhaLogin?.addEventListener("focus", () => definirEstadoLogin(campoSenhaLogin.type === "text" ? "visivel" : "senha"));
  campoSenhaLogin?.addEventListener("input", () => {
    definirEstadoLogin(campoSenhaLogin.type === "text" ? "visivel" : "senha");
    definirFeedbackLogin();
    campoSenhaLogin.setAttribute("aria-invalid", "false");
  });
  campoSenhaLogin?.addEventListener("blur", atualizarEstadoCamposLogin);

  function atualizarAvisoCapsLock(evento) {
    if (!avisoCapsLockLogin || !evento.getModifierState) return;
    avisoCapsLockLogin.hidden = !evento.getModifierState("CapsLock");
  }

  campoSenhaLogin?.addEventListener("keydown", atualizarAvisoCapsLock);
  campoSenhaLogin?.addEventListener("keyup", atualizarAvisoCapsLock);
  campoSenhaLogin?.addEventListener("blur", () => {
    if (avisoCapsLockLogin) avisoCapsLockLogin.hidden = true;
  });

  document.querySelectorAll("[data-login-social]").forEach((botao) => {
    botao.addEventListener("click", async () => {
      definirEstadoLogin("usuario");
      const provedor = botao.dataset.loginSocial === "apple" ? "Apple" : "Gmail";
      const mensagem = `Login com ${provedor} ainda não está disponível.`;
      if (typeof mostrarAviso === "function") {
        await mostrarAviso(mensagem);
      } else {
        alert(mensagem);
      }
    });
  });

  if (fLogin) {
    fLogin.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (loginEmAndamento) return;
      definirFeedbackLogin();
      const usuario = campoUsuarioLogin?.value.trim() || "";
      const senha = campoSenhaLogin?.value || "";

      if (!usuario || !senha) {
        definirEstadoLogin("erro", "login-erro");
        const camposInvalidos = !usuario && !senha ? ["usuario", "senha"] : !usuario ? ["usuario"] : ["senha"];
        definirFeedbackLogin(!usuario && !senha ? "Informe usuário e senha para entrar." : !usuario ? "Informe seu usuário para entrar." : "Informe sua senha para entrar.", camposInvalidos);
        (!usuario ? campoUsuarioLogin : campoSenhaLogin)?.focus();
        setTimeout(atualizarEstadoCamposLogin, 900);
        return;
      }

      definirEstadoLogin("senha");
      definirCarregamentoLogin(true);

      try {
        const res = await CadimusAuthApi.login({ usuario, senha });
        const d = await res.json().catch(() => null);
        if (res.ok) {
          definirEstadoLogin("sucesso", "login-sucesso");
          pararFluxoLoginAnimado();
          salvarSessao(d.token, d.usuario);
          alternarTelas(true);
        } else {
          definirEstadoLogin("erro", "login-erro");
          definirFeedbackLogin(mensagemErroLogin(res, d), ["usuario", "senha"]);
          campoSenhaLogin?.focus();
          setTimeout(atualizarEstadoCamposLogin, 900);
        }
      } catch (erro) {
        console.error("Erro ao fazer login:", erro);
        definirEstadoLogin("erro", "login-erro");
        definirFeedbackLogin(mensagemErroLogin(null));
        setTimeout(atualizarEstadoCamposLogin, 900);
      } finally {
        definirCarregamentoLogin(false);
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

  const ICONE_SENHA_VISIVEL = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/></svg>';
  const ICONE_SENHA_OCULTA = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 3l18 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M10.7 5.2A10.7 10.7 0 0 1 12 5c6 0 9.5 7 9.5 7a16.2 16.2 0 0 1-2.7 3.5M6.5 6.7C3.9 8.4 2.5 12 2.5 12s3.5 7 9.5 7c1.6 0 3-.4 4.2-1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  function atualizarBotaoSenha(botao, mostrando) {
    botao.setAttribute("aria-label", mostrando ? "Ocultar senha" : "Mostrar senha");
    botao.setAttribute("aria-pressed", String(mostrando));
    botao.classList.toggle("senha-visivel", mostrando);
    botao.title = mostrando ? "Ocultar senha" : "Mostrar senha";
    botao.innerHTML = mostrando ? ICONE_SENHA_OCULTA : ICONE_SENHA_VISIVEL;
  }

  // Mostrar/ocultar senha (funciona em qualquer campo de senha da página,
  // não só na tela de redefinir — basta ter o botão .btn-toggle-senha do lado)
  document.querySelectorAll(".btn-toggle-senha").forEach((botao) => {
    atualizarBotaoSenha(botao, false);
    botao.addEventListener("click", () => {
      const alvo = document.getElementById(botao.dataset.alvo);
      if (!alvo) return;
      const mostrando = alvo.type === "text";
      alvo.type = mostrando ? "password" : "text";
      atualizarBotaoSenha(botao, !mostrando);
      if (alvo.id === "senha") {
        definirEstadoLogin(alvo.type === "text" ? "visivel" : "senha");
      }
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
