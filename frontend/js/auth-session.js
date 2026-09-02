// auth-session.js - Base compartilhada de URL segura, storage e sessão
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
    } catch (e) {
      // ignora JSON inválido
    }
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
