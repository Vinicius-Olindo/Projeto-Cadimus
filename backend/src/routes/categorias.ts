// ==========================================
// categorias.ts - Lista de categorias reutilizáveis
// ==========================================
import type { CadimusEnv, WorkerCtx } from "../types.js";
import { obterUsuarioDaSessao } from "../utils/sessao.ts";
import { lerJsonObjeto } from "../utils/requisicao.ts";
import { erroCliente, erroInterno, json } from "../utils/respostas.ts";

interface CategoriaPayload {
  nome?: string;
}

interface CategoriaRow {
  id: number;
  nome: string;
}

export async function processarCategorias(request: Request, env: CadimusEnv, ctx: WorkerCtx): Promise<Response> {
  const metodo = request.method;
  const url = new URL(request.url);

  // Qualquer pessoa da casa (autenticada) pode ver e cadastrar categorias
  const usuarioLogado = await obterUsuarioDaSessao(request, env, ctx);
  if (!usuarioLogado) {
    return erroCliente("Não autenticado.", 401, "nao_autenticado");
  }

  if (metodo === "GET") {
    try {
      const { results } = await env.DB.prepare(`SELECT id, nome FROM categorias ORDER BY nome ASC`).all<CategoriaRow>();
      return json(results);
    } catch (erro) {
      return erroInterno(erro, "categorias.listar", "Não foi possível carregar as categorias agora.", "categorias_listar_falhou");
    }
  }

  if (metodo === "POST") {
    try {
      const dados = await lerJsonObjeto<CategoriaPayload>(request);
      if (!dados) {
        return erroCliente("Envie um corpo JSON válido.", 400, "corpo_json_invalido");
      }
      const nome = (dados.nome || "").trim();

      if (!nome) {
        return erroCliente("Informe um nome para a categoria.", 400, "categoria_nome_obrigatorio");
      }
      if (nome.length > 40) {
        return erroCliente("Nome de categoria muito longo (máx. 40 caracteres).", 400, "categoria_nome_longo");
      }

      // Se já existir (comparação sem diferenciar maiúsculas/minúsculas), reaproveita em vez de duplicar
      const { results: existentes } = await env.DB.prepare(`SELECT id, nome FROM categorias WHERE LOWER(nome) = LOWER(?)`).bind(nome).all<CategoriaRow>();
      if (existentes.length > 0) {
        return json(existentes[0]);
      }

      const resultado = await env.DB.prepare(`INSERT INTO categorias (nome) VALUES (?)`).bind(nome).run();
      return json({ id: resultado.meta?.last_row_id, nome }, 201);
    } catch (erro) {
      return erroInterno(erro, "categorias.criar", "Não foi possível cadastrar a categoria agora.", "categoria_criar_falhou");
    }
  }

  // Renomear é restrito a admin — reescreve o nome em TODOS os lançamentos e despesas
  // fixas que já usam o nome antigo (categoria é texto livre, não uma referência).
  if (metodo === "PUT") {
    if (usuarioLogado.perfil !== "superadmin") {
      return erroCliente("Acesso restrito a administradores.", 403, "acesso_restrito");
    }
    try {
      const id = url.searchParams.get("id");
      if (!id) {
        return erroCliente("ID não fornecido.", 400, "id_obrigatorio");
      }

      const dados = await lerJsonObjeto<CategoriaPayload>(request);
      if (!dados) {
        return erroCliente("Envie um corpo JSON válido.", 400, "corpo_json_invalido");
      }
      const novoNome = (dados.nome || "").trim();

      if (!novoNome) {
        return erroCliente("Informe um nome.", 400, "categoria_nome_obrigatorio");
      }
      if (novoNome.length > 40) {
        return erroCliente("Nome muito longo (máx. 40 caracteres).", 400, "categoria_nome_longo");
      }

      const { results: atual } = await env.DB.prepare(`SELECT nome FROM categorias WHERE id = ?`).bind(id).all<Pick<CategoriaRow, "nome">>();
      if (atual.length === 0) {
        return erroCliente("Categoria não encontrada.", 404, "categoria_nao_encontrada");
      }
      const nomeAntigo = atual[0].nome;

      // Evita colidir com outra categoria já existente com esse nome
      const { results: duplicado } = await env.DB.prepare(`SELECT id FROM categorias WHERE LOWER(nome) = LOWER(?) AND id != ?`).bind(novoNome, id).all<Pick<CategoriaRow, "id">>();
      if (duplicado.length > 0) {
        return erroCliente("Já existe uma categoria com esse nome.", 409, "categoria_duplicada");
      }

      await env.DB.prepare(`UPDATE categorias SET nome = ? WHERE id = ?`).bind(novoNome, id).run();

      // Aplica o novo nome em todo o histórico que usava o nome antigo
      await env.DB.prepare(`UPDATE lancamentos SET categoria = ? WHERE categoria = ?`).bind(novoNome, nomeAntigo).run();
      await env.DB.prepare(`UPDATE despesas_fixas SET categoria = ? WHERE categoria = ?`).bind(novoNome, nomeAntigo).run();

      return json({ mensagem: "Categoria renomeada em todos os lançamentos existentes." });
    } catch (erro) {
      return erroInterno(erro, "categorias.renomear", "Não foi possível renomear a categoria agora.", "categoria_renomear_falhou");
    }
  }

  // Excluir só pode quem administra — remover categoria em uso não afeta lançamentos já salvos
  // (a categoria do lançamento é um texto próprio, não depende desta tabela)
  if (metodo === "DELETE") {
    if (usuarioLogado.perfil !== "superadmin") {
      return erroCliente("Acesso restrito a administradores.", 403, "acesso_restrito");
    }
    try {
      const id = url.searchParams.get("id");
      if (!id) {
        return erroCliente("ID não fornecido.", 400, "id_obrigatorio");
      }
      await env.DB.prepare(`DELETE FROM categorias WHERE id = ?`).bind(id).run();
      return json({ mensagem: "Categoria excluída." });
    } catch (erro) {
      return erroInterno(erro, "categorias.excluir", "Não foi possível excluir a categoria agora.", "categoria_excluir_falhou");
    }
  }

  return erroCliente("Método não permitido.", 405, "metodo_nao_permitido");
}
