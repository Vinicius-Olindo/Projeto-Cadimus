-- Permite recorrências diárias preservando os dados existentes.
-- SQLite/D1 não permite alterar CHECK diretamente, então a tabela é recriada.

PRAGMA foreign_keys = OFF;

CREATE TABLE lancamentos_recorrentes_nova (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    carteira_id INTEGER NOT NULL,
    descricao TEXT NOT NULL,
    valor REAL NOT NULL,
    valor_centavos INTEGER,
    tipo TEXT NOT NULL DEFAULT 'despesa' CHECK (tipo IN ('despesa', 'receita')),
    categoria TEXT NOT NULL,
    meio_pagamento TEXT NOT NULL,
    frequencia TEXT NOT NULL CHECK (frequencia IN ('diaria', 'semanal', 'quinzenal', 'mensal', 'trimestral', 'anual')),
    dia_semana INTEGER,
    dia_mes INTEGER,
    ativo INTEGER NOT NULL DEFAULT 1,
    data_inicio TEXT NOT NULL,
    data_fim TEXT,
    criado_por INTEGER NOT NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (carteira_id) REFERENCES carteiras(id),
    FOREIGN KEY (criado_por) REFERENCES usuarios(id)
);

INSERT INTO lancamentos_recorrentes_nova (
    id, carteira_id, descricao, valor, valor_centavos, tipo, categoria, meio_pagamento,
    frequencia, dia_semana, dia_mes, ativo, data_inicio, data_fim, criado_por, criado_em
)
SELECT
    id, carteira_id, descricao, valor, valor_centavos, tipo, categoria, meio_pagamento,
    frequencia, dia_semana, dia_mes, ativo, data_inicio, data_fim, criado_por, criado_em
FROM lancamentos_recorrentes;

DROP TABLE lancamentos_recorrentes;
ALTER TABLE lancamentos_recorrentes_nova RENAME TO lancamentos_recorrentes;

DROP TRIGGER IF EXISTS trg_lancamentos_recorrentes_centavos_para_real_insert;
CREATE TRIGGER trg_lancamentos_recorrentes_centavos_para_real_insert
AFTER INSERT ON lancamentos_recorrentes
FOR EACH ROW
WHEN NEW.valor_centavos IS NOT NULL
BEGIN
  UPDATE lancamentos_recorrentes SET valor = NEW.valor_centavos / 100.0 WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_lancamentos_recorrentes_centavos_para_real_update;
CREATE TRIGGER trg_lancamentos_recorrentes_centavos_para_real_update
AFTER UPDATE OF valor_centavos ON lancamentos_recorrentes
FOR EACH ROW
WHEN NEW.valor_centavos IS NOT NULL
BEGIN
  UPDATE lancamentos_recorrentes SET valor = NEW.valor_centavos / 100.0 WHERE id = NEW.id;
END;

PRAGMA foreign_keys = ON;
