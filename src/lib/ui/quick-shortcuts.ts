export interface SavedQuickShortcut {
  id: string;
  name: string;
  type: 'expense' | 'income';
  amount: number;
  categoryId: string;
  accountId: string;
  createdAt: string;
}

const STORAGE_KEY = 'pf:quick-shortcuts';
export const MAX_QUICK_SHORTCUTS = 5;
export const FALLBACK_QUICK_LIMIT = 3;

function safeParse(raw: string | null): SavedQuickShortcut[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is SavedQuickShortcut => {
      if (!item || typeof item !== 'object') return false;
      return (
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        (item.type === 'expense' || item.type === 'income') &&
        typeof item.amount === 'number' &&
        typeof item.categoryId === 'string' &&
        typeof item.accountId === 'string' &&
        typeof item.createdAt === 'string'
      );
    });
  } catch {
    return [];
  }
}

export function getSavedQuickShortcuts(): SavedQuickShortcut[] {
  try {
    return safeParse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

function persist(shortcuts: SavedQuickShortcut[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts));
  } catch {
    // localStorage bisa diblokir; abaikan.
  }
}

export interface AddQuickShortcutResult {
  shortcuts: SavedQuickShortcut[];
  replaced: SavedQuickShortcut | null;
}

/**
 * Simpan shortcut baru. Kalau slot penuh, shortcut terlama diganti.
 * Pemanggil bertanggung jawab meminta konfirmasi sebelum memanggil ini.
 */
export function addQuickShortcut(
  shortcut: Omit<SavedQuickShortcut, 'id' | 'createdAt'>
): AddQuickShortcutResult {
  const existing = getSavedQuickShortcuts();
  let replaced: SavedQuickShortcut | null = null;

  if (existing.length >= MAX_QUICK_SHORTCUTS) {
    replaced = existing[0] ?? null;
    existing.shift();
  }

  const next: SavedQuickShortcut = {
    ...shortcut,
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `qs-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
  };

  existing.push(next);
  persist(existing);

  return { shortcuts: existing, replaced };
}

export function removeQuickShortcut(id: string): SavedQuickShortcut[] {
  const next = getSavedQuickShortcuts().filter((item) => item.id !== id);
  persist(next);
  return next;
}

export function moveQuickShortcut(
  id: string,
  direction: -1 | 1
): SavedQuickShortcut[] {
  const shortcuts = getSavedQuickShortcuts();
  const index = shortcuts.findIndex((item) => item.id === id);
  const target = index + direction;

  if (index === -1 || target < 0 || target >= shortcuts.length) {
    return shortcuts;
  }

  [shortcuts[index], shortcuts[target]] = [
    shortcuts[target],
    shortcuts[index],
  ];
  persist(shortcuts);
  return shortcuts;
}
