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
  const paginaStandalone = document.body?.dataset?.cadimusPage || "";
  const paginaLogin = paginaStandalone === "login";
  const secaoStandalone = paginaStandalone ? document.getElementById(`${paginaStandalone}-section`) : null;

  if (paginaStandalone === "cadastro" || paginaStandalone === "redefinir-senha") return;

  if (paginaLogin) {
    if (estaLogado) {
      window.location.href = "index.html";
      return;
    }

    if (sLogin) sLogin.style.display = "flex";
    if (footer) footer.style.display = "flex";
    return;
  }

  if (paginaStandalone) {
    if (!estaLogado) {
      window.location.href = "login.html";
      return;
    }

    if (sLogin) sLogin.style.display = "none";
    if (sDash) sDash.style.display = "none";
    if (sAdmin) sAdmin.style.display = "none";
    if (secaoStandalone) {
      secaoStandalone.style.display = "flex";
      secaoStandalone.style.flexDirection = "column";
    }
    if (footer) footer.style.display = "flex";

    const u = obterUsuarioLogado();
    if (bAdmin) bAdmin.style.display = u.perfil === "superadmin" ? "inline-block" : "none";
    atualizarAvatarTopo(u);
    window.dispatchEvent(new CustomEvent("cadimus:usuario-logado", { detail: { usuario: u } }));
    if (window.carregarCarteiras) window.carregarCarteiras();
    return;
  }

  if (estaLogado) {
    if (sLogin) sLogin.style.display = "none";
    if (sDash) sDash.style.display = "block";
    if (sAdmin) sAdmin.style.display = "none";
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
    if (!sLogin) {
      window.location.href = "login.html";
      return;
    }
    sLogin.style.display = "flex"; // Garante o centro da tela
    if (sDash) sDash.style.display = "none";
    if (sAdmin) sAdmin.style.display = "none";
    if (footer) footer.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", () => {
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
      window.location.href = "relatorios.html";
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
  window.location.href = "configuracoes.html";
}

function abrirPerfilUsuario() {
  const secaoDashboard = document.getElementById("dashboard-section");
  const secaoAdmin = document.getElementById("admin-section");
  if (!secaoAdmin) {
    sessionStorage.setItem("cadimus_abrir_perfil", "1");
    window.location.href = "configuracoes.html";
    return;
  }
  if (secaoDashboard) secaoDashboard.style.display = "none";
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
