// ==========================================
// entries-loader-ui.js - Carregamento principal de lançamentos
// ==========================================

// ==========================================
// [20] CARREGAMENTO PRINCIPAL (carregarLancamentos)
// ==========================================

// --- COMUNICAÇÃO COM A API (BUSCA FILTRADA) ---
let ultimaRequisicaoLancamentos = 0;
let ultimoLoteLancamentos = [];
let termoBuscaAtual = "";

async function carregarLancamentos() {
  const container = document.getElementById("lista-lancamentos");
  if (!container) return;

  const carteiraId = document.getElementById("seletor-carteira").value;
  if (!carteiraId) return; // carteiras ainda carregando

  carregarPainelDespesasFixas();
  carregarPainelComprasParceladas();
  carregarOrcamentos();
  popularSelectFiltroCategorias();
  const promiseMetas = carregarMetas();

  // Marca esta chamada como "a mais recente". Se outra começar antes dela terminar,
  // esta vira obsoleta e seu resultado é descartado (evita sobrescrever a tela com dado velho).
  const idDestaRequisicao = ++ultimaRequisicaoLancamentos;

  container.innerHTML = "";
  container.appendChild(criarFeedbackCarregamento());

  try {
    const inputMes = document.getElementById("filtro-mes").value;

    const filtrosLancamentos = { carteira_id: carteiraId };
    const filtrosTransferencias = { carteira_id: carteiraId };

    if (inputMes) {
      const [ano, mes] = inputMes.split("-");
      filtrosLancamentos.mes = mes;
      filtrosLancamentos.ano = ano;
      filtrosTransferencias.mes = mes;
      filtrosTransferencias.ano = ano;
    }

    const [resposta, respostaTransferencias] = await Promise.all([
      CadimusEntriesApi.listarResposta(filtrosLancamentos),
      CadimusWalletsApi.listarTransferencias(filtrosTransferencias),
      promiseMetas,
    ]);

    // Chegou uma requisição mais nova enquanto esperávamos? Descarta esta resposta.
    if (idDestaRequisicao !== ultimaRequisicaoLancamentos) return;

    if (tratarSessaoExpirada(resposta) || tratarSessaoExpirada(respostaTransferencias)) return;
    const dados = await resposta.json();
    const transferencias = await respostaTransferencias.json();

    if (idDestaRequisicao !== ultimaRequisicaoLancamentos) return;

    container.innerHTML = "";

    if (dados.length === 0) {
      ultimoLoteLancamentos = [];
      container.appendChild(criarAvisoListaVazia());
      animarValorMonetario(document.getElementById("total-receitas"), 0);
      animarValorMonetario(document.getElementById("total-despesas"), 0);
      animarValorMonetario(document.getElementById("saldo-total"), 0);
      document.getElementById("saldo-total").style.color = "var(--cor-texto)";
      document.getElementById("resumo-categorias").style.display = "none";
      document.getElementById("resumo-pendente-item").style.display = "none";
      renderizarResumoAutores([]);
      carregarComparacaoMesAnterior(0);
      carregarTendencia();
      carregarComparativo6Meses();
      document.getElementById("card-poupanca").style.display = "none";
      return;
    }

    ultimoLoteLancamentos = dados;

    let totalReceitas = 0;
    let totalDespesas = 0;
    let totalPendente = 0;
    let totalTransferenciasSaida = 0;
    let totalTransferenciasEntrada = 0;
    const totaisPorCategoria = {};

    dados.forEach((lancamento) => {
      const valor = valorMonetario(lancamento);
      // Pendente é um compromisso, não dinheiro que já entrou ou saiu — não conta no saldo nem nas categorias
      if (lancamento.status === "pendente") {
        if (lancamento.tipo === "despesa") {
          totalPendente += valor;
        }
        return;
      }

      if (lancamento.tipo === "receita") {
        totalReceitas += valor;
      } else {
        totalDespesas += valor;
        totaisPorCategoria[lancamento.categoria] = (totaisPorCategoria[lancamento.categoria] || 0) + valor;
      }
    });

    // Calcular transferências (saída e entrada)
    const carteiraIdNum = Number(carteiraId);
    transferencias.forEach((t) => {
      const valor = valorMonetario(t);
      if (t.carteira_origem_id === carteiraIdNum) {
        totalTransferenciasSaida += valor;
      }
      if (t.carteira_destino_id === carteiraIdNum) {
        totalTransferenciasEntrada += valor;
      }
    });

    renderizarListaLancamentos();
    popularSelectLoteCategorias();
    renderizarComparativoPeriodo();

    // Saldo = Receitas - Despesas - Transferências Saída + Transferências Entrada
    const saldoCalculado = totalReceitas - totalDespesas - totalTransferenciasSaida + totalTransferenciasEntrada;

    animarValorMonetario(document.getElementById("total-receitas"), totalReceitas);
    animarValorMonetario(document.getElementById("total-despesas"), totalDespesas);

    const elementoPendente = document.getElementById("resumo-pendente-item");
    if (elementoPendente) {
      if (totalPendente > 0) {
        elementoPendente.style.display = "flex";
        animarValorMonetario(document.getElementById("total-pendente"), totalPendente);
      } else {
        elementoPendente.style.display = "none";
      }
    }

    const elementoSaldo = document.getElementById("saldo-total");
    if (elementoSaldo) {
      animarValorMonetario(elementoSaldo, saldoCalculado);
      elementoSaldo.style.color = saldoCalculado >= 0 ? "var(--cor-receita)" : "var(--cor-despesa)";
    }

    renderizarResumoCategorias(totaisPorCategoria);
    renderizarResumoAutores(dados);
    carregarComparacaoMesAnterior(totalDespesas);
    carregarTendencia();
    carregarComparativo6Meses();
    calcularTaxaPoupanca(totalReceitas, totalDespesas);
    calcularCapacidadeGuarda();
    calcularScoreSaude(totalReceitas, totalDespesas, totaisPorCategoria);
    carregarCartoesCredito();
  } catch (erro) {
    if (idDestaRequisicao !== ultimaRequisicaoLancamentos) return;
    console.error("Erro:", erro);
    container.innerHTML = '<p style="color: var(--cor-despesa); padding: 1rem;">Erro ao carregar os dados.</p>';
  }
}
