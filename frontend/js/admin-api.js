// ==========================================
// admin-api.js - Perfil, usuários, convites, categorias e manutenção
// ==========================================

(function inicializarAdminApi() {
  async function buscarMeuPerfil() {
    return CadimusApi.fetch("/api/usuarios/me", { comJson: false });
  }

  async function atualizarMeuPerfil(dados) {
    return CadimusApi.fetch("/api/usuarios/me", {
      method: "PUT",
      body: JSON.stringify(dados),
    });
  }

  async function listarUsuarios() {
    return CadimusApi.fetch("/api/usuarios", { comJson: false });
  }

  async function criarUsuario(dados) {
    return CadimusApi.fetch("/api/usuarios", {
      method: "POST",
      body: JSON.stringify(dados),
    });
  }

  async function atualizarUsuario(id, dados) {
    return CadimusApi.fetch(`/api/usuarios?id=${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(dados),
    });
  }

  async function atualizarUsuarioPorCaminho(id, dados) {
    return CadimusApi.fetch(`/api/usuarios/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(dados),
    });
  }

  async function alternarStatusUsuario(id) {
    return CadimusApi.fetch(`/api/usuarios?id=${encodeURIComponent(id)}`, {
      method: "PATCH",
      comJson: false,
    });
  }

  async function excluirUsuario(id) {
    return CadimusApi.fetch(`/api/usuarios?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      comJson: false,
    });
  }

  async function criarConvite({ nome, email, perfil }) {
    return CadimusApi.fetch("/api/convites", {
      method: "POST",
      body: JSON.stringify({ nome, email, perfil }),
    });
  }

  async function buscarConvitePublico(token) {
    return CadimusApi.fetch(`/api/convites?token=${encodeURIComponent(token)}`, {
      autenticado: false,
      comJson: false,
    });
  }

  async function aceitarConvitePublico({ token, senha, nome, usuario }) {
    return CadimusApi.fetch("/api/convites", {
      method: "POST",
      autenticado: false,
      body: JSON.stringify({ token, senha, nome, usuario }),
    });
  }

  async function listarCategorias() {
    return CadimusApi.fetch("/api/categorias", { comJson: false });
  }

  async function criarCategoria(nome) {
    return CadimusApi.fetch("/api/categorias", {
      method: "POST",
      body: JSON.stringify({ nome }),
    });
  }

  async function renomearCategoria(id, nome) {
    return CadimusApi.fetch(`/api/categorias?id=${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ nome }),
    });
  }

  async function excluirCategoria(id) {
    return CadimusApi.fetch(`/api/categorias?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      comJson: false,
    });
  }

  async function zerarDados({ confirmacao, senha }) {
    return CadimusApi.fetch("/api/admin/zerar-dados", {
      method: "POST",
      body: JSON.stringify({ confirmacao, senha }),
    });
  }

  window.CadimusAdminApi = {
    buscarMeuPerfil,
    atualizarMeuPerfil,
    listarUsuarios,
    criarUsuario,
    atualizarUsuario,
    atualizarUsuarioPorCaminho,
    alternarStatusUsuario,
    excluirUsuario,
    criarConvite,
    buscarConvitePublico,
    aceitarConvitePublico,
    listarCategorias,
    criarCategoria,
    renomearCategoria,
    excluirCategoria,
    zerarDados,
  };
})();
