import { getAllAccounts } from '../lib/db/accounts';
import { getAllCategories } from '../lib/db/categories';
import { addTransaction, deleteTransaction, getAllTransactions } from '../lib/db/transactions';
import type { Account, Category, Transaction, TransactionType } from '../types/finance';
import { emptyStateHtml } from '../lib/ui/empty-state';
import { toast } from '../lib/ui/toast';
import { confirmAction } from '../lib/ui/confirm';
import { closeDialog, initDialog, openDialog } from '../lib/ui/dialog';
import { getProfileName } from '../lib/ui/profile';
import {
  bindCurrencyInput,
  parseNumberInput,
} from '../lib/ui/currency-input';
import {
  addQuickShortcut,
  FALLBACK_QUICK_LIMIT,
  getSavedQuickShortcuts,
  MAX_QUICK_SHORTCUTS,
  moveQuickShortcut,
  removeQuickShortcut,
  type SavedQuickShortcut,
} from '../lib/ui/quick-shortcuts';
import {
  buildQuickPatterns,
  getQuickDescription,
  getQuickPalette,
  type QuickPattern,
} from '../lib/ui/quick-patterns';
import {
  formatRupiah,
  getAmountsHidden,
  setAmountsHidden,
} from '../lib/ui/amount-visibility';

interface QuickItem {
  id: string;
  name: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  accountId: string;
  toAccountId?: string;
  note: string;
  isAuto: boolean;
}

export function initDashboardPage(): void {
  const greetingEl = document.getElementById('dash-greeting')!;
  const dateEl = document.getElementById('dash-date')!;
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
  const weeklyExpenseEl = document.getElementById('weekly-expense-total')!;
  const weeklyChartCard = document.getElementById('weekly-chart-card')!;
  const weeklyTooltip = document.getElementById('weekly-tooltip')!;
  const quickList = document.getElementById('quick-list')!;
  const quickStatus = document.getElementById('quick-status')!;
  const quickStatusText = document.getElementById('quick-status-text')!;
  const quickUndoBtn = document.getElementById('quick-undo') as HTMLButtonElement;
  const recentList = document.getElementById('dash-recent-list')!;

  const customDialog = document.getElementById('quick-custom-dialog') as HTMLDialogElement;
  const customForm = document.getElementById('quick-custom-form') as HTMLFormElement;
  const customCloseBtn = document.getElementById('quick-custom-close') as HTMLButtonElement;
  const customSubmitBtn = document.getElementById('quick-custom-submit') as HTMLButtonElement;
  const openCustomBtn = document.getElementById('open-custom-quick') as HTMLButtonElement;
  const manageOpenBtn = document.getElementById('quick-manage-open') as HTMLButtonElement;
  const nameInput = document.getElementById('quick-name') as HTMLInputElement;
  const typeSelect = document.getElementById('quick-type') as HTMLSelectElement;
  const amountInput = document.getElementById('quick-amount') as HTMLInputElement;
  const categorySelect = document.getElementById('quick-category') as HTMLSelectElement;
  const accountSelect = document.getElementById('quick-account') as HTMLSelectElement;

  const manageDialog = document.getElementById('quick-manage-dialog') as HTMLDialogElement;
  const manageList = document.getElementById('quick-manage-list')!;
  const manageCloseBtn = document.getElementById('quick-manage-close') as HTMLButtonElement;
  const manageAddBtn = document.getElementById('quick-manage-add') as HTMLButtonElement;

  const menuScroll = document.getElementById('quick-menu-scroll')!;
  const menuSortDialog = document.getElementById('menu-sort-dialog') as HTMLDialogElement;
  const menuSortList = document.getElementById('menu-sort-list')!;
  const openMenuSortBtn = document.getElementById('open-menu-sort') as HTMLButtonElement;
  const closeMenuSortBtn = document.getElementById('close-menu-sort') as HTMLButtonElement;
  const saveMenuSortBtn = document.getElementById('save-menu-sort') as HTMLButtonElement;

  let accounts: Account[] = [];
  let categories: Category[] = [];
  let transactions: Transaction[] = [];
  let accountsById = new Map<string, Account>();
  let categoriesById = new Map<string, Category>();
  let lastCreatedId: string | null = null;
  let statusTimer: number | null = null;
  let menuWorkingOrder: string[] = [];

  bindCurrencyInput(amountInput);

  const MENU_ORDER_KEY = 'pf:dashboard-menu-order';

  function readMenuOrder(): string[] {
    try {
      const raw = localStorage.getItem(MENU_ORDER_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === 'string')
        : [];
    } catch {
      return [];
    }
  }

  function writeMenuOrder(order: string[]): void {
    try {
      localStorage.setItem(MENU_ORDER_KEY, JSON.stringify(order));
    } catch {
      // localStorage bisa diblokir; abaikan.
    }
  }

  function getMenuLinks(): HTMLElement[] {
    return Array.from(menuScroll.querySelectorAll<HTMLElement>('[data-menu-id]'));
  }

  function applyMenuOrder(order: string[]): void {
    const links = getMenuLinks();
    const byId = new Map(
      links.map((link) => [link.dataset.menuId || '', link] as const)
    );

    order.forEach((id) => {
      const link = byId.get(id);
      if (!link) return;
      menuScroll.appendChild(link);
      byId.delete(id);
    });

    byId.forEach((link) => menuScroll.appendChild(link));
  }

  function renderMenuSortList(): void {
    const links = getMenuLinks();
    const byId = new Map(
      links.map((link) => [link.dataset.menuId || '', link] as const)
    );

    menuSortList.innerHTML = menuWorkingOrder
      .map((id, index) => {
        const link = byId.get(id);
        if (!link) return '';

        const label = link.dataset.menuLabel || id;
        const iconHtml = link.querySelector('.menu-icon')?.outerHTML ?? '';

        return `
          <div class="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3.5" data-sort-id="${escapeHtml(id)}">
            <div class="flex min-w-0 items-center gap-3">
              ${iconHtml}
              <span class="min-w-0 truncate text-xs font-bold text-foreground">${escapeHtml(label)}</span>
            </div>
            <div class="flex shrink-0 flex-col gap-1">
              <button
                type="button"
                class="menu-sort-move flex h-6 w-6 items-center justify-center rounded-lg border border-border bg-background text-primary transition hover:border-blue-main disabled:pointer-events-none disabled:opacity-20"
                data-direction="up"
                data-id="${escapeHtml(id)}"
                aria-label="Naikkan ${escapeHtml(label)}"
                ${index === 0 ? 'disabled' : ''}
              >
                ${getLucideIconHtml('ChevronUp')}
              </button>
              <button
                type="button"
                class="menu-sort-move flex h-6 w-6 items-center justify-center rounded-lg border border-border bg-background text-primary transition hover:border-blue-main disabled:pointer-events-none disabled:opacity-20"
                data-direction="down"
                data-id="${escapeHtml(id)}"
                aria-label="Turunkan ${escapeHtml(label)}"
                ${index === menuWorkingOrder.length - 1 ? 'disabled' : ''}
              >
                ${getLucideIconHtml('ChevronDown')}
              </button>
            </div>
          </div>
        `;
      })
      .join('');
  }

  function openMenuSort(): void {
    menuWorkingOrder = getMenuLinks()
      .map((link) => link.dataset.menuId || '')
      .filter(Boolean);
    renderMenuSortList();
    openDialog(menuSortDialog, '#close-menu-sort');
  }

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
    el.textContent = formatRupiah(value);
  }

  function applyAmountVisibility() {
    document.querySelectorAll<HTMLElement>('[data-amount]').forEach((el) => {
      const value = Number(el.dataset.amount || '0');
      const prefix = el.dataset.amountPrefix ?? '';
      el.textContent = formatRupiah(value, { prefix });
    });

    const hidden = getAmountsHidden();
    eyeOpenIcon.classList.toggle('hidden', hidden);
    eyeClosedIcon.classList.toggle('hidden', !hidden);
    toggleAmountsBtn.setAttribute(
      'aria-label',
      hidden ? 'Tampilkan nominal' : 'Sembunyikan nominal'
    );
    toggleAmountsBtn.setAttribute(
      'title',
      hidden ? 'Tampilkan nominal' : 'Sembunyikan nominal'
    );
  }

  function renderGreeting(now: Date) {
    const hour = now.getHours();
    const prefix =
      hour < 11 ? 'Pagi' : hour < 15 ? 'Siang' : hour < 19 ? 'Sore' : 'Malam';
    greetingEl.textContent = `${prefix}, ${getProfileName()}`;

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

  function hideWeeklyTooltip(): void {
    weeklyTooltip.classList.add('hidden');
    weeklyTooltip.textContent = '';
    delete weeklyTooltip.dataset.bar;
  }

  function showWeeklyTooltip(bar: HTMLElement): void {
    const dateKey = bar.dataset.date || '';
    const amount = Number(bar.dataset.amount || '0');
    const date = dateKey ? new Date(`${dateKey}T00:00:00`) : new Date();
    const dateLabel = new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);

    weeklyTooltip.innerHTML = `
      <p class="text-[9px] font-semibold text-white/70">${escapeHtml(dateLabel)}</p>
      <p class="mt-0.5 text-[11px] font-extrabold ${amount > 0 ? 'text-blue-200' : 'text-white/80'}">
        ${amount > 0 ? escapeHtml(formatRupiah(amount)) : 'Tidak ada pengeluaran'}
      </p>
    `;
    weeklyTooltip.classList.remove('hidden');

    const cardRect = weeklyChartCard.getBoundingClientRect();
    const barRect = bar.getBoundingClientRect();
    const width = weeklyTooltip.offsetWidth;
    const height = weeklyTooltip.offsetHeight;
    let left = barRect.left - cardRect.left + barRect.width / 2;
    left = Math.max(width / 2 + 8, Math.min(cardRect.width - width / 2 - 8, left));
    const top = Math.max(8, barRect.top - cardRect.top - height - 8);

    weeklyTooltip.style.left = `${left}px`;
    weeklyTooltip.style.top = `${top}px`;
  }

  document.addEventListener('click', (event) => {
    if (!(event.target as HTMLElement).closest('.week-bar')) {
      hideWeeklyTooltip();
    }
  });

  window.addEventListener('resize', hideWeeklyTooltip);

  function renderWeeklyChart() {
    hideWeeklyTooltip();

    const dayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    const now = new Date();
    const todayIndex = (now.getDay() + 6) % 7;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - todayIndex);

    const dailyExpense = dayNames.map((_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      const dateKey = toLocalDateKey(date);
      return transactions
        .filter((tx) => tx.type === 'expense' && tx.date === dateKey)
        .reduce((sum, tx) => sum + tx.amount, 0);
    });

    const maxExpense = Math.max(1, ...dailyExpense);
    const bars = Array.from(document.querySelectorAll<HTMLElement>('.week-bar'));
    const labels = Array.from(document.querySelectorAll<HTMLElement>('.week-label'));

    bars.forEach((bar, index) => {
      const value = dailyExpense[index] ?? 0;
      const height = Math.max(4, Math.round((value / maxExpense) * 96));
      const barDate = new Date(monday);
      barDate.setDate(monday.getDate() + index);

      bar.style.height = `${height}px`;
      bar.title = `${dayNames[index]}: ${formatRupiah(value)}`;
      bar.dataset.date = toLocalDateKey(barDate);
      bar.dataset.amount = String(value);
      bar.setAttribute('role', 'button');
      bar.setAttribute('tabindex', '0');
      bar.setAttribute('aria-label', `${dayNames[index]}: ${formatRupiah(value)}`);
      bar.classList.add('cursor-pointer');

      bar.onclick = (event) => {
        event.stopPropagation();
        if (
          weeklyTooltip.dataset.bar === String(index) &&
          !weeklyTooltip.classList.contains('hidden')
        ) {
          hideWeeklyTooltip();
          return;
        }

        weeklyTooltip.dataset.bar = String(index);
        showWeeklyTooltip(bar);
      };

      bar.onkeydown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          bar.click();
        }
      };

      bar.classList.remove('bg-primary', 'bg-blue-main', 'bg-blue-soft');
      if (index === todayIndex) {
        bar.classList.add('bg-blue-main');
      } else if (value === maxExpense && value > 0) {
        bar.classList.add('bg-primary');
      } else {
        bar.classList.add('bg-blue-soft');
      }
    });

    labels.forEach((label, index) => {
      label.textContent = dayNames[index];
      label.classList.remove('text-primary', 'text-blue-main', 'text-muted-foreground');
      if (index === todayIndex) {
        label.classList.add('text-blue-main');
      } else if ((dailyExpense[index] ?? 0) === maxExpense && (dailyExpense[index] ?? 0) > 0) {
        label.classList.add('text-primary');
      } else {
        label.classList.add('text-muted-foreground');
      }
    });
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

  function validSavedShortcuts(): SavedQuickShortcut[] {
    return getSavedQuickShortcuts().filter((item) => {
      const account = accountsById.get(item.accountId);
      const category = categoriesById.get(item.categoryId);
      return (
        Boolean(account) &&
        Boolean(category) &&
        (item.type === 'expense' || item.type === 'income') &&
        category?.type === item.type
      );
    });
  }

  function getQuickItems(): QuickItem[] {
    const saved = validSavedShortcuts();
    if (saved.length > 0) {
      return saved.map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        amount: item.amount,
        categoryId: item.categoryId,
        accountId: item.accountId,
        note: item.name,
        isAuto: false,
      }));
    }

    return buildQuickPatterns(transactions, accounts, categories)
      .slice(0, FALLBACK_QUICK_LIMIT)
      .map((pattern: QuickPattern) => ({
        id: `auto-${pattern.type}-${pattern.accountId}-${pattern.categoryId}-${pattern.amount}`,
        name: getQuickDescription(pattern, accountsById, categoriesById),
        type: pattern.type,
        amount: pattern.amount,
        categoryId: pattern.categoryId,
        accountId: pattern.accountId,
        toAccountId: pattern.toAccountId,
        note: pattern.note,
        isAuto: true,
      }));
  }

  async function handleQuickAdd(
    btn: HTMLButtonElement,
    item: QuickItem,
    description: string
  ) {
    if (btn.dataset.busy === '1') return;
    btn.dataset.busy = '1';
    btn.setAttribute('aria-busy', 'true');
    btn.classList.add('opacity-60', 'pointer-events-none');

    const payload: Omit<Transaction, 'id' | 'createdAt'> = {
      amount: item.amount,
      type: item.type,
      accountId: item.accountId,
      categoryId: item.categoryId,
      date: toLocalDateKey(),
      note: item.note.trim() || item.name || undefined,
      ...(item.toAccountId ? { toAccountId: item.toAccountId } : {}),
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
    const items = getQuickItems();
    quickList.innerHTML = '';

    if (items.length === 0) {
      quickList.innerHTML = `
        <p class="px-1 py-2 text-[11px] font-medium text-muted-foreground">
          Belum ada shortcut. Tap <button type="button" data-open-custom class="font-bold text-blue-main underline underline-offset-2">Custom</button> untuk membuat yang pertama.
        </p>
      `;
      quickList.querySelector('[data-open-custom]')?.addEventListener('click', openCustomForm);
      return;
    }

    for (const item of items) {
      const category = categoriesById.get(item.categoryId);
      const palette = category
        ? getQuickPalette(
            {
              type: item.type,
              accountId: item.accountId,
              categoryId: item.categoryId,
              amount: item.amount,
              note: item.note,
              count: 1,
              lastDate: '',
              lastCreatedAt: 0,
            },
            categoriesById
          )
        : { textColor: 'text-blue-main', bgColor: 'bg-blue-soft', iconName: 'Zap' };

      const iconName = category?.icon || palette.iconName || 'Zap';
      const amountPrefix =
        item.type === 'income' ? '+ ' : item.type === 'expense' ? '- ' : '';
      const amountColor =
        item.type === 'income'
          ? 'text-emerald-600'
          : item.type === 'expense'
            ? 'text-blue-main'
            : 'text-primary';

      const button = document.createElement('button');
      button.type = 'button';
      button.className =
        'group flex shrink-0 items-center gap-2.5 rounded-2xl border border-border bg-card/90 px-3.5 py-2.5 text-left shadow-xs transition-all hover:border-blue-main hover:bg-blue-soft active:scale-95';
      button.setAttribute(
        'aria-label',
        `Catat cepat ${item.name}, ${formatRupiah(item.amount)}`
      );
      button.innerHTML = `
        <div class="flex h-6.5 w-6.5 items-center justify-center rounded-xl bg-blue-soft text-blue-main transition-colors group-hover:bg-blue-main group-hover:text-white">
          ${getLucideIconHtml(iconName)}
        </div>
        <div class="flex min-w-0 flex-col">
          <span class="max-w-[150px] truncate text-[11px] font-bold text-foreground">${escapeHtml(item.name)}</span>
          <span
            class="text-[10px] font-extrabold tabular-nums ${amountColor}"
            data-amount="${item.amount}"
            data-amount-prefix="${amountPrefix}"
          >${escapeHtml(formatRupiah(item.amount, { prefix: amountPrefix }))}</span>
        </div>
      `;
      button.addEventListener('click', () => {
        void handleQuickAdd(button, item, item.name);
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
            class="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-[11px] font-bold text-white shadow-xs transition hover:opacity-90 active:scale-95"
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
        const colorClass = category?.color || 'text-blue-700 bg-blue-50';
        const [textColor, bgColor] = colorClass.split(' ');

        const categoryName =
          category?.name || (tx.type === 'transfer' ? 'Transfer' : 'Tanpa Kategori');

        const subText =
          tx.type === 'transfer'
            ? `${categoryName} • ${account?.name || 'Akun'} → ${toAccount?.name || 'Akun'}`
            : `${categoryName} • ${account?.name || 'Akun'}`;

        const headline =
          tx.note && tx.note.trim() !== '' ? tx.note : categoryName;

        let amountColor = 'text-foreground';
        let amountPrefix = '';
        if (tx.type === 'income') {
          amountColor = 'text-emerald-600';
          amountPrefix = '+ ';
        } else if (tx.type === 'expense') {
          amountColor = 'text-foreground';
          amountPrefix = '- ';
        } else {
          amountColor = 'text-blue-main';
        }

        return `
          <a href="/transactions?id=${tx.id}" class="flex items-center justify-between p-4 transition-colors hover:bg-muted/50">
            <div class="flex min-w-0 items-center gap-3.5">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${bgColor || 'bg-blue-50'} ${textColor || 'text-primary'}">
                ${getLucideIconHtml(iconName)}
              </div>
              <div class="flex min-w-0 flex-col">
                <span class="truncate text-xs font-bold text-foreground">${escapeHtml(headline)}</span>
                <span class="truncate text-[10px] font-medium text-muted-foreground">${escapeHtml(subText)}</span>
              </div>
            </div>
            <div class="flex shrink-0 items-center gap-1 pl-2">
              <span
                class="text-xs font-extrabold tabular-nums ${amountColor}"
                data-amount="${tx.amount}"
                data-amount-prefix="${amountPrefix}"
              >${escapeHtml(formatRupiah(tx.amount, { prefix: amountPrefix }))}</span>
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
    setAmount(weeklyExpenseEl, monthExpense);
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
    renderWeeklyChart();
    if (manageDialog.open) renderManageList();
  }

  // ------------------------------------------------------------------
  // Modal Custom Catat Cepat
  // ------------------------------------------------------------------

  function populateCategoryOptions(): void {
    const type = typeSelect.value === 'income' ? 'income' : 'expense';
    const options = categories
      .filter(
        (category) =>
          category.type === type && category.name.toLowerCase() !== 'koreksi saldo'
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'id'));

    categorySelect.innerHTML = '<option value="">Pilih Kategori</option>';
    for (const category of options) {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      categorySelect.appendChild(option);
    }
  }

  function populateAccountOptions(): void {
    accountSelect.innerHTML = '<option value="">Pilih Akun</option>';
    for (const account of accounts) {
      const option = document.createElement('option');
      option.value = account.id;
      option.textContent = account.name;
      accountSelect.appendChild(option);
    }
  }

  function resetCustomForm(): void {
    customForm.reset();
    typeSelect.value = 'expense';
    populateCategoryOptions();
    populateAccountOptions();
  }

  function openCustomForm(): void {
    if (accounts.length === 0 || categories.length === 0) {
      toast.info('Tambahkan akun dan kategori dulu sebelum membuat shortcut.');
      return;
    }

    if (manageDialog.open) closeDialog(manageDialog);
    if (customDialog.open) return;

    resetCustomForm();
    openDialog(customDialog, '#quick-name');
  }

  function renderManageList(): void {
    const saved = getSavedQuickShortcuts();

    if (saved.length === 0) {
      const autoCount = getQuickItems().filter((item) => item.isAuto).length;
      manageList.innerHTML = `
        <div class="rounded-2xl border border-dashed border-border bg-background/60 p-4 text-center">
          <p class="text-xs font-bold text-primary">Belum ada shortcut custom</p>
          <p class="mt-1 text-[10px] font-medium text-muted-foreground">
            ${
              autoCount > 0
                ? `Sementara ini Dashboard memakai ${autoCount} pola otomatis dari riwayat.`
                : 'Buat shortcut pertamamu lewat tombol di bawah.'
            }
          </p>
        </div>
      `;
      return;
    }

    manageList.innerHTML = saved
      .map(
        (item, index) => `
          <div class="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background p-3.5">
            <div class="flex min-w-0 flex-col">
              <span class="truncate text-xs font-bold text-foreground">${escapeHtml(item.name)}</span>
              <div class="mt-0.5 flex items-center gap-2">
                <span class="rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                  item.type === 'income'
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : 'bg-blue-soft text-blue-main'
                }">
                  ${item.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                </span>
                <span
                  class="text-[10px] font-bold text-foreground/80 tabular-nums"
                  data-amount="${item.amount}"
                  data-amount-prefix=""
                >${escapeHtml(formatRupiah(item.amount))}</span>
              </div>
            </div>
            <div class="flex shrink-0 items-center gap-1.5">
              <div class="flex flex-col gap-0.5">
                <button
                  type="button"
                  data-move-quick="${escapeHtml(item.id)}"
                  data-direction="up"
                  class="flex h-6 w-6 items-center justify-center rounded-lg border border-border bg-card text-primary transition hover:border-blue-main disabled:pointer-events-none disabled:opacity-20"
                  aria-label="Naikkan shortcut ${escapeHtml(item.name)}"
                  ${index === 0 ? 'disabled' : ''}
                >
                  ${getLucideIconHtml('ChevronUp')}
                </button>
                <button
                  type="button"
                  data-move-quick="${escapeHtml(item.id)}"
                  data-direction="down"
                  class="flex h-6 w-6 items-center justify-center rounded-lg border border-border bg-card text-primary transition hover:border-blue-main disabled:pointer-events-none disabled:opacity-20"
                  aria-label="Turunkan shortcut ${escapeHtml(item.name)}"
                  ${index === saved.length - 1 ? 'disabled' : ''}
                >
                  ${getLucideIconHtml('ChevronDown')}
                </button>
              </div>
              <button
                type="button"
                data-remove-quick="${escapeHtml(item.id)}"
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 transition-colors hover:bg-rose-500 hover:text-white"
                aria-label="Hapus shortcut ${escapeHtml(item.name)}"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
          </div>
        `
      )
      .join('');
  }

  function openManageDialog(): void {
    renderManageList();
    if (manageDialog.open) return;
    openDialog(manageDialog, '#quick-manage-close');
  }

  initDialog(customDialog);
  initDialog(manageDialog);
  initDialog(menuSortDialog);

  openMenuSortBtn.addEventListener('click', openMenuSort);
  closeMenuSortBtn.addEventListener('click', () => closeDialog(menuSortDialog));

  menuSortList.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.menu-sort-move');
    if (!button) return;

    const id = button.dataset.id || '';
    const direction = button.dataset.direction === 'up' ? -1 : 1;
    const index = menuWorkingOrder.indexOf(id);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= menuWorkingOrder.length) return;

    [menuWorkingOrder[index], menuWorkingOrder[target]] = [
      menuWorkingOrder[target],
      menuWorkingOrder[index],
    ];
    renderMenuSortList();
  });

  saveMenuSortBtn.addEventListener('click', () => {
    applyMenuOrder(menuWorkingOrder);
    writeMenuOrder(menuWorkingOrder);
    closeDialog(menuSortDialog);
    toast.success('Urutan menu disimpan.');
  });

  openCustomBtn.addEventListener('click', openCustomForm);
  customCloseBtn.addEventListener('click', () => closeDialog(customDialog));
  typeSelect.addEventListener('change', populateCategoryOptions);
  manageOpenBtn.addEventListener('click', openManageDialog);
  manageCloseBtn.addEventListener('click', () => closeDialog(manageDialog));
  manageAddBtn.addEventListener('click', () => {
    closeDialog(manageDialog);
    openCustomForm();
  });

  manageList.addEventListener('click', (event) => {
    const moveTarget = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-move-quick]'
    );
    if (moveTarget) {
      const id = moveTarget.dataset.moveQuick;
      if (!id) return;
      moveQuickShortcut(id, moveTarget.dataset.direction === 'up' ? -1 : 1);
      renderManageList();
      void loadDashboard();
      return;
    }

    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-remove-quick]');
    if (!target) return;

    const id = target.dataset.removeQuick;
    if (!id) return;

    removeQuickShortcut(id);
    renderManageList();
    void loadDashboard();
    toast.info('Shortcut dihapus.');
  });

  customForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = nameInput.value.trim();
    const amount = parseNumberInput(amountInput.value);
    const type = typeSelect.value === 'income' ? 'income' : 'expense';
    const categoryId = categorySelect.value;
    const accountId = accountSelect.value;

    if (!name) {
      toast.error('Nama shortcut belum diisi.');
      nameInput.focus();
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Nominal harus lebih dari 0.');
      amountInput.focus();
      return;
    }
    if (!Number.isInteger(amount)) {
      toast.error('Nominal tidak boleh mengandung desimal.');
      amountInput.focus();
      return;
    }
    if (!categoryId) {
      toast.error('Pilih kategori dulu.');
      categorySelect.focus();
      return;
    }
    if (!accountId) {
      toast.error('Pilih akun dulu.');
      accountSelect.focus();
      return;
    }

    if (getSavedQuickShortcuts().length >= MAX_QUICK_SHORTCUTS) {
      const confirmed = await confirmAction({
        title: 'Slot Catat Cepat Penuh',
        message:
          'Maksimal 5 shortcut. Kalau disimpan, shortcut yang paling lama akan tergantikan.',
        confirmLabel: 'Ganti Shortcut',
        variant: 'danger',
      });
      if (!confirmed) return;
    }

    customSubmitBtn.disabled = true;
    customSubmitBtn.classList.add('opacity-60');

    try {
      const result = addQuickShortcut({
        name,
        type,
        amount,
        categoryId,
        accountId,
      });

      closeDialog(customDialog);
      await loadDashboard();

      if (result.replaced) {
        toast.info(`Shortcut "${result.replaced.name}" diganti oleh "${name}".`);
      } else {
        toast.success('Shortcut Catat Cepat disimpan.');
      }
    } catch {
      toast.error('Gagal menyimpan shortcut. Coba lagi.');
    } finally {
      customSubmitBtn.disabled = false;
      customSubmitBtn.classList.remove('opacity-60');
    }
  });

  // ------------------------------------------------------------------
  // Interaksi halaman
  // ------------------------------------------------------------------

  toggleAmountsBtn.addEventListener('click', () => {
    setAmountsHidden(!getAmountsHidden());
    applyAmountVisibility();
    renderWeeklyChart();
  });

  detailToggle.addEventListener('click', () => {
    const expanded = detailToggle.getAttribute('aria-expanded') === 'true';
    const nextExpanded = !expanded;

    detailToggle.setAttribute('aria-expanded', String(nextExpanded));
    heroDetail.classList.toggle('hidden', !nextExpanded);
    detailToggleLabel.textContent = nextExpanded ? 'Tutup Detail' : 'Lihat Detail';
    detailChevron.classList.toggle('rotate-180', nextExpanded);
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

  applyMenuOrder(readMenuOrder());
  applyAmountVisibility();
  void loadDashboard();
}
