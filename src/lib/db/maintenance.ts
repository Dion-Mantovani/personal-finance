import { getDB } from './index';
import type { Account, Category, Transaction } from '../../types/finance';

export interface DataCounts {
  accounts: number;
  categories: number;
  transactions: number;
}

export interface ImportRecords {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
}

export async function getDataCounts(): Promise<DataCounts> {
  const db = await getDB();
  if (!db) return { accounts: 0, categories: 0, transactions: 0 };

  const [accounts, categories, transactions] = await Promise.all([
    db.count('accounts'),
    db.count('categories'),
    db.count('transactions'),
  ]);

  return { accounts, categories, transactions };
}

/**
 * Tulis hasil mapping import dalam satu transaksi IndexedDB supaya
 * tidak ada data setengah jadi.
 */
export async function importRecords(records: ImportRecords): Promise<void> {
  const db = await getDB();
  if (!db) throw new Error('Database tidak aktif.');

  const tx = db.transaction(
    ['accounts', 'categories', 'transactions'],
    'readwrite'
  );

  const accountStore = tx.objectStore('accounts');
  const categoryStore = tx.objectStore('categories');
  const transactionStore = tx.objectStore('transactions');

  records.accounts.forEach((account) => accountStore.put(account));
  records.categories.forEach((category) => categoryStore.put(category));
  records.transactions.forEach((transaction) => transactionStore.put(transaction));

  await tx.done;
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  if (!db) throw new Error('Database tidak aktif.');

  const tx = db.transaction(
    ['accounts', 'categories', 'transactions'],
    'readwrite'
  );

  tx.objectStore('accounts').clear();
  tx.objectStore('categories').clear();
  tx.objectStore('transactions').clear();

  await tx.done;
}
