import test from "node:test";
import assert from "node:assert/strict";

import {
  isFrequenciaRecorrencia,
  isBandeiraCartao,
  isMeioPagamento,
  isPerfilUsuario,
  isSeveridadeNotificacao,
  isStatusLancamento,
  isStatusNotificacao,
  isTipoCarteira,
  isTipoLancamento,
  MEIOS_PAGAMENTO,
  normalizarId,
  normalizarMesReferencia,
  STATUS_NOTIFICACAO,
} from "../src/domain.ts";

test("guards de domínio aceitam apenas valores canônicos conhecidos", () => {
  assert.equal(isPerfilUsuario("superadmin"), true);
  assert.equal(isPerfilUsuario("admin"), false);

  assert.equal(isTipoCarteira("compartilhada"), true);
  assert.equal(isTipoCarteira("familiar"), false);

  assert.equal(isTipoLancamento("receita"), true);
  assert.equal(isTipoLancamento("entrada"), false);

  assert.equal(isStatusLancamento("pendente"), true);
  assert.equal(isStatusLancamento("atrasado"), false);

  assert.equal(isMeioPagamento("credito"), true);
  assert.equal(isMeioPagamento("boleto"), false);

  assert.equal(isBandeiraCartao("visa"), true);
  assert.equal(isBandeiraCartao("diners"), false);

  assert.equal(isFrequenciaRecorrencia("semanal"), true);
  assert.equal(isFrequenciaRecorrencia("eventual"), false);

  assert.equal(isStatusNotificacao("nao_lida"), true);
  assert.equal(isStatusNotificacao("aberta"), false);

  assert.equal(isSeveridadeNotificacao("perigo"), true);
  assert.equal(isSeveridadeNotificacao("critico"), false);
});

test("listas de domínio expõem valores usados por formulários e filtros", () => {
  assert.deepEqual([...STATUS_NOTIFICACAO], ["nao_lida", "lida", "arquivada"]);
  assert.equal(MEIOS_PAGAMENTO.includes("pix"), true);
  assert.equal(MEIOS_PAGAMENTO.includes("cartao_credito"), true);
});

test("normalizadores de domínio convertem entradas comuns de rota", () => {
  assert.equal(normalizarId("10"), 10);
  assert.equal(normalizarId(10), 10);
  assert.equal(normalizarId("0"), null);
  assert.equal(normalizarId("abc"), null);

  assert.equal(normalizarMesReferencia("8"), "08");
  assert.equal(normalizarMesReferencia("12"), "12");
  assert.equal(normalizarMesReferencia("13"), null);
  assert.equal(normalizarMesReferencia("abc"), null);
});
