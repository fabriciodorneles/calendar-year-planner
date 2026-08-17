/**
 * O cursor marca "até onde eu já empurrei". Ele **não** filtra o pull: o pull
 * traz tudo (ver `pullCalendar`/`pullBuckets`).
 *
 * Duas regras que custaram um dado perdido em produção:
 *
 * 1. O cursor gravado é o instante em que a passada **começou**, nunca o em que
 *    terminou. Uma marcação criada no meio da sincronização nasce com
 *    `updatedAt` menor que a hora do fim; se o cursor fosse o fim, ela ficaria
 *    para sempre fora de `updatedAt > cursor` e nunca mais seria enviada —
 *    presa naquele aparelho, sem erro e com o indicador verde.
 *
 * 2. Ele só avança depois de o push dar certo. Se a rede cair, a próxima
 *    tentativa reenvia o mesmo intervalo em vez de deixar registros para trás.
 *
 * O preço da regra 1 é reenviar, na passada seguinte, o que subiu durante esta.
 * É um upsert idêntico ao que já está lá — barato perto de perder uma edição.
 */
export const pendingSince = <T extends { updatedAt: number }>(rows: T[], since: number): T[] =>
  rows.filter((row) => row.updatedAt > since);
