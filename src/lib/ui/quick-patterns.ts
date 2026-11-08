import type { Account, Category, Transaction, TransactionType } from '../../types/finance';

export interface QuickPattern {
  type: TransactionType;
  accountId: string;
  toAccountId?: string;
  categoryId: string;
  amount: number;
  note: string;
  count: number;
  lastDate: string;
  lastCreatedAt: number;
}

export interface QuickPalette {
  textColor: string;
  bgColor: string;
  iconName: string;
}

/**
 * Bangun pola transaksi berulang dari histori. Dipakai oleh "Catat Cepat"
 * di dashboard dan "Isi Cepat" di form transaksi.
 */
export function buildQuickPatterns(
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[]
): QuickPattern[] {
  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const categoriesById = new Map(categories.map((category) => [category.id, category]));

  const correctionCategoryIds = new Set(
    categories
      .filter((category) => category.name.toLowerCase() === 'koreksi saldo')
      .map((category) => category.id)
  );

  const patterns = new Map<string, QuickPattern>();

  for (const tx of transactions) {
    if (tx.amount <= 0) continue;
    if (!accountsById.has(tx.accountId)) continue;
    if (!categoriesById.has(tx.categoryId)) continue;
    if (correctionCategoryIds.has(tx.categoryId)) continue;

    if (tx.type === 'transfer') {
      if (!tx.toAccountId) continue;
      if (tx.toAccountId === tx.accountId) continue;
      if (!accountsById.has(tx.toAccountId)) continue;
    } else {
      const category = categoriesById.get(tx.categoryId);
      if (!category || category.type !== tx.type) continue;
    }

    const normalizedNote = (tx.note ?? '').trim().toLowerCase();
    const key = [
      tx.type,
      tx.accountId,
      tx.toAccountId ?? '',
      tx.categoryId,
      tx.amount,
      normalizedNote,
    ].join('|');

    const existing = patterns.get(key);
    if (existing) {
      existing.count += 1;
      const isNewer =
        tx.date > existing.lastDate ||
        (tx.date === existing.lastDate && tx.createdAt >= existing.lastCreatedAt);
      if (isNewer) {
        existing.lastDate = tx.date;
        existing.lastCreatedAt = tx.createdAt;
        existing.note = tx.note ?? '';
      }
    } else {
      patterns.set(key, {
        type: tx.type,
        accountId: tx.accountId,
        ...(tx.toAccountId ? { toAccountId: tx.toAccountId } : {}),
        categoryId: tx.categoryId,
        amount: tx.amount,
        note: tx.note ?? '',
        count: 1,
        lastDate: tx.date,
        lastCreatedAt: tx.createdAt,
      });
    }
  }

  return [...patterns.values()]
    .sort(
      (a, b) =>
        b.count - a.count ||
        b.lastDate.localeCompare(a.lastDate) ||
        b.lastCreatedAt - a.lastCreatedAt
    )
    .slice(0, 5);
}

export function getQuickPalette(
  pattern: QuickPattern,
  categoriesById: Map<string, Category>
): QuickPalette {
  const category = categoriesById.get(pattern.categoryId);
  const colorClass = category?.color || 'text-blue-700 bg-blue-50';
  const [textColor, bgColor] = colorClass.split(' ');

  return {
    textColor: textColor || 'text-primary',
    bgColor: bgColor || 'bg-blue-50',
    iconName: category?.icon || (pattern.type === 'transfer' ? 'ArrowLeftRight' : 'Wallet'),
  };
}

export function getQuickDescription(
  pattern: QuickPattern,
  accountsById: Map<string, Account>,
  categoriesById: Map<string, Category>
): string {
  if (pattern.type === 'transfer') {
    const fromName = accountsById.get(pattern.accountId)?.name || 'Akun';
    const toName = pattern.toAccountId
      ? accountsById.get(pattern.toAccountId)?.name || 'Akun'
      : 'Akun';
    return `${fromName} → ${toName}`;
  }

  const categoryName = categoriesById.get(pattern.categoryId)?.name || 'Transaksi';
  return pattern.note.trim() || categoryName;
}
