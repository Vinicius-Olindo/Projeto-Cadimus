// ==========================================
// invite-public-ui.js - Cadastro público por convite
// ==========================================

function verificarCadastroConvite() {
  const token = new URLSearchParams(window.location.search).get("token");
  const paginaCadastro = document.body?.dataset?.cadimusPage === "cadastro";
  if (!token) {
    if (!paginaCadastro) return false;
    const sCadastro = document.getElementById("cadastro-section");
    const infoEl = document.getElementById("cadastro-convite-info");
    if (sCadastro) sCadastro.style.display = "flex";
    if (infoEl) infoEl.innerHTML = '<span class="erro-convite">Convite não informado ou link incompleto.</span>';
    document.getElementById("form-cadastro-convite")?.style.setProperty("display", "none");
    return true;
  }

  const sLogin = document.getElementById("login-section");
  const sCadastro = document.getElementById("cadastro-section");
  const sDash = document.getElementById("dashboard-section");
  const sAdmin = document.getElementById("admin-section");

  if (!sCadastro) return false;

  if (sLogin) sLogin.style.display = "none";
  if (sDash) sDash.style.display = "none";
  if (sAdmin) sAdmin.style.display = "none";
  sCadastro.style.display = "flex";

  const inputToken = document.getElementById("cadastro-token");
  if (inputToken) inputToken.value = token;

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
        form.innerHTML = `<p class="sucesso-convite">Conta criada com sucesso!<br>Seu login: <strong>${dados.usuario}</strong><br><a href="login.html">Fazer login</a></p>`;
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
