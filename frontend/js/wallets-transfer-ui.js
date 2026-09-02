// ==========================================
// wallets-transfer-ui.js - Transferências entre carteiras
// ==========================================

function configurarModalTransferencia() {
  const modal = document.getElementById("modal-transferencia");
  const btnFechar = document.getElementById("btn-fechar-modal-transferencia");
  const form = document.getElementById("form-transferencia");
  const selectOrigem = document.getElementById("transferencia-carteira-origem");
  const selectDestino = document.getElementById("transferencia-carteira-destino");

  if (!modal || !btnFechar || !form) return;

  // Preencher selects com as carteiras do usuário
  function preencherSelectsCarteiras() {
    if (!carteirasDoUsuario || carteirasDoUsuario.length === 0) return;

    const opcoesHtml = carteirasDoUsuario
      .map((c) => `<option value="${c.id}">${escaparHtml(c.nome)}</option>`)
      .join("");

    selectOrigem.innerHTML = `<option value="" disabled selected>Selecionar carteira</option>${opcoesHtml}`;
    selectDestino.innerHTML = `<option value="" disabled selected>Selecionar carteira</option>${opcoesHtml}`;
  }

  // Abrir modal
  async function abrirModalTransferencia() {
    const carteiraAtual = obterCarteiraSelecionada();
    if (carteiraAtual?.tipo === "compartilhada") {
      atualizarVisibilidadeTransferencia();
      await mostrarAviso("Transferências ficam disponíveis apenas em carteiras pessoais.");
      return;
    }

    preencherSelectsCarteiras();
    document.getElementById("transferencia-data").valueAsDate = new Date();
    modal.style.display = "flex";
    trapFoco(modal);
  }

  // Expor globalmente para chamar do botão
  window.abrirModalTransferencia = abrirModalTransferencia;

  const btnTransferencia = document.getElementById("btn-transferencia");
  btnTransferencia?.addEventListener("click", () => abrirModalTransferencia());

  // Fechar modal
  btnFechar.addEventListener("click", () => {
    modal.style.display = "none";
    liberarFoco();
    form.reset();
  });

  // Submeter transferência
  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const btnSalvar = document.getElementById("btn-salvar-transferencia");
    btnSalvar.innerText = "Transferindo...";
    btnSalvar.disabled = true;

    try {
      const origemId = Number(selectOrigem.value);
      const destinoId = Number(selectDestino.value);
      const valorPayload = montarPayloadMonetario("transferencia-valor");
      const valor = valorPayload.valor;
      const data = document.getElementById("transferencia-data").value;
      const descricao = document.getElementById("transferencia-descricao").value.trim();
      const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      // Validações locais
      if (!origemId || !destinoId) {
        await mostrarAviso("Selecione as carteiras de origem e destino.");
        return;
      }

      if (origemId === destinoId) {
        await mostrarAviso("As carteiras de origem e destino devem ser diferentes.");
        return;
      }

      if (!valor || valor <= 0) {
        await mostrarAviso("Informe um valor válido.");
        return;
      }

      const resposta = await CadimusWalletsApi.transferir({
        valor,
        valorCentavos: valorPayload.valor_centavos,
        data,
        origemId,
        destinoId,
        descricao,
        idempotencyKey,
      });

      if (tratarSessaoExpirada(resposta)) return;

      if (resposta.ok) {
        modal.style.display = "none";
        liberarFoco();
        form.reset();
        if (typeof atualizarDashboardAposMudanca === "function") {
          atualizarDashboardAposMudanca({
            tipo: "transferencia",
            recarregarLista: true,
            entidadesAfetadas: ["bonificacoes", "orcamentos", "metas"],
          });
        } else {
          await recarregarLancamentosAposMutacao();
        }
        mostrarToast("Transferência realizada com sucesso!");
      } else {
        const erro = await resposta.json();
        await mostrarAviso(`Erro: ${erro.erro}`);
      }
    } catch (erro) {
      await mostrarAviso("Falha na comunicação com o servidor.");
    } finally {
      btnSalvar.innerText = "Transferir";
      btnSalvar.disabled = false;
    }
  });
}

