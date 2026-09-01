// ==========================================
// planning-goals-ui.js - Metas dentro do planejamento
// ==========================================
// --- METAS NO PLANEJAMENTO ---
function configurarMetaPlano() {
  const btnNovaMeta = document.getElementById("btn-nova-meta-plano");
  if (!btnNovaMeta) return;
  btnNovaMeta.addEventListener("click", () => abrirModalMeta("", "", null));
}

function renderizarMetasPlano() {
  const container = document.getElementById("plano-lista-metas");
  if (!container) return;

  if (typeof metasCarregadas === "undefined" || metasCarregadas.length === 0) {
    container.innerHTML = '<div class="plano-vazio">Nenhuma meta criada ainda.</div>';
    return;
  }

  container.innerHTML = metasCarregadas.map((meta) => {
    const valorLimite = valorMonetario(meta, "valor_limite");
    const totalDepositado = valorMonetario(meta, "total_depositado");
    const percentual = valorLimite > 0 ? Math.min(100, Math.round((totalDepositado / valorLimite) * 100)) : 0;
    const temPrazo = !!meta.data_limite;

    return `
      <div class="plano-meta-item" data-id="${meta.id}">
        <div class="plano-meta-topo">
          <span class="plano-meta-categoria">${escaparHtml(meta.categoria)}</span>
          <span class="plano-meta-valor">${formatadorBRL.format(totalDepositado)} / ${formatadorBRL.format(valorLimite)}</span>
        </div>
        <div class="plano-meta-barra">
          <div class="plano-meta-preenchimento" style="width: ${percentual}%"></div>
        </div>
        <div class="plano-meta-detalhes">
          <span>${percentual}% concluído${temPrazo ? ` · Prazo: ${new Date(meta.data_limite + "T12:00:00").toLocaleDateString("pt-BR")}` : ""}</span>
          ${temPrazo && meta.falta > 0 ? `<span class="plano-meta-badge-semana">~${formatadorBRL.format(valorMonetario(meta, "guarda_semanal"))}/sem.</span>` : ""}
        </div>
        <div class="plano-meta-acoes">
          <button type="button" class="btn-link-adicionar plano-btn-depositar" data-id="${meta.id}" data-categoria="${escaparHtml(meta.categoria)}">Depositar</button>
          <button type="button" class="btn-link-adicionar plano-btn-editar" data-categoria="${escaparHtml(meta.categoria)}" data-valor="${valorMonetario(meta, "valor_limite")}" data-datalimite="${meta.data_limite || ""}">Editar</button>
        </div>
      </div>
    `;
  }).join("");

  container.querySelectorAll(".plano-btn-depositar").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      abrirModalDeposito(Number(btn.dataset.id), btn.dataset.categoria);
    });
  });

  container.querySelectorAll(".plano-btn-editar").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      abrirModalMeta(btn.dataset.categoria, btn.dataset.valor, btn.dataset.datalimite || null);
    });
  });
}
