/** Precisa ser um UUID de verdade: as colunas `id` no Postgres são `uuid`, e o
 *  fallback antigo (base36 aleatório) seria rejeitado no sync. */
export const newId = (): string => {
  const source: Crypto | undefined = globalThis.crypto;
  if (source?.randomUUID) return source.randomUUID();

  const bytes = new Uint8Array(16);
  if (source?.getRandomValues) {
    source.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40; // versão 4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variante
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

/** Todo registro sincronizável carrega isto (DESIGN.md §5): id estável, carimbo
 *  de última escrita para o last-write-wins e soft delete. */
export type Syncable = {
  id: string;
  updatedAt: number;
  deletedAt: number | null;
};

export const isLive = <T extends { deletedAt: number | null }>(record: T): boolean =>
  record.deletedAt === null;
