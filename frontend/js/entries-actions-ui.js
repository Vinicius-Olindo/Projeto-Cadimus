// ==========================================
// entries-actions-ui.js - Ações sensíveis de lançamentos
// ==========================================

// --- FUNÇÃO PARA EXCLUIR REGISTROS ---
async function apagarLancamento(id) {
  if (!(await pedirConfirmacao("Deseja realmente excluir este lançamento permanentemente?", { textoConfirmar: "Excluir", perigo: true }))) return;

  try {
    const resposta = await CadimusEntriesApi.excluir(id);

    if (tratarSessaoExpirada(resposta)) return;

    if (resposta.ok) {
      if (typeof removerLancamentoLocalmente === "function") {
        removerLancamentoLocalmente(id);
      } else {
        await recarregarLancamentosAposMutacao();
      }
      mostrarToast("Lançamento excluído", "info");
    } else {
      const erro = await resposta.json();
      await mostrarAviso(`Não foi possível apagar: ${erro.erro}`);
    }
  } catch (erro) {
    console.error(erro);
    await mostrarAviso("Erro ao se conectar com a nuvem.");
  }
}
