// ==========================================
// wallets-card-ui.js - Cartões de crédito
// ==========================================

let cartoesCreditoCarregados = [];

async function popularSelectCartoesCredito(select, carteiraId = document.getElementById("seletor-carteira")?.value, valorSelecionado = "") {
  if (!select || !carteiraId || !window.CadimusCardsApi) return;

  select.innerHTML = '<option value="">Nenhum cartão</option>';

  try {
    const resposta = await CadimusCardsApi.listar({ carteira_id: carteiraId });
    if (tratarSessaoExpirada(resposta)) return;
    if (!resposta.ok) return;

    const cartoes = await resposta.json();
    cartoes.forEach((cartao) => {
      const opcao = document.createElement("option");
      opcao.value = String(cartao.id);
      opcao.textContent = `${cartao.nome}${cartao.ultimos4 ? ` •••• ${cartao.ultimos4}` : ""}`;
      opcao.dataset.diaFechamento = cartao.dia_fechamento || "";
      opcao.dataset.diaVencimento = cartao.dia_vencimento || "";
      select.appendChild(opcao);
    });
    select.value = valorSelecionado ? String(valorSelecionado) : "";
  } catch (erro) {
    console.error("Erro ao carregar cartões:", erro);
  }
}

function configurarCampoCartaoCredito({ campoId, selectId, meioId, tipoId }) {
  const campo = document.getElementById(campoId);
  const select = document.getElementById(selectId);
  const meio = document.getElementById(meioId);
  const tipo = tipoId ? document.getElementById(tipoId) : null;
  if (!campo || !select || !meio) return;

  const atualizar = async () => {
    const usaCredito = String(meio.value || "").toLowerCase() === "credito";
    const ehDespesa = !tipo || tipo.value !== "receita";
    const mostrar = usaCredito && ehDespesa;
    campo.style.display = mostrar ? "" : "none";
    if (mostrar) await popularSelectCartoesCredito(select, undefined, select.value);
    else select.value = "";
  };

  meio.addEventListener("change", atualizar);
  tipo?.addEventListener("change", atualizar);
  atualizar();
}

function validarCartaoCreditoObrigatorio({ meioId, selectId, tipoId, mensagem = "Selecione o cartão de crédito usado nesta despesa." }) {
  const meio = document.getElementById(meioId);
  const select = document.getElementById(selectId);
  const tipo = tipoId ? document.getElementById(tipoId) : null;
  const usaCredito = String(meio?.value || "").toLowerCase() === "credito";
  const ehDespesa = !tipo || tipo.value !== "receita";

  if (!usaCredito || !ehDespesa || !select || select.value) return true;

  select.setCustomValidity(mensagem);
  select.reportValidity();
  select.focus();
  setTimeout(() => select.setCustomValidity(""), 1200);
  return false;
}

window.popularSelectCartoesCredito = popularSelectCartoesCredito;
window.configurarCampoCartaoCredito = configurarCampoCartaoCredito;
window.validarCartaoCreditoObrigatorio = validarCartaoCreditoObrigatorio;

function configurarModalCartaoCredito() {
  const modal = document.getElementById("modal-cartao-credito");
  const btnFechar = document.getElementById("btn-fechar-modal-cartao");
  const form = document.getElementById("form-cartao-credito");

  if (!modal || !btnFechar || !form) return;

  function abrirModalCartao(editar) {
    form.reset();
    document.getElementById("cartao-editando-id").value = "";
    document.getElementById("titulo-modal-cartao").innerText = "Novo cartão de crédito";

    if (editar) {
      document.getElementById("cartao-editando-id").value = editar.id;
      document.getElementById("titulo-modal-cartao").innerText = "Editar cartão";
      document.getElementById("cartao-nome").value = editar.nome || "";
      document.getElementById("cartao-bandeira").value = editar.bandeira || "outro";
      document.getElementById("cartao-ultimos4").value = editar.ultimos4 || "";
      document.getElementById("cartao-dia-fechamento").value = editar.dia_fechamento;
      document.getElementById("cartao-dia-vencimento").value = editar.dia_vencimento;
      definirValorInputMonetario("cartao-limite", valorMonetario(editar, "limite"));
    }

    modal.style.display = "flex";
    trapFoco(modal);
  }

  window.abrirModalCartao = abrirModalCartao;

  btnFechar.addEventListener("click", () => {
    modal.style.display = "none";
    liberarFoco();
    form.reset();
  });

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const idEdicao = document.getElementById("cartao-editando-id").value;
    const btnSalvar = document.getElementById("btn-salvar-cartao");
    btnSalvar.disabled = true;
    btnSalvar.innerText = "Salvando...";

    try {
      const carteiraId = document.getElementById("seletor-carteira").value;
      const limitePayload = montarPayloadMonetario("cartao-limite", "limite", { vazioComoZero: true });
      const corpo = {
        nome: document.getElementById("cartao-nome").value.trim(),
        bandeira: document.getElementById("cartao-bandeira").value,
        ultimos4: document.getElementById("cartao-ultimos4").value.trim() || null,
        dia_fechamento: parseInt(document.getElementById("cartao-dia-fechamento").value),
        dia_vencimento: parseInt(document.getElementById("cartao-dia-vencimento").value),
        ...limitePayload,
        carteira_id: Number(carteiraId),
      };

      const resposta = await CadimusCardsApi.salvar(corpo, idEdicao || null);

      if (tratarSessaoExpirada(resposta)) return;

      if (resposta.ok) {
        const resultado = await resposta.clone().json().catch(() => null);
        modal.style.display = "none";
        liberarFoco();
        if (resultado?.cartao) {
          const cartaoAtualizado = resultado.cartao;
          const indice = cartoesCreditoCarregados.findIndex((cartao) => String(cartao.id) === String(cartaoAtualizado.id));
          if (indice >= 0) cartoesCreditoCarregados[indice] = { ...cartoesCreditoCarregados[indice], ...cartaoAtualizado };
          else cartoesCreditoCarregados.unshift(cartaoAtualizado);
          renderizarCartoesCreditoCarregados();
        } else if (idEdicao) {
          const existente = cartoesCreditoCarregados.find((cartao) => String(cartao.id) === String(idEdicao)) || {};
          const atualizado = { ...existente, ...corpo, id: Number(idEdicao) };
          cartoesCreditoCarregados = cartoesCreditoCarregados.map((cartao) => String(cartao.id) === String(idEdicao) ? atualizado : cartao);
          renderizarCartoesCreditoCarregados();
        } else {
          carregarCartoesCredito();
        }
        mostrarToast(idEdicao ? "Cartão atualizado" : "Cartão criado", "sucesso");
      } else {
        const erro = await resposta.json();
        await mostrarAviso(`Erro: ${erro.erro}`);
      }
    } catch {
      await mostrarAviso("Falha na comunicação com o servidor.");
    } finally {
      btnSalvar.disabled = false;
      btnSalvar.innerText = "Salvar cartão";
    }
  });
}

function renderizarCartoesCreditoCarregados() {
  const card = document.getElementById("card-cartoes-credito");
  const container = document.getElementById("lista-cartoes-painel");
  if (!card || !container) return;

  if (typeof renderizarAlertasRiscoFinanceiro === "function") renderizarAlertasRiscoFinanceiro();

  if (cartoesCreditoCarregados.length === 0) {
    card.style.display = "none";
    container.innerHTML = "";
    return;
  }

  card.style.display = "flex";
  container.innerHTML = "";

  const NOMES_BANDEIRAS = { visa: "Visa", mastercard: "Mastercard", elo: "Elo", amex: "Amex", outro: "Cartão" };
  const CORES_BANDEIRAS = { visa: "#1a1f71", mastercard: "#eb001b", elo: "#f5a623", amex: "#006fcf", outro: "#666" };

  cartoesCreditoCarregados.forEach((cartao) => {
    const cor = CORES_BANDEIRAS[cartao.bandeira] || CORES_BANDEIRAS.outro;
    const nomeBandeira = NOMES_BANDEIRAS[cartao.bandeira] || "Cartão";
    const limite = valorMonetario(cartao, "limite");
    const gastoAtual = valorMonetario(cartao, "gasto_atual");
    const disponivel = Math.max(0, limite - gastoAtual);
    const pctLimite = limite > 0 ? Math.min((gastoAtual / limite) * 100, 100) : 0;
    const corBarra = pctLimite >= 80 ? "var(--cor-despesa)" : pctLimite >= 50 ? "var(--cor-pendente)" : "var(--cor-receita)";

    const div = document.createElement("div");
    div.className = "cartao-item";
    div.innerHTML = `
      <div class="cartao-item-header">
        <div class="cartao-item-bandeira" style="background:${cor}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--cor-superficie-alta)" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
        </div>
        <div class="cartao-item-info">
          <strong>${escaparHtml(cartao.nome)}</strong>
          <span class="cartao-item-detalhe">${nomeBandeira}${cartao.ultimos4 ? " •••• " + cartao.ultimos4 : ""}</span>
        </div>
        <div class="cartao-item-acoes">
          <button type="button" class="cartao-editar-btn" data-id="${cartao.id}" title="Editar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button type="button" class="cartao-apagar-btn" data-id="${cartao.id}" data-nome="${escaparHtml(cartao.nome)}" title="Excluir">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
      <div class="cartao-item-datas">
        <span>Fechamento: dia ${cartao.dia_fechamento}</span>
        <span>Vencimento: dia ${cartao.dia_vencimento}</span>
      </div>
      ${limite > 0 ? `
      <div class="cartao-item-limite">
        <div class="cartao-limite-texto">
          <span>${formatadorBRL.format(gastoAtual)} usado</span>
          <span>${pctLimite.toFixed(0)}% de ${formatadorBRL.format(limite)}</span>
        </div>
        <div class="cartao-limite-barra">
          <div class="cartao-limite-preenchimento" style="width:${pctLimite}%;background:${corBarra}"></div>
        </div>
        <div class="cartao-limite-disponivel">
          <span>Disponível</span>
          <strong>${formatadorBRL.format(disponivel)}</strong>
        </div>
      </div>
      ` : ""}
      ${cartao.parcelas_ativas > 0 ? `<div class="cartao-item-parcelas">${cartao.parcelas_ativas} parcela(s) em aberto</div>` : ""}
    `;
    container.appendChild(div);
  });

  container.querySelectorAll(".cartao-editar-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.id);
      const cartao = cartoesCreditoCarregados.find((c) => c.id === id);
      if (cartao) abrirModalCartao(cartao);
    });
  });

  container.querySelectorAll(".cartao-apagar-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.id);
      const nome = btn.dataset.nome;
      if (!(await pedirConfirmacao(`Excluir o cartão "${nome}"?`, { textoConfirmar: "Excluir", perigo: true }))) return;

      try {
        const resposta = await CadimusCardsApi.excluir(id);
        if (tratarSessaoExpirada(resposta)) return;
        if (resposta.ok) {
          cartoesCreditoCarregados = cartoesCreditoCarregados.filter((cartao) => String(cartao.id) !== String(id));
          renderizarCartoesCreditoCarregados();
          mostrarToast("Cartão excluído", "sucesso");
        }
      } catch {
        await mostrarAviso("Erro ao excluir cartão.");
      }
    });
  });
}

async function carregarCartoesCredito() {
  const carteiraId = document.getElementById("seletor-carteira")?.value;
  if (!carteiraId) return;

  try {
    const resposta = await CadimusCardsApi.listar({ carteira_id: carteiraId });
    if (tratarSessaoExpirada(resposta)) return;
    if (!resposta.ok) return;

    cartoesCreditoCarregados = await resposta.json();
    renderizarCartoesCreditoCarregados();
  } catch (erro) {
    console.error("Erro ao carregar cartões:", erro);
    if (typeof renderizarAlertasRiscoFinanceiro === "function") renderizarAlertasRiscoFinanceiro();
  }
}

