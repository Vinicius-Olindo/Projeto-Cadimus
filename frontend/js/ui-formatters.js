// ==========================================
// ui-formatters.js - Formatadores compartilhados de interface
// ==========================================

(function inicializarFormatadoresUI(global) {
  const formatadorBRL = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  function formatarMoedaBRL(valor) {
    return formatadorBRL.format(Number(valor) || 0);
  }

  function formatarDataHora(dataISO) {
    if (!dataISO) return "—";
    try {
      const normalizado = dataISO.replace(" ", "T");
      const data = new Date(normalizado);
      if (Number.isNaN(data.getTime())) return "—";

      return `${data.toLocaleDateString("pt-BR")} às ${data.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } catch {
      return "—";
    }
  }

  global.CadimusFormatadores = {
    formatadorBRL,
    formatarMoedaBRL,
    formatarDataHora,
  };

  global.formatadorBRL = formatadorBRL;
  global.formatarMoedaBRL = formatarMoedaBRL;
  global.formatarDataHora = formatarDataHora;
})(window);
