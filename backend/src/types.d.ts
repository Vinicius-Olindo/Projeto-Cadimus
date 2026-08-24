export type SqlParam = string | number | boolean | null | undefined;

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

export type PerfilUsuario = "superadmin" | "comum" | string;

export interface UsuarioSessao {
  id: number;
  nome_usuario: string;
  perfil: PerfilUsuario;
}

export interface Carteira {
  id: number;
  nome: string;
  tipo: "pessoal" | "compartilhada" | string;
  criado_por?: number | null;
  papel?: "admin" | "membro" | string;
  ordem?: number | null;
}

export type TipoLancamento = "receita" | "despesa";
export type StatusLancamento = "pago" | "pendente";

export interface Lancamento {
  id: number;
  descricao: string;
  valor?: number;
  valor_centavos?: number | null;
  data_compra: string;
  tipo: TipoLancamento;
  categoria: string;
  meio_pagamento: string;
  status: StatusLancamento;
  carteira_id: number;
  criado_por: number;
  despesa_fixa_id?: number | null;
  compra_parcelada_id?: number | null;
  recorrencia_id?: number | null;
  cartao_credito_id?: number | null;
  nota?: string | null;
}

export interface CartaoCredito {
  id: number;
  nome: string;
  bandeira?: string | null;
  ultimos4?: string | null;
  dia_fechamento: number;
  dia_vencimento: number;
  limite?: number;
  limite_centavos?: number | null;
  carteira_id: number;
  criado_por?: number | null;
  ativo?: number | boolean;
}

export type FrequenciaRecorrencia = "diaria" | "semanal" | "quinzenal" | "mensal" | "trimestral" | "anual";

export interface LancamentoRecorrente {
  id: number;
  carteira_id: number;
  descricao: string;
  valor?: number;
  valor_centavos?: number | null;
  tipo: TipoLancamento;
  categoria: string;
  meio_pagamento: string;
  frequencia: FrequenciaRecorrencia;
  dia_semana?: number | null;
  dia_mes?: number | null;
  data_inicio: string;
  data_fim?: string | null;
  criado_por: number;
  ativo?: number | boolean;
}

export interface RespostaErro {
  erro: string;
  codigo?: string;
  detalhes?: unknown;
}
