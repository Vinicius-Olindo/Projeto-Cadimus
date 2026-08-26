// ==========================================
// lancamentos.js - Lógica de Despesas e Receitas
// ==========================================
import { obterUsuarioDaSessao } from "../utils/sessao.ts";
import { obterCarteirasDoUsuario } from "../utils/carteiras.ts";
import {
  isStatusLancamento,
  isTipoLancamento,
  normalizarId,
  normalizarMeioPagamento,
  normalizarStatusLancamento,
  normalizarTipoLancamento,
} from "../domain.ts";
import { gerarLancamentosFixosDoMes } from "../utils/despesasFixas.ts";
import { gerarLancamentosParceladosDoMes } from "../utils/comprasParceladas.ts";
import { gerarLancamentosRecorrentesDoMes } from "../utils/lancamentosRecorrentes.ts";
import { registrarAuditoria } from "../utils/auditoria.ts";
import { centavosParaReais, normalizarCentavos } from "../utils/dinheiro.ts";
import { deveVincularCartaoCredito, validarCartaoCreditoDaCarteira } from "../utils/cartoesCredito.ts";
import { erroCliente, erroInterno, json } from "../utils/respostas.ts";

/** @param {unknown} valor */
function dataISOValida(valor) {
  return typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

/**
 * @param {import("../types.js").CadimusEnv} env
 * @param {number[]} carteirasAlvo
 * @param {string} dataInicio
 * @param {string} dataFim
 */
async function gerarLancamentosDoPeriodo(env, carteirasAlvo, dataInicio, dataFim) {
  if (!dataISOValida(dataInicio) || !dataISOValida(dataFim)) return;

  const inicio = new Date(`${dataInicio}T12:00:00`);
  const fim = new Date(`${dataFim}T12:00:00`);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || inicio > fim) return;

  const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
  const limite = new Date(fim.getFullYear(), fim.getMonth(), 1);
  let mesesProcessados = 0;

  while (cursor <= limite && mesesProcessados < 24) {
    const ano = String(cursor.getFullYear());
    const mes = String(cursor.getMonth() + 1).padStart(2, "0");
    await gerarLancamentosFixosDoMes(env, carteirasAlvo, ano, mes);
    await gerarLancamentosParceladosDoMes(env, carteirasAlvo, ano, mes);
    await gerarLancamentosRecorrentesDoMes(env, carteirasAlvo, ano, mes);
    cursor.setMonth(cursor.getMonth() + 1);
    mesesProcessados++;
  }
}

/**
 * @param {import("../types.js").CadimusEnv} env
 * @param {number} carteiraId
 */
async function carteiraEhCompartilhada(env, carteiraId) {
  const { results } = await env.DB.prepare(`SELECT tipo FROM carteiras WHERE id = ?`).bind(carteiraId).all();
  return results[0]?.tipo === "compartilhada";
}

/**
 * @param {import("../types.js").CadimusEnv} env
 * @param {Array<number|string>} carteiraIds
 * @returns {Promise<Set<number>>}
 */
async function obterCarteirasCompartilhadas(env, carteiraIds) {
  const idsUnicos = [...new Set(carteiraIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
  if (idsUnicos.length === 0) return new Set();

  const { results } = await env.DB.prepare(
    `SELECT id FROM carteiras WHERE tipo = 'compartilhada' AND id IN (${idsUnicos.map(() => "?").join(",")})`,
  )
    .bind(...idsUnicos)
    .all();

  return new Set(/** @type {{ id: number|string }[]} */ (results).map((carteira) => Number(carteira.id)));
}

/**
 * @param {Request} request
 * @param {import("../types.js").CadimusEnv} env
 * @param {import("../types.js").WorkerCtx} ctx
 */
export async function processarLancamentos(request, env, ctx) {
  const metodo = request.method;
  const url = new URL(request.url);

  // Toda operação em lançamentos exige login
  const usuarioLogado = await obterUsuarioDaSessao(request, env, ctx);
  if (!usuarioLogado) {
    return erroCliente("Não autenticado.", 401, "nao_autenticado");
  }

  // Só pode ler/gravar/apagar nas carteiras às quais tem acesso (usuarios_carteiras)
  const carteirasPermitidas = await obterCarteirasDoUsuario(env, usuarioLogado.id);

  // ==========================================
  // 1. BUSCAR LANÇAMENTOS (GET COM FILTROS)
  // ==========================================
  if (metodo === "GET") {
    try {
      const mes = url.searchParams.get("mes");
      const ano = url.searchParams.get("ano");
      const carteiraId = url.searchParams.get("carteira_id");
      const dataInicio = url.searchParams.get("data_inicio");
      const dataFim = url.searchParams.get("data_fim");
      const categoria = url.searchParams.get("categoria");
      const tipo = url.searchParams.get("tipo");
      const status = url.searchParams.get("status");
      const carteiraIdNormalizada = carteiraId ? normalizarId(carteiraId) : null;

      if (carteiraId && (!carteiraIdNormalizada || !carteirasPermitidas.includes(carteiraIdNormalizada))) {
        return erroCliente("Acesso negado a esta carteira.", 403, "carteira_acesso_negado");
      }

      if (carteirasPermitidas.length === 0) {
        return json([]);
      }
      if (tipo && !isTipoLancamento(tipo)) {
        return erroCliente("Tipo inválido.", 400, "tipo_invalido");
      }
      if (status && !isStatusLancamento(status)) {
        return erroCliente("Status inválido.", 400, "status_invalido");
      }

      const despesaFixaId = url.searchParams.get("despesa_fixa_id");
      const compraParceladaId = url.searchParams.get("compra_parcelada_id");
      const recorrenciaId = url.searchParams.get("recorrencia_id");

      // Antes de listar, garante que as despesas fixas ativas e as parcelas do mês já foram geradas
      if (mes && ano && !despesaFixaId && !compraParceladaId && !recorrenciaId) {
        const carteirasAlvo = carteiraIdNormalizada ? [carteiraIdNormalizada] : carteirasPermitidas;
        await gerarLancamentosFixosDoMes(env, carteirasAlvo, ano, mes);
        await gerarLancamentosParceladosDoMes(env, carteirasAlvo, ano, mes);
        await gerarLancamentosRecorrentesDoMes(env, carteirasAlvo, ano, mes);
      } else if (dataInicio && dataFim && !despesaFixaId && !compraParceladaId && !recorrenciaId) {
        const carteirasAlvo = carteiraIdNormalizada ? [carteiraIdNormalizada] : carteirasPermitidas;
        await gerarLancamentosDoPeriodo(env, carteirasAlvo, dataInicio, dataFim);
      }

      let query = `
        SELECT l.*, COALESCE(u.nome, u.nome_usuario) AS criado_por_nome, u.foto_perfil AS criado_por_foto
        FROM lancamentos l
        JOIN usuarios u ON u.id = l.criado_por
        WHERE 1=1
      `;
      let params = /** @type {import("../types.js").SqlParam[]} */ ([]);

      if (carteiraId) {
        query += ` AND l.carteira_id = ?`;
        params.push(carteiraId);
      } else {
        // Sem filtro explícito: restringe automaticamente às carteiras do usuário
        query += ` AND l.carteira_id IN (${carteirasPermitidas.map(() => "?").join(",")})`;
        params.push(...carteirasPermitidas);
      }

      if (mes && ano) {
        query += ` AND strftime('%m', l.data_compra) = ? AND strftime('%Y', l.data_compra) = ?`;
        params.push(mes.padStart(2, "0"), ano);
      }

      if (dataInicio) {
        if (!dataISOValida(dataInicio)) {
          return erroCliente("data_inicio inválida.", 400, "data_inicio_invalida");
        }
        query += ` AND l.data_compra >= ?`;
        params.push(dataInicio);
      }

      if (dataFim) {
        if (!dataISOValida(dataFim)) {
          return erroCliente("data_fim inválida.", 400, "data_fim_invalida");
        }
        query += ` AND l.data_compra <= ?`;
        params.push(dataFim);
      }

      if (categoria) {
        query += ` AND LOWER(l.categoria) = LOWER(?)`;
        params.push(categoria);
      }

      if (tipo) {
        query += ` AND l.tipo = ?`;
        params.push(tipo);
      }

      if (status) {
        query += ` AND l.status = ?`;
        params.push(status);
      }

      if (despesaFixaId) {
        query += ` AND l.despesa_fixa_id = ?`;
        params.push(despesaFixaId);
      }

      if (compraParceladaId) {
        query += ` AND l.compra_parcelada_id = ?`;
        params.push(compraParceladaId);
      }

      if (recorrenciaId) {
        query += ` AND l.recorrencia_id = ?`;
        params.push(recorrenciaId);
      }

      query += ` ORDER BY l.data_compra DESC`;

      const { results } = await env.DB.prepare(query)
        .bind(...params)
        .all();
      return json(results);
    } catch (erro) {
      return erroInterno(erro, "lancamentos.listar", "Não foi possível carregar os lançamentos agora.", "lancamentos_listar_falhou");
    }
  }

  // ==========================================
  // 2. SALVAR NOVO LANÇAMENTO (POST)
  // ==========================================
  if (metodo === "POST") {
    try {
      const dados = await request.json();
      const carteiraIdNormalizada = normalizarId(dados.carteira_id);

      if (!carteiraIdNormalizada || !carteirasPermitidas.includes(carteiraIdNormalizada)) {
        return erroCliente("Acesso negado a esta carteira.", 403, "carteira_acesso_negado");
      }

      const descricao = String(dados.descricao || "").trim();
      const dataCompra = String(dados.data_compra || "").trim();
      const categoria = String(dados.categoria || "").trim();

      if (!descricao) {
        return erroCliente("Informe uma descrição para o lançamento.", 400, "descricao_obrigatoria");
      }
      if (dados.valor === undefined && dados.valor_centavos === undefined) {
        return erroCliente("Informe um valor válido.", 400, "valor_obrigatorio");
      }
      if (!dataCompra || Number.isNaN(Date.parse(`${dataCompra}T12:00:00`))) {
        return erroCliente("Informe uma data válida para o lançamento.", 400, "data_compra_invalida");
      }
      if (!categoria) {
        return erroCliente("Escolha uma categoria.", 400, "categoria_obrigatoria");
      }

      const tipoNormalizado = normalizarTipoLancamento(dados.tipo);
      const statusNormalizado = normalizarStatusLancamento(dados.status);
      const meioPagamentoNormalizado = normalizarMeioPagamento(dados.meio_pagamento);
      if (!tipoNormalizado) {
        return erroCliente("Tipo inválido.", 400, "tipo_invalido");
      }
      if (!statusNormalizado) {
        return erroCliente("Status inválido.", 400, "status_invalido");
      }
      if (!meioPagamentoNormalizado) {
        return erroCliente("Meio de pagamento inválido.", 400, "meio_pagamento_invalido");
      }

      // Valida que a categoria existe na tabela de categorias.
      // Não usamos FK no banco porque a categoria é texto livre nos lançamentos
      // históricos (permite renomear retroativamente via categorias.ts), mas
      // garantimos aqui que só entram valores reconhecidos pelo sistema.
      if (categoria) {
        const { results: catValida } = await env.DB.prepare(
          `SELECT id FROM categorias WHERE LOWER(nome) = LOWER(?)`
        ).bind(categoria).all();
        if (catValida.length === 0) {
          return erroCliente("Categoria inválida. Escolha uma categoria existente ou cadastre uma nova antes de salvar.", 400, "categoria_invalida");
        }
      }

      let valorCentavos;
      try {
        valorCentavos = normalizarCentavos(dados.valor, dados.valor_centavos);
      } catch {
        return erroCliente("Informe um valor válido.", 400, "valor_invalido");
      }
      if (valorCentavos <= 0) {
        return erroCliente("Informe um valor maior que zero.", 400, "valor_invalido");
      }
      const valor = centavosParaReais(valorCentavos);
      let cartaoCreditoId = null;
      if (deveVincularCartaoCredito({ ...dados, tipo: tipoNormalizado, meio_pagamento: meioPagamentoNormalizado }) && dados.cartao_credito_id) {
        const cartaoValido = await validarCartaoCreditoDaCarteira(env, dados.cartao_credito_id, carteiraIdNormalizada);
        if (cartaoValido === false) {
          return erroCliente("Cartão de crédito inválido para esta carteira.", 400, "cartao_credito_invalido");
        }
        cartaoCreditoId = cartaoValido;
      }

      const query = `
                INSERT INTO lancamentos 
                (descricao, valor, valor_centavos, data_compra, tipo, categoria, meio_pagamento, status, carteira_id, criado_por, nota, cartao_credito_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
      const insertResult = await env.DB.prepare(query)
        .bind(
          descricao,
          valor,
          valorCentavos,
          dataCompra,
          tipoNormalizado,
          categoria,
          meioPagamentoNormalizado,
          statusNormalizado,
          carteiraIdNormalizada,
          usuarioLogado.id, // criado_por vem da sessão, nunca do corpo enviado pelo cliente
          dados.nota || "",
          cartaoCreditoId,
        )
        .run();

      await registrarAuditoria(env, {
        usuarioId: usuarioLogado.id,
        acao: "lancamento.criado",
        entidade: "lancamento",
        entidadeId: insertResult.meta?.last_row_id || null,
        carteiraId: carteiraIdNormalizada,
        metadata: {
          tipo: tipoNormalizado,
          status: statusNormalizado,
          categoria,
        },
      });

      return json({ mensagem: "Salvo com sucesso!" }, 201);
    } catch (erro) {
      return erroInterno(erro, "lancamentos.criar", "Não foi possível salvar este lançamento agora.", "lancamento_salvar_falhou");
    }
  }

  // ==========================================
  // 3. EDITAR (hoje usado pra alternar pago/pendente, mas aceita qualquer campo)
  // ==========================================
  if (metodo === "PUT") {
    try {
      const id = url.searchParams.get("id");
      if (!id) {
        return erroCliente("ID não fornecido.", 400, "id_obrigatorio");
      }

      const { results: alvo } = await env.DB.prepare(`SELECT carteira_id, criado_por, tipo, meio_pagamento FROM lancamentos WHERE id = ?`).bind(id).all();
      if (alvo.length === 0) {
        return erroCliente("Lançamento não encontrado.", 404, "lancamento_nao_encontrado");
      }
      if (!carteirasPermitidas.includes(alvo[0].carteira_id)) {
        return erroCliente("Acesso negado a esta carteira.", 403, "carteira_acesso_negado");
      }

      const dados = await request.json();
      const camposPermitidos = ["descricao", "valor", "valor_centavos", "data_compra", "tipo", "categoria", "meio_pagamento", "status", "nota", "cartao_credito_id"];
      const camposEnviados = Object.keys(dados).filter((campo) => camposPermitidos.includes(campo));

      // Marcar pago/pendente é livre pra quem acessa a carteira. Editar os detalhes
      // em carteira pessoal é restrito ao criador/admin; em carteira compartilhada,
      // qualquer membro da carteira pode ajustar o registro compartilhado.
      const apenasAlternandoStatus = camposEnviados.length > 0 && camposEnviados.every((campo) => campo === "status");
      const carteiraCompartilhada = await carteiraEhCompartilhada(env, alvo[0].carteira_id);
      const podeEditarDetalhes = carteiraCompartilhada || alvo[0].criado_por === usuarioLogado.id || usuarioLogado.perfil === "superadmin";

      if (!apenasAlternandoStatus && !podeEditarDetalhes) {
        return erroCliente("Só quem lançou (ou um administrador) pode editar os detalhes deste registro.", 403, "lancamento_edicao_negada");
      }

      const campos = [];
      const valores = [];

      if (dados.valor !== undefined || dados.valor_centavos !== undefined) {
        const valorCentavos = normalizarCentavos(dados.valor, dados.valor_centavos);
        campos.push("valor = ?");
        valores.push(centavosParaReais(valorCentavos));
        campos.push("valor_centavos = ?");
        valores.push(valorCentavos);
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

      for (const campo of camposEnviados) {
        if (campo === "valor" || campo === "valor_centavos" || campo === "cartao_credito_id") continue;

        if (campo === "status" && !isStatusLancamento(dados.status)) {
          return erroCliente("Status inválido.", 400, "status_invalido");
        }
        if (campo === "tipo" && !isTipoLancamento(dados.tipo)) {
          return erroCliente("Tipo inválido.", 400, "tipo_invalido");
        }
        if (campo === "meio_pagamento" && !normalizarMeioPagamento(dados.meio_pagamento)) {
          return erroCliente("Meio de pagamento inválido.", 400, "meio_pagamento_invalido");
        }
        if (campo === "categoria") {
          const { results: catValida } = await env.DB.prepare(
            `SELECT id FROM categorias WHERE LOWER(nome) = LOWER(?)`
          ).bind(dados.categoria).all();
          if (catValida.length === 0) {
            return erroCliente("Categoria inválida. Escolha uma categoria existente ou cadastre uma nova antes de salvar.", 400, "categoria_invalida");
          }
        }

        campos.push(`${campo} = ?`);
        if (campo === "tipo") valores.push(normalizarTipoLancamento(dados[campo]));
        else if (campo === "status") valores.push(normalizarStatusLancamento(dados[campo]));
        else if (campo === "meio_pagamento") valores.push(normalizarMeioPagamento(dados[campo]));
        else valores.push(dados[campo]);
      }

      if (campos.length === 0) {
        return erroCliente("Nada para atualizar.", 400, "sem_campos_para_atualizar");
      }

      valores.push(id);
      await env.DB.prepare(`UPDATE lancamentos SET ${campos.join(", ")} WHERE id = ?`)
        .bind(...valores)
        .run();

      await registrarAuditoria(env, {
        usuarioId: usuarioLogado.id,
        acao: "lancamento.atualizado",
        entidade: "lancamento",
        entidadeId: Number(id),
        carteiraId: alvo[0].carteira_id,
        metadata: {
          campos: camposEnviados,
        },
      });

      return json({ mensagem: "Atualizado com sucesso." });
    } catch (erro) {
      return erroInterno(erro, "lancamentos.atualizar", "Não foi possível atualizar este lançamento agora.", "lancamento_atualizar_falhou");
    }
  }

  // ==========================================
  // 4. APAGAR LANÇAMENTO (DELETE)
  // ==========================================
  if (metodo === "DELETE") {
    try {
      const idParaApagar = url.searchParams.get("id");

      if (!idParaApagar) {
        return erroCliente("ID não fornecido.", 400, "id_obrigatorio");
      }

      const { results } = await env.DB.prepare(`SELECT carteira_id, criado_por FROM lancamentos WHERE id = ?`).bind(idParaApagar).all();

      if (results.length === 0) {
        return erroCliente("Lançamento não encontrado.", 404, "lancamento_nao_encontrado");
      }
      if (!carteirasPermitidas.includes(results[0].carteira_id)) {
        return erroCliente("Acesso negado a esta carteira.", 403, "carteira_acesso_negado");
      }
      const carteiraCompartilhada = await carteiraEhCompartilhada(env, results[0].carteira_id);
      if (!carteiraCompartilhada && results[0].criado_por !== usuarioLogado.id && usuarioLogado.perfil !== "superadmin") {
        return erroCliente("Só quem lançou (ou um administrador) pode excluir este registro.", 403, "lancamento_exclusao_negada");
      }

      await env.DB.prepare(`DELETE FROM lancamentos WHERE id = ?`).bind(idParaApagar).run();

      await registrarAuditoria(env, {
        usuarioId: usuarioLogado.id,
        acao: "lancamento.excluido",
        entidade: "lancamento",
        entidadeId: Number(idParaApagar),
        carteiraId: results[0].carteira_id,
      });

      return json({ mensagem: "Lançamento apagado." });
    } catch (erro) {
      return erroInterno(erro, "lancamentos.excluir", "Não foi possível apagar este lançamento agora.", "lancamento_excluir_falhou");
    }
  }

  // ==========================================
  // 5. ATUALIZAÇÃO EM LOTE (PATCH)
  // ==========================================
  if (metodo === "PATCH") {
    try {
      const dados = await request.json();
      const { ids, status, categoria } = dados;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return erroCliente("Nenhum ID fornecido.", 400, "ids_obrigatorios");
      }

      if (ids.length > 50) {
        return erroCliente("Máximo de 50 lançamentos por vez.", 400, "lote_limite_excedido");
      }

      if (status && !isStatusLancamento(status)) {
        return erroCliente("Status inválido.", 400, "status_invalido");
      }

      if (categoria) {
        const { results: catValida } = await env.DB.prepare(
          `SELECT id FROM categorias WHERE LOWER(nome) = LOWER(?)`
        ).bind(categoria).all();
        if (catValida.length === 0) {
          return erroCliente("Categoria inválida.", 400, "categoria_invalida");
        }
      }

      // Verifica permissão: em carteira pessoal, só quem criou/admin edita detalhes;
      // em compartilhada, qualquer membro com acesso pode atuar no registro.
      const placeholders = ids.map(() => "?").join(",");
      const { results: alvos } = await env.DB.prepare(
        `SELECT id, criado_por, carteira_id FROM lancamentos WHERE id IN (${placeholders})`
      ).bind(...ids).all();

      const carteirasCompartilhadas = await obterCarteirasCompartilhadas(env, alvos.map((a) => a.carteira_id));
      const semPermissao = /** @type {any[]} */ (alvos).filter(
        (a) => !carteirasCompartilhadas.has(Number(a.carteira_id)) && a.criado_por !== usuarioLogado.id && usuarioLogado.perfil !== "superadmin"
      );
      if (semPermissao.length > 0) {
        return erroCliente("Sem permissão para editar alguns lançamentos.", 403, "lote_edicao_negada");
      }

      const foraDaCarteira = /** @type {any[]} */ (alvos).filter((a) => !carteirasPermitidas.includes(a.carteira_id));
      if (foraDaCarteira.length > 0) {
        return erroCliente("Acesso negado a alguns lançamentos.", 403, "lote_acesso_negado");
      }

      let atualizados = 0;
      for (const id of ids) {
        const campos = [];
        const valores = [];

        if (status) {
          campos.push("status = ?");
          valores.push(status);
        }
        if (categoria) {
          campos.push("categoria = ?");
          valores.push(categoria);
        }

        if (campos.length === 0) continue;

        valores.push(id);
        await env.DB.prepare(`UPDATE lancamentos SET ${campos.join(", ")} WHERE id = ?`).bind(...valores).run();
        atualizados++;
      }

      if (atualizados > 0) {
        await registrarAuditoria(env, {
          usuarioId: usuarioLogado.id,
          acao: "lancamento.lote_atualizado",
          entidade: "lancamento",
          metadata: {
            ids,
            status: status || null,
            categoria: categoria || null,
            atualizados,
          },
        });
      }

      return json({ mensagem: `${atualizados} lançamento(s) atualizado(s).` });
    } catch (erro) {
      return erroInterno(erro, "lancamentos.lote", "Não foi possível atualizar os lançamentos selecionados agora.", "lancamentos_lote_falhou");
    }
  }

  return erroCliente("Método não permitido.", 405, "metodo_nao_permitido");
}
