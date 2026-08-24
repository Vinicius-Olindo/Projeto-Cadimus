// ==========================================
// comprasParceladas.js (rota) - Gestão das compras parceladas
// ==========================================
import { obterUsuarioDaSessao } from "../utils/sessao.ts";
import { obterCarteirasDoUsuario } from "../utils/carteiras.ts";
import { gerarTodasParcelasDaCompra } from "../utils/comprasParceladas.ts";
import { centavosParaReais, normalizarCentavos } from "../utils/dinheiro.ts";
import { validarCartaoCreditoDaCarteira } from "../utils/cartoesCredito.ts";
import { erroCliente, erroInterno, json } from "../utils/respostas.ts";

/**
 * @param {Request} request
 * @param {import("../types.js").CadimusEnv} env
 * @param {import("../types.js").WorkerCtx} ctx
 */
export async function processarComprasParceladas(request, env, ctx) {
  const metodo = request.method;
  const url = new URL(request.url);

  const usuarioLogado = await obterUsuarioDaSessao(request, env, ctx);
  if (!usuarioLogado) {
    return erroCliente("Não autenticado.", 401, "nao_autenticado");
  }

  const carteirasPermitidas = await obterCarteirasDoUsuario(env, usuarioLogado.id);

  // ==========================================
  // LISTAR
  // ==========================================
  if (metodo === "GET") {
    try {
      const carteiraId = url.searchParams.get("carteira_id");

      if (carteiraId && !carteirasPermitidas.includes(Number(carteiraId))) {
        return erroCliente("Acesso negado a esta carteira.", 403, "carteira_acesso_negado");
      }
      if (carteirasPermitidas.length === 0) {
        return json([]);
      }

      let query = `SELECT * FROM compras_parceladas WHERE 1=1`;
      let params = /** @type {import("../types.js").SqlParam[]} */ ([]);

      if (carteiraId) {
        query += ` AND carteira_id = ?`;
        params.push(carteiraId);
      } else {
        query += ` AND carteira_id IN (${carteirasPermitidas.map(() => "?").join(",")})`;
        params.push(...carteirasPermitidas);
      }

      query += ` ORDER BY ano_inicio DESC, mes_inicio DESC`;

      const { results } = await env.DB.prepare(query)
        .bind(...params)
        .all();
      return json(results);
    } catch (erro) {
      return erroInterno(erro, "comprasParceladas.listar", "Não foi possível carregar as compras parceladas agora.", "parceladas_listar_falhou");
    }
  }

  // ==========================================
  // CRIAR
  // ==========================================
  if (metodo === "POST") {
    try {
      const dados = await request.json();

      if (!carteirasPermitidas.includes(Number(dados.carteira_id))) {
        return erroCliente("Acesso negado a esta carteira.", 403, "carteira_acesso_negado");
      }

      const descricao = (dados.descricao || "").trim();
      let diaVencimento = parseInt(dados.dia_vencimento, 10);
      const totalParcelas = parseInt(dados.total_parcelas, 10);
      const anoInicio = parseInt(dados.ano_inicio, 10);
      const mesInicio = parseInt(dados.mes_inicio, 10);
      if (
        dados.valor_total === undefined &&
        dados.valor_total_centavos === undefined &&
        dados.valor_parcela === undefined &&
        dados.valor_parcela_centavos === undefined
      ) {
        return erroCliente("Informe o valor total da compra.", 400, "valor_total_obrigatorio");
      }

      const valorTotalCentavos = dados.valor_total !== undefined || dados.valor_total_centavos !== undefined
        ? normalizarCentavos(dados.valor_total, dados.valor_total_centavos)
        : normalizarCentavos(dados.valor_parcela, dados.valor_parcela_centavos) * totalParcelas;
      const valorTotal = centavosParaReais(valorTotalCentavos);
      const valorParcelaCentavos = Number.isInteger(totalParcelas) && totalParcelas > 0
        ? Math.floor(valorTotalCentavos / totalParcelas)
        : 0;
      const valorParcela = centavosParaReais(valorParcelaCentavos);

      if (!descricao) {
        return erroCliente("Informe uma descrição.", 400, "descricao_obrigatoria");
      }
      if (valorTotalCentavos <= 0) {
        return erroCliente("Informe o valor total da compra.", 400, "valor_total_invalido");
      }
      if (valorParcelaCentavos <= 0) {
        return erroCliente("Valor de parcela inválido.", 400, "valor_parcela_invalido");
      }
      if (!Number.isInteger(diaVencimento) || diaVencimento < 1 || diaVencimento > 28) {
        return erroCliente("Escolha um dia de vencimento entre 1 e 28.", 400, "dia_vencimento_invalido");
      }
      if (!Number.isInteger(totalParcelas) || totalParcelas < 2) {
        return erroCliente("Uma compra parcelada precisa de pelo menos 2 parcelas (pra 1x, lance como despesa comum).", 400, "total_parcelas_invalido");
      }
      if (totalParcelas > 60) {
        return erroCliente("Máximo de 60 parcelas.", 400, "total_parcelas_limite");
      }
      if (!Number.isInteger(anoInicio) || !Number.isInteger(mesInicio) || mesInicio < 1 || mesInicio > 12) {
        return erroCliente("Informe o mês da primeira parcela.", 400, "periodo_inicio_invalido");
      }
      if (!dados.categoria) {
        return erroCliente("Escolha uma categoria.", 400, "categoria_obrigatoria");
      }
      if (!dados.meio_pagamento) {
        return erroCliente("Escolha um meio de pagamento.", 400, "meio_pagamento_obrigatorio");
      }
      let cartaoCreditoId = null;
      if (String(dados.meio_pagamento).toLowerCase() === "credito" && dados.cartao_credito_id) {
        const cartaoValido = await validarCartaoCreditoDaCarteira(env, dados.cartao_credito_id, dados.carteira_id);
        if (cartaoValido === false) {
          return erroCliente("Cartão de crédito inválido para esta carteira.", 400, "cartao_credito_invalido");
        }
        cartaoCreditoId = cartaoValido;
        const { results: cartao } = await env.DB.prepare(`SELECT dia_vencimento FROM cartoes_credito WHERE id = ?`).bind(cartaoCreditoId).all();
        diaVencimento = Math.min(Math.max(Number(cartao[0]?.dia_vencimento || diaVencimento), 1), 28);
      }

      const resultado = await env.DB.prepare(
        `INSERT INTO compras_parceladas
         (carteira_id, descricao, valor_total, valor_total_centavos, valor_parcela, valor_parcela_centavos, categoria, meio_pagamento, dia_vencimento, total_parcelas, ano_inicio, mes_inicio, criado_por, cartao_credito_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(dados.carteira_id, descricao, valorTotal, valorTotalCentavos, valorParcela, valorParcelaCentavos, dados.categoria, dados.meio_pagamento, diaVencimento, totalParcelas, anoInicio, mesInicio, usuarioLogado.id, cartaoCreditoId)
        .run();

      const compraParceladaId = Number(resultado.meta?.last_row_id);
      if (!Number.isInteger(compraParceladaId) || compraParceladaId <= 0) {
        return erroInterno(new Error("last_row_id ausente ao criar compra parcelada"), "comprasParceladas.criar", "Compra cadastrada, mas não foi possível gerar as parcelas agora.", "parcelada_id_ausente");
      }

      // Gera todas as N parcelas de uma vez (inclusive as de meses futuros) — diferente da
      // despesa fixa, aqui já sabemos exatamente quando tudo termina desde o cadastro
      await gerarTodasParcelasDaCompra(env, compraParceladaId);

      return json({ id: compraParceladaId, mensagem: "Compra parcelada cadastrada!" }, 201);
    } catch (erro) {
      return erroInterno(erro, "comprasParceladas.criar", "Não foi possível cadastrar a compra parcelada agora.", "parcelada_criar_falhou");
    }
  }

  // ==========================================
  // EDITAR / CANCELAR
  // ==========================================
  if (metodo === "PUT") {
    try {
      const id = url.searchParams.get("id");
      if (!id) {
        return erroCliente("ID não fornecido.", 400, "id_obrigatorio");
      }

      const { results: alvo } = await env.DB.prepare(`SELECT carteira_id, meio_pagamento FROM compras_parceladas WHERE id = ?`).bind(id).all();
      if (alvo.length === 0) {
        return erroCliente("Compra parcelada não encontrada.", 404, "parcelada_nao_encontrada");
      }
      if (!carteirasPermitidas.includes(alvo[0].carteira_id)) {
        return erroCliente("Acesso negado a esta carteira.", 403, "carteira_acesso_negado");
      }

      const dados = await request.json();
      const campos = [];
      const valores = [];

      if (dados.descricao !== undefined) {
        campos.push("descricao = ?");
        valores.push(String(dados.descricao).trim());
      }
      if (dados.valor_parcela !== undefined || dados.valor_parcela_centavos !== undefined) {
        const valorParcelaCentavos = normalizarCentavos(dados.valor_parcela, dados.valor_parcela_centavos);
        const valor = centavosParaReais(valorParcelaCentavos);
        if (valorParcelaCentavos <= 0) {
          return erroCliente("Informe o valor da parcela.", 400, "valor_parcela_invalido");
        }
        campos.push("valor_parcela = ?");
        valores.push(valor);
        campos.push("valor_parcela_centavos = ?");
        valores.push(valorParcelaCentavos);
      }
      if (dados.valor_total !== undefined || dados.valor_total_centavos !== undefined) {
        const valorTotalCentavos = normalizarCentavos(dados.valor_total, dados.valor_total_centavos);
        if (valorTotalCentavos <= 0) {
          return erroCliente("Informe o valor total da compra.", 400, "valor_total_invalido");
        }
        campos.push("valor_total = ?");
        valores.push(centavosParaReais(valorTotalCentavos));
        campos.push("valor_total_centavos = ?");
        valores.push(valorTotalCentavos);
      }
      if (dados.categoria !== undefined) {
        campos.push("categoria = ?");
        valores.push(dados.categoria);
      }
      if (dados.meio_pagamento !== undefined) {
        campos.push("meio_pagamento = ?");
        valores.push(dados.meio_pagamento);
      }
      if (dados.dia_vencimento !== undefined) {
        const dia = parseInt(dados.dia_vencimento, 10);
        if (!Number.isInteger(dia) || dia < 1 || dia > 28) {
          return erroCliente("Escolha um dia de vencimento entre 1 e 28.", 400, "dia_vencimento_invalido");
        }
        campos.push("dia_vencimento = ?");
        valores.push(dia);
      }
      if (dados.ativo !== undefined) {
        campos.push("ativo = ?");
        valores.push(dados.ativo ? 1 : 0);
      }
      if (dados.cartao_credito_id !== undefined || dados.meio_pagamento !== undefined) {
        const meioPagamento = dados.meio_pagamento ?? alvo[0].meio_pagamento;
        let cartaoCreditoId = null;
        if (String(meioPagamento).toLowerCase() === "credito" && dados.cartao_credito_id) {
          const cartaoValido = await validarCartaoCreditoDaCarteira(env, dados.cartao_credito_id, alvo[0].carteira_id);
          if (cartaoValido === false) {
            return erroCliente("Cartão de crédito inválido para esta carteira.", 400, "cartao_credito_invalido");
          }
          cartaoCreditoId = cartaoValido;
          const { results: cartao } = await env.DB.prepare(`SELECT dia_vencimento FROM cartoes_credito WHERE id = ?`).bind(cartaoCreditoId).all();
          const diaCartao = Math.min(Math.max(Number(cartao[0]?.dia_vencimento || 1), 1), 28);
          const indiceDia = campos.indexOf("dia_vencimento = ?");
          if (indiceDia >= 0) valores[indiceDia] = diaCartao;
          else {
            campos.push("dia_vencimento = ?");
            valores.push(diaCartao);
          }
        }
        campos.push("cartao_credito_id = ?");
        valores.push(cartaoCreditoId);
      }

      if (campos.length === 0) {
        return erroCliente("Nada para atualizar.", 400, "sem_campos_para_atualizar");
      }

      valores.push(id);
      await env.DB.prepare(`UPDATE compras_parceladas SET ${campos.join(", ")} WHERE id = ?`)
        .bind(...valores)
        .run();

      if (campos.some((campo) => campo.startsWith("cartao_credito_id")) || dados.meio_pagamento !== undefined) {
        const { results: atualizada } = await env.DB.prepare(`SELECT cartao_credito_id FROM compras_parceladas WHERE id = ?`).bind(id).all();
        await env.DB.prepare(`UPDATE lancamentos SET cartao_credito_id = ? WHERE compra_parcelada_id = ?`)
          .bind(atualizada[0]?.cartao_credito_id || null, id)
          .run();
      }

      return json({ mensagem: "Atualizado com sucesso." });
    } catch (erro) {
      return erroInterno(erro, "comprasParceladas.atualizar", "Não foi possível atualizar esta compra parcelada agora.", "parcelada_atualizar_falhou");
    }
  }

  // ==========================================
  // EXCLUIR
  // ==========================================
  if (metodo === "DELETE") {
    try {
      const id = url.searchParams.get("id");
      if (!id) {
        return erroCliente("ID não fornecido.", 400, "id_obrigatorio");
      }

      const { results: alvo } = await env.DB.prepare(`SELECT carteira_id FROM compras_parceladas WHERE id = ?`).bind(id).all();
      if (alvo.length === 0) {
        return erroCliente("Compra parcelada não encontrada.", 404, "parcelada_nao_encontrada");
      }
      if (!carteirasPermitidas.includes(alvo[0].carteira_id)) {
        return erroCliente("Acesso negado a esta carteira.", 403, "carteira_acesso_negado");
      }

      // Desvincula as parcelas já geradas antes de excluir a regra (evita violar a chave estrangeira)
      await env.DB.prepare(`UPDATE lancamentos SET compra_parcelada_id = NULL WHERE compra_parcelada_id = ?`).bind(id).run();

      await env.DB.prepare(`DELETE FROM compras_parceladas WHERE id = ?`).bind(id).run();

      return json({ mensagem: "Compra parcelada excluída." });
    } catch (erro) {
      return erroInterno(erro, "comprasParceladas.excluir", "Não foi possível excluir esta compra parcelada agora.", "parcelada_excluir_falhou");
    }
  }

  return erroCliente("Método não permitido.", 405, "metodo_nao_permitido");
}
