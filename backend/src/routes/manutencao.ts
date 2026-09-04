// ==========================================
// manutencao.ts - Ações de manutenção do sistema (restrito a superadmin)
// ==========================================
import type { CadimusEnv, WorkerCtx } from "../types.js";
import { obterUsuarioDaSessao } from "../utils/sessao.ts";
import { verificarSenha } from "../utils/crypto.ts";

const CATEGORIAS_PADRAO = ["Mercado", "Transporte", "Moradia", "Contas", "Saúde", "Lazer", "Educação", "Salário", "Outros"];
const FRASE_CONFIRMACAO = "APAGAR TUDO";

interface ConfirmacaoLimpeza {
  confirmacao?: string;
  senha?: string;
}

interface UsuarioSenhaRow {
  senha_hash: string | null;
}

export async function processarLimpezaDados(request: Request, env: CadimusEnv, ctx: WorkerCtx): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ erro: "Método não permitido." }), { status: 405 });
  }

  const usuarioLogado = await obterUsuarioDaSessao(request, env, ctx);
  if (!usuarioLogado) {
    return new Response(JSON.stringify({ erro: "Não autenticado." }), { status: 401 });
  }
  if (usuarioLogado.perfil !== "superadmin") {
    return new Response(JSON.stringify({ erro: "Acesso restrito a administradores." }), { status: 403 });
  }

  try {
    const dados = (await request.json().catch(() => ({}))) as ConfirmacaoLimpeza;

    // Exige digitar a frase exata — é uma ação irreversível que afeta TODO o sistema,
    // não só uma carteira, então o clique sozinho num botão não é confirmação suficiente.
    if (dados.confirmacao !== FRASE_CONFIRMACAO) {
      return new Response(JSON.stringify({ erro: `Confirmação inválida. Digite exatamente "${FRASE_CONFIRMACAO}" para prosseguir.` }), { status: 400 });
    }

    if (!dados.senha || typeof dados.senha !== "string") {
      return new Response(JSON.stringify({ erro: "Informe sua senha para confirmar a exclusão.", codigo: "senha_obrigatoria" }), { status: 400 });
    }

    const usuarioSenha = await env.DB
      .prepare(`SELECT senha_hash FROM usuarios WHERE id = ?`)
      .bind(usuarioLogado.id)
      .first<UsuarioSenhaRow>();

    const senhaCorreta = await verificarSenha(dados.senha, usuarioSenha?.senha_hash);
    if (!senhaCorreta) {
      return new Response(JSON.stringify({ erro: "Senha incorreta. Nenhum dado foi apagado.", codigo: "senha_incorreta" }), { status: 403 });
    }

    // Ordem importa: lancamentos referencia despesas_fixas e compras_parceladas por
    // chave estrangeira, então precisa ser apagado primeiro.
    await env.DB.prepare(`DELETE FROM lancamentos`).run();
    await env.DB.prepare(`DELETE FROM despesas_fixas`).run();
    await env.DB.prepare(`DELETE FROM compras_parceladas`).run();
    await env.DB.prepare(`DELETE FROM metas_categoria`).run();
    await env.DB.prepare(`DELETE FROM categorias`).run();

    // Restaura a lista de categorias padrão — deixa o app pronto pra usar de novo,
    // em vez de deixar a lista de categorias vazia.
    for (const nome of CATEGORIAS_PADRAO) {
      await env.DB.prepare(`INSERT INTO categorias (nome) VALUES (?)`).bind(nome).run();
    }

    // Não mexe em usuarios, carteiras, usuarios_carteiras nem sessoes — isso preserva
    // os acessos e contas, só zera os dados financeiros de fato.

    return new Response(
      JSON.stringify({ mensagem: "Todos os dados financeiros foram apagados. As categorias padrão foram restauradas." }),
      { status: 200 },
    );
  } catch (erro) {
    console.error("Erro:", erro);
    return new Response(JSON.stringify({ erro: "Erro ao limpar os dados." }), { status: 500 });
  }
}
