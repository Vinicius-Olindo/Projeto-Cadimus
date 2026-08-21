// ==========================================
// notifications-ui.js - Central de notificações no frontend
// ==========================================

// ==========================================
// [16] NOTIFICAÇÕES
// ==========================================

// --- NOTIFICAÇÕES DE VENCIMENTO ---
function verificarNotificacoes() {
  const notificacoes = [];
  const hoje = new Date();
  const diaAtual = hoje.getDate();
  const carteiraId = Number(document.getElementById("seletor-carteira")?.value || 0) || null;
  const chaveDia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
  const chaveMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;

  despesasFixasCarregadas.forEach((fixa) => {
    if (!fixa.ativo) return;
    const aviso = calcularAvisoVencimento(fixa.dia_vencimento);
    if (aviso) {
      notificacoes.push({
        tipo: "fixa",
        titulo: fixa.descricao,
        descricao: fixa.descricao,
        mensagem: `${aviso.texto} · ${formatadorBRL.format(valorMonetario(fixa))}`,
        valor: valorMonetario(fixa),
        dia: fixa.dia_vencimento,
        texto: aviso.texto,
        atrasado: aviso.atrasado,
        urgencia: aviso.atrasado ? 0 : diaAtual === fixa.dia_vencimento ? 1 : 2,
        severidade: aviso.atrasado ? "perigo" : "aviso",
        carteira_id: carteiraId,
        entidade: "despesa_fixa",
        entidade_id: fixa.id,
        chave_unica: `despesa_fixa:${fixa.id}:vencimento:${chaveMes}:lembrete:${chaveDia}`,
      });
    }
  });

  comprasParceladasCarregadas.forEach((compra) => {
    if (!compra.ativo) return;
    const aviso = calcularAvisoVencimento(compra.dia_vencimento);
    if (aviso) {
      notificacoes.push({
        tipo: "parcelada",
        titulo: compra.descricao,
        descricao: compra.descricao,
        mensagem: `${aviso.texto} · ${formatadorBRL.format(valorMonetario(compra, "valor_parcela"))}`,
        valor: valorMonetario(compra, "valor_parcela"),
        dia: compra.dia_vencimento,
        texto: aviso.texto,
        atrasado: aviso.atrasado,
        urgencia: aviso.atrasado ? 0 : diaAtual === compra.dia_vencimento ? 1 : 2,
        severidade: aviso.atrasado ? "perigo" : "aviso",
        carteira_id: carteiraId,
        entidade: "compra_parcelada",
        entidade_id: compra.id,
        chave_unica: `compra_parcelada:${compra.id}:vencimento:${chaveMes}:lembrete:${chaveDia}`,
      });
    }
  });

  ultimoLoteLancamentos.forEach((lanc) => {
    if (lanc.status === "pago") return;
    const dataLanc = new Date(lanc.data_compra + "T12:00:00");
    const diffMs = hoje - dataLanc;
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let texto = null;
    let atrasado = false;

    if (diffDias === 0) {
      texto = "Vence hoje";
    } else if (diffDias > 0 && diffDias <= 3) {
      texto = `Vence em ${diffDias} dia${diffDias > 1 ? "s" : ""}`;
    } else if (diffDias < 0 && diffDias >= -3) {
      texto = `Venceu há ${Math.abs(diffDias)} dia${Math.abs(diffDias) > 1 ? "s" : ""}`;
      atrasado = true;
    }

    if (texto) {
      notificacoes.push({
        tipo: "lancamento",
        titulo: lanc.descricao,
        descricao: lanc.descricao,
        mensagem: `${texto} · ${formatadorBRL.format(valorMonetario(lanc))}`,
        valor: valorMonetario(lanc),
        dia: dataLanc.getUTCDate(),
        texto,
        atrasado,
        urgencia: atrasado ? 0 : diffDias === 0 ? 1 : 2,
        severidade: atrasado ? "perigo" : "aviso",
        carteira_id: carteiraId,
        entidade: "lancamento",
        entidade_id: lanc.id,
        data_evento: lanc.data_compra,
        chave_unica: `lancamento:${lanc.id}:vencimento:${lanc.data_compra}:lembrete:${chaveDia}`,
      });
    }
  });

  // Metas com prazo — lembrete semanal
  if (typeof metasCarregadas !== "undefined") {
    metasCarregadas.forEach((meta) => {
      if (!meta.data_limite || meta.falta <= 0) return;
      const dataLimite = new Date(meta.data_limite + "T23:59:59");
      const diffMs = dataLimite - hoje;
      const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      let texto = null;
      let atrasado = false;

      if (diffDias < 0) {
        texto = `Meta "${meta.categoria}" passou do prazo! Faltava ${formatadorBRL.format(valorMonetario(meta, "falta"))}`;
        atrasado = true;
      } else if (diffDias <= 7) {
        texto = `Meta "${meta.categoria}": faltam ${formatadorBRL.format(valorMonetario(meta, "falta"))} (${meta.semanas_restantes} sem.)`;
      }

      if (texto) {
        notificacoes.push({
          tipo: "meta",
          titulo: `Meta: ${meta.categoria}`,
          descricao: meta.categoria,
          mensagem: texto,
          valor: valorMonetario(meta, "falta"),
          dia: dataLimite.getUTCDate(),
          texto,
          atrasado,
          urgencia: atrasado ? 0 : diffDias <= 7 ? 2 : 3,
          severidade: atrasado ? "perigo" : "aviso",
          carteira_id: carteiraId,
          entidade: "meta",
          entidade_id: meta.id,
          data_evento: meta.data_limite,
          chave_unica: `meta:${meta.id}:prazo:${meta.data_limite}:lembrete:${chaveDia}`,
        });
      }
    });
  }

  notificacoes.sort((a, b) => a.urgencia - b.urgencia);
  return notificacoes;
}

function renderizarNotificacoesLocal() {
  const notificacoes = verificarNotificacoes();
  const badge = document.getElementById("notificacao-badge");
  const lista = document.getElementById("lista-notificacoes");

  if (notificacoes.length === 0) {
    badge.classList.remove("com-alertas");
    lista.innerHTML = '<div class="notificacao-vazio">Nenhum vencimento próximo.</div>';
    return;
  }

  badge.classList.add("com-alertas");

  lista.innerHTML = notificacoes.map((n) => {
    const iconeClasse = n.atrasado ? "atrasado" : n.urgencia === 1 ? "hoje" : "proximo";
    const svgIcone = n.atrasado
      ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
      : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
    const tipoLabel = n.tipo === "fixa" ? "Fixa" : n.tipo === "parcelada" ? "Parcelada" : "Lançamento";
    const valorFormatado = formatadorBRL.format(valorMonetario(n));

    return `
      <div class="notificacao-item">
        <div class="notificacao-icone ${iconeClasse}">${svgIcone}</div>
        <div class="notificacao-info">
          <div class="notificacao-descricao">${escaparHtml(n.descricao)}</div>
          <div class="notificacao-detalhe">${tipoLabel} · Dia ${n.dia} · ${n.texto}</div>
        </div>
        <span class="notificacao-valor">${valorFormatado}</span>
      </div>
    `;
  }).join("");
}

async function sincronizarNotificacoesLocais() {
  const notificacoes = verificarNotificacoes();
  if (notificacoes.length === 0) return;

  try {
    await CadimusNotificationsApi.sincronizar(notificacoes);
  } catch (erro) {
    console.warn("Não foi possível sincronizar notificações:", erro);
  }
}

let filtroNotificacoesAtual = "nao_lida";

async function buscarNotificacoesPersistidas(status = "nao_lida") {
  return CadimusNotificationsApi.listar(status, 50);
}

async function gerarNotificacoesAutomaticas() {
  return CadimusNotificationsApi.gerarAutomaticas();
}

function renderizarListaNotificacoesPersistidas(notificacoes, resumo = {}) {
  const badge = document.getElementById("notificacao-badge");
  const lista = document.getElementById("lista-notificacoes");
  if (!badge || !lista) return;

  if (Number(resumo.nao_lidas || 0) > 0) badge.classList.add("com-alertas");
  else badge.classList.remove("com-alertas");

  if (notificacoes.length === 0) {
    const mensagemVazia = filtroNotificacoesAtual === "arquivada"
      ? "Nenhuma notificação arquivada."
      : filtroNotificacoesAtual === "todas"
        ? "Nenhuma notificação no histórico."
        : "Nenhuma notificação nova.";
    lista.innerHTML = `<div class="notificacao-vazio">${mensagemVazia}</div>`;
    return;
  }

  lista.innerHTML = notificacoes.map((n) => {
    const perigo = n.severidade === "perigo";
    const iconeClasse = perigo ? "atrasado" : n.severidade === "aviso" ? "hoje" : "proximo";
    const svgIcone = perigo
      ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
      : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
    const tipoLabel = n.tipo === "fixa" ? "Fixa" : n.tipo === "parcelada" ? "Parcelada" : n.tipo === "meta" ? "Meta" : "Lançamento";
    const statusLabel = n.status === "nao_lida" ? "Nova" : n.status === "arquivada" ? "Arquivada" : "Lida";

    return `
      <div class="notificacao-item" data-id="${n.id}">
        <div class="notificacao-icone ${iconeClasse}">${svgIcone}</div>
        <div class="notificacao-info">
          <div class="notificacao-descricao">${escaparHtml(n.titulo)}</div>
          <div class="notificacao-detalhe">${tipoLabel} · ${statusLabel} · ${escaparHtml(n.mensagem)}</div>
        </div>
        ${n.status !== "arquivada" ? `<button type="button" class="notificacao-arquivar" data-id="${n.id}" title="Arquivar alerta">Arquivar</button>` : ""}
      </div>
    `;
  }).join("");
}

function atualizarTabsNotificacoes(status) {
  document.querySelectorAll(".notificacao-tab").forEach((tab) => {
    tab.classList.toggle("ativo", tab.dataset.status === status);
  });
}

async function renderizarNotificacoes(status = filtroNotificacoesAtual) {
  filtroNotificacoesAtual = status;
  atualizarTabsNotificacoes(status);
  const lista = document.getElementById("lista-notificacoes");
  if (lista) lista.innerHTML = '<div class="notificacao-vazio">Carregando notificações...</div>';

  try {
    await gerarNotificacoesAutomaticas();
    const dados = await buscarNotificacoesPersistidas(status);
    renderizarListaNotificacoesPersistidas(dados.notificacoes || [], dados.resumo || {});
  } catch (erro) {
    console.error("Erro ao renderizar notificacoes:", erro);
    await sincronizarNotificacoesLocais();
    renderizarNotificacoesLocal();
  }
}

async function atualizarBadgeNotificacoes() {
  try {
    await gerarNotificacoesAutomaticas();
    const dados = await buscarNotificacoesPersistidas("nao_lida");
    const badge = document.getElementById("notificacao-badge");
    if (!badge) return;
    if (Number(dados.resumo?.nao_lidas || 0) > 0) badge.classList.add("com-alertas");
    else badge.classList.remove("com-alertas");
  } catch {
    const badge = document.getElementById("notificacao-badge");
    if (badge && verificarNotificacoes().length > 0) badge.classList.add("com-alertas");
  }
}

async function marcarNotificacoesComoLidas() {
  try {
    await CadimusNotificationsApi.marcarTodasComoLidas();
  } catch (erro) {
    console.warn("Não foi possível marcar notificações como lidas:", erro);
  }
}

async function arquivarNotificacao(id) {
  await CadimusNotificationsApi.arquivar(id);
}

function configurarNotificacoes() {
  const btn = document.getElementById("btn-notificacoes");
  const modal = document.getElementById("modal-notificacoes");
  const btnFechar = document.getElementById("btn-fechar-modal-notificacoes");
  const btnMarcarLidas = document.getElementById("btn-marcar-notificacoes-lidas");
  const lista = document.getElementById("lista-notificacoes");
  const badge = document.getElementById("notificacao-badge");
  if (!btn || !modal) return;

  btn.addEventListener("click", async (e) => {
    e.stopPropagation();
    modal.style.display = "flex";
    await renderizarNotificacoes("nao_lida");
    await marcarNotificacoesComoLidas();
    atualizarBadgeNotificacoes();
    trapFoco(modal);
  });

  document.querySelectorAll(".notificacao-tab").forEach((tab) => {
    tab.addEventListener("click", () => renderizarNotificacoes(tab.dataset.status || "nao_lida"));
  });

  btnMarcarLidas?.addEventListener("click", async () => {
    await marcarNotificacoesComoLidas();
    await renderizarNotificacoes(filtroNotificacoesAtual);
    atualizarBadgeNotificacoes();
  });

  lista?.addEventListener("click", async (e) => {
    const btnArquivar = e.target.closest(".notificacao-arquivar");
    if (!btnArquivar) return;
    await arquivarNotificacao(btnArquivar.dataset.id);
    await renderizarNotificacoes(filtroNotificacoesAtual);
    atualizarBadgeNotificacoes();
  });

  if (btnFechar) {
    btnFechar.addEventListener("click", () => {
      modal.style.display = "none";
      liberarFoco();
    });
  }

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
      liberarFoco();
    }
  });
}
