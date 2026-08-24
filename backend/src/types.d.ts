export type Id = number;
export type IdEntrada = number | string;
export type CampoOpcional<T> = T | null | undefined;
export type SqlParam = string | number | boolean | null | undefined;
export type AtivoBanco = 0 | 1 | boolean;

export interface D1Result<T = any> {
  results: T[];
  success?: boolean;
  meta?: {
    last_row_id?: number;
    changes?: number;
    [key: string]: unknown;
  };
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T = any>(): Promise<D1Result<T>>;
  run<T = any>(): Promise<D1Result<T>>;
  first<T = any>(): Promise<T | null>;
}

export interface D1DatabaseBinding {
  prepare(query: string): D1PreparedStatement;
}

export interface CadimusEnv {
  DB: D1DatabaseBinding;
  FRONTEND_URL?: string;
  RESEND_API_KEY?: string;
  EMAIL_REMETENTE?: string;
}

export interface WorkerCtx {
  waitUntil?: (promise: Promise<unknown>) => void;
}

export type PerfilUsuario = "superadmin" | "comum";

export interface UsuarioSessao {
  id: Id;
  nome_usuario: string;
  perfil: PerfilUsuario;
}

export type TipoCarteira = "pessoal" | "compartilhada" | "individual";
export type PapelCarteira = "admin" | "membro";

export interface Carteira {
  id: Id;
  nome: string;
  tipo: TipoCarteira;
  criado_por?: number | null;
  papel?: PapelCarteira;
  ordem?: number | null;
}

export type TipoLancamento = "receita" | "despesa";
export type StatusLancamento = "pago" | "pendente";
export type MeioPagamento = "dinheiro" | "pix" | "debito" | "credito" | "cartao_credito" | "transferencia" | "outro";
export type CategoriaFinanceira = string;

export interface Lancamento {
  id: Id;
  descricao: string;
  valor?: number;
  valor_centavos?: number | null;
  data_compra: string;
  tipo: TipoLancamento;
  categoria: CategoriaFinanceira;
  meio_pagamento: MeioPagamento;
  status: StatusLancamento;
  carteira_id: Id;
  criado_por: Id;
  despesa_fixa_id?: number | null;
  compra_parcelada_id?: number | null;
  recorrencia_id?: number | null;
  cartao_credito_id?: number | null;
  nota?: string | null;
}

export type BandeiraCartao = "visa" | "mastercard" | "elo" | "amex" | "hipercard" | "outro";

export interface CartaoCredito {
  id: Id;
  nome: string;
  bandeira?: BandeiraCartao | null;
  ultimos4?: string | null;
  dia_fechamento: number;
  dia_vencimento: number;
  limite?: number;
  limite_centavos?: number | null;
  carteira_id: Id;
  criado_por?: Id | null;
  ativo?: AtivoBanco;
}

export type FrequenciaRecorrencia = "diaria" | "semanal" | "quinzenal" | "mensal" | "trimestral" | "anual";

export interface LancamentoRecorrente {
  id: Id;
  carteira_id: Id;
  descricao: string;
  valor?: number;
  valor_centavos?: number | null;
  tipo: TipoLancamento;
  categoria: CategoriaFinanceira;
  meio_pagamento: MeioPagamento;
  frequencia: FrequenciaRecorrencia;
  dia_semana?: number | null;
  dia_mes?: number | null;
  data_inicio: string;
  data_fim?: string | null;
  criado_por: Id;
  ativo?: AtivoBanco;
}

export type StatusNotificacao = "nao_lida" | "lida" | "arquivada";
export type SeveridadeNotificacao = "info" | "sucesso" | "aviso" | "perigo";

export interface Notificacao {
  id: Id;
  usuario_id: Id;
  carteira_id?: Id | null;
  tipo: string;
  titulo: string;
  mensagem: string;
  status: StatusNotificacao;
  severidade: SeveridadeNotificacao;
  entidade?: string | null;
  entidade_id?: Id | null;
  chave_unica?: string | null;
  url_acao?: string | null;
  data_evento?: string | null;
}

export interface RespostaErro {
  erro: string;
  codigo?: string;
  detalhes?: unknown;
}
