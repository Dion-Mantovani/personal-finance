
import { getAllAccounts } from '../lib/db/accounts';
import { getAllCategories } from '../lib/db/categories';
import { getAllTransactions } from '../lib/db/transactions';
import type { Account, Category, Transaction, TransactionType } from '../types/finance';
import { closeDialog, initDialog, openDialog } from '../lib/ui/dialog';
import { toast } from '../lib/ui/toast';
import {
  clearAllErrors,
  clearOnInput,
  setFieldError,
} from '../lib/ui/validation';
import { emptyStateHtml } from '../lib/ui/empty-state';
import { escapeHtml } from '../lib/ui/html';
import {
  bindCurrencyInput,
  formatNumberInput,
  parseNumberInput,
} from '../lib/ui/currency-input';
import { formatRupiah as formatAmountDisplay } from '../lib/ui/amount-visibility';

interface HistoryFilters {
  search: string;
  accountId: string;
  categoryId: string;
  startDate: string;
  endDate: string;
  min: number | null;
  max: number | null;
}

export function initHistoryPage(): void {
  let currentDate = new Date();
  let selectedFilter: 'all' | TransactionType = 'all';
  let filters: HistoryFilters = {
    search: '',
    accountId: '',
    categoryId: '',
    startDate: '',
    endDate: '',
    min: null,
    max: null,
  };

  let latestAccounts: Account[] = [];
  let latestCategories: Category[] = [];

  let searchOpen = false;
  let summaryOpen = false;
  let searchTimer: number | null = null;
  let pickerYear = currentDate.getFullYear();

  const monthDisplay = document.getElementById('current-month-display')!;
  const monthPickerBtn = document.getElementById('month-picker-btn')!;
  const prevMonthBtn = document.getElementById('prev-month-btn')!;
  const nextMonthBtn = document.getElementById('next-month-btn')!;
  const groupedContainer = document.getElementById('tx-grouped-container')!;
  const historyContent = document.getElementById('history-content')!;
  const summarySection = document.getElementById('history-summary')!;
  const summaryIncome = document.getElementById('summary-income')!;
  const summaryExpense = document.getElementById('summary-expense')!;
  const summaryBalance = document.getElementById('summary-balance')!;
  const toggleSummaryBtn = document.getElementById('toggle-summary') as HTMLButtonElement;
  const summaryChevron = document.getElementById('summary-chevron')!;

  const monthPickerWrap = document.getElementById('month-picker-wrap')!;
  const rangePickerWrap = document.getElementById('range-picker-wrap')!;
  const rangePickerBtn = document.getElementById('range-picker-btn')!;
  const rangePickerLabel = document.getElementById('range-picker-label')!;
  const clearRangeBtn = document.getElementById('clear-range-btn')!;
  const searchWrap = document.getElementById('search-wrap')!;

  const searchBtn = document.getElementById('btn-search-trigger') as HTMLButtonElement;
  const filterBtn = document.getElementById('btn-filter-trigger') as HTMLButtonElement;
  const exportBtn = document.getElementById('btn-export-trigger') as HTMLButtonElement;
  const filterBadge = document.getElementById('filter-badge')!;
  const activeFilterRow = document.getElementById('active-filter-row')!;
  const activeFilterText = document.getElementById('active-filter-text')!;
  const resetActiveFiltersBtn = document.getElementById('reset-active-filters')!;

  const monthModal = document.getElementById('month-modal') as HTMLDialogElement;
  const closeMonthModalBtn = document.getElementById('close-month-modal')!;
  const pickerPrevYearBtn = document.getElementById('picker-prev-year')!;
  const pickerNextYearBtn = document.getElementById('picker-next-year')!;
  const pickerYearLabel = document.getElementById('picker-year-label')!;
  const monthGrid = document.getElementById('month-grid')!;
  const pickerCurrentMonthBtn = document.getElementById('picker-current-month')!;

  const filterModal = document.getElementById('filter-modal') as HTMLDialogElement;
  const exportModal = document.getElementById('export-modal') as HTMLDialogElement;

  const searchInput = document.getElementById('history-search') as HTMLInputElement;
  const searchClearBtn = document.getElementById('search-clear-btn') as HTMLButtonElement;

  const filterForm = document.getElementById('filter-form') as HTMLFormElement;
  const filterAccount = document.getElementById('filter-account') as HTMLInputElement;
  const filterCategory = document.getElementById('filter-category') as HTMLInputElement;
  const filterAccountPills = document.getElementById('filter-account-pills')!;
  const filterCategoryPills = document.getElementById('filter-category-pills')!;
  const filterStartDate = document.getElementById('filter-start-date') as HTMLInputElement;
  const filterEndDate = document.getElementById('filter-end-date') as HTMLInputElement;
  const filterMin = document.getElementById('filter-min') as HTMLInputElement;
  const filterMax = document.getElementById('filter-max') as HTMLInputElement;
  const filterResetBtn = document.getElementById('filter-reset')!;
  const closeFilterModalBtn = document.getElementById('close-filter-modal')!;

  bindCurrencyInput(filterMin);
  bindCurrencyInput(filterMax);

  const exportForm = document.getElementById('export-form') as HTMLFormElement;
  const exportInfo = document.getElementById('export-info')!;
  const exportMonthScopeLabel = document.getElementById('export-month-scope-label')!;
  const exportCancelBtn = document.getElementById('export-cancel')!;
  const closeExportModalBtn = document.getElementById('close-export-modal')!;

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
  ];

  function getMonthKey(date = currentDate): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  function toLocalDateKey(date = new Date()): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function updateMonthDisplay() {
    monthDisplay.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }

  function hasDateRange(): boolean {
    return Boolean(filters.startDate || filters.endDate);
  }

  function formatShortDate(dateStr: string): string {
    const date = parseLocalDate(dateStr);
    if (!date) return dateStr;
    return `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  }

  function formatRangeLabel(startDate: string, endDate: string): string {
    if (startDate && endDate) {
      const start = parseLocalDate(startDate);
      const end = parseLocalDate(endDate);
      if (!start || !end) return `${startDate} – ${endDate}`;

      if (start.getFullYear() === end.getFullYear()) {
        return `${start.getDate()} ${monthNames[start.getMonth()]} – ${end.getDate()} ${monthNames[end.getMonth()]} ${end.getFullYear()}`;
      }

      return `${formatShortDate(startDate)} – ${formatShortDate(endDate)}`;
    }

    if (startDate) return `Dari ${formatShortDate(startDate)}`;
    return `Sampai ${formatShortDate(endDate)}`;
  }

  function updatePickerVisibility(): void {
    const rangeActive = hasDateRange();

    monthPickerWrap.style.display = searchOpen || rangeActive ? 'none' : 'flex';
    rangePickerWrap.style.display = !searchOpen && rangeActive ? 'flex' : 'none';
    searchWrap.style.display = searchOpen ? 'flex' : 'none';

    rangePickerLabel.textContent = rangeActive
      ? formatRangeLabel(filters.startDate, filters.endDate)
      : '';

    searchBtn.setAttribute('aria-expanded', String(searchOpen));
    searchBtn.className = searchOpen
      ? 'flex h-9 w-9 items-center justify-center rounded-2xl border border-blue-main bg-blue-soft text-blue-main shadow-xs transition-all active:scale-95'
      : 'flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground shadow-xs transition-all hover:bg-muted active:scale-95';
  }

  function renderMonthGrid(): void {
    pickerYearLabel.textContent = String(pickerYear);

    monthGrid.innerHTML = monthNames
      .map((name, index) => {
        const selected =
          pickerYear === currentDate.getFullYear() &&
          index === currentDate.getMonth();

        return `
          <button
            type="button"
            data-month="${index}"
            class="rounded-xl border px-2 py-2.5 text-xs font-semibold transition ${
              selected
                ? 'border-primary bg-primary text-primary-foreground shadow-soft'
                : 'border-border bg-card text-foreground hover:border-blue-main hover:bg-blue-soft'
            }"
          >${name}</button>
        `;
      })
      .join('');
  }

  function openMonthPicker(): void {
    pickerYear = currentDate.getFullYear();
    renderMonthGrid();
    openDialog(monthModal, '#close-month-modal');
  }

  initDialog(monthModal);

  monthPickerBtn.addEventListener('click', openMonthPicker);
  closeMonthModalBtn.addEventListener('click', () => closeDialog(monthModal));

  pickerPrevYearBtn.addEventListener('click', () => {
    pickerYear -= 1;
    renderMonthGrid();
  });

  pickerNextYearBtn.addEventListener('click', () => {
    pickerYear += 1;
    renderMonthGrid();
  });

  pickerCurrentMonthBtn.addEventListener('click', () => {
    currentDate = new Date();
    currentDate.setDate(1);
    updateMonthDisplay();
    closeDialog(monthModal);
    renderHistory();
  });

  monthGrid.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-month]');
    if (!target) return;

    const monthIndex = Number(target.dataset.month);
    if (!Number.isInteger(monthIndex)) return;

    currentDate = new Date(pickerYear, monthIndex, 1);
    updateMonthDisplay();
    closeDialog(monthModal);
    renderHistory();
  });

  prevMonthBtn.addEventListener('click', () => {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    updateMonthDisplay();
    renderHistory();
  });

  nextMonthBtn.addEventListener('click', () => {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    updateMonthDisplay();
    renderHistory();
  });

  const tabBtns = document.querySelectorAll<HTMLElement>('.history-tab-btn');
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', (event) => {
      const target = event.currentTarget as HTMLElement;
      selectedFilter = target.getAttribute('data-filter') as 'all' | TransactionType;

      tabBtns.forEach((tabBtn) => {
        tabBtn.className = 'history-tab-btn flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-bold text-muted-foreground transition-all hover:bg-muted active:scale-95';
      });
      target.className = 'history-tab-btn flex shrink-0 items-center gap-1.5 rounded-full border border-primary bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-soft transition-all active:scale-95';

      renderHistory();
    });
  });

  function getLucideIconHtml(iconName: string) {
    const template = document.querySelector(`#icon-templates template[data-icon-name="${iconName}"]`) as HTMLTemplateElement;
    if (template) return template.innerHTML;
    const defaultTemplate = document.querySelector(`#icon-templates template[data-icon-name="ArrowLeftRight"]`) as HTMLTemplateElement;
    return defaultTemplate ? defaultTemplate.innerHTML : '';
  }

  function parseLocalDate(dateStr: string): Date | null {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return null;
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDateHeader(dateStr: string) {
    const date = parseLocalDate(dateStr);
    if (!date) return dateStr;

    const today = new Date();
    if (date.toDateString() === today.toDateString()) return 'Hari ini';

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Kemarin';

    return `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  }

  // ---------------------------------------------------------------
  // Filter indicators
  // ---------------------------------------------------------------

  function updateFilterIndicators(): void {
    const filterCount =
      (filters.accountId ? 1 : 0) +
      (filters.categoryId ? 1 : 0) +
      (hasDateRange() ? 1 : 0) +
      (filters.min !== null || filters.max !== null ? 1 : 0);

    filterBadge.textContent = String(filterCount);
    filterBadge.style.display = filterCount > 0 ? 'flex' : 'none';

    filterBtn.className = filterCount > 0
      ? 'relative flex h-9 w-9 items-center justify-center rounded-2xl border border-blue-main bg-blue-soft text-blue-main shadow-xs transition-all active:scale-95'
      : 'relative flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground shadow-xs transition-all hover:bg-muted active:scale-95';

    const parts: string[] = [];
    if (filters.search) parts.push(`"${filters.search}"`);

    if (filters.accountId) {
      const account = latestAccounts.find((acc) => acc.id === filters.accountId);
      if (account) parts.push(account.name);
    }

    if (filters.categoryId) {
      const category = latestCategories.find((cat) => cat.id === filters.categoryId);
      if (category) parts.push(category.name);
    }

    if (hasDateRange()) {
      parts.push(formatRangeLabel(filters.startDate, filters.endDate));
    }

    if (filters.min !== null || filters.max !== null) {
      const minLabel = filters.min !== null ? formatAmountDisplay(filters.min) : formatAmountDisplay(0);
      const maxLabel = filters.max !== null ? formatAmountDisplay(filters.max) : 'tanpa batas';
      parts.push(`${minLabel} – ${maxLabel}`);
    }

    activeFilterText.textContent = parts.length > 0 ? `Filter aktif: ${parts.join(' • ')}` : '';
    activeFilterRow.style.display = parts.length > 0 ? 'block' : 'none';

    // Margin konten: default mt-32, saat ada filter aktif jadi mt-40.
    const hasActiveFilters = parts.length > 0;
    historyContent.classList.toggle('mt-38', hasActiveFilters);
    historyContent.classList.toggle('mt-30', !hasActiveFilters);

    updatePickerVisibility();
  }

  function resetAllFilters(): void {
    filters = {
      search: '',
      accountId: '',
      categoryId: '',
      startDate: '',
      endDate: '',
      min: null,
      max: null,
    };
    searchInput.value = '';
    searchClearBtn.style.display = 'none';
    filterAccount.value = '';
    filterCategory.value = '';
    filterStartDate.value = '';
    filterEndDate.value = '';
    filterMin.value = '';
    filterMax.value = '';
    clearAllErrors(filterForm);
    renderHistory();
  }

  resetActiveFiltersBtn.addEventListener('click', resetAllFilters);

  // ---------------------------------------------------------------
  // Ringkasan pemasukan / pengeluaran / balance
  // ---------------------------------------------------------------

  function setSummaryOpen(open: boolean): void {
    summaryOpen = open;
    summarySection.classList.toggle('hidden', !open);
    toggleSummaryBtn.setAttribute('aria-expanded', String(open));
    toggleSummaryBtn.setAttribute(
      'aria-label',
      open ? 'Sembunyikan ringkasan transaksi' : 'Tampilkan ringkasan transaksi'
    );
    toggleSummaryBtn.setAttribute(
      'title',
      open ? 'Sembunyikan ringkasan' : 'Tampilkan ringkasan'
    );
    summaryChevron.classList.toggle('rotate-180', open);
  }

  toggleSummaryBtn.addEventListener('click', () => {
    setSummaryOpen(!summaryOpen);
  });

  function renderSummary(transactions: Transaction[]): void {
    const totalIncome = transactions
      .filter((tx) => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const totalExpense = transactions
      .filter((tx) => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const balance = totalIncome - totalExpense;

    summaryIncome.textContent = formatAmountDisplay(totalIncome);
    summaryExpense.textContent = formatAmountDisplay(totalExpense);
    summaryBalance.textContent = formatAmountDisplay(balance, { signed: true });

    summaryBalance.classList.toggle('text-blue-200', balance >= 0);
    summaryBalance.classList.toggle('text-rose-300', balance < 0);
  }

  // ---------------------------------------------------------------
  // Search realtime (debounce 300ms, menggantikan month picker)
  // ---------------------------------------------------------------

  function applySearch(): void {
    if (searchTimer !== null) {
      window.clearTimeout(searchTimer);
      searchTimer = null;
    }

    filters.search = searchInput.value.trim();
    searchClearBtn.style.display = filters.search ? 'flex' : 'none';
    renderHistory();
  }

  function openSearch(): void {
    searchOpen = true;
    updatePickerVisibility();
    window.setTimeout(() => searchInput.focus({ preventScroll: true }), 40);
  }

  function closeSearch(): void {
    searchOpen = false;

    if (searchTimer !== null) {
      window.clearTimeout(searchTimer);
      searchTimer = null;
    }

    searchInput.value = '';
    searchClearBtn.style.display = 'none';
    filters.search = '';
    updatePickerVisibility();
    renderHistory();
  }

  searchBtn.addEventListener('click', () => {
    if (searchOpen) closeSearch();
    else openSearch();
  });

  searchInput.addEventListener('input', () => {
    searchClearBtn.style.display = searchInput.value ? 'flex' : 'none';

    if (searchTimer !== null) window.clearTimeout(searchTimer);

    searchTimer = window.setTimeout(() => {
      searchTimer = null;
      filters.search = searchInput.value.trim();
      renderHistory();
    }, 300);
  });

  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeSearch();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      applySearch();
    }
  });

  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchClearBtn.style.display = 'none';
    applySearch();
    searchInput.focus();
  });

  // ---------------------------------------------------------------
  // Rentang tanggal cepat (chip)
  // ---------------------------------------------------------------

  rangePickerBtn.addEventListener('click', async () => {
    await populateFilterOptions();
    openDialog(filterModal, '#filter-account-pills .filter-pill');
  });

  clearRangeBtn.addEventListener('click', () => {
    filters.startDate = '';
    filters.endDate = '';
    filterStartDate.value = '';
    filterEndDate.value = '';
    renderHistory();
  });

  // ---------------------------------------------------------------
  // Filter
  // ---------------------------------------------------------------

  initDialog(filterModal, () => clearAllErrors(filterForm));

  function renderFilterPills(
    container: HTMLElement,
    items: Array<{ id: string; label: string }>,
    selectedId: string,
    onSelect: (id: string) => void
  ): void {
    container.innerHTML = items
      .map((item) => {
        const active = item.id === selectedId;
        return `
          <button
            type="button"
            data-value="${escapeHtml(item.id)}"
            class="filter-pill w-fit shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all active:scale-95 ${
              active
                ? 'border-blue-main bg-blue-main text-white shadow-xs'
                : 'border-border bg-card text-muted-foreground hover:bg-muted'
            }"
          >${escapeHtml(item.label)}</button>
        `;
      })
      .join('');

    container.querySelectorAll<HTMLButtonElement>('.filter-pill').forEach((button) => {
      button.addEventListener('click', () => {
        const value = button.dataset.value ?? '';
        container.querySelectorAll<HTMLButtonElement>('.filter-pill').forEach((item) => {
          const active = item === button;
          item.className = `filter-pill w-fit shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all active:scale-95 ${
            active
              ? 'border-blue-main bg-blue-main text-white shadow-xs'
              : 'border-border bg-card text-muted-foreground hover:bg-muted'
          }`;
        });
        onSelect(value);
      });
    });
  }

  async function populateFilterOptions(): Promise<void> {
    const [accounts, categories] = await Promise.all([
      getAllAccounts(),
      getAllCategories(),
    ]);

    latestAccounts = accounts;
    latestCategories = categories;

    const accountItems = [
      { id: '', label: 'Semua akun' },
      ...accounts.map((acc) => ({ id: acc.id, label: acc.name })),
    ];

    const categoryItems = [
      { id: '', label: 'Semua kategori' },
      ...categories
        .filter((cat) => cat.name.toLowerCase() !== 'koreksi saldo')
        .map((cat) => {
          const typeLabel =
            cat.type === 'income' ? 'Masuk' : cat.type === 'transfer' ? 'Transfer' : 'Keluar';
          return { id: cat.id, label: `${cat.name} (${typeLabel})` };
        }),
    ];

    filterAccount.value = filters.accountId;
    filterCategory.value = filters.categoryId;

    renderFilterPills(filterAccountPills, accountItems, filters.accountId, (id) => {
      filterAccount.value = id;
    });
    renderFilterPills(filterCategoryPills, categoryItems, filters.categoryId, (id) => {
      filterCategory.value = id;
    });

    filterStartDate.value = filters.startDate;
    filterEndDate.value = filters.endDate || toLocalDateKey();
    filterMin.value = filters.min !== null ? formatNumberInput(String(filters.min)) : '';
    filterMax.value = filters.max !== null ? formatNumberInput(String(filters.max)) : '';
  }

  filterBtn.addEventListener('click', async () => {
    await populateFilterOptions();
    openDialog(filterModal, '#filter-account-pills .filter-pill');
  });

  closeFilterModalBtn.addEventListener('click', () => closeDialog(filterModal));

  clearOnInput([filterMin, filterMax, filterStartDate, filterEndDate, filterAccount, filterCategory]);

  filterForm.addEventListener('submit', (event) => {
    event.preventDefault();
    clearAllErrors(filterForm);

    const startDate = filterStartDate.value;
    const endDate = filterEndDate.value;
    const minRaw = filterMin.value.trim();
    const maxRaw = filterMax.value.trim();
    const min = minRaw === '' ? null : parseNumberInput(minRaw);
    const max = maxRaw === '' ? null : parseNumberInput(maxRaw);

    let hasError = false;

    if (startDate && endDate && startDate > endDate) {
      setFieldError(filterEndDate, 'Tanggal akhir tidak boleh sebelum tanggal awal.');
      hasError = true;
    }

    if (min !== null && (!Number.isFinite(min) || min < 0)) {
      setFieldError(filterMin, 'Nominal minimum tidak valid.');
      hasError = true;
    }

    if (max !== null && (!Number.isFinite(max) || max < 0)) {
      setFieldError(filterMax, 'Nominal maksimum tidak valid.');
      hasError = true;
    }

    if (!hasError && min !== null && max !== null && min > max) {
      setFieldError(filterMax, 'Maksimum tidak boleh lebih kecil dari minimum.');
      hasError = true;
    }

    if (hasError) {
      toast.error('Periksa kembali filter yang ditandai.');
      return;
    }

    filters.accountId = filterAccount.value;
    filters.categoryId = filterCategory.value;
    filters.startDate = startDate;
    filters.endDate = endDate;
    filters.min = min;
    filters.max = max;

    closeDialog(filterModal);
    renderHistory();
  });

  filterResetBtn.addEventListener('click', () => {
    filters.accountId = '';
    filters.categoryId = '';
    filters.startDate = '';
    filters.endDate = '';
    filters.min = null;
    filters.max = null;
    filterAccount.value = '';
    filterCategory.value = '';
    filterStartDate.value = '';
    filterEndDate.value = '';
    filterMin.value = '';
    filterMax.value = '';
    clearAllErrors(filterForm);
    closeDialog(filterModal);
    renderHistory();
  });

  // ---------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------

  initDialog(exportModal);

  async function updateExportInfo(): Promise<void> {
    const transactions = await getAllTransactions();
    const monthKey = getMonthKey();
    const rangeActive = hasDateRange();

    const visibleCount = rangeActive
      ? transactions.filter(
          (tx) =>
            (!filters.startDate || tx.date >= filters.startDate) &&
            (!filters.endDate || tx.date <= filters.endDate)
        ).length
      : transactions.filter((tx) => tx.date.startsWith(monthKey)).length;

    const label = rangeActive ? 'Rentang aktif' : monthDisplay.textContent;
    exportInfo.textContent = `${label}: ${visibleCount} transaksi • Semua: ${transactions.length} transaksi.`;
  }

  exportBtn.addEventListener('click', async () => {
    exportMonthScopeLabel.textContent = hasDateRange()
      ? 'Rentang tanggal aktif'
      : 'Bulan yang sedang dibuka';
    exportInfo.textContent = 'Menghitung data...';
    openDialog(exportModal, 'input[name="export-scope"]');
    await updateExportInfo();
  });

  closeExportModalBtn.addEventListener('click', () => closeDialog(exportModal));
  exportCancelBtn.addEventListener('click', () => closeDialog(exportModal));

  function typeLabel(type: TransactionType): string {
    if (type === 'income') return 'Masuk';
    if (type === 'expense') return 'Keluar';
    return 'Transfer';
  }

  function downloadFile(filename: string, content: string, mime: string): void {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function csvCell(value: unknown): string {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
  }

  let exportBusy = false;
  const exportSubmitBtn = exportForm.querySelector<HTMLButtonElement>('button[type="submit"]');

  exportForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (exportBusy) return;

    exportBusy = true;
    if (exportSubmitBtn) {
      exportSubmitBtn.disabled = true;
      exportSubmitBtn.textContent = 'Menyiapkan...';
    }

    try {
      const scopeInput = document.querySelector<HTMLInputElement>('input[name="export-scope"]:checked');
      const formatInput = document.querySelector<HTMLInputElement>('input[name="export-format"]:checked');
      const scope = scopeInput?.value === 'all' ? 'all' : 'month';
      const format = formatInput?.value === 'json' ? 'json' : 'csv';

      const [transactions, accounts, categories] = await Promise.all([
        getAllTransactions(),
        getAllAccounts(),
        getAllCategories(),
      ]);

      const monthKey = getMonthKey();
      const rangeActive = hasDateRange();
      const scoped = scope === 'all'
        ? transactions
        : rangeActive
          ? transactions.filter(
              (tx) =>
                (!filters.startDate || tx.date >= filters.startDate) &&
                (!filters.endDate || tx.date <= filters.endDate)
            )
          : transactions.filter((tx) => tx.date.startsWith(monthKey));

      if (scoped.length === 0) {
        toast.error('Tidak ada transaksi untuk diekspor.');
        return;
      }

      const accountMap = new Map(accounts.map((acc) => [acc.id, acc.name]));
      const categoryMap = new Map(categories.map((cat) => [cat.id, cat.name]));

      const rows = [...scoped]
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
        .map((tx) => ({
          id: tx.id,
          date: tx.date,
          type: tx.type,
          typeLabel: typeLabel(tx.type),
          amount: tx.amount,
          categoryId: tx.categoryId,
          categoryName: categoryMap.get(tx.categoryId) ?? '',
          accountId: tx.accountId,
          accountName: accountMap.get(tx.accountId) ?? '',
          toAccountId: tx.toAccountId ?? '',
          toAccountName: tx.toAccountId ? accountMap.get(tx.toAccountId) ?? '' : '',
          note: tx.note ?? '',
          createdAt: tx.createdAt,
        }));

      const filenameBase = scope === 'all'
        ? 'semua-transaksi'
        : rangeActive
          ? `riwayat-${filters.startDate || 'awal'}_${filters.endDate || 'akhir'}`
          : `riwayat-${monthKey}`;
      const exportScope = scope === 'all' ? 'all' : rangeActive ? 'range' : 'month';

      if (format === 'json') {
        const payload = {
          app: 'personal-finance',
          version: 1,
          exportedAt: new Date().toISOString(),
          scope: exportScope,
          count: rows.length,
          transactions: rows,
        };
        downloadFile(
          `${filenameBase}.json`,
          JSON.stringify(payload, null, 2),
          'application/json;charset=utf-8'
        );
      } else {
        const header = [
          'Tanggal',
          'Tipe',
          'Jumlah',
          'Kategori',
          'Akun',
          'Akun Tujuan',
          'Catatan',
        ];
        const lines = [
          header.map(csvCell).join(','),
          ...rows.map((row) =>
            [
              row.date,
              row.typeLabel,
              row.amount,
              row.categoryName,
              row.accountName,
              row.toAccountName,
              row.note,
            ]
              .map(csvCell)
              .join(',')
          ),
        ];
        downloadFile(
          `${filenameBase}.csv`,
          `\uFEFF${lines.join('\r\n')}`,
          'text/csv;charset=utf-8'
        );
      }

      closeDialog(exportModal);
      toast.success(`${rows.length} transaksi berhasil diekspor.`);
    } catch {
      toast.error('Gagal mengekspor data. Coba lagi.');
    } finally {
      exportBusy = false;
      if (exportSubmitBtn) {
        exportSubmitBtn.disabled = false;
        exportSubmitBtn.textContent = 'Unduh';
      }
    }
  });

  // ---------------------------------------------------------------
  // List rendering
  // ---------------------------------------------------------------

  groupedContainer.addEventListener('click', (event) => {
    const trigger = (event.target as HTMLElement).closest('[data-empty-action="reset-filters"]');
    if (trigger) resetAllFilters();
  });

  async function renderHistory() {
    const [transactions, accounts, categories] = await Promise.all([
      getAllTransactions(),
      getAllAccounts(),
      getAllCategories(),
    ]);

    latestAccounts = accounts;
    latestCategories = categories;

    const accountMap = new Map<string, Account>(accounts.map((acc) => [acc.id, acc]));
    const categoryMap = new Map<string, Category>(categories.map((cat) => [cat.id, cat]));

    const monthKey = getMonthKey();
    const rangeActive = hasDateRange();

    let filteredTx = rangeActive
      ? transactions.filter(
          (tx) =>
            (!filters.startDate || tx.date >= filters.startDate) &&
            (!filters.endDate || tx.date <= filters.endDate)
        )
      : transactions.filter((tx) => tx.date.startsWith(monthKey));

    if (selectedFilter !== 'all') {
      filteredTx = filteredTx.filter((tx) => tx.type === selectedFilter);
    }

    const searchTerm = filters.search.trim().toLowerCase();

    filteredTx = filteredTx.filter((tx) => {
      const cat = categoryMap.get(tx.categoryId);
      const acc = accountMap.get(tx.accountId);
      const toAcc = tx.toAccountId ? accountMap.get(tx.toAccountId) : null;

      if (filters.accountId && tx.accountId !== filters.accountId && tx.toAccountId !== filters.accountId) {
        return false;
      }

      if (filters.categoryId && tx.categoryId !== filters.categoryId) {
        return false;
      }

      if (filters.min !== null && tx.amount < filters.min) return false;
      if (filters.max !== null && tx.amount > filters.max) return false;

      if (searchTerm) {
        const haystack = [
          tx.note ?? '',
          cat?.name ?? '',
          acc?.name ?? '',
          toAcc?.name ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(searchTerm)) return false;
      }

      return true;
    });

    updateFilterIndicators();
    renderSummary(filteredTx);

    if (filteredTx.length === 0) {
      const hasFilters =
        Boolean(filters.search) ||
        Boolean(filters.accountId) ||
        Boolean(filters.categoryId) ||
        hasDateRange() ||
        filters.min !== null ||
        filters.max !== null;

      const typeName =
        selectedFilter === 'income'
          ? 'pemasukan'
          : selectedFilter === 'expense'
            ? 'pengeluaran'
            : selectedFilter === 'transfer'
              ? 'transfer'
              : '';

      groupedContainer.innerHTML = emptyStateHtml({
        iconHtml: getLucideIconHtml(hasFilters ? 'Search' : 'Receipt'),
        title: hasFilters
          ? 'Tidak ada transaksi yang cocok'
          : typeName
            ? `Belum ada transaksi ${typeName} bulan ini`
            : 'Belum ada transaksi bulan ini',
        description: hasFilters
          ? 'Coba ubah kata kunci, rentang tanggal, nominal, atau reset filter.'
          : 'Mulai catat pemasukan dan pengeluaran pertamamu di bulan ini.',
        actionHtml: hasFilters
          ? `
            <button
              type="button"
              data-empty-action="reset-filters"
              class="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-[11px] font-bold text-white shadow-xs transition hover:opacity-90 active:scale-95"
            >
              Reset filter
            </button>
          `
          : `
            <a
              href="/transactions"
              class="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-[11px] font-bold text-white shadow-xs transition hover:opacity-90 active:scale-95"
            >
              Catat transaksi
            </a>
          `,
      });
      return;
    }

    const groupedMap = new Map<string, Transaction[]>();
    filteredTx.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);

    filteredTx.forEach((tx) => {
      if (!groupedMap.has(tx.date)) {
        groupedMap.set(tx.date, []);
      }
      groupedMap.get(tx.date)!.push(tx);
    });

    let htmlContent = '';

    groupedMap.forEach((txList, dateKey) => {
      const dateFormatted = formatDateHeader(dateKey);

      const txItemsHtml = txList.map((tx) => {
        const cat = categoryMap.get(tx.categoryId);
        const acc = accountMap.get(tx.accountId);
        const toAcc = tx.toAccountId ? accountMap.get(tx.toAccountId) : null;

        const iconName = cat?.icon || (tx.type === 'transfer' ? 'ArrowLeftRight' : 'Wallet');
        const colorClass = cat?.color || 'text-blue-700 bg-blue-50';
        const [textColor, bgColor] = colorClass.split(' ');

        let accountAndCategory = '';
        const categoryName = cat?.name || (tx.type === 'transfer' ? 'Transfer' : 'Kategori Dihapus');

        if (tx.type === 'transfer') {
          const accName = acc?.name || 'Asal';
          const toAccName = toAcc?.name || 'Tujuan';
          accountAndCategory = `${categoryName} • ${accName} → ${toAccName}`;
        } else {
          const accName = acc?.name || 'Akun Dihapus';
          accountAndCategory = `${categoryName} • ${accName}`;
        }

        const headlineText = tx.note && tx.note.trim() !== '' ? tx.note : categoryName;

        let amountColorClass = 'text-foreground';
        let amountPrefix = '';
        if (tx.type === 'income') {
          amountColorClass = 'text-emerald-600';
          amountPrefix = '+ ';
        } else if (tx.type === 'expense') {
          amountColorClass = 'text-foreground';
          amountPrefix = '- ';
        } else {
          amountColorClass = 'text-blue-main';
        }

        return `
          <a
            href="/transactions?id=${encodeURIComponent(tx.id)}"
            class="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50"
          >
            <div class="flex min-w-0 items-center gap-3.5">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${bgColor || 'bg-blue-50'} ${textColor || 'text-primary'}">
                ${getLucideIconHtml(iconName)}
              </div>
              <div class="flex min-w-0 flex-col">
                <span class="truncate text-xs font-bold text-foreground">${escapeHtml(headlineText)}</span>
                <span class="truncate text-[10px] font-medium text-muted-foreground">${escapeHtml(accountAndCategory)}</span>
              </div>
            </div>
            <div class="flex shrink-0 items-center gap-1 pl-2">
              <span class="text-xs font-extrabold tabular-nums ${amountColorClass}">
                ${escapeHtml(formatAmountDisplay(tx.amount, { prefix: amountPrefix }))}
              </span>
            </div>
          </a>
        `;
      }).join('');

      const groupNet = txList.reduce((sum, tx) => {
        if (tx.type === 'income') return sum + tx.amount;
        if (tx.type === 'expense') return sum - tx.amount;
        return sum;
      }, 0);
      const groupNetLabel =
        groupNet === 0
          ? formatAmountDisplay(0)
          : groupNet > 0
            ? formatAmountDisplay(groupNet, { prefix: '+ ' })
            : formatAmountDisplay(groupNet, { signed: true });

      htmlContent += `
        <div class="space-y-2.5">
          <div class="flex items-center justify-between px-1">
            <span class="text-xs font-bold tracking-tight text-primary">${escapeHtml(dateFormatted)}</span>
            <div class="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
              <span>${txList.length} transaksi</span>
              <span>•</span>
              <span class="font-bold text-foreground">${groupNetLabel}</span>
            </div>
          </div>
          <div class="divide-y divide-border overflow-hidden rounded-[28px] border border-border bg-card shadow-soft">
            ${txItemsHtml}
          </div>
        </div>
      `;
    });

    groupedContainer.innerHTML = htmlContent;
  }

  // Deep link dari ikon search di Dashboard.
  if (new URLSearchParams(window.location.search).get('search') === '1') {
    openSearch();
    history.replaceState(null, '', window.location.pathname);
  }

  updateMonthDisplay();
  renderHistory();
}
