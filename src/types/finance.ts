export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Account {
  id: string; 
  name: string;
  balance: number;
  icon?: string;
  color?: string;
}

export interface Category {
  id: string; 
  name: string;
  type: TransactionType;
  icon?: string;
  color?: string;
}

export interface Transaction {
  id: string;            
  accountId: string;     // Akun asal / sumber
  toAccountId?: string;  // Akun tujuan (khusus untuk transfer)
  categoryId: string;    
  amount: number;
  type: TransactionType;
  date: string;          
  note?: string;
  createdAt: number;     
}