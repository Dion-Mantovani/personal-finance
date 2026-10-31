import { getDB } from './index';
import { getAllAccounts } from './accounts';
import type { Transaction } from '../../types/finance';

export async function addTransaction(tx: Omit<Transaction, 'id' | 'createdAt'>): Promise<string | null> {
  const db = await getDB();
  if (!db) return null;

  const id = crypto.randomUUID();
  await db.put('transactions', {
    ...tx,
    id,
    createdAt: Date.now(),
  });

  return id;
}

export async function updateTransaction(
  id: string,
  tx: Omit<Transaction, 'id' | 'createdAt'>
): Promise<{ success: boolean; message: string }> {
  const db = await getDB();
  if (!db) return { success: false, message: 'Database tidak aktif.' };

  const existingTx = await db.get('transactions', id);
  if (!existingTx) return { success: false, message: 'Transaksi tidak ditemukan.' };

  await db.put('transactions', {
    ...tx,
    id,
    createdAt: existingTx.createdAt, 
  });

  return { success: true, message: 'Transaksi berhasil diperbarui.' };
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const db = await getDB();
  if (!db) return [];
  return await db.getAllFromIndex('transactions', 'by-date');
}

export async function getTransactionsByAccount(accountId: string): Promise<Transaction[]> {
  const db = await getDB();
  if (!db) return [];
  
  // Ambil semua transaksi
  const allTxs = await db.getAll('transactions');
  
  // Filter transaksi di mana akun terkait sebagai accountId ATAU toAccountId (untuk transfer)
  return allTxs.filter(tx => tx.accountId === accountId || tx.toAccountId === accountId);
}

export async function getTransactionsByCategory(categoryId: string): Promise<Transaction[]> {
  const db = await getDB();
  if (!db) return [];
  return await db.getAllFromIndex('transactions', 'by-category', categoryId);
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.delete('transactions', id);
}

export async function getDashboardSummary() {
  const accounts = await getAllAccounts();
  const transactions = await getAllTransactions();

  const initialAccountsBalance = accounts.reduce((acc:any, curr:any) => acc + curr.balance, 0);

  const txSummary = transactions.reduce(
    (acc, tx) => {
      if (tx.type === 'income') {
        acc.totalIncome += tx.amount;
      } else if (tx.type === 'expense') {
        acc.totalExpense += tx.amount;
      }
      // Transfer tidak mengubah total net worth / total balance keseluruhan dashboard, jadi diabaikan di summary total
      return acc;
    },
    { totalIncome: 0, totalExpense: 0 }
  );

  const totalBalance = initialAccountsBalance + txSummary.totalIncome - txSummary.totalExpense;

  return {
    totalBalance,
    totalIncome: txSummary.totalIncome,
    totalExpense: txSummary.totalExpense,
  };
}