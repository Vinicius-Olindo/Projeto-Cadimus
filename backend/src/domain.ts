import type {
  BandeiraCartao,
  FrequenciaRecorrencia,
  IdEntrada,
  MeioPagamento,
  PapelCarteira,
  PerfilUsuario,
  SeveridadeNotificacao,
  StatusLancamento,
  StatusNotificacao,
  TipoCarteira,
  TipoLancamento,
} from "./types.js";

export const PERFIS_USUARIO = ["superadmin", "comum"] as const satisfies readonly PerfilUsuario[];

export const TIPOS_CARTEIRA = ["pessoal", "compartilhada", "individual"] as const satisfies readonly TipoCarteira[];

export const PAPEIS_CARTEIRA = ["admin", "membro"] as const satisfies readonly PapelCarteira[];

export const TIPOS_LANCAMENTO = ["receita", "despesa"] as const satisfies readonly TipoLancamento[];

export const STATUS_LANCAMENTO = ["pago", "pendente"] as const satisfies readonly StatusLancamento[];

export const MEIOS_PAGAMENTO = [
  "dinheiro",
  "pix",
  "debito",
  "credito",
  "cartao_credito",
  "transferencia",
  "outro",
] as const satisfies readonly MeioPagamento[];

export const BANDEIRAS_CARTAO = ["visa", "mastercard", "elo", "amex", "hipercard", "outro"] as const satisfies readonly BandeiraCartao[];

export const FREQUENCIAS_RECORRENCIA = [
  "diaria",
  "semanal",
  "quinzenal",
  "mensal",
  "trimestral",
  "anual",
] as const satisfies readonly FrequenciaRecorrencia[];

export const STATUS_NOTIFICACAO = ["nao_lida", "lida", "arquivada"] as const satisfies readonly StatusNotificacao[];

export const SEVERIDADES_NOTIFICACAO = ["info", "sucesso", "aviso", "perigo"] as const satisfies readonly SeveridadeNotificacao[];

function pertenceA<T extends string>(valores: readonly T[], valor: unknown): valor is T {
  return typeof valor === "string" && valores.includes(valor as T);
}

function normalizarTexto(valor: unknown): string | null {
  return typeof valor === "string" ? valor.trim().toLowerCase() : null;
}

function normalizarDominio<T extends string>(valores: readonly T[], valor: unknown): T | null {
  const normalizado = normalizarTexto(valor);
  return valores.find((item) => item === normalizado) ?? null;
}

export function isPerfilUsuario(valor: unknown): valor is PerfilUsuario {
  return pertenceA(PERFIS_USUARIO, valor);
}

export function isTipoCarteira(valor: unknown): valor is TipoCarteira {
  return pertenceA(TIPOS_CARTEIRA, valor);
}

export function isTipoLancamento(valor: unknown): valor is TipoLancamento {
  return normalizarTipoLancamento(valor) !== null;
}

export function isStatusLancamento(valor: unknown): valor is StatusLancamento {
  return normalizarStatusLancamento(valor) !== null;
}

export function isMeioPagamento(valor: unknown): valor is MeioPagamento {
  return normalizarMeioPagamento(valor) !== null;
}

export function isBandeiraCartao(valor: unknown): valor is BandeiraCartao {
  return pertenceA(BANDEIRAS_CARTAO, valor);
}

export function isFrequenciaRecorrencia(valor: unknown): valor is FrequenciaRecorrencia {
  return normalizarFrequenciaRecorrencia(valor) !== null;
}

export function isStatusNotificacao(valor: unknown): valor is StatusNotificacao {
  return pertenceA(STATUS_NOTIFICACAO, valor);
}

export function isSeveridadeNotificacao(valor: unknown): valor is SeveridadeNotificacao {
  return pertenceA(SEVERIDADES_NOTIFICACAO, valor);
}

export function normalizarId(valor: IdEntrada | null | undefined): number | null {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

export function normalizarTipoLancamento(valor: unknown): TipoLancamento | null {
  return normalizarDominio(TIPOS_LANCAMENTO, valor);
}

export function normalizarStatusLancamento(valor: unknown): StatusLancamento | null {
  return normalizarDominio(STATUS_LANCAMENTO, valor);
}

export function normalizarMeioPagamento(valor: unknown): MeioPagamento | null {
  return normalizarDominio(MEIOS_PAGAMENTO, valor);
}

export function normalizarFrequenciaRecorrencia(valor: unknown): FrequenciaRecorrencia | null {
  return normalizarDominio(FREQUENCIAS_RECORRENCIA, valor);
}

export function normalizarMesReferencia(valor: number | string | null | undefined): string | null {
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < 1 || numero > 12) return null;
  return String(numero).padStart(2, "0");
}
