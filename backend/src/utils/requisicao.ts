// ==========================================
// requisicao.ts - Helpers seguros para entrada HTTP
// ==========================================

import { normalizarId } from "../domain.ts";
import { normalizarCentavos, type OpcoesDinheiro, type ValorMonetarioEntrada } from "./dinheiro.ts";

export interface ErroPayload {
  mensagem: string;
  codigo: string;
  status: number;
}

export type ResultadoValidacao<T> =
  | { ok: true; valor: T }
  | { ok: false; erro: ErroPayload };

function ehObjetoPlano(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/**
 * Lê o corpo JSON garantindo que a rota recebeu um objeto.
 * Evita casts diretos de `request.json()` para Payload nas rotas.
 */
export async function lerJsonObjeto<T extends object>(request: Request): Promise<T | null> {
  try {
    const dados: unknown = await request.json();
    return ehObjetoPlano(dados) ? (dados as T) : null;
  } catch {
    return null;
  }
}

export function campoTexto(
  dados: Record<string, unknown>,
  campo: string,
  opcoes: {
    obrigatorio?: boolean;
    limite?: number;
    mensagemObrigatorio?: string;
    codigoObrigatorio?: string;
    mensagemLongo?: string;
    codigoLongo?: string;
  } = {},
): ResultadoValidacao<string | null> {
  const valor = dados[campo];
  const texto = typeof valor === "string" ? valor.trim() : valor === null || valor === undefined ? "" : String(valor).trim();

  if (!texto) {
    if (!opcoes.obrigatorio) return { ok: true, valor: null };
    return {
      ok: false,
      erro: {
        mensagem: opcoes.mensagemObrigatorio ?? `${campo} é obrigatório.`,
        codigo: opcoes.codigoObrigatorio ?? `${campo}_obrigatorio`,
        status: 400,
      },
    };
  }

  if (opcoes.limite && texto.length > opcoes.limite) {
    return {
      ok: false,
      erro: {
        mensagem: opcoes.mensagemLongo ?? `${campo} muito longo.`,
        codigo: opcoes.codigoLongo ?? `${campo}_longo`,
        status: 400,
      },
    };
  }

  return { ok: true, valor: texto };
}

export function campoIdObrigatorio(
  dados: Record<string, unknown>,
  campo: string,
  mensagem = `${campo} inválido ou não informado.`,
  codigo = `${campo}_invalido`,
): ResultadoValidacao<number> {
  const id = normalizarId(dados[campo] as string | number | null | undefined);

  if (!id) {
    return { ok: false, erro: { mensagem, codigo, status: 400 } };
  }

  return { ok: true, valor: id };
}

export function campoDataISOObrigatoria(
  dados: Record<string, unknown>,
  campo: string,
  mensagem = "Informe uma data válida.",
  codigo = `${campo}_invalida`,
): ResultadoValidacao<string> {
  const texto = campoTexto(dados, campo, { obrigatorio: true, mensagemObrigatorio: mensagem, codigoObrigatorio: codigo });
  if (!texto.ok) return texto;

  const data = texto.valor;
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(Date.parse(`${data}T12:00:00`))) {
    return { ok: false, erro: { mensagem, codigo, status: 400 } };
  }

  return { ok: true, valor: data };
}

export function campoCentavosObrigatorio(
  dados: Record<string, unknown>,
  campoValor: string,
  campoCentavos: string,
  mensagemObrigatorio: string,
  codigoObrigatorio: string,
  mensagemInvalido: string,
  codigoInvalido: string,
  opcoes: OpcoesDinheiro & { mensagemNaoPositivo?: string; codigoNaoPositivo?: string } = {},
): ResultadoValidacao<number> {
  const valor = dados[campoValor] as ValorMonetarioEntrada;
  const valorCentavos = dados[campoCentavos] as ValorMonetarioEntrada;

  if (valor === undefined && valorCentavos === undefined) {
    return { ok: false, erro: { mensagem: mensagemObrigatorio, codigo: codigoObrigatorio, status: 400 } };
  }

  try {
    const centavos = normalizarCentavos(valor, valorCentavos, opcoes);
    if (!opcoes.permitirNegativo && centavos <= 0) {
      return {
        ok: false,
        erro: {
          mensagem: opcoes.mensagemNaoPositivo ?? mensagemInvalido,
          codigo: opcoes.codigoNaoPositivo ?? codigoInvalido,
          status: 400,
        },
      };
    }
    return { ok: true, valor: centavos };
  } catch {
    return { ok: false, erro: { mensagem: mensagemInvalido, codigo: codigoInvalido, status: 400 } };
  }
}
