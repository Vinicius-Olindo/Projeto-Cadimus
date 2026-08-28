-- Adiciona anexo por link aos lançamentos.
-- Fase 1: guardamos apenas URL/nome, sem upload físico.
ALTER TABLE lancamentos ADD COLUMN anexo_url TEXT;
ALTER TABLE lancamentos ADD COLUMN anexo_nome TEXT;
