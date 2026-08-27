// ==========================================
// usuarios.ts - Gestão de Contas e Perfis (somente superadmin)
// ==========================================
import type { CadimusEnv, PerfilUsuario, SqlParam, UsuarioSessao, WorkerCtx } from "../types.js";
import { hashSenha } from "../utils/crypto.ts";
import { obterUsuarioDaSessao } from "../utils/sessao.ts";
import { erroCliente, erroInterno, json } from "../utils/respostas.ts";

// Regra simples de formato (não valida se o e-mail existe de verdade — isso
// só o envio da confirmação/recuperação por e-mail vai garantir, quando essa
// parte for implementada).
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Tamanho máximo da data URL da foto (base64). Isso equivale a ~220KB de
// imagem já comprimida — a compressão de verdade acontece no navegador
// (ver frontend/js/main.js) antes de chegar aqui; este limite é só uma
// trava de segurança contra uploads gigantes ou manipulados.
const TAMANHO_MAXIMO_FOTO = 300000;

// Valida e normaliza os campos cadastrais (nome, telefone, e-mail, foto).
// Usado tanto na criação quanto na edição. `idAtual` é usado para não
// barrar o próprio e-mail do usuário quando ele edita outra coisa.
interface UsuarioPayload {
  usuario?: string;
  senha?: string;
  perfil?: PerfilUsuario | string;
  nome?: string;
  telefone?: string | number | null;
  email?: string;
  foto_perfil?: string | null;
  salario?: string | number | null;
}

interface DadosCadastraisValidados {
  erro?: string;
  nome?: string;
  email?: string;
  telefone?: string | null;
  foto_perfil?: string | null;
}

interface IdRow {
  id: number;
}

interface UsuarioAlvoRow {
  id: number;
  perfil: PerfilUsuario;
  criado_por?: number | null;
  ativo?: number | boolean | null;
}

interface ContagemRow {
  total: number;
}

interface UsuarioPerfilRow {
  id: number;
  nome_usuario: string;
  perfil: PerfilUsuario;
  nome?: string | null;
  telefone?: string | null;
  email?: string | null;
  foto_perfil?: string | null;
  salario?: number | null;
  criado_em?: string;
  ultimo_acesso?: string | null;
}

interface UsuarioListagemRow extends UsuarioPerfilRow {
  ativo?: number | boolean | null;
  criado_por?: number | null;
}

async function validarDadosCadastrais(dados: UsuarioPayload, env: CadimusEnv, idAtual: number | null = null): Promise<DadosCadastraisValidados> {
  const resultado: DadosCadastraisValidados = {};

  if (dados.nome !== undefined) {
    const nome = String(dados.nome).trim();
    if (!nome) {
      return { erro: "Informe o nome completo." };
    }
    if (nome.length > 80) {
      return { erro: "Nome muito longo (máx. 80 caracteres)." };
    }
    resultado.nome = nome;
  }

  if (dados.email !== undefined) {
    const email = String(dados.email).trim().toLowerCase();
    if (!email || !REGEX_EMAIL.test(email)) {
      return { erro: "Informe um e-mail válido." };
    }

    const condicaoId = idAtual !== null ? "AND id != ?" : "";
    const binds = idAtual !== null ? [email, idAtual] : [email];
    const { results: duplicado } = await env.DB.prepare(`SELECT id FROM usuarios WHERE LOWER(email) = LOWER(?) ${condicaoId}`)
      .bind(...binds)
      .all<IdRow>();
    if (duplicado.length > 0) {
      return { erro: "Já existe um usuário cadastrado com esse e-mail." };
    }
    resultado.email = email;
  }

  if (dados.telefone !== undefined) {
    const digitos = String(dados.telefone).replace(/\D/g, "");
    if (digitos && (digitos.length < 10 || digitos.length > 11)) {
      return { erro: "Telefone inválido (informe DDD + número)." };
    }
    resultado.telefone = digitos || null;
  }

  if (dados.foto_perfil !== undefined) {
    const foto = dados.foto_perfil;
    if (foto) {
      if (typeof foto !== "string" || !foto.startsWith("data:image/")) {
        return { erro: "Foto de perfil inválida." };
      }
      if (foto.length > TAMANHO_MAXIMO_FOTO) {
        return { erro: "Foto de perfil muito grande. Tente uma imagem menor." };
      }
    }
    resultado.foto_perfil = foto || null;
  }

  return resultado;
}

function ehSuperadminRaiz(usuario: Pick<UsuarioSessao, "id">): boolean {
  return Number(usuario.id) === 1;
}

function podeGerenciarUsuario(usuarioLogado: UsuarioSessao, usuarioAlvo: Pick<UsuarioAlvoRow, "criado_por">): boolean {
  return ehSuperadminRaiz(usuarioLogado) || Number(usuarioAlvo.criado_por) === Number(usuarioLogado.id);
}

export async function processarUsuarios(request: Request, env: CadimusEnv, ctx: WorkerCtx): Promise<Response> {
  const metodo = request.method;
  const url = new URL(request.url);

  // Todo o painel de usuários é restrito: precisa estar logado E ser superadmin
  const usuarioLogado = await obterUsuarioDaSessao(request, env, ctx);
  if (!usuarioLogado) {
    return erroCliente("Não autenticado.", 401, "nao_autenticado");
  }

  // ==========================================
  // ROTA /me: perfil do usuário logado (qualquer perfil)
  // ==========================================
  if (url.pathname.endsWith("/me")) {
    // GET: retorna dados completos
    if (metodo === "GET") {
      try {
        const { results } = await env.DB.prepare(
          `SELECT id, nome_usuario, perfil, nome, telefone, email, foto_perfil, salario, criado_em, ultimo_acesso FROM usuarios WHERE id = ?`
        ).bind(usuarioLogado.id).all<UsuarioPerfilRow>();
        if (results.length === 0) {
          return erroCliente("Usuário não encontrado.", 404, "usuario_nao_encontrado");
        }
        return json(results[0]);
      } catch (erro) {
        return erroInterno(erro, "usuarios.me", "Não foi possível carregar o perfil agora.", "perfil_carregar_falhou");
      }
    }

    // PUT: editar próprio perfil (nome, email, telefone, salario, foto, senha)
    if (metodo === "PUT") {
      try {
        const dados = await request.json() as UsuarioPayload;
        const campos: string[] = [];
        const valores: SqlParam[] = [];

        const cadastrais = await validarDadosCadastrais(dados, env, usuarioLogado.id);
        if (cadastrais.erro) {
          return erroCliente(cadastrais.erro, 400, "dados_cadastrais_invalidos");
        }
        if (cadastrais.nome !== undefined) { campos.push("nome = ?"); valores.push(cadastrais.nome); }
        if (cadastrais.email !== undefined) { campos.push("email = ?"); valores.push(cadastrais.email); }
        if (cadastrais.telefone !== undefined) { campos.push("telefone = ?"); valores.push(cadastrais.telefone); }
        if (cadastrais.foto_perfil !== undefined) { campos.push("foto_perfil = ?"); valores.push(cadastrais.foto_perfil); }

        if (dados.salario !== undefined) {
          campos.push("salario = ?");
          valores.push(Number(dados.salario) || 0);
        }

        if (dados.senha) {
          if (dados.senha.length < 6) {
            return erroCliente("A senha deve ter ao menos 6 caracteres.", 400, "senha_curta");
          }
          campos.push("senha_hash = ?");
          valores.push(await hashSenha(dados.senha));
        }

        if (campos.length === 0) {
          return erroCliente("Nenhum dado para atualizar.", 400, "sem_campos_para_atualizar");
        }

        valores.push(usuarioLogado.id);
        await env.DB.prepare(`UPDATE usuarios SET ${campos.join(", ")} WHERE id = ?`).bind(...valores).run();

        return json({ mensagem: "Perfil atualizado com sucesso!" });
      } catch (erro) {
        return erroInterno(erro, "usuarios.atualizarPerfil", "Não foi possível atualizar o perfil agora.", "perfil_atualizar_falhou");
      }
    }

    return erroCliente("Use GET ou PUT.", 405, "metodo_invalido");
  }

  if (usuarioLogado.perfil !== "superadmin") {
    return erroCliente("Acesso restrito a administradores.", 403, "admin_obrigatorio");
  }

  // ==========================================
  // LISTAR
  // ==========================================
  if (metodo === "GET") {
    try {
      // Apenas o superadmin original (id=1) vê todos os usuários.
      // Outros admins (mesmo com perfil superadmin) só veem quem eles criaram.
      let query: string;
      let binds: SqlParam[] = [];
      if (Number(usuarioLogado.id) === 1) {
        query = `SELECT id, nome_usuario, perfil, nome, telefone, email, foto_perfil, criado_em, ultimo_acesso, ativo, criado_por, salario FROM usuarios ORDER BY id ASC`;
      } else {
        query = `SELECT id, nome_usuario, perfil, nome, telefone, email, foto_perfil, criado_em, ultimo_acesso, ativo, criado_por, salario FROM usuarios WHERE criado_por = ? ORDER BY id ASC`;
        binds = [usuarioLogado.id];
      }
      const { results } = await env.DB.prepare(query).bind(...binds).all<UsuarioListagemRow>();
      return json(results);
    } catch (erro) {
      return erroInterno(erro, "usuarios.listar", "Não foi possível carregar os usuários agora.", "usuarios_listar_falhou");
    }
  }

  // ==========================================
  // CRIAR
  // ==========================================
  if (metodo === "POST") {
    try {
      const dados = await request.json() as UsuarioPayload;
      const perfil: PerfilUsuario = dados.perfil === "superadmin" && ehSuperadminRaiz(usuarioLogado) ? "superadmin" : "comum";

      if (!dados.usuario || !dados.senha) {
        return erroCliente("Usuário e senha obrigatórios.", 400, "credenciais_obrigatorias");
      }
      if (dados.senha.length < 6) {
        return erroCliente("A senha deve ter ao menos 6 caracteres.", 400, "senha_curta");
      }
      if (!dados.nome || !dados.email) {
        return erroCliente("Nome completo e e-mail são obrigatórios.", 400, "dados_cadastrais_obrigatorios");
      }

      const { results: existente } = await env.DB.prepare(`SELECT id FROM usuarios WHERE LOWER(nome_usuario) = LOWER(?)`).bind(dados.usuario).all<IdRow>();
      if (existente.length > 0) {
        return erroCliente("Já existe um usuário com esse nome.", 409, "usuario_duplicado");
      }

      const cadastrais = await validarDadosCadastrais(dados, env);
      if (cadastrais.erro) {
        return erroCliente(cadastrais.erro, 400, "dados_cadastrais_invalidos");
      }

      // Nunca mais gravamos a senha em texto puro
      const senhaHash = await hashSenha(dados.senha);

      const query = `INSERT INTO usuarios (nome_usuario, senha_hash, perfil, nome, telefone, email, foto_perfil, criado_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      const resultadoUsuario = await env.DB.prepare(query)
        .bind(dados.usuario, senhaHash, perfil, cadastrais.nome, cadastrais.telefone ?? null, cadastrais.email, cadastrais.foto_perfil ?? null, usuarioLogado.id)
        .run();
      const novoUsuarioId = resultadoUsuario.meta?.last_row_id;
      if (!novoUsuarioId) {
        return erroInterno(new Error("last_row_id ausente ao criar usuário"), "usuarios.criar", "Usuário cadastrado, mas não foi possível finalizar a criação agora.", "usuario_id_ausente");
      }

      // Toda conta nova já nasce com sua própria carteira pessoal — sem isso
      // o usuário fica sem nenhum lugar pra lançar nada. Quem cria carteiras
      // compartilhadas continua sendo decisão manual, feita depois pelo próprio
      // usuário (ver carteiras.ts).
      try {
        const nomeCarteira = `Pessoal - ${cadastrais.nome}`.slice(0, 40);
        const resultadoCarteira = await env.DB.prepare(`INSERT INTO carteiras (nome, tipo) VALUES (?, 'individual')`).bind(nomeCarteira).run();
        const novaCarteiraId = resultadoCarteira.meta?.last_row_id;
        if (!novaCarteiraId) throw new Error("last_row_id ausente ao criar carteira pessoal");
        await env.DB.prepare(`INSERT INTO usuarios_carteiras (usuario_id, carteira_id, papel) VALUES (?, ?, 'admin')`)
          .bind(novoUsuarioId, novaCarteiraId)
          .run();
      } catch (erroCarteira) {
        // Desfaz o usuário pra não deixar uma conta órfã, sem carteira e presa
        await env.DB.prepare(`DELETE FROM usuarios WHERE id = ?`).bind(novoUsuarioId).run();
        return erroInterno(erroCarteira, "usuarios.criarCarteiraPessoal", "Usuário não pôde ser cadastrado (falha ao criar a carteira pessoal).", "carteira_pessoal_criar_falhou");
      }

      return json({ mensagem: "Usuário cadastrado com sucesso!" }, 201);
    } catch (erro) {
      return erroInterno(erro, "usuarios.criar", "Não foi possível cadastrar este usuário agora.", "usuario_criar_falhou");
    }
  }

  // ==========================================
  // EDITAR (nome, perfil e, opcionalmente, senha)
  // ==========================================
  if (metodo === "PUT") {
    try {
      const id = url.searchParams.get("id");
      if (!id) {
        return erroCliente("ID não fornecido.", 400, "id_obrigatorio");
      }

      const { results: alvo } = await env.DB.prepare(`SELECT id, perfil, criado_por FROM usuarios WHERE id = ?`).bind(id).all<UsuarioAlvoRow>();
      if (alvo.length > 0 && !podeGerenciarUsuario(usuarioLogado, alvo[0])) {
        return erroCliente("Acesso negado.", 403, "acesso_negado");
      }
      if (alvo.length > 0 && alvo[0].perfil === "superadmin" && !ehSuperadminRaiz(usuarioLogado)) {
        return erroCliente("Somente o administrador principal pode gerenciar outros administradores.", 403, "admin_raiz_obrigatorio");
      }
      if (alvo.length === 0) {
        return erroCliente("Usuário não encontrado.", 404, "usuario_nao_encontrado");
      }

      const dados = await request.json() as UsuarioPayload;
      const campos: string[] = [];
      const valores: SqlParam[] = [];

      if (dados.usuario) {
        const { results: duplicado } = await env.DB.prepare(`SELECT id FROM usuarios WHERE LOWER(nome_usuario) = LOWER(?) AND id != ?`).bind(dados.usuario, id).all<IdRow>();
        if (duplicado.length > 0) {
          return erroCliente("Já existe um usuário com esse nome.", 409, "usuario_duplicado");
        }
        campos.push("nome_usuario = ?");
        valores.push(dados.usuario);
      }

      if (dados.perfil) {
        const novoPerfil: PerfilUsuario = dados.perfil === "superadmin" ? "superadmin" : "comum";
        if (novoPerfil === "superadmin" && !ehSuperadminRaiz(usuarioLogado)) {
          return erroCliente("Somente o administrador principal pode conceder perfil de administrador.", 403, "admin_raiz_obrigatorio");
        }

        // Impede remover o último superadmin do sistema (evitaria travar o painel pra sempre)
        if (alvo[0].perfil === "superadmin" && novoPerfil !== "superadmin") {
          const { results: contagem } = await env.DB.prepare(`SELECT COUNT(*) AS total FROM usuarios WHERE perfil = 'superadmin'`).all<ContagemRow>();
          if (contagem[0].total <= 1) {
            return erroCliente("Não é possível remover o último administrador do sistema.", 400, "ultimo_admin_bloqueado");
          }
        }

        campos.push("perfil = ?");
        valores.push(novoPerfil);
      }

      if (dados.senha) {
        if (dados.senha.length < 6) {
          return erroCliente("A senha deve ter ao menos 6 caracteres.", 400, "senha_curta");
        }
        campos.push("senha_hash = ?");
        valores.push(await hashSenha(dados.senha));
      }

      if (dados.salario !== undefined) {
        const salario = Number(dados.salario) || 0;
        campos.push("salario = ?");
        valores.push(salario);
      }

      const cadastrais = await validarDadosCadastrais(dados, env, Number(id));
      if (cadastrais.erro) {
        return erroCliente(cadastrais.erro, 400, "dados_cadastrais_invalidos");
      }
      if (cadastrais.nome !== undefined) {
        campos.push("nome = ?");
        valores.push(cadastrais.nome);
      }
      if (cadastrais.email !== undefined) {
        campos.push("email = ?");
        valores.push(cadastrais.email);
      }
      if (cadastrais.telefone !== undefined) {
        campos.push("telefone = ?");
        valores.push(cadastrais.telefone);
      }
      if (cadastrais.foto_perfil !== undefined) {
        campos.push("foto_perfil = ?");
        valores.push(cadastrais.foto_perfil);
      }

      if (campos.length === 0) {
        return erroCliente("Nada para atualizar.", 400, "sem_campos_para_atualizar");
      }

      valores.push(id);
      await env.DB.prepare(`UPDATE usuarios SET ${campos.join(", ")} WHERE id = ?`)
        .bind(...valores)
        .run();

      return json({ mensagem: "Usuário atualizado com sucesso!" });
    } catch (erro) {
      return erroInterno(erro, "usuarios.atualizar", "Não foi possível atualizar este usuário agora.", "usuario_atualizar_falhou");
    }
  }

  // ==========================================
  // TOGGLE ATIVO/INATIVO
  // ==========================================
  if (metodo === "PATCH") {
    try {
      const id = url.searchParams.get("id");
      if (!id) {
        return erroCliente("ID não fornecido.", 400, "id_obrigatorio");
      }

      if (Number(id) === usuarioLogado.id) {
        return erroCliente("Você não pode desativar a própria conta.", 400, "auto_desativacao_bloqueada");
      }

      const { results: alvo } = await env.DB.prepare(`SELECT id, perfil, ativo, criado_por FROM usuarios WHERE id = ?`).bind(id).all<UsuarioAlvoRow>();
      if (alvo.length > 0 && !podeGerenciarUsuario(usuarioLogado, alvo[0])) {
        return erroCliente("Acesso negado.", 403, "acesso_negado");
      }
      if (alvo.length > 0 && alvo[0].perfil === "superadmin" && !ehSuperadminRaiz(usuarioLogado)) {
        return erroCliente("Somente o administrador principal pode gerenciar outros administradores.", 403, "admin_raiz_obrigatorio");
      }
      if (alvo.length === 0) {
        return erroCliente("Usuário não encontrado.", 404, "usuario_nao_encontrado");
      }

      // Impede desativar o último superadmin
      if (alvo[0].perfil === "superadmin" && alvo[0].ativo === 1) {
        const { results: contagem } = await env.DB.prepare(`SELECT COUNT(*) AS total FROM usuarios WHERE perfil = 'superadmin' AND ativo = 1`).all<ContagemRow>();
        if (contagem[0].total <= 1) {
          return erroCliente("Não é possível desativar o único administrador ativo do sistema.", 400, "ultimo_admin_ativo_bloqueado");
        }
      }

      const novoStatus = alvo[0].ativo === 1 ? 0 : 1;
      await env.DB.prepare(`UPDATE usuarios SET ativo = ? WHERE id = ?`).bind(novoStatus, id).run();

      // Se desativou, invalida todas as sessões do usuário
      if (novoStatus === 0) {
        await env.DB.prepare(`DELETE FROM sessoes WHERE usuario_id = ?`).bind(id).run();
      }

      return json({ ativo: novoStatus, mensagem: novoStatus === 1 ? "Usuário ativado." : "Usuário desativado." });
    } catch (erro) {
      return erroInterno(erro, "usuarios.alterarStatus", "Não foi possível alterar o status deste usuário agora.", "usuario_status_falhou");
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

      if (Number(id) === usuarioLogado.id) {
        return erroCliente("Você não pode excluir a própria conta enquanto está logado nela.", 400, "auto_exclusao_bloqueada");
      }

      const { results: alvo } = await env.DB.prepare(`SELECT id, perfil, criado_por FROM usuarios WHERE id = ?`).bind(id).all<UsuarioAlvoRow>();
      if (alvo.length > 0 && !podeGerenciarUsuario(usuarioLogado, alvo[0])) {
        return erroCliente("Acesso negado.", 403, "acesso_negado");
      }
      if (alvo.length > 0 && alvo[0].perfil === "superadmin" && !ehSuperadminRaiz(usuarioLogado)) {
        return erroCliente("Somente o administrador principal pode gerenciar outros administradores.", 403, "admin_raiz_obrigatorio");
      }
      if (alvo.length === 0) {
        return erroCliente("Usuário não encontrado.", 404, "usuario_nao_encontrado");
      }

      // Impede excluir o último superadmin
      if (alvo[0].perfil === "superadmin") {
        const { results: contagem } = await env.DB.prepare(`SELECT COUNT(*) AS total FROM usuarios WHERE perfil = 'superadmin'`).all<ContagemRow>();
        if (contagem[0].total <= 1) {
          return erroCliente("Não é possível excluir o último administrador do sistema.", 400, "ultimo_admin_bloqueado");
        }
      }

      // Impede excluir quem já tem lançamentos gravados (evita registros órfãos)
      const { results: lancamentosDoUsuario } = await env.DB.prepare(`SELECT COUNT(*) AS total FROM lancamentos WHERE criado_por = ?`).bind(id).all<ContagemRow>();
      if (lancamentosDoUsuario[0].total > 0) {
        return erroCliente("Este usuário já tem lançamentos registrados e não pode ser excluído. Você pode alterar o perfil dele em vez de excluir.", 400, "usuario_com_lancamentos");
      }

      // Limpa acessos e sessões antes de remover a conta
      await env.DB.prepare(`DELETE FROM usuarios_carteiras WHERE usuario_id = ?`).bind(id).run();
      await env.DB.prepare(`DELETE FROM sessoes WHERE usuario_id = ?`).bind(id).run();
      await env.DB.prepare(`DELETE FROM usuarios WHERE id = ?`).bind(id).run();

      return json({ mensagem: "Usuário excluído." });
    } catch (erro) {
      return erroInterno(erro, "usuarios.excluir", "Não foi possível excluir este usuário agora.", "usuario_excluir_falhou");
    }
  }

  return erroCliente("Método não permitido.", 405, "metodo_nao_permitido");
}
