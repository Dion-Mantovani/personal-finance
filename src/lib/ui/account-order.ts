const STORAGE_KEY = 'pf:account-order';

/**
 * Urutan akun kustom disimpan di localStorage (bukan IndexedDB) supaya
 * skema database tidak berubah.
 */
export function readAccountOrder(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

export function writeAccountOrder(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // localStorage bisa diblokir (mode privat tertentu); abaikan.
  }
}

/**
 * Terapkan urutan tersimpan. Akun yang belum punya posisi (mis. akun baru)
 * diletakkan di akhir dengan urutan aslinya tetap stabil.
 */
export function sortByStoredOrder<T extends { id: string }>(
  items: T[],
  order: string[]
): T[] {
  const positions = new Map(order.map((id, index) => [id, index]));

  return [...items].sort((a, b) => {
    const aIndex = positions.get(a.id);
    const bIndex = positions.get(b.id);

    if (aIndex === undefined && bIndex === undefined) return 0;
    if (aIndex === undefined) return 1;
    if (bIndex === undefined) return -1;
    return aIndex - bIndex;
  });
}
