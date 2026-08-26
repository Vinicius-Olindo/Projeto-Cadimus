var API_URL =
  window.CADIMUS_API_URL ||
  (window.location.hostname === "staging.cadimus.pages.dev"
    ? "https://cadimus-backend-staging.olinbytedigital.workers.dev"
    : "https://cadimus-backend.olinbytedigital.workers.dev");

function montarUrlApi(caminho) {
  if (!caminho || typeof caminho !== "string") {
    throw new Error("Caminho da API inválido.");
  }

  if (/^https?:\/\//i.test(caminho)) {
    return caminho;
  }

  return `${API_URL}${caminho.startsWith("/") ? caminho : `/${caminho}`}`;
}

function headersAutenticados(comJson = true) {
  const token = typeof obterToken === "function" ? obterToken() : null;
  const headers = {};
  if (comJson) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function apiFetch(caminho, opcoes = {}) {
  const {
    comJson = true,
    autenticado = true,
    headers = {},
    ...fetchOptions
  } = opcoes;

  const headersBase = autenticado ? headersAutenticados(comJson) : {};
  return fetch(montarUrlApi(caminho), {
    ...fetchOptions,
    headers: {
      ...headersBase,
      ...headers,
    },
  });
}

async function apiJson(caminho, opcoes = {}) {
  const resposta = await apiFetch(caminho, opcoes);
  const dados = await resposta.json().catch(() => null);
  return { resposta, dados };
}

function obterMensagemErroApi(erroOuDados, fallback = "Não foi possível concluir a operação.") {
  if (!erroOuDados) return fallback;
  if (typeof erroOuDados === "string") return erroOuDados.trim() || fallback;

  const mensagem =
    (typeof erroOuDados.erro === "string" && erroOuDados.erro.trim()) ||
    (typeof erroOuDados.mensagem === "string" && erroOuDados.mensagem.trim());

  return mensagem || fallback;
}

window.CadimusApi = {
  baseUrl: API_URL,
  montarUrl: montarUrlApi,
  fetch: apiFetch,
  json: apiJson,
  headersAutenticados,
  obterMensagemErro: obterMensagemErroApi,
};

window.API_URL = API_URL;
window.headersAutenticados = headersAutenticados;
window.obterMensagemErroApi = obterMensagemErroApi;
