import { getDB } from './index';
import { getTransactionsByCategory } from './transactions';
import type { Category } from '../../types/finance';

export async function addCategory(category: Omit<Category, 'id'> & { id?: string }): Promise<string | null> {
  const db = await getDB();
  if (!db) return null;

  const id = category.id || crypto.randomUUID();
  const newCategory: Category = {
    icon: 'Tag',
    color: 'text-blue-700 bg-blue-50',
    ...category,
    id,
  };

  await db.put('categories', newCategory);
  return id;
}

export async function getAllCategories(): Promise<Category[]> {
  const db = await getDB();
  if (!db) return [];
  return await db.getAll('categories');
}

/**
 * Menghapus kategori dengan aturan:
 * Gagal jika masih ada transaksi yang terikat ke kategori ini.
 */
export async function deleteCategory(id: string): Promise<{ success: boolean; message: string }> {
  const db = await getDB();
  if (!db) return { success: false, message: 'Database tidak aktif.' };

  const relatedTransactions = await getTransactionsByCategory(id);
  if (relatedTransactions.length > 0) {
    return {
      success: false,
      message: `Gagal menghapus kategori! Masih ada ${relatedTransactions.length} transaksi yang terikat ke kategori ini. Hapus transaksi terkait terlebih dahulu.`
    };
  }

  await db.delete('categories', id);
  return { success: true, message: 'Kategori berhasil dihapus.' };
}

/**
 * Memperbarui data kategori (Nama, Tipe, Icon, Warna)
 */
export async function updateCategory(
  id: string,
  data: Omit<Category, 'id'>
): Promise<{ success: boolean; message: string }> {
  const db = await getDB();
  if (!db) return { success: false, message: 'Database tidak aktif.' };

  const existingCategory = await db.get('categories', id);
  if (!existingCategory) return { success: false, message: 'Kategori tidak ditemukan.' };

  await db.put('categories', {
    ...data,
    id
  });

  return { success: true, message: 'Kategori berhasil diperbarui.' };
}