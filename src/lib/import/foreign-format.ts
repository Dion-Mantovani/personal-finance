import type {
  Account,
  Category,
  Transaction,
  TransactionType,
} from '../../types/finance';

export interface ForeignAccount {
  id?: unknown;
  name?: unknown;
  initial_balance?: unknown;
  icon?: unknown;
  status?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
}

export interface ForeignCategory {
  id?: unknown;
  name?: unknown;
  type?: unknown;
  icon?: unknown;
  is_default?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
}

export interface ForeignTransaction {
  id?: unknown;
  type?: unknown;
  amount?: unknown;
  account_id?: unknown;
  to_account_id?: unknown;
  category_id?: unknown;
  fee?: unknown;
  transaction_date?: unknown;
  description?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
}

export interface ForeignPayload {
  accounts: ForeignAccount[];
  categories: ForeignCategory[];
  transactions: ForeignTransaction[];
}

export interface MappedImport {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  warnings: string[];
  skippedTransactions: number;
  ignoredFees: number;
}

const ACCOUNT_ICON_MAP: Record<string, string> = {
  'credit-card': 'CreditCard',
  creditcard: 'CreditCard',
  card: 'CreditCard',
  landmark: 'Landmark',
  bank: 'Landmark',
  'piggy-bank': 'PiggyBank',
  piggybank: 'PiggyBank',
  savings: 'PiggyBank',
  coins: 'Coins',
  cash: 'Banknote',
  wallet: 'Wallet',
  'building-2': 'Building2',
  building: 'Building2',
  smartphone: 'Smartphone',
  phone: 'Smartphone',
  'e-wallet': 'Smartphone',
  briefcase: 'Briefcase',
  'hand-coins': 'HandCoins',
  income: 'HandCoins',
  chart: 'ChartLine',
  'line-chart': 'ChartLine',
  investment: 'ChartLine',
  dollar: 'CircleDollarSign',
  'circle-dollar': 'CircleDollarSign',
  banknote: 'Banknote',
  money: 'Banknote',
};

const CATEGORY_ICON_MAP: Record<string, string> = {
  utensils: 'Utensils',
  food: 'Utensils',
  restaurant: 'Utensils',
  coffee: 'Coffee',
  drink: 'Coffee',
  pizza: 'Pizza',
  apple: 'Apple',
  fruit: 'Apple',
  'shopping-basket': 'ShoppingBasket',
  'shopping-bag': 'ShoppingBag',
  shopping: 'ShoppingBag',
  'shopping-cart': 'ShoppingCart',
  groceries: 'ShoppingCart',
  package: 'Package',
  shirt: 'Shirt',
  clothing: 'Shirt',
  gift: 'Gift',
  car: 'Car',
  bus: 'Bus',
  bike: 'Bike',
  bicycle: 'Bike',
  fuel: 'Fuel',
  gasoline: 'Fuel',
  plane: 'Plane',
  flight: 'Plane',
  travel: 'Plane',
  train: 'TrainFront',
  parking: 'CircleParking',
  transport: 'Car',
  transportation: 'Car',
  zap: 'Zap',
  electricity: 'Zap',
  utilities: 'Zap',
  wifi: 'Wifi',
  internet: 'Wifi',
  droplets: 'Droplets',
  water: 'Droplets',
  flame: 'Flame',
  gas: 'Flame',
  phone: 'Phone',
  telephone: 'Phone',
  receipt: 'ReceiptText',
  bill: 'ReceiptText',
  'heart-pulse': 'HeartPulse',
  health: 'HeartPulse',
  pill: 'Pill',
  medicine: 'Pill',
  stethoscope: 'Stethoscope',
  medical: 'Stethoscope',
  dumbbell: 'Dumbbell',
  gym: 'Dumbbell',
  sports: 'Dumbbell',
  smile: 'Smile',
  film: 'Film',
  entertainment: 'Film',
  movie: 'Film',
  game: 'Gamepad2',
  gamepad: 'Gamepad2',
  music: 'Music',
  tv: 'Tv',
  'book-open': 'BookOpen',
  book: 'BookOpen',
  education: 'BookOpen',
  graduation: 'GraduationCap',
  'graduation-cap': 'GraduationCap',
  school: 'School',
  house: 'House',
  home: 'House',
  sofa: 'Sofa',
  furniture: 'Sofa',
  wrench: 'Wrench',
  repair: 'Wrench',
  briefcase: 'Briefcase',
  salary: 'Briefcase',
  work: 'Briefcase',
  laptop: 'Laptop',
  freelance: 'Laptop',
  building: 'Building2',
  banknote: 'Banknote',
  money: 'Banknote',
  'trending-up': 'TrendingUp',
  'hand-coins': 'HandCoins',
  'chart-line': 'ChartLine',
  'piggy-bank': 'PiggyBank',
  savings: 'PiggyBank',
  coins: 'Coins',
  landmark: 'Landmark',
  bank: 'Landmark',
  repeat: 'Repeat',
  subscription: 'Repeat',
  refresh: 'RefreshCw',
  recurring: 'RefreshCw',
  'shield-check': 'ShieldCheck',
  insurance: 'ShieldCheck',
  shield: 'ShieldAlert',
  'shield-alert': 'ShieldAlert',
  'file-text': 'FileText',
  tax: 'FileText',
  baby: 'Baby',
  users: 'Users',
  family: 'Users',
  'paw-print': 'PawPrint',
  pet: 'PawPrint',
  sparkles: 'Sparkles',
  beauty: 'Sparkles',
  scissors: 'Scissors',
  haircut: 'Scissors',
  tag: 'Tag',
  'more-horizontal': 'MoreHorizontal',
  other: 'MoreHorizontal',
  help: 'CircleHelp',
};

const EXPENSE_COLORS = [
  'text-brand-navy bg-amber-50',
  'text-rose-700 bg-rose-50',
  'text-violet-700 bg-violet-50',
  'text-emerald-700 bg-emerald-50',
];

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `import-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeType(value: unknown): TransactionType | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'income' || normalized === 'expense' || normalized === 'transfer') {
    return normalized;
  }
  return null;
}

function normalizeIconKey(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

function mapIcon(value: unknown, kind: 'account' | 'category'): string {
  const key = normalizeIconKey(value);
  if (kind === 'account') return ACCOUNT_ICON_MAP[key] ?? 'Wallet';
  return CATEGORY_ICON_MAP[key] ?? 'Utensils';
}

function colorForCategory(type: TransactionType, name: string): string {
  if (type === 'income') return 'text-emerald-700 bg-emerald-50';
  if (type === 'transfer') return 'text-brand-navy bg-amber-50';

  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
  }
  return EXPENSE_COLORS[hash % EXPENSE_COLORS.length];
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const date = value.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : date;
}

function readId(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Parse file JSON dari aplikasi lain. Format yang didukung:
 * { accounts: [...], categories: [...], transactions: [...] }
 */
export function parseForeignPayload(text: string): ForeignPayload {
  let raw: unknown;

  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('File bukan JSON yang valid.');
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Format file tidak dikenali.');
  }

  const record = raw as Record<string, unknown>;
  const hasAnyArray = ['accounts', 'categories', 'transactions'].some((key) =>
    Array.isArray(record[key])
  );

  if (!hasAnyArray) {
    throw new Error(
      'Format file tidak dikenali. Diperlukan array accounts, categories, atau transactions.'
    );
  }

  return {
    accounts: Array.isArray(record.accounts)
      ? (record.accounts as ForeignAccount[])
      : [],
    categories: Array.isArray(record.categories)
      ? (record.categories as ForeignCategory[])
      : [],
    transactions: Array.isArray(record.transactions)
      ? (record.transactions as ForeignTransaction[])
      : [],
  };
}

/**
 * Petakan format eksternal ke schema aplikasi. Data yang sudah ada
 * dicocokkan berdasarkan ID/nama agar import bersifat merge dan idempotent.
 */
export function mapForeignPayload(
  payload: ForeignPayload,
  existingAccounts: Account[],
  existingCategories: Category[],
  existingTransactions: Transaction[]
): MappedImport {
  const warnings: string[] = [];
  const newAccounts: Account[] = [];
  const newCategories: Category[] = [];
  const importedTransactions: Transaction[] = [];

  let skippedTransactions = 0;
  let ignoredFees = 0;

  const accountIdMap = new Map<string, string>();
  const accountsById = new Map(existingAccounts.map((account) => [account.id, account]));
  const accountsByName = new Map(
    existingAccounts.map((account) => [account.name.trim().toLowerCase(), account])
  );

  payload.accounts.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      warnings.push(`Akun #${index + 1} dilewati: format tidak valid.`);
      return;
    }

    const name = typeof item.name === 'string' ? item.name.trim() : '';
    if (!name) {
      warnings.push(`Akun #${index + 1} dilewati: nama kosong.`);
      return;
    }

    const rawId = readId(item.id);
    const existingByName = accountsByName.get(name.toLowerCase());

    if (existingByName) {
      if (rawId) accountIdMap.set(rawId, existingByName.id);
      return;
    }

    const existingById = rawId ? accountsById.get(rawId) : undefined;
    const id = existingById ? newId() : rawId || newId();
    const balanceRaw = Number(item.initial_balance);
    const account: Account = {
      id,
      name,
      balance: Number.isFinite(balanceRaw) ? balanceRaw : 0,
      icon: mapIcon(item.icon, 'account'),
      color: 'text-brand-navy bg-amber-50',
    };

    newAccounts.push(account);
    accountsById.set(account.id, account);
    accountsByName.set(name.toLowerCase(), account);
    if (rawId) accountIdMap.set(rawId, account.id);
  });

  const categoryIdMap = new Map<string, string>();
  const categoriesById = new Map(existingCategories.map((category) => [category.id, category]));
  const categoriesByKey = new Map(
    existingCategories.map((category) => [
      `${category.type}|${category.name.trim().toLowerCase()}`,
      category,
    ])
  );

  payload.categories.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      warnings.push(`Kategori #${index + 1} dilewati: format tidak valid.`);
      return;
    }

    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const type = normalizeType(item.type);

    if (!name || !type) {
      warnings.push(`Kategori #${index + 1} dilewati: nama/tipe tidak valid.`);
      return;
    }

    if (name.toLowerCase() === 'koreksi saldo') {
      warnings.push('Kategori "Koreksi Saldo" dilewati karena nama tersebut dipakai sistem.');
      return;
    }

    const rawId = readId(item.id);
    const key = `${type}|${name.toLowerCase()}`;
    const existingByKey = categoriesByKey.get(key);

    if (existingByKey) {
      if (rawId) categoryIdMap.set(rawId, existingByKey.id);
      return;
    }

    const existingById = rawId ? categoriesById.get(rawId) : undefined;
    const id = existingById ? newId() : rawId || newId();
    const category: Category = {
      id,
      name,
      type,
      icon: mapIcon(item.icon, 'category'),
      color: colorForCategory(type, name),
    };

    newCategories.push(category);
    categoriesById.set(category.id, category);
    categoriesByKey.set(key, category);
    if (rawId) categoryIdMap.set(rawId, category.id);
  });

  const hasTransferTransaction = payload.transactions.some(
    (transaction) => normalizeType(transaction?.type) === 'transfer'
  );

  let transferCategory =
    [...categoriesById.values()].find(
      (category) =>
        category.type === 'transfer' && category.name.trim().toLowerCase() === 'transfer'
    ) ?? null;

  if (hasTransferTransaction && !transferCategory) {
    transferCategory = {
      id: newId(),
      name: 'Transfer',
      type: 'transfer',
      icon: 'ArrowLeftRight',
      color: 'text-brand-navy bg-amber-50',
    };
    newCategories.push(transferCategory);
    categoriesById.set(transferCategory.id, transferCategory);
    categoriesByKey.set('transfer|transfer', transferCategory);
  }

  const existingTransactionIds = new Set(
    existingTransactions.map((transaction) => transaction.id)
  );
  const seenTransactionIds = new Set<string>();

  payload.transactions.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      skippedTransactions += 1;
      warnings.push(`Transaksi #${index + 1} dilewati: format tidak valid.`);
      return;
    }

    const type = normalizeType(item.type);
    if (!type) {
      skippedTransactions += 1;
      warnings.push(`Transaksi #${index + 1} dilewati: tipe tidak valid.`);
      return;
    }

    const amountRaw = Number(item.amount);
    const amount = Math.round(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) {
      skippedTransactions += 1;
      warnings.push(`Transaksi #${index + 1} dilewati: nominal tidak valid.`);
      return;
    }

    const rawAccountId = readId(item.account_id);
    const accountId =
      accountIdMap.get(rawAccountId) ??
      (accountsById.has(rawAccountId) ? rawAccountId : undefined);
    if (!accountId) {
      skippedTransactions += 1;
      warnings.push(`Transaksi #${index + 1} dilewati: akun tidak ditemukan.`);
      return;
    }

    const date = normalizeDate(item.transaction_date);
    if (!date) {
      skippedTransactions += 1;
      warnings.push(`Transaksi #${index + 1} dilewati: tanggal tidak valid.`);
      return;
    }

    let toAccountId: string | undefined;
    let categoryId: string | undefined;

    if (type === 'transfer') {
      const rawToAccountId = readId(item.to_account_id);
      toAccountId =
        accountIdMap.get(rawToAccountId) ??
        (accountsById.has(rawToAccountId) ? rawToAccountId : undefined);

      if (!toAccountId || toAccountId === accountId) {
        skippedTransactions += 1;
        warnings.push(`Transaksi #${index + 1} dilewati: akun tujuan tidak valid.`);
        return;
      }

      categoryId = transferCategory?.id;
      if (!categoryId) {
        skippedTransactions += 1;
        warnings.push(`Transaksi #${index + 1} dilewati: kategori transfer tidak tersedia.`);
        return;
      }
    } else {
      const rawCategoryId = readId(item.category_id);
      categoryId =
        categoryIdMap.get(rawCategoryId) ??
        (categoriesById.has(rawCategoryId) ? rawCategoryId : undefined);

      const category = categoryId ? categoriesById.get(categoryId) : undefined;
      if (!category || category.type !== type) {
        skippedTransactions += 1;
        warnings.push(`Transaksi #${index + 1} dilewati: kategori tidak sesuai tipe.`);
        return;
      }
    }

    const rawId = readId(item.id);
    const id = rawId || newId();

    if (existingTransactionIds.has(id) || seenTransactionIds.has(id)) {
      skippedTransactions += 1;
      return;
    }

    seenTransactionIds.add(id);

    const fee = Number(item.fee);
    if (Number.isFinite(fee) && fee > 0) ignoredFees += 1;

    const createdAtRaw =
      typeof item.created_at === 'string' ? Date.parse(item.created_at) : NaN;
    const note = typeof item.description === 'string' ? item.description.trim() : '';

    importedTransactions.push({
      id,
      accountId,
      ...(toAccountId ? { toAccountId } : {}),
      categoryId: categoryId as string,
      amount,
      type,
      date,
      ...(note ? { note } : {}),
      createdAt: Number.isFinite(createdAtRaw) ? createdAtRaw : Date.now(),
    });
  });

  if (skippedTransactions > 0) {
    warnings.push(`${skippedTransactions} transaksi dilewati (tidak valid atau sudah ada).`);
  }

  if (ignoredFees > 0) {
    warnings.push(`${ignoredFees} transaksi memiliki fee; nilai fee diabaikan.`);
  }

  return {
    accounts: newAccounts,
    categories: newCategories,
    transactions: importedTransactions,
    warnings,
    skippedTransactions,
    ignoredFees,
  };
}
