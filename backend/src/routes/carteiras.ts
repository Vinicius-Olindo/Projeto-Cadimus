// ==========================================
// carteiras.ts - Listagem e criação de carteiras (contas)
// ==========================================
import type { CadimusEnv, Carteira, PapelCarteira, TipoCarteira, WorkerCtx } from "../types.js";
import { obterUsuarioDaSessao } from "../utils/sessao.ts";
import { registrarAuditoria } from "../utils/auditoria.ts";
import { lerJsonObjeto } from "../utils/requisicao.ts";
import { erroCliente, erroInterno, json } from "../utils/respostas.ts";

interface UsuarioIdRow {
  id: number;
}

interface ColegaRow {
  id: number;
  nome?: string | null;
  nome_usuario: string;
}

interface AcessoCarteiraRow {
  papel: PapelCarteira;
}

interface MembroCarteiraRow {
  id: number;
  nome?: string | null;
  nome_usuario: string;
  papel: PapelCarteira;
}

interface CriarCarteiraPayload {
  nome?: string;
  tipo?: TipoCarteira | string;
  membros?: unknown;
}

interface AtualizarMembrosPayload {
  membros?: unknown;
}

interface ReordenarPayload {
  ordem?: unknown;
}

interface CarteiraTipoRow {
  id: number;
  tipo: TipoCarteira;
}

interface UsuarioCarteiraRow {
  usuario_id: number;
}

interface TotalCarteirasRow {
  total: number;
}

// Filtra e confirma no banco quais ids recebidos são de usuários que existem
// de verdade (usado tanto na criação quanto na edição de membros).
async function idsValidosDeUsuarios(env: CadimusEnv, idsRecebidos: number[]): Promise<number[]> {
  if (idsRecebidos.length === 0) return [];
  const placeholders = idsRecebidos.map(() => "?").join(", ");
  const { results } = await env.DB.prepare(`SELECT id FROM usuarios WHERE id IN (${placeholders})`)
    .bind(...idsRecebidos)
    .all<UsuarioIdRow>();
  return results.map((u) => u.id);
}

export async function processarCarteiras(request: Request, env: CadimusEnv, ctx: WorkerCtx): Promise<Response> {
  const metodo = request.method;
  const url = new URL(request.url);

  const usuarioLogado = await obterUsuarioDaSessao(request, env, ctx);
  if (!usuarioLogado) {
    return erroCliente("Não autenticado.", 401, "nao_autenticado");
  }

  // ==========================================
  // LISTAR (só as carteiras às quais o usuário tem acesso)
  // ==========================================
  if (metodo === "GET") {
    try {
      // Lista básica dos outros usuários do sistema, sem dados sensíveis —
      // usada só pra montar a lista de "com quem compartilhar" na tela de
      // nova carteira. Qualquer usuário logado pode ver (não só o admin),
      // já que ele precisa escolher com quem compartilhar.
      if (url.searchParams.get("colegas") === "1") {
        const { results } = await env.DB.prepare(`SELECT id, nome, nome_usuario FROM usuarios WHERE id != ? ORDER BY nome ASC`)
          .bind(usuarioLogado.id)
          .all<ColegaRow>();
        return json(results);
      }

      // Membros atuais de uma carteira específica — só quem já tem acesso a
      // ela pode ver quem mais tem.
      const carteiraMembrosId = url.searchParams.get("membros");
      if (carteiraMembrosId) {
        const { results: acesso } = await env.DB.prepare(`SELECT papel FROM usuarios_carteiras WHERE usuario_id = ? AND carteira_id = ?`)
          .bind(usuarioLogado.id, carteiraMembrosId)
          .all<AcessoCarteiraRow>();
        if (acesso.length === 0) {
          return erroCliente("Você não tem acesso a essa carteira.", 403, "carteira_acesso_negado");
        }

        const { results } = await env.DB.prepare(
          `SELECT u.id, u.nome, u.nome_usuario, uc.papel
           FROM usuarios_carteiras uc
           JOIN usuarios u ON u.id = uc.usuario_id
           WHERE uc.carteira_id = ?
          ORDER BY uc.papel ASC, u.nome ASC`,
        )
          .bind(carteiraMembrosId)
          .all<MembroCarteiraRow>();
        return json({ souAdmin: acesso[0].papel === "admin", membros: results });
      }

      const query = `
        SELECT c.id, c.nome, c.tipo, uc.papel
        FROM carteiras c
        JOIN usuarios_carteiras uc ON uc.carteira_id = c.id
        WHERE uc.usuario_id = ?
        ORDER BY uc.ordem ASC, c.tipo ASC, c.nome ASC
      `;
      const { results } = await env.DB.prepare(query).bind(usuarioLogado.id).all<Carteira>();
      return json(results);
    } catch (erro) {
      return erroInterno(erro, "carteiras.listar", "Não foi possível carregar as carteiras agora.", "carteiras_listar_falhou");
    }
  }

  // ==========================================
  // CRIAR NOVA CARTEIRA
  // ==========================================
  if (metodo === "POST") {
    try {
      const dados = await lerJsonObjeto<CriarCarteiraPayload>(request);
      if (!dados) {
        return erroCliente("Envie um corpo JSON válido.", 400, "corpo_json_invalido");
      }
      const nome = (dados.nome || "").trim();
      const tipo: TipoCarteira = dados.tipo === "compartilhada" ? "compartilhada" : "individual";

      if (!nome) {
        return erroCliente("Informe um nome para a carteira.", 400, "nome_obrigatorio");
      }
      if (nome.length > 40) {
        return erroCliente("Nome muito longo (máx. 40 caracteres).", 400, "nome_muito_longo");
      }

      // Carteira compartilhada: quem cria escolhe explicitamente com quem
      // compartilhar (não é mais "todo mundo do sistema" automaticamente —
      // isso deixaria de fazer sentido assim que existirem contas que não
      // são da mesma casa). Dá pra ajustar depois em "Gerenciar membros".
      let membrosValidos: number[] = [];
      if (tipo === "compartilhada") {
        const idsRecebidos = Array.isArray(dados.membros) ? dados.membros.map(Number).filter((id) => Number.isInteger(id) && id !== usuarioLogado.id) : [];
        membrosValidos = await idsValidosDeUsuarios(env, idsRecebidos);
      }

      const resultadoCarteira = await env.DB.prepare(`INSERT INTO carteiras (nome, tipo) VALUES (?, ?)`).bind(nome, tipo).run();
      const novaCarteiraId = resultadoCarteira.meta?.last_row_id;
      if (!novaCarteiraId) {
        return erroInterno(new Error("last_row_id ausente ao criar carteira"), "carteiras.criar", "Carteira criada, mas não foi possível finalizar a configuração agora.", "carteira_id_ausente");
      }

      // Quem criou sempre vira admin da carteira
      await env.DB.prepare(`INSERT INTO usuarios_carteiras (usuario_id, carteira_id, papel) VALUES (?, ?, 'admin')`).bind(usuarioLogado.id, novaCarteiraId).run();

      for (const membroId of membrosValidos) {
        await env.DB.prepare(`INSERT INTO usuarios_carteiras (usuario_id, carteira_id, papel) VALUES (?, ?, 'membro')`).bind(membroId, novaCarteiraId).run();
      }

      await registrarAuditoria(env, {
        usuarioId: usuarioLogado.id,
        acao: "carteira.criada",
        entidade: "carteira",
        entidadeId: novaCarteiraId,
        carteiraId: novaCarteiraId,
        metadata: {
          tipo,
          membros: membrosValidos.length,
        },
      });

      return json({ id: novaCarteiraId, nome, tipo }, 201);
    } catch (erro) {
      return erroInterno(erro, "carteiras.criar", "Não foi possível criar esta carteira agora.", "carteira_criar_falhou");
    }
  }

  // ==========================================
  // EDITAR MEMBROS (adicionar/remover quem tem acesso a uma compartilhada)
  // ==========================================
  if (metodo === "PUT") {
    try {
      const carteiraId = url.searchParams.get("id");
      if (!carteiraId) {
        return erroCliente("ID da carteira não fornecido.", 400, "carteira_id_obrigatorio");
      }

      const { results: carteira } = await env.DB.prepare(`SELECT id, tipo FROM carteiras WHERE id = ?`).bind(carteiraId).all<CarteiraTipoRow>();
      if (carteira.length === 0) {
        return erroCliente("Carteira não encontrada.", 404, "carteira_nao_encontrada");
      }
      if (carteira[0].tipo !== "compartilhada") {
        return erroCliente("Só é possível gerenciar membros de uma carteira compartilhada.", 400, "carteira_nao_compartilhada");
      }

      // Só quem é admin dessa carteira específica pode mexer em quem tem acesso
      const { results: acesso } = await env.DB.prepare(`SELECT papel FROM usuarios_carteiras WHERE usuario_id = ? AND carteira_id = ?`)
        .bind(usuarioLogado.id, carteiraId)
        .all<AcessoCarteiraRow>();
      if (acesso.length === 0 || acesso[0].papel !== "admin") {
        return erroCliente("Só um administrador desta carteira pode gerenciar os membros.", 403, "carteira_admin_obrigatorio");
      }

      const dados = await lerJsonObjeto<AtualizarMembrosPayload>(request);
      if (!dados) {
        return erroCliente("Envie um corpo JSON válido.", 400, "corpo_json_invalido");
      }
      const idsRecebidos = Array.isArray(dados.membros) ? dados.membros.map(Number).filter((id) => Number.isInteger(id) && id !== usuarioLogado.id) : [];
      const membrosDesejados = await idsValidosDeUsuarios(env, idsRecebidos);

      // Nunca mexe nos admins por aqui — só na lista de "membro" comum
      const { results: atuais } = await env.DB.prepare(`SELECT usuario_id FROM usuarios_carteiras WHERE carteira_id = ? AND papel = 'membro'`)
        .bind(carteiraId)
        .all<UsuarioCarteiraRow>();
      const atuaisIds = atuais.map((m) => m.usuario_id);

      const paraRemover = atuaisIds.filter((id) => !membrosDesejados.includes(id));
      const paraAdicionar = membrosDesejados.filter((id) => !atuaisIds.includes(id));

      for (const id of paraRemover) {
        await env.DB.prepare(`DELETE FROM usuarios_carteiras WHERE carteira_id = ? AND usuario_id = ? AND papel = 'membro'`).bind(carteiraId, id).run();
      }
      for (const id of paraAdicionar) {
        await env.DB.prepare(`INSERT INTO usuarios_carteiras (usuario_id, carteira_id, papel) VALUES (?, ?, 'membro')`).bind(id, carteiraId).run();
      }

      await registrarAuditoria(env, {
        usuarioId: usuarioLogado.id,
        acao: "carteira.membros_atualizados",
        entidade: "carteira",
        entidadeId: Number(carteiraId),
        carteiraId: Number(carteiraId),
        metadata: {
          adicionados: paraAdicionar.length,
          removidos: paraRemover.length,
        },
      });

      return json({ mensagem: "Membros atualizados com sucesso!" });
    } catch (erro) {
      return erroInterno(erro, "carteiras.membros", "Não foi possível atualizar os membros agora.", "carteira_membros_falhou");
    }
  }

  // ==========================================
  // REORDENAR (o usuário arrasta as abas como quiser)
  // ==========================================
  if (metodo === "PATCH") {
    try {
      const dados = await lerJsonObjeto<ReordenarPayload>(request);
      if (!dados) {
        return erroCliente("Envie um corpo JSON válido.", 400, "corpo_json_invalido");
      }
      const ordemRecebida = Array.isArray(dados.ordem) ? dados.ordem.map(Number).filter((id) => Number.isInteger(id)) : [];
      if (ordemRecebida.length === 0) {
        return erroCliente("Ordem inválida.", 400, "ordem_invalida");
      }

      for (let indice = 0; indice < ordemRecebida.length; indice++) {
        await env.DB.prepare(`UPDATE usuarios_carteiras SET ordem = ? WHERE usuario_id = ? AND carteira_id = ?`)
          .bind(indice, usuarioLogado.id, ordemRecebida[indice])
          .run();
      }

      return json({ mensagem: "Ordem salva." });
    } catch (erro) {
      return erroInterno(erro, "carteiras.reordenar", "Não foi possível salvar a ordem das carteiras agora.", "carteira_ordem_falhou");
    }
  }

  // ==========================================
  // EXCLUIR CARTEIRA (só quem é admin dela)
  // ==========================================
  if (metodo === "DELETE") {
    try {
      const carteiraId = url.searchParams.get("id");
      if (!carteiraId) {
        return erroCliente("ID da carteira não fornecido.", 400, "carteira_id_obrigatorio");
      }

      const { results: acesso } = await env.DB.prepare(`SELECT papel FROM usuarios_carteiras WHERE usuario_id = ? AND carteira_id = ?`)
        .bind(usuarioLogado.id, carteiraId)
        .all<AcessoCarteiraRow>();
      if (acesso.length === 0 || acesso[0].papel !== "admin") {
        return erroCliente("Só um administrador desta carteira pode excluí-la.", 403, "carteira_admin_obrigatorio");
      }

      const { results: totalCarteiras } = await env.DB.prepare(`SELECT COUNT(*) AS total FROM usuarios_carteiras WHERE usuario_id = ?`)
        .bind(usuarioLogado.id)
        .all<TotalCarteirasRow>();
      if (totalCarteiras[0].total <= 1) {
        return erroCliente("Você precisa ter pelo menos uma carteira.", 400, "ultima_carteira_bloqueada");
      }

      // Limpa tudo que referencia essa carteira antes de excluí-la
      await registrarAuditoria(env, {
        usuarioId: usuarioLogado.id,
        acao: "carteira.excluida",
        entidade: "carteira",
        entidadeId: Number(carteiraId),
        carteiraId: Number(carteiraId),
      });

      await env.DB.prepare(`DELETE FROM transferencias WHERE carteira_origem_id = ? OR carteira_destino_id = ?`).bind(carteiraId, carteiraId).run();
      await env.DB.prepare(`DELETE FROM orcamentos WHERE carteira_id = ?`).bind(carteiraId).run();
      await env.DB.prepare(`DELETE FROM cartoes_credito WHERE carteira_id = ?`).bind(carteiraId).run();
      await env.DB.prepare(`DELETE FROM lancamentos_recorrentes WHERE carteira_id = ?`).bind(carteiraId).run();
      await env.DB.prepare(`DELETE FROM despesas_fixas WHERE carteira_id = ?`).bind(carteiraId).run();
      await env.DB.prepare(`DELETE FROM compras_parceladas WHERE carteira_id = ?`).bind(carteiraId).run();
      await env.DB.prepare(`DELETE FROM metas_categoria WHERE carteira_id = ?`).bind(carteiraId).run();
      await env.DB.prepare(`DELETE FROM lancamentos WHERE carteira_id = ?`).bind(carteiraId).run();
      await env.DB.prepare(`DELETE FROM usuarios_carteiras WHERE carteira_id = ?`).bind(carteiraId).run();
      await env.DB.prepare(`DELETE FROM carteiras WHERE id = ?`).bind(carteiraId).run();

      return json({ mensagem: "Carteira excluída." });
    } catch (erro) {
      return erroInterno(erro, "carteiras.excluir", "Não foi possível excluir esta carteira agora.", "carteira_excluir_falhou");
    }
  }

  return erroCliente("Método não permitido.", 405, "metodo_nao_permitido");
}
