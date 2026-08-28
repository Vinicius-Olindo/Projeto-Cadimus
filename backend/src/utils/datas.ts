/**
 * Normaliza um dia de vencimento para o mês informado.
 *
 * Mantém dias 29/30/31 quando o mês comporta e cai para o último dia real em
 * meses mais curtos. Isso evita quebrar lançamentos de cartão com vencimento
 * no fim do mês sem voltar à trava antiga de dia 28.
 */
export function diaSeguroNoMes(ano: number, mesUmBaseado: number, diaDesejado: number): number {
  const diaNormalizado = Number.isInteger(diaDesejado)
    ? Math.min(Math.max(diaDesejado, 1), 31)
    : 1;
  const ultimoDiaDoMes = new Date(ano, mesUmBaseado, 0).getDate();

  return Math.min(diaNormalizado, ultimoDiaDoMes);
}
