// ==========================================
// lancamentosRecorrentes.ts (rota) - Lançamentos com frequência customizável
// ==========================================
import type {
  CadimusEnv,
  FrequenciaRecorrencia,
  IdEntrada,
  LancamentoRecorrente,
  MeioPagamento,
  SqlParam,
  TipoLancamento,
  WorkerCtx,
} from "../types.js";
import {
  isTipoLancamento,
  normalizarFrequenciaRecorrencia,
  normalizarId,
  normalizarMeioPagamento,
} from "../domain.ts";
import { obterUsuarioDaSessao } from "../utils/sessao.ts";
import { obterCarteirasDoUsuario } from "../utils/carteiras.ts";
import { centavosParaReais, normalizarCentavos, type ValorMonetarioEntrada } from "../utils/dinheiro.ts";
import { campoCentavosObrigatorio, campoDataISOObrigatoria, campoTexto, lerJsonObjeto } from "../utils/requisicao.ts";
import { erroCliente, erroFinanceiro, erroInterno } from "../utils/respostas.ts";

interface RecorrenciaPayload {
  carteira_id?: IdEntrada;
  descricao?: string;
  valor?: ValorMonetarioEntrada;
  valor_centavos?: ValorMonetarioEntrada;
  tipo?: TipoLancamento | string;
  categoria?: string;
  meio_pagamento?: MeioPagamento | string;
  frequencia?: FrequenciaRecorrencia | string;
  dia_semana?: number | string;
  dia_mes?: number | string;
  data_inicio?: string;
  data_fim?: string | null;
  ativo?: boolean | number;
}

interface RecorrenciaCarteiraRow {
  carteira_id: number;
}

type FrequenciaComDiaMes = Extract<FrequenciaRecorrencia, "mensal" | "trimestral" | "anual">;

const FREQUENCIAS_COM_DIA_MES: readonly FrequenciaComDiaMes[] = ["mensal", "trimestral", "anual"];

function json<T>(dados: T, status = 200): Response {
  return new Response(JSON.stringify(dados), { status });
}

function frequenciaUsaDiaMes(frequencia: FrequenciaRecorrencia): frequencia is FrequenciaComDiaMes {
  return FREQUENCIAS_COM_DIA_MES.includes(frequencia as FrequenciaComDiaMes);
}

function normalizarDiaSemana(valor: number | string | null | undefined): number | null {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero >= 0 && numero <= 6 ? numero : null;
}

function normalizarDiaMesSeguro(valor: number | string | null | undefined): number | null {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero >= 1 && numero <= 28 ? numero : null;
}

export async function processarLancamentosRecorrentes(request: Request, env: CadimusEnv, ctx: WorkerCtx): Promise<Response> {
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

      let query = `SELECT * FROM lancamentos_recorrentes WHERE 1=1`;
      const params: SqlParam[] = [];

      if (carteiraId) {
        query += ` AND carteira_id = ?`;
        params.push(carteiraIdNormalizada);
      } else {
        query += ` AND carteira_id IN (${carteirasPermitidas.map(() => "?").join(",")})`;
        params.push(...carteirasPermitidas);
      }

      query += ` ORDER BY criado_em DESC`;

      const { results } = await env.DB.prepare(query)
        .bind(...params)
        .all<LancamentoRecorrente>();
      return json(results);
    } catch (erro) {
      return erroInterno(erro, "recorrencias.listar", "Não foi possível carregar as recorrências agora.", "recorrencias_listar_falhou");
    }
  }

  // ==========================================
  // CRIAR
  // ==========================================
  if (metodo === "POST") {
    try {
      const dados = await lerJsonObjeto<RecorrenciaPayload>(request);
      if (!dados) {
        return erroCliente("Envie um corpo JSON válido.", 400, "corpo_json_invalido");
      }
      const carteiraIdNormalizada = normalizarId(dados.carteira_id);

      if (!carteiraIdNormalizada || !carteirasPermitidas.includes(carteiraIdNormalizada)) {
        return erroCliente("Acesso negado a esta carteira.", 403, "carteira_acesso_negado");
      }

      const payload = dados as Record<string, unknown>;
      const descricaoValidada = campoTexto(payload, "descricao", {
        obrigatorio: true,
        mensagemObrigatorio: "Informe uma descrição.",
        codigoObrigatorio: "descricao_obrigatoria",
      });
      if (!descricaoValidada.ok) return erroCliente(descricaoValidada.erro.mensagem, descricaoValidada.erro.status, descricaoValidada.erro.codigo);
      const descricao = descricaoValidada.valor;

      const valorValidado = campoCentavosObrigatorio(
        payload,
        "valor",
        "valor_centavos",
        "Informe um valor válido.",
        "valor_obrigatorio",
        "Informe um valor válido.",
        "valor_invalido",
      );
      if (!valorValidado.ok) return erroCliente(valorValidado.erro.mensagem, valorValidado.erro.status, valorValidado.erro.codigo);
      const valorCentavos = valorValidado.valor;
      const valor = centavosParaReais(valorCentavos);
      const categoriaValidada = campoTexto(payload, "categoria", {
        obrigatorio: true,
        mensagemObrigatorio: "Escolha uma categoria.",
        codigoObrigatorio: "categoria_obrigatoria",
      });
      if (!categoriaValidada.ok) return erroCliente(categoriaValidada.erro.mensagem, categoriaValidada.erro.status, categoriaValidada.erro.codigo);
      const categoria = categoriaValidada.valor ?? "";
      const ehBonificacao = categoria.toLowerCase() === "bonificação";
      if (!ehBonificacao && dados.tipo !== undefined && !isTipoLancamento(dados.tipo)) {
        return erroCliente("Tipo inválido.", 400, "tipo_invalido");
      }
      const tipo = ehBonificacao ? "receita" : dados.tipo === "receita" ? "receita" : "despesa";
      const frequencia = normalizarFrequenciaRecorrencia(dados.frequencia);
      const dataInicioValidada = campoDataISOObrigatoria(payload, "data_inicio", "Informe a data de início.", "data_inicio_obrigatoria");
      if (!dataInicioValidada.ok) return erroCliente(dataInicioValidada.erro.mensagem, dataInicioValidada.erro.status, dataInicioValidada.erro.codigo);
      const dataInicio = dataInicioValidada.valor;
      const diaSemana = normalizarDiaSemana(dados.dia_semana ?? 0);
      const diaMes = normalizarDiaMesSeguro(dados.dia_mes ?? 1);

      if (!frequencia) {
        return erroCliente("Frequência inválida.", 400, "frequencia_invalida");
      }
      if (!dados.meio_pagamento) {
        return erroCliente("Escolha um meio de pagamento.", 400, "meio_pagamento_obrigatorio");
      }
      const meioPagamento = normalizarMeioPagamento(dados.meio_pagamento);
      if (!meioPagamento) {
        return erroCliente("Meio de pagamento inválido.", 400, "meio_pagamento_invalido");
      }

      if (frequencia === "semanal" && diaSemana === null) {
        return erroCliente("Dia da semana inválido.", 400, "dia_semana_invalido");
      }
      if (frequenciaUsaDiaMes(frequencia) && diaMes === null) {
        return erroCliente("Dia do mês inválido (1-28).", 400, "dia_mes_invalido");
      }

      const valoresBase = [
        carteiraIdNormalizada, descricao, valor, tipo, categoria, meioPagamento,
        frequencia,
        frequencia === "semanal" ? diaSemana : null,
        frequenciaUsaDiaMes(frequencia) ? diaMes : null,
        dataInicio,
        dados.data_fim || null,
        usuarioLogado.id,
      ];

      let resultado;
      try {
        resultado = await env.DB.prepare(
          `INSERT INTO lancamentos_recorrentes
           (carteira_id, descricao, valor, valor_centavos, tipo, categoria, meio_pagamento, frequencia, dia_semana, dia_mes, data_inicio, data_fim, criado_por)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(
            carteiraIdNormalizada, descricao, valor, valorCentavos, tipo, categoria, meioPagamento,
            frequencia,
            frequencia === "semanal" ? diaSemana : null,
            frequenciaUsaDiaMes(frequencia) ? diaMes : null,
            dataInicio,
            dados.data_fim || null,
            usuarioLogado.id,
          )
          .run();
      } catch (erroInsert) {
        const detalheErroInsert = erroInsert instanceof Error ? erroInsert.message : String(erroInsert);
        if (!/valor_centavos/i.test(detalheErroInsert)) throw erroInsert;

        resultado = await env.DB.prepare(
          `INSERT INTO lancamentos_recorrentes
           (carteira_id, descricao, valor, tipo, categoria, meio_pagamento, frequencia, dia_semana, dia_mes, data_inicio, data_fim, criado_por)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(...valoresBase)
          .run();
      }

      return json({ id: resultado.meta?.last_row_id ?? null, mensagem: "Recorrência criada!" }, 201);
    } catch (erro) {
      return erroFinanceiro(erro, "recorrencias.criar", "Não foi possível criar esta recorrência agora.", "recorrencia_criar_falhou");
    }
  }

  // ==========================================
  // EDITAR / PAUSAR
  // ==========================================
  if (metodo === "PUT") {
    try {
      const id = url.searchParams.get("id");
      if (!id) {
        return erroCliente("ID não fornecido.", 400, "id_obrigatorio");
      }

      const { results: alvo } = await env.DB.prepare(`SELECT carteira_id FROM lancamentos_recorrentes WHERE id = ?`).bind(id).all<RecorrenciaCarteiraRow>();
      if (alvo.length === 0) {
        return erroCliente("Recorrência não encontrada.", 404, "recorrencia_nao_encontrada");
      }
      if (!carteirasPermitidas.includes(alvo[0].carteira_id)) {
        return erroCliente("Acesso negado.", 403, "acesso_negado");
      }

      const dados = await lerJsonObjeto<RecorrenciaPayload>(request);
      if (!dados) {
        return erroCliente("Envie um corpo JSON válido.", 400, "corpo_json_invalido");
      }
      const campos: string[] = [];
      const valores: SqlParam[] = [];

      if (dados.descricao !== undefined) { campos.push("descricao = ?"); valores.push(String(dados.descricao).trim()); }
      if (dados.valor !== undefined || dados.valor_centavos !== undefined) {
        let valorCentavos: number;
        try {
          valorCentavos = normalizarCentavos(dados.valor, dados.valor_centavos);
        } catch {
          return erroCliente("Valor inválido.", 400, "valor_invalido");
        }
        if (valorCentavos <= 0) return erroCliente("Valor inválido.", 400, "valor_invalido");
        campos.push("valor = ?"); valores.push(centavosParaReais(valorCentavos));
        campos.push("valor_centavos = ?"); valores.push(valorCentavos);
      }
      const categoriaAtualizada = dados.categoria !== undefined ? String(dados.categoria).trim() : null;
      const ehBonificacao = categoriaAtualizada?.toLowerCase() === "bonificação";
      if (dados.tipo !== undefined || ehBonificacao) {
        if (!ehBonificacao && dados.tipo !== undefined && !isTipoLancamento(dados.tipo)) {
          return erroCliente("Tipo inválido.", 400, "tipo_invalido");
        }
        campos.push("tipo = ?");
        valores.push(ehBonificacao ? "receita" : dados.tipo === "receita" ? "receita" : "despesa");
      }
      if (dados.categoria !== undefined) { campos.push("categoria = ?"); valores.push(categoriaAtualizada); }
      if (dados.meio_pagamento !== undefined) {
        const meioPagamento = normalizarMeioPagamento(dados.meio_pagamento);
        if (!meioPagamento) {
          return erroCliente("Meio de pagamento inválido.", 400, "meio_pagamento_invalido");
        }
        campos.push("meio_pagamento = ?");
        valores.push(meioPagamento);
      }
      if (dados.frequencia !== undefined) {
        const frequencia = normalizarFrequenciaRecorrencia(dados.frequencia);
        if (!frequencia) {
          return erroCliente("Frequência inválida.", 400, "frequencia_invalida");
        }
        campos.push("frequencia = ?");
        valores.push(frequencia);
      }
      if (dados.dia_semana !== undefined) {
        const diaSemana = normalizarDiaSemana(dados.dia_semana);
        if (diaSemana === null) {
          return erroCliente("Dia da semana inválido.", 400, "dia_semana_invalido");
        }
        campos.push("dia_semana = ?");
        valores.push(diaSemana);
      }
      if (dados.dia_mes !== undefined) {
        const diaMes = normalizarDiaMesSeguro(dados.dia_mes);
        if (diaMes === null) {
          return erroCliente("Dia do mês inválido (1-28).", 400, "dia_mes_invalido");
        }
        campos.push("dia_mes = ?");
        valores.push(diaMes);
      }
      if (dados.data_inicio !== undefined) { campos.push("data_inicio = ?"); valores.push(dados.data_inicio); }
      if (dados.data_fim !== undefined) { campos.push("data_fim = ?"); valores.push(dados.data_fim); }
      if (dados.ativo !== undefined) { campos.push("ativo = ?"); valores.push(dados.ativo ? 1 : 0); }

      if (campos.length === 0) {
        return erroCliente("Nada para atualizar.", 400, "sem_campos_para_atualizar");
      }

      valores.push(id);
      await env.DB.prepare(`UPDATE lancamentos_recorrentes SET ${campos.join(", ")} WHERE id = ?`)
        .bind(...valores)
        .run();

      return json({ mensagem: "Atualizado." });
    } catch (erro) {
      return erroFinanceiro(erro, "recorrencias.atualizar", "Não foi possível atualizar esta recorrência agora.", "recorrencia_atualizar_falhou");
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

      const { results: alvo } = await env.DB.prepare(`SELECT carteira_id FROM lancamentos_recorrentes WHERE id = ?`).bind(id).all<RecorrenciaCarteiraRow>();
      if (alvo.length === 0) {
        return erroCliente("Recorrência não encontrada.", 404, "recorrencia_nao_encontrada");
      }
      if (!carteirasPermitidas.includes(alvo[0].carteira_id)) {
        return erroCliente("Acesso negado.", 403, "acesso_negado");
      }

      await env.DB.prepare(`UPDATE lancamentos SET recorrencia_id = NULL WHERE recorrencia_id = ?`).bind(id).run();
      await env.DB.prepare(`DELETE FROM lancamentos_recorrentes WHERE id = ?`).bind(id).run();

      return json({ mensagem: "Recorrência excluída." });
    } catch (erro) {
      return erroFinanceiro(erro, "recorrencias.excluir", "Não foi possível excluir esta recorrência agora.", "recorrencia_excluir_falhou");
    }
  }

  return erroCliente("Método não permitido.", 405, "metodo_nao_permitido");
}
