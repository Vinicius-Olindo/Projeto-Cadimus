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

window.CadimusApi = {
  baseUrl: API_URL,
  montarUrl: montarUrlApi,
  fetch: apiFetch,
  json: apiJson,
  headersAutenticados,
};

window.API_URL = API_URL;
window.headersAutenticados = headersAutenticados;
