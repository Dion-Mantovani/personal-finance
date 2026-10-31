import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Account, Category, Transaction } from '../../types/finance';

const DB_NAME = 'PersonalFinanceDB';
const DB_VERSION = 1;

interface FinanceDBSchema extends DBSchema {
  accounts: {
    key: string;
    value: Account;
  };
  categories: {
    key: string;
    value: Category;
    indexes: { 'by-type': string };
  };
  transactions: {
    key: string; // Berubah jadi string karena UUID
    value: Transaction;
    indexes: {
      'by-date': string;
      'by-account': string;
      'by-category': string;
      'by-type': string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<FinanceDBSchema>> | null = null;

export const getDB = () => {
  if (typeof window === 'undefined') return null;

  if (!dbPromise) {
    dbPromise = openDB<FinanceDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('accounts')) {
          db.createObjectStore('accounts', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('categories')) {
          const catStore = db.createObjectStore('categories', { keyPath: 'id' });
          catStore.createIndex('by-type', 'type');
        }

        if (!db.objectStoreNames.contains('transactions')) {
          const txStore = db.createObjectStore('transactions', {
            keyPath: 'id', // Menggunakan id sebagai keyPath (UUID)
          });
          txStore.createIndex('by-date', 'date');
          txStore.createIndex('by-account', 'accountId');
          txStore.createIndex('by-category', 'categoryId');
          txStore.createIndex('by-type', 'type');
        }
      },
    });
  }

  return dbPromise;
};