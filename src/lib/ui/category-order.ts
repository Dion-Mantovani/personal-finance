import type { TransactionType } from '../../types/finance';

const STORAGE_KEY = 'pf:category-order';

export interface CategoryOrder {
  expense: string[];
  income: string[];
}

function emptyOrder(): CategoryOrder {
  return { expense: [], income: [] };
}

export function readCategoryOrder(): CategoryOrder {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyOrder();

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return emptyOrder();

    const record = parsed as Record<string, unknown>;
    const readList = (value: unknown): string[] =>
      Array.isArray(value)
        ? value.filter((id): id is string => typeof id === 'string')
        : [];

    return {
      expense: readList(record.expense),
      income: readList(record.income),
    };
  } catch {
    return emptyOrder();
  }
}

export function writeCategoryOrder(order: CategoryOrder): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  } catch {
    // localStorage bisa diblokir; abaikan.
  }
}

export function readOrderForType(type: TransactionType): string[] {
  if (type === 'transfer') return [];
  return readCategoryOrder()[type];
}

export function writeOrderForType(type: TransactionType, ids: string[]): void {
  if (type === 'transfer') return;

  const order = readCategoryOrder();
  order[type] = ids;
  writeCategoryOrder(order);
}

export function sortCategoriesByStoredOrder<T extends { id: string }>(
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
