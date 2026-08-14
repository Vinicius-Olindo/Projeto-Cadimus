// ==========================================
// money-utils.js - Conversões monetárias da interface
// ==========================================

(function inicializarMoneyUtils(global) {
  const REGEX_BR = /^-?\d{1,3}(\.\d{3})*(,\d{1,2})?$/;
  const REGEX_DECIMAL = /^-?\d+([.,]\d{1,2})?$/;

  function reaisParaCentavos(valor, opcoes = {}) {
    const { permitirNegativo = false } = opcoes;

    if (valor === null || valor === undefined || valor === "") {
      throw new TypeError("Valor monetário não informado.");
    }

    let normalizado;

    if (typeof valor === "number") {
      if (!Number.isFinite(valor)) throw new TypeError("Valor monetário inválido.");
      normalizado = String(valor);
    } else if (typeof valor === "string") {
      const limpo = valor
        .trim()
        .replace(/\s/g, "")
        .replace(/^R\$/i, "");

      if (!limpo) throw new TypeError("Valor monetário não informado.");

      if (REGEX_BR.test(limpo)) {
        normalizado = limpo.replace(/\./g, "").replace(",", ".");
      } else if (REGEX_DECIMAL.test(limpo)) {
        normalizado = limpo.replace(",", ".");
      } else {
        throw new TypeError("Valor monetário inválido.");
      }
    } else {
      throw new TypeError("Valor monetário inválido.");
    }

    const numero = Number(normalizado);
    if (!Number.isFinite(numero)) throw new TypeError("Valor monetário inválido.");
    if (!permitirNegativo && numero < 0) throw new RangeError("Valor monetário não pode ser negativo.");

    return Math.round(numero * 100);
  }

  function centavosParaReais(centavos) {
    if (!Number.isInteger(centavos)) {
      throw new TypeError("Centavos devem ser um número inteiro.");
    }

    return centavos / 100;
  }

  function normalizarCentavos(valor, valorCentavos, opcoes = {}) {
    const { permitirNegativo = false } = opcoes;

    if (valorCentavos !== null && valorCentavos !== undefined && valorCentavos !== "") {
      const centavos = typeof valorCentavos === "string" ? Number(valorCentavos.trim()) : valorCentavos;
      if (!Number.isInteger(centavos)) throw new TypeError("Valor em centavos deve ser inteiro.");
      if (!permitirNegativo && centavos < 0) throw new RangeError("Valor em centavos não pode ser negativo.");
      return centavos;
    }

    return reaisParaCentavos(valor, { permitirNegativo });
  }

  function somarCentavos(valores) {
    if (!Array.isArray(valores)) throw new TypeError("Lista de centavos inválida.");

    return valores.reduce((total, valor) => {
      if (!Number.isInteger(valor)) {
        throw new TypeError("Todos os valores devem estar em centavos inteiros.");
      }
      return total + valor;
    }, 0);
  }

  function formatarCentavosBRL(centavos) {
    return global.CadimusFormatadores.formatadorBRL.format(centavosParaReais(centavos));
  }

  global.CadimusMoney = {
    reaisParaCentavos,
    centavosParaReais,
    normalizarCentavos,
    somarCentavos,
    formatarCentavosBRL,
  };
})(window);
