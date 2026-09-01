// ==========================================
// entries-list-groups.js - Agrupamento temporal da lista de lançamentos
// ==========================================

function criarDataLocalMeioDia(dataStr) {
  return new Date(`${String(dataStr).slice(0, 10)}T12:00:00`);
}

function obterChaveData(data) {
  return [
    data.getFullYear(),
    String(data.getMonth() + 1).padStart(2, "0"),
    String(data.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatarDataGrupo(data, opcoes = {}) {
  const { compacta = false } = opcoes;
  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: compacta ? "short" : "long",
    year: compacta ? undefined : "numeric",
  }).replace(".", "");
}

function obterInicioSemana(dataBase) {
  const inicio = new Date(dataBase);
  const diaSemana = inicio.getDay();
  const diasDesdeSegunda = diaSemana === 0 ? 6 : diaSemana - 1;
  inicio.setDate(inicio.getDate() - diasDesdeSegunda);
  inicio.setHours(12, 0, 0, 0);
  return inicio;
}

function obterGrupoTemporalLancamento(dataStr) {
  const data = criarDataLocalMeioDia(dataStr);
  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);
  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);
  const inicioSemana = obterInicioSemana(hoje);

  const chaveData = obterChaveData(data);
  const chaveHoje = obterChaveData(hoje);
  const chaveOntem = obterChaveData(ontem);

  if (data > hoje) {
    return {
      chave: "futuros",
      titulo: "Próximos lançamentos",
      subtitulo: "Datas futuras",
      ordem: 1,
      agruparPorData: true,
      data,
    };
  }

  if (chaveData === chaveHoje) {
    return {
      chave: "hoje",
      titulo: "Hoje",
      ordem: 2,
      agruparPorData: false,
      data,
    };
  }

  if (chaveData === chaveOntem) {
    return {
      chave: "ontem",
      titulo: "Ontem",
      ordem: 3,
      agruparPorData: false,
      data,
    };
  }

  if (data >= inicioSemana && data < ontem) {
    return {
      chave: "semana",
      titulo: "Esta semana",
      subtitulo: "Antes de ontem",
      ordem: 4,
      agruparPorData: true,
      data,
    };
  }

  if (data.getMonth() === hoje.getMonth() && data.getFullYear() === hoje.getFullYear()) {
    return {
      chave: "mes",
      titulo: "Este mês",
      subtitulo: "Fora desta semana",
      ordem: 5,
      agruparPorData: true,
      data,
    };
  }

  return {
    chave: "outros",
    titulo: "Outros períodos",
    ordem: 6,
    agruparPorData: true,
    data,
  };
}

function agruparLancamentosPorTempo(lancamentos) {
  const grupos = new Map();

  lancamentos.forEach((lancamento) => {
    const info = obterGrupoTemporalLancamento(lancamento.data_compra);
    if (!grupos.has(info.chave)) {
      grupos.set(info.chave, {
        chave: info.chave,
        titulo: info.titulo,
        subtitulo: info.subtitulo || "",
        ordem: info.ordem,
        agruparPorData: info.agruparPorData,
        itens: [],
        datas: new Map(),
      });
    }

    const grupo = grupos.get(info.chave);
    grupo.itens.push(lancamento);

    if (grupo.agruparPorData) {
      const chaveData = obterChaveData(info.data);
      if (!grupo.datas.has(chaveData)) {
        grupo.datas.set(chaveData, {
          data: info.data,
          titulo: formatarDataGrupo(info.data),
          itens: [],
        });
      }
      grupo.datas.get(chaveData).itens.push(lancamento);
    }
  });

  return [...grupos.values()].sort((a, b) => a.ordem - b.ordem);
}

function criarHeaderGrupoLancamentos(grupo, recolhido) {
  const header = document.createElement("div");
  header.className = "grupo-data-header grupo-data-header-principal";
  header.innerHTML = `
    <span class="grupo-data-identidade">
      <span class="grupo-data-texto">${escaparHtml(grupo.titulo)}</span>
      ${grupo.subtitulo ? `<span class="grupo-data-subtitulo">${escaparHtml(grupo.subtitulo)}</span>` : ""}
    </span>
    <div class="grupo-data-direita">
      <span class="grupo-data-qtd">${grupo.itens.length}</span>
      <button type="button" class="grupo-data-toggle${recolhido ? ' recolhido' : ''}" data-grupo="${escaparHtml(grupo.chave)}" title="Recolher/Expandir" aria-label="Recolher grupo">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    </div>`;
  return header;
}

function criarSubheaderDataLancamentos(grupoData) {
  const header = document.createElement("div");
  header.className = "grupo-data-header grupo-data-subheader";
  header.innerHTML = `
    <span class="grupo-data-texto">${escaparHtml(grupoData.titulo)}</span>
    <span class="grupo-data-qtd">${grupoData.itens.length}</span>
  `;
  return header;
}
