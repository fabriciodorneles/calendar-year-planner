/**
 * Last-write-wins por registro: o lado com `updatedAt` maior vence, e cada
 * registro é pequeno (um dia de marcação, um objetivo), então edições em
 * lugares diferentes se somam em vez de competir. Depende dos relógios dos
 * dispositivos estarem razoavelmente certos.
 */
export function mergeById<T extends { id: string; updatedAt: number }>(
  local: T[],
  remote: T[],
): { merged: T[]; changed: boolean } {
  const byId = new Map(local.map((item) => [item.id, item]));
  let changed = false;

  for (const item of remote) {
    const mine = byId.get(item.id);
    if (!mine || item.updatedAt > mine.updatedAt) {
      byId.set(item.id, item);
      changed = true;
    }
  }

  return { merged: [...byId.values()], changed };
}
