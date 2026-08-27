// ==========================================
// bonuses-ui.js - Card de bonificações recorrentes
// ==========================================

let bonificacoesCarregadas = [];

const CATEGORIA_BONIFICACAO = "Bonificação";

function ehBonificacaoRecorrente(rec) {
  return rec?.tipo === "receita" && String(rec.categoria || "").toLowerCase() === CATEGORIA_BONIFICACAO.toLowerCase();
}

function obterAnoMesDashboard() {
  const inputMes = document.getElementById("filtro-mes")?.value;
  if (inputMes) {
    const [ano, mes] = inputMes.split("-").map(Number);
    return { ano, mes };
  }

  const hoje = new Date();
  return { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 };
}

function dataIsoBonificacao(ano, mes, dia) {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function somarDiasBonificacao(dataStr, dias) {
  const data = new Date(`${dataStr}T12:00:00`);
  data.setDate(data.getDate() + dias);
  return data.toISOString().slice(0, 10);
}

function ultimoDiaMesBonificacao(ano, mes) {
  return new Date(ano, mes, 0).getDate();
}

function contarOcorrenciasBonificacao(rec, ano, mes) {
  const inicioMes = dataIsoBonificacao(ano, mes, 1);
  const fimMes = dataIsoBonificacao(ano, mes, ultimoDiaMesBonificacao(ano, mes));
  if (!rec.data_inicio || rec.data_inicio > fimMes) return 0;
  if (rec.data_fim && rec.data_fim < inicioMes) return 0;

  const ocorrencias = [];
  const adicionarSeNoMes = (data) => {
    if (data >= inicioMes && data <= fimMes && (!rec.data_fim || data <= rec.data_fim)) ocorrencias.push(data);
  };

  if (rec.frequencia === "diaria") {
    let data = rec.data_inicio;
    while (data <= fimMes) {
      adicionarSeNoMes(data);
      data = somarDiasBonificacao(data, 1);
    }
  } else if (rec.frequencia === "semanal") {
    const inicio = new Date(`${rec.data_inicio}T12:00:00`);
    const diaSemana = Number(rec.dia_semana || 0);
    const delta = (diaSemana - inicio.getDay() + 7) % 7;
    inicio.setDate(inicio.getDate() + delta);
    let data = inicio.toISOString().slice(0, 10);
    while (data <= fimMes) {
      adicionarSeNoMes(data);
      data = somarDiasBonificacao(data, 7);
    }
  } else if (rec.frequencia === "quinzenal") {
    let data = rec.data_inicio;
    while (data <= fimMes) {
      adicionarSeNoMes(data);
      data = somarDiasBonificacao(data, 14);
    }
  } else {
    const intervaloMeses = rec.frequencia === "trimestral" ? 3 : rec.frequencia === "anual" ? 12 : 1;
    const anoInicio = Number(rec.data_inicio.slice(0, 4));
    const mesInicio = Number(rec.data_inicio.slice(5, 7));
    const diffMeses = (ano - anoInicio) * 12 + (mes - mesInicio);
    if (diffMeses >= 0 && diffMeses % intervaloMeses === 0) {
      const dia = Math.min(Math.max(Number(rec.dia_mes || rec.data_inicio.slice(8, 10) || 1), 1), 28);
      adicionarSeNoMes(dataIsoBonificacao(ano, mes, dia));
    }
  }

  return ocorrencias.length;
}

function rotuloFrequenciaBonificacao(rec) {
  const nomes = { diaria: "Diária", semanal: "Semanal", quinzenal: "Quinzenal", mensal: "Mensal", trimestral: "Trimestral", anual: "Anual" };
  const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const base = nomes[rec.frequencia] || "Mensal";

  if (rec.frequencia === "diaria") return `${base} · todos os dias`;
  if (rec.frequencia === "semanal") return `${base} · ${dias[rec.dia_semana || 0]}`;
  if (["mensal", "trimestral", "anual"].includes(rec.frequencia)) return `${base} · dia ${rec.dia_mes || 1}`;
  return base;
}

async function abrirModalBonificacao() {
  if (typeof abrirModalRecorrencia !== "function") return;
  await abrirModalRecorrencia({
    titulo: "Nova bonificação",
    placeholderDescricao: "Ex: Bonificação diária, comissão semanal...",
    contexto: "bonificacao",
    tipo: "receita",
    categoria: CATEGORIA_BONIFICACAO,
    frequencia: "mensal",
    meioPagamento: "pix",
  });
}

async function carregarPainelBonificacoes(lancamentosDoPeriodo = ultimoLoteLancamentos) {
  const card = document.getElementById("card-bonificacoes");
  const container = document.getElementById("lista-bonificacoes-painel");
  const carteiraId = document.getElementById("seletor-carteira")?.value;
  bonificacoesCarregadas = [];
  if (!card || !container || !carteiraId) {
    if (card) card.style.display = "none";
    return;
  }

  try {
    const resposta = await CadimusScheduledApi.listarRecorrentes({ carteira_id: carteiraId });
    if (tratarSessaoExpirada(resposta)) return;
    if (!resposta.ok) {
      bonificacoesCarregadas = [];
      card.style.display = "none";
      return;
    }

    bonificacoesCarregadas = (await resposta.json()).filter(ehBonificacaoRecorrente);

    if (bonificacoesCarregadas.length === 0) {
      card.style.display = "none";
      return;
    }

    const { ano, mes } = obterAnoMesDashboard();
    const previstas = bonificacoesCarregadas
      .filter((rec) => rec.ativo)
      .reduce((total, rec) => total + contarOcorrenciasBonificacao(rec, ano, mes) * valorMonetario(rec), 0);
    const recebidas = (lancamentosDoPeriodo || [])
      .filter((l) => l.tipo === "receita" && String(l.categoria || "").toLowerCase() === CATEGORIA_BONIFICACAO.toLowerCase() && l.status === "pago")
      .reduce((total, l) => total + valorMonetario(l), 0);
    const pendente = Math.max(0, previstas - recebidas);

    document.getElementById("bonificacoes-previsto").textContent = formatadorBRL.format(previstas);
    document.getElementById("bonificacoes-recebido").textContent = formatadorBRL.format(recebidas);
    document.getElementById("bonificacoes-pendente").textContent = formatadorBRL.format(pendente);

    card.style.display = "flex";
    container.innerHTML = "";

    bonificacoesCarregadas.forEach((rec) => {
      const valorFormatado = formatadorBRL.format(valorMonetario(rec));
      const ocorrencias = contarOcorrenciasBonificacao(rec, ano, mes);
      const sufixo = rec.frequencia === "diaria" ? "/dia" : rec.frequencia === "semanal" ? "/sem." : rec.frequencia === "quinzenal" ? "/quinz." : "/mês";
      const div = document.createElement("div");
      div.className = "linha-item linha-usuario lancamento-recorrente-card lancamento-recorrente-bonificacao";
      div.innerHTML = `
        <button type="button" class="fixa-btn-toggle btn-alternar-bonificacao ${rec.ativo ? "fixa-ativa" : "fixa-pausada"}" data-id="${rec.id}" title="${rec.ativo ? "Pausar" : "Ativar"}">
          ${rec.ativo
            ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>'
            : '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>'}
        </button>
        <div class="fixa-conteudo">
          <span class="item-descricao">${escaparHtml(rec.descricao)}</span>
          <span class="item-categoria">${rotuloFrequenciaBonificacao(rec)} · ${valorFormatado}${sufixo} · ${ocorrencias} no mês</span>
          <div class="fixa-botoes">
            <span class="item-status ${rec.ativo ? "status-pago" : "status-pendente"}">${rec.ativo ? "Ativa" : "Pausada"}</span>
            <button type="button" class="fixa-btn btn-editar-bonificacao" data-id="${rec.id}">Editar</button>
            <button type="button" class="fixa-btn-excluir btn-excluir-bonificacao" data-id="${rec.id}">Excluir</button>
          </div>
        </div>
      `;
      container.appendChild(div);
    });

    container.querySelectorAll(".btn-editar-bonificacao").forEach((btn) => {
      btn.addEventListener("click", () => editarBonificacao(Number(btn.dataset.id)));
    });
    container.querySelectorAll(".btn-alternar-bonificacao").forEach((btn) => {
      btn.addEventListener("click", () => alternarBonificacao(Number(btn.dataset.id)));
    });
    container.querySelectorAll(".btn-excluir-bonificacao").forEach((btn) => {
      btn.addEventListener("click", () => excluirBonificacao(Number(btn.dataset.id)));
    });
  } catch (erro) {
    console.error("Erro ao carregar bonificações:", erro);
    bonificacoesCarregadas = [];
    card.style.display = "none";
  }
}

async function alternarBonificacao(id) {
  const alvo = bonificacoesCarregadas.find((b) => b.id === id);
  if (!alvo) return;

  try {
    const resposta = await CadimusScheduledApi.atualizarRecorrente(id, { ativo: !alvo.ativo });
    if (tratarSessaoExpirada(resposta)) return;

    if (resposta.ok) {
      carregarPainelBonificacoes();
      if (typeof carregarPainelRecorrentes === "function") carregarPainelRecorrentes();
      mostrarToast(alvo.ativo ? "Bonificação pausada" : "Bonificação ativada", "info");
    } else {
      const erro = await resposta.json();
      await mostrarAviso(obterMensagemErroApi(erro, "Não foi possível alterar esta bonificação agora."));
    }
  } catch {
    await mostrarAviso("Erro de conexão.");
  }
}

function editarBonificacao(id) {
  if (typeof editarRecorrencia !== "function") return;

  const mapa = new Map();
  if (Array.isArray(recorrentesCarregadas)) recorrentesCarregadas.forEach((rec) => mapa.set(rec.id, rec));
  bonificacoesCarregadas.forEach((rec) => mapa.set(rec.id, rec));
  recorrentesCarregadas = Array.from(mapa.values());

  editarRecorrencia(id);
}

async function excluirBonificacao(id) {
  if (!(await pedirConfirmacao("Excluir esta bonificação? Lançamentos já gerados continuam na lista.", { textoConfirmar: "Excluir", perigo: true }))) return;

  try {
    const resposta = await CadimusScheduledApi.excluirRecorrente(id);
    if (tratarSessaoExpirada(resposta)) return;

    if (resposta.ok) {
      carregarPainelBonificacoes();
      if (typeof carregarPainelRecorrentes === "function") carregarPainelRecorrentes();
      mostrarToast("Bonificação excluída", "info");
    } else {
      const erro = await resposta.json();
      await mostrarAviso(obterMensagemErroApi(erro, "Não foi possível excluir esta bonificação agora."));
    }
  } catch {
    await mostrarAviso("Erro de conexão.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-bonificacoes")?.addEventListener("click", abrirModalBonificacao);
  document.getElementById("btn-nova-bonificacao")?.addEventListener("click", abrirModalBonificacao);
});
