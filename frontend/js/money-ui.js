function obterCentavosMonetarios(campoId, opcoes = {}) {
  const { vazioComoZero = false, ...opcoesDinheiro } = opcoes;
  const campo = document.getElementById(campoId);
  const valor = campo?.value;
  if (vazioComoZero && (valor === null || valor === undefined || String(valor).trim() === "")) {
    return 0;
  }
  return window.CadimusMoney.reaisParaCentavos(valor, opcoesDinheiro);
}

function formatarValorParaInputMonetario(valor) {
  if (valor === null || valor === undefined || valor === "") return "";
  const centavos = window.CadimusMoney.reaisParaCentavos(valor);
  return window.CadimusMoney.formatarCentavosBRL(centavos);
}

function definirValorInputMonetario(campoId, valor, opcoes = {}) {
  const { vazioComoZero = false } = opcoes;
  const campo = document.getElementById(campoId);
  if (!campo) return;

  if ((valor === null || valor === undefined || valor === "") && !vazioComoZero) {
    campo.value = "";
    return;
  }

  campo.value = formatarValorParaInputMonetario(valor || 0);
}

function obterReaisMonetarios(campoId, opcoes = {}) {
  return window.CadimusMoney.centavosParaReais(obterCentavosMonetarios(campoId, opcoes));
}

function montarPayloadMonetario(campoId, nomeCampo = "valor", opcoes = {}) {
  const centavos = obterCentavosMonetarios(campoId, opcoes);
  return {
    [nomeCampo]: window.CadimusMoney.centavosParaReais(centavos),
    [`${nomeCampo}_centavos`]: centavos,
  };
}

function valorMonetario(registro, nomeCampo = "valor") {
  const nomeCentavos = `${nomeCampo}_centavos`;
  if (Number.isInteger(registro?.[nomeCentavos])) {
    return window.CadimusMoney.centavosParaReais(registro[nomeCentavos]);
  }
  return Number(registro?.[nomeCampo]) || 0;
}

function centavosMonetarios(registro, nomeCampo = "valor") {
  const nomeCentavos = `${nomeCampo}_centavos`;
  if (Number.isInteger(registro?.[nomeCentavos])) {
    return registro[nomeCentavos];
  }
  return window.CadimusMoney.reaisParaCentavos(valorMonetario(registro, nomeCampo), { permitirNegativo: true });
}

function somarValoresMonetarios(registros, nomeCampo = "valor") {
  return registros.reduce((total, registro) => total + valorMonetario(registro, nomeCampo), 0);
}

const CAMPOS_INPUT_MONETARIO = [
  "valor",
  "transferencia-valor",
  "orcamento-valor",
  "cartao-limite",
  "fixa-valor",
  "recorrencia-valor",
  "parcelada-valor-total",
  "meta-valor",
  "deposito-valor",
  "plano-valor-alvo",
  "plano-dep-valor",
  "plano-salario-input",
  "simulacao-valor",
  "novo-salario",
];

function normalizarCampoMonetario(campo) {
  if (!campo.value.trim()) return;

  try {
    const centavos = window.CadimusMoney.reaisParaCentavos(campo.value);
    campo.value = window.CadimusMoney.formatarCentavosBRL(centavos);
  } catch {
    campo.value = "";
  }
}

function configurarInputsMonetarios() {
  CAMPOS_INPUT_MONETARIO.forEach((campoId) => {
    const campo = document.getElementById(campoId);
    if (!campo || campo.dataset.monetarioConfigurado === "true") return;

    campo.dataset.monetarioConfigurado = "true";
    campo.setAttribute("inputmode", "decimal");
    campo.setAttribute("autocomplete", "off");
    campo.placeholder = campo.placeholder || "R$ 0,00";

    campo.addEventListener("focus", () => campo.select());
    campo.addEventListener("blur", () => normalizarCampoMonetario(campo));
  });
}

window.valorMonetario = valorMonetario;
window.centavosMonetarios = centavosMonetarios;
window.somarValoresMonetarios = somarValoresMonetarios;
window.definirValorInputMonetario = definirValorInputMonetario;
window.obterReaisMonetarios = obterReaisMonetarios;
window.configurarInputsMonetarios = configurarInputsMonetarios;
