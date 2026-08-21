// ==========================================
// admin-users-ui.js - Usuários e convites do admin
// ==========================================
// --- FORMULÁRIO DE USUÁRIO (criar E editar no mesmo formulário) ---
function configurarFormularioUsuario() {
  const form = document.getElementById("form-perfil-usuario");
  const btnCancelar = document.getElementById("btn-cancelar-edicao");
  const inputFoto = document.getElementById("input-foto-perfil");
  const btnRemoverFoto = document.getElementById("btn-remover-foto");

  if (!form) return;

  btnCancelar?.addEventListener("click", () => sairModoEdicaoUsuario());

  inputFoto?.addEventListener("change", async () => {
    const arquivo = inputFoto.files[0];
    if (!arquivo) return;
    try {
      const dataUrl = await comprimirImagemParaBase64(arquivo);
      definirPreviewFoto(dataUrl);
    } catch (erro) {
      await mostrarAviso("Não foi possível usar essa imagem. Tente outra foto.");
    } finally {
      inputFoto.value = "";
    }
  });

  btnRemoverFoto?.addEventListener("click", () => definirPreviewFoto(null));

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const idEdicao = document.getElementById("usuario-editando-id").value;
    const nome = document.getElementById("novo-nome").value.trim();
    const usuario = document.getElementById("novo-usuario").value.trim();
    const email = document.getElementById("novo-email").value.trim();
    const telefone = document.getElementById("novo-telefone").value.trim();
    const salario = parseFloat(document.getElementById("novo-salario").value) || 0;
    const fotoPerfil = document.getElementById("nova-foto-perfil").value;
    const senha = document.getElementById("nova-senha").value;
    const perfil = document.getElementById("novo-perfil").value;
    const btnSalvar = document.getElementById("btn-salvar-usuario");

    if (!idEdicao && !senha) {
      await mostrarAviso("Defina uma senha para o novo usuário.");
      return;
    }

    btnSalvar.disabled = true;
    btnSalvar.innerText = idEdicao ? "Salvando..." : "Criando...";

    try {
      let resposta;
      const corpo = { nome, usuario, email, telefone, salario, perfil, foto_perfil: fotoPerfil };
      if (senha) corpo.senha = senha;

      if (idEdicao) {
        const usuarioLogado = obterUsuarioLogado();
        const ehProprioPerfil = String(idEdicao) === String(usuarioLogado.id);
        if (ehProprioPerfil && usuarioLogado.perfil !== "superadmin") {
          resposta = await CadimusAdminApi.atualizarMeuPerfil({ nome, email, telefone, salario, foto_perfil: fotoPerfil, ...(senha ? { senha } : {}) });
        } else {
          resposta = await CadimusAdminApi.atualizarUsuario(idEdicao, corpo);
        }
      } else {
        resposta = await CadimusAdminApi.criarUsuario(corpo);
      }

      if (tratarSessaoExpirada(resposta)) return;

      if (resposta.ok) {
        sairModoEdicaoUsuario();
        carregarUsuarios();
        if (idEdicao) {
          const usuarioLogado = obterUsuarioLogado();
          if (String(idEdicao) === String(usuarioLogado.id)) {
            const dadosAtualizados = { ...usuarioLogado };
            if (nome) dadosAtualizados.nome = nome;
            if (fotoPerfil !== undefined) dadosAtualizados.foto_perfil = fotoPerfil || null;
            if (email !== undefined) dadosAtualizados.email = email;
            if (telefone !== undefined) dadosAtualizados.telefone = telefone;
            if (salario !== undefined) dadosAtualizados.salario = salario;
            const token = obterToken();
            sessaoMemoria.usuario = dadosAtualizados;
            gravarSessionStorageSeguro("sessao", JSON.stringify({ token, usuario: dadosAtualizados }));
            atualizarAvatarTopo(dadosAtualizados);
          }
        }
        mostrarToast(idEdicao ? "Usuário atualizado" : "Usuário criado");
      } else {
        const erro = await resposta.json();
        await mostrarAviso(`Erro: ${erro.erro}`);
      }
    } catch (erro) {
      console.error("Erro ao salvar perfil:", erro);
      await mostrarAviso(`Erro ao salvar: ${erro.message || "verifique sua conexão"}`);
    } finally {
      btnSalvar.disabled = false;
      btnSalvar.innerText = idEdicao ? "Salvar edição" : "Criar";
    }
  });
}

// --- SISTEMA DE CONVITES ---
function configurarSistemaConvites() {
  const btnConvidar = document.getElementById("btn-convidar-usuario");
  const modalConvite = document.getElementById("modal-convite");
  const formConvite = document.getElementById("form-convite");
  const btnFecharModal = document.getElementById("btn-fechar-modal-convite");
  const divResultado = document.getElementById("convite-resultado");
  const btnCopiar = document.getElementById("btn-copiar-convite");
  const btnFecharResultado = document.getElementById("btn-fechar-convite-resultado");

  if (!btnConvidar) return;

  btnConvidar.addEventListener("click", () => {
    modalConvite.style.display = "flex";
    formConvite.style.display = "block";
    divResultado.style.display = "none";
    formConvite.reset();
  });

  btnFecharModal?.addEventListener("click", () => {
    modalConvite.style.display = "none";
  });

  formConvite?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = document.getElementById("convite-nome").value.trim();
    const email = document.getElementById("convite-email").value.trim();
    const perfil = document.getElementById("convite-perfil").value;
    const btnGerar = document.getElementById("btn-gerar-convite");

    if (!nome || !email) {
      await mostrarAviso("Preencha nome e e-mail.");
      return;
    }

    btnGerar.disabled = true;
    btnGerar.innerText = "Gerando...";

    try {
      const resposta = await CadimusAdminApi.criarConvite({ nome, email, perfil });

      if (tratarSessaoExpirada(resposta)) return;

      if (resposta.ok) {
        const dados = await resposta.json();
        const linkCompleto = `${window.location.origin}?token=${dados.token}`;
        document.getElementById("convite-link").value = linkCompleto;
        formConvite.style.display = "none";
        divResultado.style.display = "block";
        mostrarToast("Convite gerado com sucesso!");
      } else {
        const erro = await resposta.json();
        await mostrarAviso(`Erro: ${erro.erro}`);
      }
    } catch (erro) {
      await mostrarAviso("Erro de conexão ao gerar convite.");
    } finally {
      btnGerar.disabled = false;
      btnGerar.innerText = "Gerar convite";
    }
  });

  btnCopiar?.addEventListener("click", async () => {
    const link = document.getElementById("convite-link").value;
    try {
      await navigator.clipboard.writeText(link);
      mostrarToast("Link copiado!");
    } catch {
      document.getElementById("convite-link").select();
      document.execCommand("copy");
      mostrarToast("Link copiado!");
    }
  });

  btnFecharResultado?.addEventListener("click", () => {
    modalConvite.style.display = "none";
  });
}

// --- CADASTRO POR CONVITE (página pública) ---
function verificarCadastroConvite() {
  const token = new URLSearchParams(window.location.search).get("token");
  if (!token) return false;

  const sLogin = document.getElementById("login-section");
  const sCadastro = document.getElementById("cadastro-section");
  const sDash = document.getElementById("dashboard-section");
  const sAdmin = document.getElementById("admin-section");

  if (sLogin) sLogin.style.display = "none";
  if (sDash) sDash.style.display = "none";
  if (sAdmin) sAdmin.style.display = "none";
  if (sCadastro) sCadastro.style.display = "flex";

  document.getElementById("cadastro-token").value = token;

  carregarInfoConvite(token);
  configurarFormularioCadastroConvite(token);

  return true;
}

async function carregarInfoConvite(token) {
  const infoEl = document.getElementById("cadastro-convite-info");
  try {
    const resposta = await CadimusAdminApi.buscarConvitePublico(token);
    if (resposta.ok) {
      const dados = await resposta.json();
      infoEl.innerHTML = `Olá, <strong>${dados.nome}</strong>! Você foi convidado(a) para usar o Gestor Financeiro.<br>Crie sua senha para acessar.`;
      document.getElementById("cadastro-nome").value = dados.nome;
    } else {
      const erro = await resposta.json();
      infoEl.innerHTML = `<span class="erro-convite">${erro.erro}</span>`;
      document.getElementById("form-cadastro-convite").style.display = "none";
    }
  } catch {
    infoEl.innerHTML = '<span class="erro-convite">Erro ao validar convite.</span>';
  }
}

function configurarFormularioCadastroConvite(token) {
  const form = document.getElementById("form-cadastro-convite");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = document.getElementById("cadastro-nome").value.trim();
    const usuario = document.getElementById("cadastro-usuario").value.trim();
    const senha = document.getElementById("cadastro-senha").value;
    const confirmarSenha = document.getElementById("cadastro-confirmar-senha").value;
    const btnCriar = form.querySelector("button[type='submit']");
    const erroEl = document.getElementById("cadastro-erro");

    function mostrarErro(msg) {
      erroEl.textContent = msg;
      erroEl.style.display = "block";
    }

    if (!usuario) {
      mostrarErro("Escolha um nome de usuário.");
      return;
    }

    if (senha !== confirmarSenha) {
      mostrarErro("As senhas não coincidem.");
      return;
    }

    if (senha.length < 6) {
      mostrarErro("A senha deve ter ao menos 6 caracteres.");
      return;
    }

    erroEl.style.display = "none";
    btnCriar.disabled = true;
    btnCriar.innerText = "Criando conta...";

    try {
      const resposta = await CadimusAdminApi.aceitarConvitePublico({ token, senha, nome, usuario });

      const dados = await resposta.json();

      if (resposta.ok) {
        mostrarErro("");
        erroEl.style.display = "none";
        form.innerHTML = `<p class="sucesso-convite">Conta criada com sucesso!<br>Seu login: <strong>${dados.usuario}</strong><br><a href="/">Fazer login</a></p>`;
      } else {
        mostrarErro(dados.erro || "Erro ao criar conta.");
      }
    } catch {
      mostrarErro("Erro de conexão. Tente novamente.");
    } finally {
      btnCriar.disabled = false;
      btnCriar.innerText = "Criar conta";
    }
  });
}

function entrarModoEdicaoUsuario(usuario) {
  const secaoAdmin = document.getElementById("admin-section");
  const secaoDash = document.getElementById("dashboard-section");
  if (secaoAdmin && secaoDash) {
    secaoDash.style.display = "none";
    secaoAdmin.style.display = "flex";
    secaoAdmin.style.flexDirection = "column";
  }
  document.querySelectorAll(".settings-nav-item").forEach((t) => t.classList.remove("ativo"));
  const navPerfil = document.querySelector('[data-settings-painel="sp-perfil"]');
  if (navPerfil) navPerfil.classList.add("ativo");
  document.querySelectorAll(".settings-painel").forEach((p) => (p.style.display = "none"));
  const painelPerfil = document.getElementById("sp-perfil");
  if (painelPerfil) painelPerfil.style.display = "block";

  document.getElementById("usuario-editando-id").value = usuario.id;
  document.getElementById("novo-nome").value = usuario.nome || "";
  document.getElementById("novo-usuario").value = usuario.nome_usuario;
  document.getElementById("novo-email").value = usuario.email || "";
  document.getElementById("novo-telefone").value = usuario.telefone || "";
  document.getElementById("novo-salario").value = usuario.salario || "";
  document.getElementById("nova-senha").value = "";
  document.getElementById("novo-perfil").value = usuario.perfil;
  definirPreviewFoto(usuario.foto_perfil || null);
  document.getElementById("dica-senha").style.display = "inline-block";
  document.getElementById("btn-salvar-usuario").innerText = "Salvar edição";
  document.getElementById("btn-cancelar-edicao").style.display = "inline-block";
  document.getElementById("sp-perfil").scrollIntoView({ behavior: "smooth", block: "start" });
}

function sairModoEdicaoUsuario() {
  const form = document.getElementById("form-perfil-usuario");
  if (form) form.reset();
  const el = (id) => document.getElementById(id);
  if (el("usuario-editando-id")) el("usuario-editando-id").value = "";
  definirPreviewFoto(null);
  if (el("dica-senha")) el("dica-senha").style.display = "none";
  if (el("titulo-form-usuario")) el("titulo-form-usuario").innerText = "Perfil";
  if (el("btn-salvar-usuario")) el("btn-salvar-usuario").innerText = "Salvar alterações";
  if (el("btn-cancelar-edicao")) el("btn-cancelar-edicao").style.display = "none";
}


async function carregarUsuarios() {
  const container = document.getElementById("lista-usuarios");
  const badge = document.getElementById("badge-usuarios");
  const campoBusca = document.getElementById("busca-usuarios");
  if (!container) return;

  container.innerHTML = '<div class="estado-vazio-admin"><div class="icone-vazio">👤</div><p>Carregando usuários...</p></div>';

  try {
    const resposta = await CadimusAdminApi.listarUsuarios();
    if (tratarSessaoExpirada(resposta)) return;
    const dados = await resposta.json();

    if (badge) badge.textContent = dados.length;
    container.innerHTML = "";

    if (dados.length === 0) {
      container.innerHTML = '<div class="estado-vazio-admin"><div class="icone-vazio">👤</div><p>Nenhum usuário cadastrado.</p></div>';
      return;
    }

    const usuarioLogado = obterUsuarioLogado();

    function renderizarListaUsuarios(filtro) {
      container.innerHTML = "";
      const termo = (filtro || "").toLowerCase();
      const filtrados = termo ? dados.filter((u) => {
        const texto = `${u.nome || ""} ${u.nome_usuario || ""} ${u.email || ""}`.toLowerCase();
        return texto.includes(termo);
      }) : dados;

      if (filtrados.length === 0) {
        container.innerHTML = '<div class="estado-vazio-admin"><div class="icone-vazio">🔍</div><p>Nenhum usuário encontrado para "' + escaparHtml(termo) + '"</p></div>';
        return;
      }

      filtrados.forEach((user) => {
        const ehVoceMesmo = user.id === usuarioLogado.id;
        const ehAtivo = user.ativo !== 0;

        const div = document.createElement("div");
        div.className = "linha-item linha-usuario" + (ehAtivo ? "" : " linha-inativa");
        const fotoSegura = sanitizarUrl(user.foto_perfil);
        const avatarHtml = fotoSegura
          ? `<img class="avatar-lista" src="${fotoSegura}" alt="" />`
          : `<div class="avatar-lista avatar-vazio">${escaparHtml((user.nome || user.nome_usuario).charAt(0).toUpperCase())}</div>`;
        div.innerHTML = `
          ${avatarHtml}
          <div class="item-info-principal linha-usuario-info">
            <div class="linha-usuario-nome-linha">
              <span class="item-descricao">${escaparHtml(user.nome || user.nome_usuario)}${ehVoceMesmo ? " (você)" : ""}</span>
              <span class="item-status status-pago">${escaparHtml(user.perfil.toUpperCase())}</span>
            </div>
            <span class="linha-usuario-detalhe">@${escaparHtml(user.nome_usuario)}${user.email ? ` · ${escaparHtml(user.email)}` : ""}</span>
            <span class="linha-usuario-detalhe">
              Criado em ${formatarDataHora(user.criado_em)}${user.ultimo_acesso ? ` · Último acesso: ${formatarDataHora(user.ultimo_acesso)}` : " · Nunca acessou"}
            </span>
          </div>
          <div class="item-valores">
            <button type="button" class="btn-toggle-ativo ${ehAtivo ? "ativo" : "inativo"}" data-id="${user.id}" ${ehVoceMesmo ? "disabled title='Você não pode desativar a própria conta'" : ""}>${ehAtivo ? "Ativo" : "Inativo"}</button>
            <button type="button" class="btn-editar-usuario" data-id="${user.id}">Editar</button>
            <button type="button" class="btn-excluir-conta" data-id="${user.id}" ${ehVoceMesmo ? "disabled" : ""} title="${ehVoceMesmo ? "Você não pode excluir a própria conta" : "Excluir usuário"}">Excluir</button>
          </div>
        `;
        container.appendChild(div);
      });

      container.querySelectorAll(".btn-toggle-ativo").forEach((btn) => {
        btn.addEventListener("click", () => alternarStatusUsuario(Number(btn.dataset.id), btn));
      });

      container.querySelectorAll(".btn-editar-usuario").forEach((btn) => {
        btn.addEventListener("click", () => {
          const alvo = dados.find((u) => u.id === Number(btn.dataset.id));
          if (alvo) entrarModoEdicaoUsuario(alvo);
        });
      });

      container.querySelectorAll(".btn-excluir-conta").forEach((btn) => {
        btn.addEventListener("click", () => excluirUsuario(Number(btn.dataset.id), btn));
      });
    }

    renderizarListausuarios = renderizarListaUsuarios;
    renderizarListaUsuarios("");

    if (campoBusca) {
      campoBusca.oninput = () => renderizarListaUsuarios(campoBusca.value);
    }
  } catch (erro) {
    container.innerHTML = '<div class="estado-vazio-admin" style="color: var(--cor-despesa);"><div class="icone-vazio">⚠️</div><p>Erro ao carregar usuários.</p></div>';
  }
}

async function alternarStatusUsuario(id, botao) {
  const ehAtivo = botao.classList.contains("ativo");
  const acao = ehAtivo ? "desativar" : "ativar";
  const msg = ehAtivo
    ? "Desativar esta conta? O usuário não conseguirá mais fazer login."
    : "Reativar esta conta? O usuário poderá fazer login novamente.";

  if (!(await pedirConfirmacao(msg, { textoConfirmar: ehAtivo ? "Desativar" : "Ativar", perigo: ehAtivo }))) return;

  botao.disabled = true;
  botao.innerText = "Alterando...";

  try {
    const resposta = await CadimusAdminApi.alternarStatusUsuario(id);

    if (tratarSessaoExpirada(resposta)) return;

    if (resposta.ok) {
      carregarUsuarios();
      mostrarToast(resposta.ok ? `Usuário ${acao === "ativar" ? "ativado" : "desativado"}` : "Erro");
    } else {
      const erro = await resposta.json();
      await mostrarAviso(`Não foi possível ${acao}: ${erro.erro}`);
      botao.disabled = false;
      botao.innerText = ehAtivo ? "Ativo" : "Inativo";
    }
  } catch (erro) {
    await mostrarAviso("Erro ao se conectar com o servidor.");
    botao.disabled = false;
    botao.innerText = ehAtivo ? "Ativo" : "Inativo";
  }
}

async function excluirUsuario(id, botao) {
  if (!(await pedirConfirmacao("Excluir este usuário permanentemente? Essa ação não pode ser desfeita.", { textoConfirmar: "Excluir", perigo: true }))) return;

  botao.disabled = true;
  botao.innerText = "Excluindo...";

  try {
    const resposta = await CadimusAdminApi.excluirUsuario(id);

    if (tratarSessaoExpirada(resposta)) return;

    if (resposta.ok) {
      carregarUsuarios();
      mostrarToast("Usuário excluído", "info");
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
