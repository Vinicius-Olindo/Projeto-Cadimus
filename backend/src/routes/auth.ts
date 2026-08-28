// ==========================================
// auth.ts - Lógica de Login e Autenticação
// ==========================================
import type { CadimusEnv, PerfilUsuario, WorkerCtx } from "../types.js";
import { verificarSenha, hashSenha } from "../utils/crypto.ts";
import { criarSessao, encerrarSessao } from "../utils/sessao.ts";
import { enviarEmail, templateRecuperacaoSenha } from "../utils/email.ts";
import { lerJsonObjeto } from "../utils/requisicao.ts";
import { erroCliente, erroInterno, json } from "../utils/respostas.ts";

const LIMITE_TENTATIVAS = 5; // por usuário, dentro dos últimos 15 minutos (ver datetime('now', '-15 minutes') abaixo)
const DURACAO_TOKEN_RECUPERACAO_MS = 30 * 60 * 1000; // 30 minutos

interface LoginPayload {
  usuario?: string;
  senha?: string;
}

interface EsqueciSenhaPayload {
  email?: string;
}

interface RedefinirSenhaPayload {
  token?: string;
  novaSenha?: string;
}

interface TentativasRow {
  total: number;
}

interface UsuarioRecuperacaoRow {
  id: number;
  nome?: string | null;
}

interface TokenRecuperacaoRow {
  id: number;
  usuario_id: number;
  expira_em: string;
}

interface UsuarioLoginRow {
  id: number;
  nome_usuario: string;
  perfil: PerfilUsuario;
  nome?: string | null;
  foto_perfil?: string | null;
  senha_hash: string;
  ativo?: number | boolean | null;
}

export async function processarLogin(request: Request, env: CadimusEnv, ctx: WorkerCtx): Promise<Response> {
  const url = new URL(request.url);

  // ==========================================
  // LOGOUT: encerra a sessão atual
  // ==========================================
  if (request.method === "DELETE" || url.pathname.endsWith("/logout")) {
    await encerrarSessao(request, env);
    return json({ mensagem: "Sessão encerrada." });
  }

  // ==========================================
  // ESQUECI MINHA SENHA: gera um token e manda o link por e-mail
  // ==========================================
  if (url.pathname.endsWith("/esqueci-senha")) {
    if (request.method !== "POST") return erroCliente("Use POST.", 405, "metodo_invalido");

    try {
      const dados = await lerJsonObjeto<EsqueciSenhaPayload>(request);
      if (!dados) {
        return erroCliente("Envie um corpo JSON válido.", 400, "corpo_json_invalido");
      }
      const { email } = dados;
      const emailNormalizado = (email || "").trim().toLowerCase();

      if (!emailNormalizado) {
        return erroCliente("Informe o e-mail.", 400, "email_obrigatorio");
      }

      // Mesmo limite de tentativas do login, só que por e-mail — evita que alguém
      // fique disparando e-mails de recuperação pra caixa de entrada de outra pessoa.
      const identificador = `reset:${emailNormalizado}`;
      await env.DB.prepare(`DELETE FROM tentativas_login WHERE tentativa_em <= datetime('now', '-15 minutes')`).run();
      const { results: tentativas } = await env.DB.prepare(
        `SELECT COUNT(*) AS total FROM tentativas_login WHERE identificador = ? AND tentativa_em > datetime('now', '-15 minutes')`,
      )
        .bind(identificador)
        .all<TentativasRow>();
      if (tentativas[0].total >= LIMITE_TENTATIVAS) {
        return erroCliente("Muitas tentativas. Aguarde alguns minutos e tente novamente.", 429, "muitas_tentativas");
      }
      await env.DB.prepare(`INSERT INTO tentativas_login (identificador) VALUES (?)`).bind(identificador).run();

      const { results } = await env.DB.prepare(`SELECT id, nome FROM usuarios WHERE LOWER(email) = LOWER(?)`).bind(emailNormalizado).all<UsuarioRecuperacaoRow>();

      // Resposta sempre igual, exista ou não o e-mail — não dá pra alguém usar essa
      // tela pra descobrir quais e-mails estão cadastrados no sistema.
      const mensagemGenerica = { mensagem: "Se esse e-mail estiver cadastrado, você vai receber um link de recuperação em instantes." };

      if (results.length === 0) {
        return json(mensagemGenerica);
      }

      const usuarioId = results[0].id;

      // Limpa tokens antigos desse usuário antes de gerar um novo
      await env.DB.prepare(`DELETE FROM tokens_recuperacao_senha WHERE usuario_id = ?`).bind(usuarioId).run();

      const token = crypto.randomUUID();
      const expiraEm = new Date(Date.now() + DURACAO_TOKEN_RECUPERACAO_MS).toISOString();
      await env.DB.prepare(`INSERT INTO tokens_recuperacao_senha (usuario_id, token, expira_em) VALUES (?, ?, ?)`).bind(usuarioId, token, expiraEm).run();

      const linkFrontend = `${env.FRONTEND_URL || ""}?token=${token}`;
      await enviarEmail(env, {
        para: emailNormalizado,
        assunto: "Recuperação de senha — Cadimus",
        html: templateRecuperacaoSenha(linkFrontend),
      });

      return json(mensagemGenerica);
    } catch (erro) {
      return erroInterno(erro, "auth.esqueciSenha", "Não foi possível solicitar a recuperação de senha agora.", "recuperacao_senha_falhou");
    }
  }

  // ==========================================
  // REDEFINIR SENHA: valida o token do e-mail e grava a senha nova
  // ==========================================
  if (url.pathname.endsWith("/redefinir-senha")) {
    if (request.method !== "POST") return erroCliente("Use POST.", 405, "metodo_invalido");

    try {
      const dados = await lerJsonObjeto<RedefinirSenhaPayload>(request);
      if (!dados) {
        return erroCliente("Envie um corpo JSON válido.", 400, "corpo_json_invalido");
      }
      const { token, novaSenha } = dados;

      if (!token || !novaSenha) {
        return erroCliente("Token e nova senha são obrigatórios.", 400, "token_senha_obrigatorios");
      }
      if (novaSenha.length < 6) {
        return erroCliente("A senha deve ter ao menos 6 caracteres.", 400, "senha_curta");
      }

      const { results } = await env.DB.prepare(`SELECT id, usuario_id, expira_em FROM tokens_recuperacao_senha WHERE token = ?`).bind(token).all<TokenRecuperacaoRow>();
      if (results.length === 0) {
        return erroCliente("Link inválido ou já utilizado. Peça a recuperação de senha novamente.", 400, "token_invalido");
      }

      const registroToken = results[0];
      if (new Date(registroToken.expira_em) < new Date()) {
        await env.DB.prepare(`DELETE FROM tokens_recuperacao_senha WHERE id = ?`).bind(registroToken.id).run();
        return erroCliente("Esse link expirou. Peça a recuperação de senha novamente.", 400, "token_expirado");
      }

      const senhaHash = await hashSenha(novaSenha);
      await env.DB.prepare(`UPDATE usuarios SET senha_hash = ? WHERE id = ?`).bind(senhaHash, registroToken.usuario_id).run();

      // Token é de uso único
      await env.DB.prepare(`DELETE FROM tokens_recuperacao_senha WHERE id = ?`).bind(registroToken.id).run();

      // Derruba todas as sessões abertas dessa conta — se alguém mais tinha acesso
      // (ex: sessão esquecida aberta em outro aparelho), ele precisa logar de novo
      // com a senha nova.
      await env.DB.prepare(`DELETE FROM sessoes WHERE usuario_id = ?`).bind(registroToken.usuario_id).run();

      return json({ mensagem: "Senha redefinida com sucesso! Já pode fazer login." });
    } catch (erro) {
      return erroInterno(erro, "auth.redefinirSenha", "Não foi possível redefinir a senha agora.", "redefinir_senha_falhou");
    }
  }

  if (request.method !== "POST") return erroCliente("Use POST.", 405, "metodo_invalido");

  try {
    const corpo = await lerJsonObjeto<LoginPayload>(request);
    if (!corpo) {
      return erroCliente("Envie um corpo JSON válido.", 400, "corpo_json_invalido");
    }
    const { usuario, senha } = corpo;

    if (!usuario || !senha) {
      return erroCliente("Usuário e senha são obrigatórios.", 400, "credenciais_obrigatorias");
    }

    const identificador = usuario.trim().toLowerCase();

    // Limpeza preguiçosa: some com tentativas velhas pra tabela não crescer sem parar.
    // Usa datetime() do próprio SQLite (mesmo formato do CURRENT_TIMESTAMP) em vez de
    // gerar a data no JS — evita descompasso de formato entre os dois lados.
    await env.DB.prepare(`DELETE FROM tentativas_login WHERE tentativa_em <= datetime('now', '-15 minutes')`).run();

    const { results: tentativas } = await env.DB.prepare(
      `SELECT COUNT(*) AS total FROM tentativas_login WHERE identificador = ? AND tentativa_em > datetime('now', '-15 minutes')`,
    )
      .bind(identificador)
      .all<TentativasRow>();

    if (tentativas[0].total >= LIMITE_TENTATIVAS) {
      return erroCliente("Muitas tentativas de login. Aguarde alguns minutos e tente novamente.", 429, "muitas_tentativas");
    }

    // Busca o usuário pelo nome_usuario, sem diferenciar maiúsculas/minúsculas — teclados
    // de celular costumam capitalizar a primeira letra sozinhos, e o cadastro/edição de
    // usuário já trata "Vinicius" e "vinicius" como o mesmo nome (ver usuarios.ts)
    const query = `SELECT id, nome_usuario, perfil, nome, foto_perfil, senha_hash, ativo FROM usuarios WHERE LOWER(nome_usuario) = LOWER(?)`;
    const { results } = await env.DB.prepare(query).bind(usuario).all<UsuarioLoginRow>();

    const userDB = results[0];
    const senhaValida = userDB ? await verificarSenha(senha, userDB.senha_hash) : false;

    if (!userDB || !senhaValida) {
      // Registra a tentativa errada (mesmo se o usuário nem existir — evita revelar quais contas existem)
      await env.DB.prepare(`INSERT INTO tentativas_login (identificador) VALUES (?)`).bind(identificador).run();
      return erroCliente("Usuário ou senha incorretos.", 401, "credenciais_invalidas");
    }

    // Bloqueia login de usuário inativo
    if (userDB.ativo === 0) {
      return erroCliente("Sua conta foi desativada. Fale com um administrador.", 403, "usuario_inativo");
    }

    // Login certo: limpa o histórico de tentativas erradas desse usuário
    await env.DB.prepare(`DELETE FROM tentativas_login WHERE identificador = ?`).bind(identificador).run();

    // Registra o último acesso
    await env.DB.prepare(`UPDATE usuarios SET ultimo_acesso = datetime('now') WHERE id = ?`).bind(userDB.id).run();

    // Gera e persiste um token de sessão real (antes o token era descartado)
    const tokenSessao = await criarSessao(env, userDB.id);

    return json({
      mensagem: "Login autorizado!",
      token: tokenSessao,
      usuario: {
        id: userDB.id,
        nome_usuario: userDB.nome_usuario,
        perfil: userDB.perfil,
        nome: userDB.nome,
        foto_perfil: userDB.foto_perfil,
      },
    });
    } catch (erro) {
      return erroInterno(erro, "auth.login", "Não foi possível fazer login agora.", "login_falhou");
    }
}
