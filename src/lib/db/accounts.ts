import { getDB } from './index';
import { getTransactionsByAccount, addTransaction } from './transactions';
import { getAllCategories, addCategory } from './categories';
import type { Account } from '../../types/finance';

export async function addAccount(account: Omit<Account, 'id'> & { id?: string }): Promise<string | null> {
  const db = await getDB();
  if (!db) return null;

  const id = account.id || crypto.randomUUID();
  const newAccount: Account = { ...account, id };
  
  await db.put('accounts', newAccount);
  return id;
}

export async function getAllAccounts(): Promise<Account[]> {
  const db = await getDB();
  if (!db) return [];
  return await db.getAll('accounts');
}

export async function deleteAccount(id: string): Promise<{ success: boolean; message: string }> {
  const db = await getDB();
  if (!db) return { success: false, message: 'Database tidak aktif.' };

  const relatedTransactions = await getTransactionsByAccount(id);
  if (relatedTransactions.length > 0) {
    return {
      success: false,
      message: `Gagal menghapus akun! Masih ada ${relatedTransactions.length} transaksi yang terikat ke akun ini. Hapus transaksi terkait terlebih dahulu.`
    };
  }

  await db.delete('accounts', id);
  return { success: true, message: 'Akun berhasil dihapus.' };
}

// Di dalam fungsi getAccountCurrentBalance(accountId: string):
export async function getAccountCurrentBalance(accountId: string): Promise<number> {
  const db = await getDB();
  if (!db) return 0;

  const account = await db.get('accounts', accountId);
  if (!account) return 0;

  const transactions = await getTransactionsByAccount(accountId);

  const mutation = transactions.reduce((acc, tx) => {
    if (tx.type === 'income') {
      if (tx.accountId === accountId) return acc + tx.amount;
    } else if (tx.type === 'expense') {
      if (tx.accountId === accountId) return acc - tx.amount;
    } else if (tx.type === 'transfer') {
      if (tx.accountId === accountId) return acc - tx.amount;      // Keluar dari akun ini
      if (tx.toAccountId === accountId) return acc + tx.amount;    // Masuk ke akun ini
    }
    return acc;
  }, 0);

  return account.balance + mutation;
}

/**
 * Helper internal untuk mendapatkan atau membuat kategori "Koreksi Saldo"
 */
async function getOrCreateCorrectionCategory(type: 'income' | 'expense'): Promise<string> {
  const categories = await getAllCategories();
  const existingCategory = categories.find(
    (c) => c.name.toLowerCase() === 'koreksi saldo' && c.type === type
  );

  if (existingCategory) {
    return existingCategory.id;
  }

  // Buat otomatis jika belum ada
  const newCatId = await addCategory({
    name: 'Koreksi Saldo',
    type: type,
  });

  return newCatId || '';
}

/**
 * Mengubah nama/properti akun atau menyesuaikan saldo saat ini via Transaksi Koreksi.
 */
export async function updateAccount(
  accountId: string,
  data: { name: string; targetBalance: number; icon: string; color: string }
): Promise<{ success: boolean; message: string }> {
  const db = await getDB();
  if (!db) return { success: false, message: 'Database tidak aktif.' };

  const account = await db.get('accounts', accountId);
  if (!account) return { success: false, message: 'Akun tidak ditemukan.' };

  // 1. Update atribut akun (nama, icon, color)
  account.name = data.name;
  account.icon = data.icon;
  account.color = data.color;
  await db.put('accounts', account);

  // 2. Hitung selisih dari saldo saat ini
  const currentBalance = await getAccountCurrentBalance(accountId);
  const diff = data.targetBalance - currentBalance;

  if (diff === 0) {
    return { success: true, message: 'Data akun berhasil diperbarui.' };
  }

  // 3. Buat transaksi penyesuaian jika ada selisih
  const isIncome = diff > 0;
  const txType = isIncome ? 'income' : 'expense';
  const categoryId = await getOrCreateCorrectionCategory(txType);

  await addTransaction({
    accountId,
    categoryId,
    amount: Math.abs(diff),
    type: txType,
    date: new Date().toISOString().split('T')[0],
    note: `Koreksi Saldo (${isIncome ? 'Penambahan' : 'Pengurangan'})`,
  });

  return { success: true, message: 'Saldo akun berhasil disesuaikan!' };
}