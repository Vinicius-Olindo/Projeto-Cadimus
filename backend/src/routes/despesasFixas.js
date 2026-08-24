// ==========================================
// despesasFixas.js (rota) - Gestão das despesas/receitas fixas
// ==========================================
import { obterUsuarioDaSessao } from "../utils/sessao.ts";
import { obterCarteirasDoUsuario } from "../utils/carteiras.ts";
import { isTipoLancamento, normalizarId, normalizarMeioPagamento } from "../domain.ts";
import { centavosParaReais, normalizarCentavos } from "../utils/dinheiro.ts";
import { deveVincularCartaoCredito, validarCartaoCreditoDaCarteira } from "../utils/cartoesCredito.ts";
import { erroCliente, erroInterno, json } from "../utils/respostas.ts";

/**
 * @param {Request} request
 * @param {import("../types.js").CadimusEnv} env
 * @param {import("../types.js").WorkerCtx} ctx
 */
export async function processarDespesasFixas(request, env, ctx) {
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
      const carteiraIdNormalizada = carteiraId ? normalizarId(carteiraId) : null;

      if (carteiraId && (!carteiraIdNormalizada || !carteirasPermitidas.includes(carteiraIdNormalizada))) {
        return erroCliente("Acesso negado a esta carteira.", 403, "carteira_acesso_negado");
      }
      if (carteirasPermitidas.length === 0) {
        return json([]);
      }

      let query = `SELECT * FROM despesas_fixas WHERE 1=1`;
      let params = /** @type {import("../types.js").SqlParam[]} */ ([]);

      if (carteiraId) {
        query += ` AND carteira_id = ?`;
        params.push(carteiraIdNormalizada);
      } else {
        query += ` AND carteira_id IN (${carteirasPermitidas.map(() => "?").join(",")})`;
        params.push(...carteirasPermitidas);
      }

      query += ` ORDER BY dia_vencimento ASC`;

      const { results } = await env.DB.prepare(query)
        .bind(...params)
        .all();
      return json(results);
    } catch (erro) {
      return erroInterno(erro, "despesasFixas.listar", "Não foi possível carregar as despesas fixas agora.", "fixas_listar_falhou");
    }
  }

  // ==========================================
  // CRIAR
  // ==========================================
  if (metodo === "POST") {
    try {
      const dados = await request.json();
      const carteiraIdNormalizada = normalizarId(dados.carteira_id);

      if (!carteiraIdNormalizada || !carteirasPermitidas.includes(carteiraIdNormalizada)) {
        return erroCliente("Acesso negado a esta carteira.", 403, "carteira_acesso_negado");
      }

      const descricao = (dados.descricao || "").trim();
      if (dados.valor === undefined && dados.valor_centavos === undefined) {
        return erroCliente("Informe um valor válido.", 400, "valor_obrigatorio");
      }
      const valorCentavos = normalizarCentavos(dados.valor, dados.valor_centavos);
      const valor = centavosParaReais(valorCentavos);
      const diaVencimento = parseInt(dados.dia_vencimento, 10);
      const tipo = dados.tipo === "receita" ? "receita" : "despesa";

      if (!descricao) {
        return erroCliente("Informe uma descrição.", 400, "descricao_obrigatoria");
      }
      if (valorCentavos <= 0) {
        return erroCliente("Informe um valor válido.", 400, "valor_invalido");
      }
      if (!Number.isInteger(diaVencimento) || diaVencimento < 1 || diaVencimento > 28) {
        return erroCliente("Escolha um dia de vencimento entre 1 e 28 (evita problemas em meses mais curtos).", 400, "dia_vencimento_invalido");
      }
      if (!dados.categoria) {
        return erroCliente("Escolha uma categoria.", 400, "categoria_obrigatoria");
      }
      if (!dados.meio_pagamento) {
        return erroCliente("Escolha um meio de pagamento.", 400, "meio_pagamento_obrigatorio");
      }
      const meioPagamento = normalizarMeioPagamento(dados.meio_pagamento);
      if (!meioPagamento) {
        return erroCliente("Meio de pagamento inválido.", 400, "meio_pagamento_invalido");
      }
      let cartaoCreditoId = null;
      if (deveVincularCartaoCredito({ ...dados, tipo, meio_pagamento: meioPagamento }) && dados.cartao_credito_id) {
        const cartaoValido = await validarCartaoCreditoDaCarteira(env, dados.cartao_credito_id, carteiraIdNormalizada);
        if (cartaoValido === false) {
          return erroCliente("Cartão de crédito inválido para esta carteira.", 400, "cartao_credito_invalido");
        }
        cartaoCreditoId = cartaoValido;
      }

      const resultado = await env.DB.prepare(
        `INSERT INTO despesas_fixas (carteira_id, descricao, valor, valor_centavos, tipo, categoria, meio_pagamento, dia_vencimento, criado_por, cartao_credito_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(carteiraIdNormalizada, descricao, valor, valorCentavos, tipo, dados.categoria, meioPagamento, diaVencimento, usuarioLogado.id, cartaoCreditoId)
        .run();

      return json({ id: resultado.meta?.last_row_id ?? null, mensagem: "Despesa fixa cadastrada!" }, 201);
    } catch (erro) {
      return erroInterno(erro, "despesasFixas.criar", "Não foi possível cadastrar esta despesa fixa agora.", "fixa_criar_falhou");
    }
  }

  // ==========================================
  // EDITAR / PAUSAR / ATIVAR
  // ==========================================
  if (metodo === "PUT") {
    try {
      const id = url.searchParams.get("id");
      if (!id) {
        return erroCliente("ID não fornecido.", 400, "id_obrigatorio");
      }

      const { results: alvo } = await env.DB.prepare(`SELECT carteira_id, tipo, meio_pagamento FROM despesas_fixas WHERE id = ?`).bind(id).all();
      if (alvo.length === 0) {
        return erroCliente("Despesa fixa não encontrada.", 404, "fixa_nao_encontrada");
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
      if (dados.valor !== undefined || dados.valor_centavos !== undefined) {
        const valorCentavos = normalizarCentavos(dados.valor, dados.valor_centavos);
        const valor = centavosParaReais(valorCentavos);
        if (valorCentavos <= 0) {
          return erroCliente("Informe um valor válido.", 400, "valor_invalido");
        }
        campos.push("valor = ?");
        valores.push(valor);
        campos.push("valor_centavos = ?");
        valores.push(valorCentavos);
      }
      if (dados.tipo !== undefined) {
        if (!isTipoLancamento(dados.tipo)) {
          return erroCliente("Tipo inválido.", 400, "tipo_invalido");
        }
        campos.push("tipo = ?");
        valores.push(dados.tipo);
      }
      if (dados.categoria !== undefined) {
        campos.push("categoria = ?");
        valores.push(dados.categoria);
      }
      if (dados.meio_pagamento !== undefined) {
        const meioPagamento = normalizarMeioPagamento(dados.meio_pagamento);
        if (!meioPagamento) {
          return erroCliente("Meio de pagamento inválido.", 400, "meio_pagamento_invalido");
        }
        campos.push("meio_pagamento = ?");
        valores.push(meioPagamento);
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
      if (dados.cartao_credito_id !== undefined || dados.meio_pagamento !== undefined || dados.tipo !== undefined) {
        const dadosCartao = {
          tipo: dados.tipo ?? alvo[0].tipo,
          meio_pagamento: dados.meio_pagamento ?? alvo[0].meio_pagamento,
          cartao_credito_id: dados.cartao_credito_id,
        };
        let cartaoCreditoId = null;
        if (deveVincularCartaoCredito(dadosCartao) && dados.cartao_credito_id) {
          const cartaoValido = await validarCartaoCreditoDaCarteira(env, dados.cartao_credito_id, alvo[0].carteira_id);
          if (cartaoValido === false) {
            return erroCliente("Cartão de crédito inválido para esta carteira.", 400, "cartao_credito_invalido");
          }
          cartaoCreditoId = cartaoValido;
        }
        campos.push("cartao_credito_id = ?");
        valores.push(cartaoCreditoId);
      }

      if (campos.length === 0) {
        return erroCliente("Nada para atualizar.", 400, "sem_campos_para_atualizar");
      }

      valores.push(id);
      await env.DB.prepare(`UPDATE despesas_fixas SET ${campos.join(", ")} WHERE id = ?`)
        .bind(...valores)
        .run();

      if (campos.some((campo) => campo.startsWith("cartao_credito_id")) || dados.meio_pagamento !== undefined || dados.tipo !== undefined) {
        const { results: atualizada } = await env.DB.prepare(`SELECT cartao_credito_id FROM despesas_fixas WHERE id = ?`).bind(id).all();
        await env.DB.prepare(`UPDATE lancamentos SET cartao_credito_id = ? WHERE despesa_fixa_id = ?`)
          .bind(atualizada[0]?.cartao_credito_id || null, id)
          .run();
      }

      return json({ mensagem: "Atualizado com sucesso." });
    } catch (erro) {
      return erroInterno(erro, "despesasFixas.atualizar", "Não foi possível atualizar esta despesa fixa agora.", "fixa_atualizar_falhou");
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

      const { results: alvo } = await env.DB.prepare(`SELECT carteira_id FROM despesas_fixas WHERE id = ?`).bind(id).all();
      if (alvo.length === 0) {
        return erroCliente("Despesa fixa não encontrada.", 404, "fixa_nao_encontrada");
      }
      if (!carteirasPermitidas.includes(alvo[0].carteira_id)) {
        return erroCliente("Acesso negado a esta carteira.", 403, "carteira_acesso_negado");
      }

      // Desvincula os lançamentos que essa regra já gerou (eles continuam existindo,
      // só param de "pertencer" à regra) — sem isso, a chave estrangeira impede a exclusão
      await env.DB.prepare(`UPDATE lancamentos SET despesa_fixa_id = NULL WHERE despesa_fixa_id = ?`).bind(id).run();

      await env.DB.prepare(`DELETE FROM despesas_fixas WHERE id = ?`).bind(id).run();

      return json({ mensagem: "Despesa fixa excluída." });
    } catch (erro) {
      return erroInterno(erro, "despesasFixas.excluir", "Não foi possível excluir esta despesa fixa agora.", "fixa_excluir_falhou");
    }
  }

  return erroCliente("Método não permitido.", 405, "metodo_nao_permitido");
}
