
import { getAllAccounts } from '../lib/db/accounts';
import { getAllCategories } from '../lib/db/categories';
import { addTransaction, deleteTransaction, getAllTransactions } from '../lib/db/transactions';
import type { Account, Category, Transaction, TransactionType } from '../types/finance';
import { emptyStateHtml } from '../lib/ui/empty-state';
import { toast } from '../lib/ui/toast';
import {
  buildQuickPatterns,
  getQuickDescription,
  getQuickPalette,
} from '../lib/ui/quick-patterns';

export function initDashboardPage(): void {
  const greetingEl = document.getElementById('dash-greeting')!;
  const dateEl = document.getElementById('dash-date')!;
  const refreshBtn = document.getElementById('refresh-btn') as HTMLButtonElement;
  const refreshIcon = document.getElementById('refresh-icon')!;
  const toggleAmountsBtn = document.getElementById('toggle-amounts') as HTMLButtonElement;
  const eyeOpenIcon = document.getElementById('eye-open-icon')!;
  const eyeClosedIcon = document.getElementById('eye-closed-icon')!;
  const totalBalanceEl = document.getElementById('dash-total-balance')!;
  const cashflowPill = document.getElementById('cashflow-pill')!;
  const cashflowAmountEl = document.getElementById('cashflow-amount')!;
  const cashflowUpIcon = document.getElementById('cashflow-up')!;
  const cashflowDownIcon = document.getElementById('cashflow-down')!;
  const detailToggle = document.getElementById('detail-toggle') as HTMLButtonElement;
  const detailToggleLabel = document.getElementById('detail-toggle-label')!;
  const detailChevron = document.getElementById('detail-chevron')!;
  const heroDetail = document.getElementById('hero-detail')!;
  const periodEl = document.getElementById('dash-period')!;
  const monthIncomeEl = document.getElementById('dash-month-income')!;
  const monthExpenseEl = document.getElementById('dash-month-expense')!;
  const quickSection = document.getElementById('quick-section')!;
  const quickList = document.getElementById('quick-list')!;
  const quickStatus = document.getElementById('quick-status')!;
  const quickStatusText = document.getElementById('quick-status-text')!;
  const quickUndoBtn = document.getElementById('quick-undo') as HTMLButtonElement;
  const recentList = document.getElementById('dash-recent-list')!;

  let accounts: Account[] = [];
  let categories: Category[] = [];
  let transactions: Transaction[] = [];
  let accountsById = new Map<string, Account>();
  let categoriesById = new Map<string, Category>();
  let lastCreatedId: string | null = null;
  let statusTimer: number | null = null;
  let amountsHidden = false;

  const formatIDR = (num: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);

  function toLocalDateKey(date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => {
      const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return map[char] ?? char;
    });
  }

  function getLucideIconHtml(iconName: string): string {
    const template = document.querySelector(
      `#icon-templates template[data-icon-name="${iconName}"]`
    ) as HTMLTemplateElement | null;
    if (template) return template.innerHTML;

    const fallback = document.querySelector(
      `#icon-templates template[data-icon-name="ArrowLeftRight"]`
    ) as HTMLTemplateElement | null;
    return fallback ? fallback.innerHTML : '';
  }

  function setAmount(el: HTMLElement, value: number) {
    el.dataset.amount = String(value);
    el.textContent = amountsHidden ? '••••••' : formatIDR(value);
  }

  function applyAmountVisibility() {
    document.querySelectorAll<HTMLElement>('[data-amount]').forEach((el) => {
      const value = Number(el.dataset.amount || '0');
      el.textContent = amountsHidden ? '••••••' : formatIDR(value);
    });

    eyeOpenIcon.classList.toggle('hidden', amountsHidden);
    eyeClosedIcon.classList.toggle('hidden', !amountsHidden);
    toggleAmountsBtn.setAttribute('aria-label', amountsHidden ? 'Tampilkan nominal' : 'Sembunyikan nominal');
    toggleAmountsBtn.setAttribute('title', amountsHidden ? 'Tampilkan nominal' : 'Sembunyikan nominal');
  }

  function renderGreeting(now: Date) {
    const hour = now.getHours();
    greetingEl.textContent =
      hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 19 ? 'Selamat sore' : 'Selamat malam';

    dateEl.textContent = new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(now);

    periodEl.textContent = new Intl.DateTimeFormat('id-ID', {
      month: 'long',
      year: 'numeric',
    }).format(now);
  }

  function highlightCurrentDay() {
    const todayIndex = (new Date().getDay() + 6) % 7;
    const tallestIndex = 1;
    const bars = Array.from(document.querySelectorAll<HTMLElement>('.week-bar'));
    const labels = Array.from(document.querySelectorAll<HTMLElement>('.week-label'));

    bars.forEach((bar, index) => {
      bar.classList.remove('bg-brand-navy', 'bg-accent-yellow');
      bar.classList.add('bg-brand-border');

      if (index === todayIndex) {
        bar.classList.replace('bg-brand-border', 'bg-accent-yellow');
      } else if (index === tallestIndex) {
        bar.classList.replace('bg-brand-border', 'bg-brand-navy');
      }
    });

    const todayLabel = labels[todayIndex];
    if (todayLabel) {
      todayLabel.classList.remove('text-text-secondary', 'font-medium');
      todayLabel.classList.add('text-brand-navy', 'font-bold');
    }
  }

  function showQuickStatus(success: boolean, message: string, undoable = false) {
    if (statusTimer !== null) {
      window.clearTimeout(statusTimer);
      statusTimer = null;
    }

    quickStatus.className = success
      ? 'flex items-center gap-2 rounded-xl border border-finance-green/20 bg-finance-green/5 px-3 py-2 text-[11px] font-semibold text-finance-green'
      : 'flex items-center gap-2 rounded-xl border border-finance-red/20 bg-finance-red/5 px-3 py-2 text-[11px] font-semibold text-finance-red';

    quickStatusText.textContent = success ? `✓ ${message}` : message;
    quickUndoBtn.classList.toggle('hidden', !undoable);

    statusTimer = window.setTimeout(() => {
      quickStatus.className = 'hidden';
      quickUndoBtn.classList.add('hidden');
      lastCreatedId = null;
      statusTimer = null;
    }, 5000);
  }

  async function handleQuickAdd(
    btn: HTMLButtonElement,
    pattern: QuickPattern,
    description: string
  ) {
    if (btn.dataset.busy === '1') return;
    btn.dataset.busy = '1';
    btn.setAttribute('aria-busy', 'true');
    btn.classList.add('opacity-60', 'pointer-events-none');

    const payload: Omit<Transaction, 'id' | 'createdAt'> = {
      amount: pattern.amount,
      type: pattern.type,
      accountId: pattern.accountId,
      categoryId: pattern.categoryId,
      date: toLocalDateKey(),
      note: pattern.note.trim() || undefined,
      ...(pattern.toAccountId ? { toAccountId: pattern.toAccountId } : {}),
    };

    let newId: string | null = null;
    try {
      newId = await addTransaction(payload);
    } catch {
      newId = null;
    }

    if (!newId) {
      btn.dataset.busy = '0';
      btn.removeAttribute('aria-busy');
      btn.classList.remove('opacity-60', 'pointer-events-none');
      showQuickStatus(false, 'Gagal mencatat transaksi. Coba lagi.');
      return;
    }

    lastCreatedId = newId;

    // Transaksi sudah tersimpan. Kegagalan refresh tidak boleh terlihat
    // seperti kegagalan pencatatan (bisa memicu input ganda).
    try {
      await loadDashboard();
    } catch {
      // Diamkan: data lokal akan termuat lagi pada interaksi berikutnya.
    }

    btn.dataset.busy = '0';
    btn.removeAttribute('aria-busy');
    btn.classList.remove('opacity-60', 'pointer-events-none');

    showQuickStatus(true, `${description} tercatat`, true);
  }

  function renderQuickActions() {
    const patterns = buildQuickPatterns(transactions, accounts, categories);

    if (patterns.length === 0) {
      quickSection.classList.add('hidden');
      quickList.innerHTML = '';
      return;
    }

    quickSection.classList.remove('hidden');
    quickList.innerHTML = '';

    for (const pattern of patterns) {
      const { textColor, bgColor, iconName } = getQuickPalette(pattern, categoriesById);
      const description = getQuickDescription(pattern, accountsById, categoriesById);
      const amountPrefix =
        pattern.type === 'income' ? '+ ' : pattern.type === 'expense' ? '- ' : '';
      const amountColor =
        pattern.type === 'income'
          ? 'text-finance-green'
          : pattern.type === 'expense'
            ? 'text-finance-red'
            : 'text-brand-navy';

      const button = document.createElement('button');
      button.type = 'button';
      button.className =
        'snap-start shrink-0 w-[160px] text-left rounded-2xl bg-white border border-brand-border/70 p-3 shadow-xs hover:border-accent-yellow hover:shadow-md active:scale-95 transition touch-manipulation flex items-center gap-2.5';
      button.setAttribute(
        'aria-label',
        `Catat cepat ${description}, ${formatIDR(pattern.amount)}`
      );
      button.innerHTML = `
        <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-brand-border/40 ${bgColor} ${textColor}">
          ${getLucideIconHtml(iconName)}
        </div>
        <div class="min-w-0">
          <p class="text-[11px] font-bold text-brand-navy truncate">${escapeHtml(description)}</p>
          <p class="mt-0.5 text-xs font-extrabold tabular-nums truncate ${amountColor}">${amountPrefix}${escapeHtml(formatIDR(pattern.amount))}</p>
        </div>
      `;
      button.addEventListener('click', () => {
        void handleQuickAdd(button, pattern, description);
      });

      quickList.appendChild(button);
    }
  }

  function renderRecentTransactions() {
    const recent = [...transactions]
      .sort((a, b) =>
        a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)
      )
      .slice(0, 5);

    if (recent.length === 0) {
      recentList.innerHTML = emptyStateHtml({
        iconHtml: getLucideIconHtml('Receipt'),
        title: 'Belum ada transaksi',
        description: 'Mulai catat pemasukan atau pengeluaran pertamamu.',
        actionHtml: `
          <a
            href="/transactions"
            class="inline-flex items-center gap-1.5 rounded-xl bg-accent-yellow px-4 py-2 text-[11px] font-bold text-brand-navy shadow-xs transition hover:bg-accent-yellow-hover active:scale-95"
          >
            Catat transaksi pertama <span aria-hidden="true">→</span>
          </a>
        `,
      });
      return;
    }

    recentList.innerHTML = recent
      .map((tx) => {
        const category = categoriesById.get(tx.categoryId);
        const account = accountsById.get(tx.accountId);
        const toAccount = tx.toAccountId ? accountsById.get(tx.toAccountId) : null;

        const iconName =
          category?.icon || (tx.type === 'transfer' ? 'ArrowLeftRight' : 'Wallet');
        const colorClass = category?.color || 'text-brand-navy bg-amber-50';
        const [textColor, bgColor] = colorClass.split(' ');

        const categoryName =
          category?.name || (tx.type === 'transfer' ? 'Transfer' : 'Tanpa Kategori');

        const subText =
          tx.type === 'transfer'
            ? `${categoryName} • ${account?.name || 'Akun'} → ${toAccount?.name || 'Akun'}`
            : `${categoryName} • ${account?.name || 'Akun'}`;

        const headline =
          tx.note && tx.note.trim() !== '' ? tx.note : categoryName;

        let amountColor = 'text-brand-navy';
        let amountPrefix = '';
        if (tx.type === 'income') {
          amountColor = 'text-finance-green';
          amountPrefix = '+ ';
        } else if (tx.type === 'expense') {
          amountColor = 'text-finance-red';
          amountPrefix = '- ';
        }

        return `
          <a href="/transactions?id=${tx.id}" class="flex justify-between items-center p-3.5 border border-brand-border/60 rounded-2xl bg-white hover:border-accent-yellow hover:shadow-xs transition">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-11 h-11 rounded-full flex items-center justify-center shrink-0 border border-brand-border/40 ${bgColor || 'bg-amber-50'} ${textColor || 'text-brand-navy'}">
                ${getLucideIconHtml(iconName)}
              </div>
              <div class="min-w-0">
                <p class="font-bold text-brand-navy text-sm truncate">${escapeHtml(headline)}</p>
                <p class="text-[11px] text-text-secondary mt-0.5 truncate">${escapeHtml(subText)}</p>
              </div>
            </div>
            <div class="text-right shrink-0 pl-2">
              <p class="text-sm font-extrabold ${amountColor}">${amountPrefix}${escapeHtml(formatIDR(tx.amount))}</p>
            </div>
          </a>
        `;
      })
      .join('');
  }

  function renderSummary() {
    const now = new Date();
    const monthKey = toLocalDateKey(now).slice(0, 7);

    const initialBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
    const totalIncome = transactions
      .filter((tx) => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const totalExpense = transactions
      .filter((tx) => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const totalBalance = initialBalance + totalIncome - totalExpense;

    const monthlyTransactions = transactions.filter((tx) => tx.date.startsWith(monthKey));
    const monthIncome = monthlyTransactions
      .filter((tx) => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const monthExpense = monthlyTransactions
      .filter((tx) => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const netCashflow = monthIncome - monthExpense;

    renderGreeting(now);

    setAmount(totalBalanceEl, totalBalance);
    setAmount(monthIncomeEl, monthIncome);
    setAmount(monthExpenseEl, monthExpense);
    setAmount(cashflowAmountEl, netCashflow);

    cashflowPill.classList.toggle('text-finance-green', netCashflow >= 0);
    cashflowPill.classList.toggle('text-finance-red', netCashflow < 0);
    cashflowUpIcon.classList.toggle('hidden', netCashflow < 0);
    cashflowDownIcon.classList.toggle('hidden', netCashflow >= 0);
  }

  async function loadDashboard() {
    const [nextAccounts, nextCategories, nextTransactions] = await Promise.all([
      getAllAccounts(),
      getAllCategories(),
      getAllTransactions(),
    ]);

    accounts = nextAccounts;
    categories = nextCategories;
    transactions = nextTransactions;
    accountsById = new Map(accounts.map((account) => [account.id, account]));
    categoriesById = new Map(categories.map((category) => [category.id, category]));

    renderSummary();
    renderQuickActions();
    renderRecentTransactions();
  }

  toggleAmountsBtn.addEventListener('click', () => {
    amountsHidden = !amountsHidden;
    applyAmountVisibility();
  });

  detailToggle.addEventListener('click', () => {
    const expanded = detailToggle.getAttribute('aria-expanded') === 'true';
    const nextExpanded = !expanded;

    detailToggle.setAttribute('aria-expanded', String(nextExpanded));
    heroDetail.classList.toggle('hidden', !nextExpanded);
    detailToggleLabel.textContent = nextExpanded ? 'Tutup Detail' : 'Buka Detail';
    detailChevron.classList.toggle('rotate-180', nextExpanded);
  });

  refreshBtn.addEventListener('click', async () => {
    if (refreshBtn.disabled) return;

    refreshBtn.disabled = true;
    refreshIcon.classList.add('animate-spin');

    try {
      await loadDashboard();
    } finally {
      refreshIcon.classList.remove('animate-spin');
      refreshBtn.disabled = false;
    }
  });

  quickUndoBtn.addEventListener('click', async () => {
    if (!lastCreatedId) return;

    const idToUndo = lastCreatedId;
    lastCreatedId = null;

    if (statusTimer !== null) {
      window.clearTimeout(statusTimer);
      statusTimer = null;
    }
    quickStatus.className = 'hidden';
    quickUndoBtn.classList.add('hidden');

    try {
      await deleteTransaction(idToUndo);
      await loadDashboard();
      toast.info('Transaksi dibatalkan.');
    } catch {
      showQuickStatus(false, 'Gagal mengurungkan transaksi.');
    }
  });

  highlightCurrentDay();
  loadDashboard();
}
