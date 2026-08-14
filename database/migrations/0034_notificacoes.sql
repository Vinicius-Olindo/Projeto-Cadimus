-- Central persistente de notificacoes do Cadimus.
-- Nivel 1: historico dentro do app, com lida/nao_lida/arquivada.

CREATE TABLE IF NOT EXISTS notificacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  carteira_id INTEGER,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'nao_lida',
  severidade TEXT NOT NULL DEFAULT 'info',
  entidade TEXT,
  entidade_id INTEGER,
  chave_unica TEXT,
  url_acao TEXT,
  data_evento TEXT,
  lida_em TEXT,
  arquivada_em TEXT,
  criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (carteira_id) REFERENCES carteiras(id) ON DELETE CASCADE,
  CHECK (status IN ('nao_lida', 'lida', 'arquivada')),
  CHECK (severidade IN ('info', 'sucesso', 'aviso', 'perigo')),
  UNIQUE (usuario_id, chave_unica)
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_status
  ON notificacoes(usuario_id, status, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_carteira
  ON notificacoes(usuario_id, carteira_id, criado_em DESC);

