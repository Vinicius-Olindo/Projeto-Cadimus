// ==========================================
// convites.ts - Sistema de Convites para Cadastro
// ==========================================
import type { CadimusEnv, PerfilUsuario, UsuarioSessao, WorkerCtx } from "../types.js";
import { hashSenha } from "../utils/crypto.ts";
import { obterUsuarioDaSessao } from "../utils/sessao.ts";
import { erroCliente, erroInterno, json } from "../utils/respostas.ts";

const DURACAO_CONVITE_MS = 3 * 60 * 60 * 1000; // 3 horas
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ConvitePayload {
  token?: string;
  senha?: string;
  nome?: string;
  usuario?: string;
  email?: string;
  perfil?: PerfilUsuario | string;
}

interface ConviteRow {
  id: number;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  criado_por: number;
  expira_em: string;
  usado_em?: string | null;
}

interface ConviteCriadorRow {
  criado_por: number;
}

interface IdRow {
  id: number;
}

function ehSuperadminRaiz(usuario: Pick<UsuarioSessao, "id">): boolean {
  return Number(usuario.id) === 1;
}

export async function processarConvites(request: Request, env: CadimusEnv, ctx: WorkerCtx): Promise<Response> {
  const metodo = request.method;
  const url = new URL(request.url);

  // ==========================================
  // GET /api/convites?token=xxx — Valida token (público)
  // ==========================================
  if (metodo === "GET") {
    const token = url.searchParams.get("token");
    if (!token) {
      return erroCliente("Token não fornecido.", 400, "token_obrigatorio");
    }

    try {
      const { results } = await env.DB.prepare(
        `SELECT id, nome, email, perfil, expira_em, usado_em FROM convites WHERE token = ?`
      ).bind(token).all<ConviteRow>();

      if (results.length === 0) {
        return erroCliente("Convite não encontrado.", 404, "convite_nao_encontrado");
      }

      const convite = results[0];

      if (convite.usado_em) {
        return erroCliente("Este convite já foi utilizado.", 410, "convite_utilizado");
      }

      if (new Date(convite.expira_em) < new Date()) {
        return erroCliente("Este convite expirou. Solicite um novo.", 410, "convite_expirado");
      }

      return json({
        nome: convite.nome,
        email: convite.email,
        perfil: convite.perfil,
      });
    } catch (erro) {
      return erroInterno(erro, "convites.validar", "Não foi possível validar este convite agora.", "convite_validar_falhou");
    }
  }

  // ==========================================
  // POST /api/convites — Cria convite (somente superadmin)
  // ==========================================
  if (metodo === "POST") {
    const body = await request.json().catch(() => ({})) as ConvitePayload;

    // Se tem campo "senha", é aceitação de convite (público)
    if (body.token && body.senha) {
      return aceitarConvite(body, env);
    }

    // Caso contrário, é criação de convite (admin)
    const usuarioLogado = await obterUsuarioDaSessao(request, env, ctx);
    if (!usuarioLogado) {
      return erroCliente("Não autenticado.", 401, "nao_autenticado");
    }
    if (usuarioLogado.perfil !== "superadmin") {
      return erroCliente("Acesso restrito a administradores.", 403, "admin_obrigatorio");
    }

    const { nome, email, perfil } = body;

    if (!nome || !nome.trim()) {
      return erroCliente("Informe o nome do convidado.", 400, "nome_obrigatorio");
    }
    if (!email || !REGEX_EMAIL.test(email.trim())) {
      return erroCliente("Informe um e-mail válido.", 400, "email_invalido");
    }

    const perfilFinal: PerfilUsuario = perfil === "superadmin" && ehSuperadminRaiz(usuarioLogado) ? "superadmin" : "comum";

    try {
      // Verifica se já existe usuário com esse e-mail
      const { results: existente } = await env.DB.prepare(
        `SELECT id FROM usuarios WHERE LOWER(email) = LOWER(?)`
      ).bind(email.trim()).all<IdRow>();

      if (existente.length > 0) {
        return erroCliente("Já existe um usuário com esse e-mail.", 409, "email_duplicado");
      }

      // Verifica se já existe convite pendente para esse e-mail
      const { results: convitePendente } = await env.DB.prepare(
        `SELECT id FROM convites WHERE LOWER(email) = LOWER(?) AND usado_em IS NULL AND expira_em > datetime('now')`
      ).bind(email.trim()).all<IdRow>();

      if (convitePendente.length > 0) {
        return erroCliente("Já existe um convite pendente para esse e-mail.", 409, "convite_pendente");
      }

      const token = crypto.randomUUID();
      const expiraEm = new Date(Date.now() + DURACAO_CONVITE_MS).toISOString();

      await env.DB.prepare(
        `INSERT INTO convites (token, email, nome, perfil, criado_por, expira_em) VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(token, email.trim().toLowerCase(), nome.trim(), perfilFinal, usuarioLogado.id, expiraEm).run();

      return json({
        mensagem: "Convite criado com sucesso!",
        token,
        expira_em: expiraEm,
      }, 201);
    } catch (erro) {
      return erroInterno(erro, "convites.criar", "Não foi possível criar este convite agora.", "convite_criar_falhou");
    }
  }

  // ==========================================
  // DELETE /api/convites?id=xxx — Remove convite (admin)
  // ==========================================
  if (metodo === "DELETE") {
    const usuarioLogado = await obterUsuarioDaSessao(request, env, ctx);
    if (!usuarioLogado) {
      return erroCliente("Não autenticado.", 401, "nao_autenticado");
    }
    if (usuarioLogado.perfil !== "superadmin") {
      return erroCliente("Acesso restrito a administradores.", 403, "admin_obrigatorio");
    }

    const id = url.searchParams.get("id");
    if (!id) {
      return erroCliente("ID não fornecido.", 400, "id_obrigatorio");
    }

    try {
      const { results: alvo } = await env.DB.prepare(`SELECT criado_por FROM convites WHERE id = ?`).bind(id).all<ConviteCriadorRow>();
      if (alvo.length === 0) {
        return erroCliente("Convite não encontrado.", 404, "convite_nao_encontrado");
      }
      if (!ehSuperadminRaiz(usuarioLogado) && Number(alvo[0].criado_por) !== Number(usuarioLogado.id)) {
        return erroCliente("Acesso negado.", 403, "acesso_negado");
      }

      await env.DB.prepare(`DELETE FROM convites WHERE id = ?`).bind(id).run();
      return json({ mensagem: "Convite removido." });
    } catch (erro) {
      return erroInterno(erro, "convites.excluir", "Não foi possível remover este convite agora.", "convite_excluir_falhou");
    }
  }

  return erroCliente("Método não permitido.", 405, "metodo_nao_permitido");
}

// ==========================================
// Aceita o convite e cria o usuário
// ==========================================
async function aceitarConvite(body: ConvitePayload, env: CadimusEnv): Promise<Response> {
  const { token, senha, nome, usuario } = body;

  if (!token || !senha) {
    return erroCliente("Token e senha são obrigatórios.", 400, "token_senha_obrigatorios");
  }

  if (!usuario || !usuario.trim()) {
    return erroCliente("Escolha um nome de usuário.", 400, "usuario_obrigatorio");
  }

  if (senha.length < 6) {
    return erroCliente("A senha deve ter ao menos 6 caracteres.", 400, "senha_curta");
  }

  try {
    const { results } = await env.DB.prepare(
      `SELECT id, nome, email, perfil, criado_por, expira_em, usado_em FROM convites WHERE token = ?`
    ).bind(token).all<ConviteRow>();

    if (results.length === 0) {
      return erroCliente("Convite não encontrado.", 404, "convite_nao_encontrado");
    }

    const convite = results[0];

    if (convite.perfil === "superadmin" && Number(convite.criado_por) !== 1) {
      return erroCliente("Convite administrativo inválido. Solicite um novo convite.", 403, "convite_admin_invalido");
    }

    if (convite.usado_em) {
      return erroCliente("Este convite já foi utilizado.", 410, "convite_utilizado");
    }

    if (new Date(convite.expira_em) < new Date()) {
      return erroCliente("Este convite expirou. Solicite um novo.", 410, "convite_expirado");
    }

    const nomeUsuario = usuario.trim();

    // Verifica se o nome de usuário já existe
    const { results: usuarioExistente } = await env.DB.prepare(
      `SELECT id FROM usuarios WHERE LOWER(nome_usuario) = LOWER(?)`
    ).bind(nomeUsuario).all<IdRow>();

    if (usuarioExistente.length > 0) {
      return json({ 
        erro: "Esse nome de usuário já está em uso. Escolha outro."
      }, 409);
    }

    const senhaHash = await hashSenha(senha);
    const nomeFinal = nome || convite.nome;

    // Usuários criados por convite sempre recebem perfil "comum"
    const resultado = await env.DB.prepare(
      `INSERT INTO usuarios (nome_usuario, senha_hash, perfil, nome, email, criado_por) VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(nomeUsuario, senhaHash, convite.perfil, nomeFinal, convite.email, convite.criado_por).run();
    const novoUsuarioId = resultado.meta?.last_row_id;
    if (!novoUsuarioId) {
      return erroInterno(new Error("last_row_id ausente ao aceitar convite"), "convites.aceitar", "Não foi possível criar a conta agora.", "usuario_id_ausente");
    }

    // Cria carteira pessoal (mesma lógica do cadastro pelo painel admin)
    try {
      const nomeCarteira = `Pessoal - ${nomeFinal}`.slice(0, 40);
      const resultadoCarteira = await env.DB.prepare(`INSERT INTO carteiras (nome, tipo) VALUES (?, 'individual')`).bind(nomeCarteira).run();
      const novaCarteiraId = resultadoCarteira.meta?.last_row_id;
      if (!novaCarteiraId) throw new Error("last_row_id ausente ao criar carteira pessoal");
      await env.DB.prepare(`INSERT INTO usuarios_carteiras (usuario_id, carteira_id, papel) VALUES (?, ?, 'admin')`)
        .bind(novoUsuarioId, novaCarteiraId)
        .run();
    } catch (erroCarteira) {
      // Desfaz o usuário pra não deixar conta órfã
      await env.DB.prepare(`DELETE FROM usuarios WHERE id = ?`).bind(novoUsuarioId).run();
      return erroInterno(erroCarteira, "convites.criarCarteiraPessoal", "Erro ao criar conta. Tente novamente.", "carteira_pessoal_criar_falhou");
    }

    // Marca convite como usado
    await env.DB.prepare(
      `UPDATE convites SET usado_em = datetime('now') WHERE id = ?`
    ).bind(convite.id).run();

    return json({
      mensagem: "Conta criada com sucesso! Já pode fazer login.",
      usuario: nomeUsuario,
    }, 201);
  } catch (erro) {
    return erroInterno(erro, "convites.aceitar", "Não foi possível criar a conta agora.", "convite_aceitar_falhou");
  }
}
