// ==========================================
// auth-api.js - Acesso aos endpoints de autenticação
// ==========================================

(function inicializarAuthApi() {
  async function login({ usuario, senha }) {
    return CadimusApi.fetch("/api/auth", {
      method: "POST",
      autenticado: false,
      body: JSON.stringify({ usuario, senha }),
    });
  }

  async function logout() {
    return CadimusApi.fetch("/api/auth", {
      method: "DELETE",
      comJson: false,
    });
  }

  async function solicitarRecuperacaoSenha(email) {
    return CadimusApi.fetch("/api/auth/esqueci-senha", {
      method: "POST",
      autenticado: false,
      body: JSON.stringify({ email }),
    });
  }

  async function redefinirSenha({ token, novaSenha }) {
    return CadimusApi.fetch("/api/auth/redefinir-senha", {
      method: "POST",
      autenticado: false,
      body: JSON.stringify({ token, novaSenha }),
    });
  }

  window.CadimusAuthApi = {
    login,
    logout,
    solicitarRecuperacaoSenha,
    redefinirSenha,
  };
})();
