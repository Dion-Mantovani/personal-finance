import { getAllAccounts } from '../lib/db/accounts';
import { getAllCategories, addCategory } from '../lib/db/categories';
import {
  getAllTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
} from '../lib/db/transactions';
import type { Transaction, TransactionType, Category, Account } from '../types/finance';
import { setFlash, toast } from '../lib/ui/toast';
import { confirmAction } from '../lib/ui/confirm';
import { closeDialog, initDialog, openDialog } from '../lib/ui/dialog';
import {
  clearAllErrors,
  clearFieldError,
  clearOnInput,
  showFieldErrors,
  type FieldError,
} from '../lib/ui/validation';
import { escapeHtml } from '../lib/ui/html';
import {
  bindCurrencyInput,
  formatNumberInput,
  parseNumberInput,
} from '../lib/ui/currency-input';
import {
  buildQuickPatterns,
  getQuickDescription,
  getQuickPalette,
  type QuickPattern,
} from '../lib/ui/quick-patterns';
import { readAccountOrder, sortByStoredOrder } from '../lib/ui/account-order';
import {
  readOrderForType,
  sortCategoriesByStoredOrder,
} from '../lib/ui/category-order';
import { formatRupiah as formatAmountDisplay } from '../lib/ui/amount-visibility';

export function initTransactionsPage(): void {
  const form = document.getElementById('tx-form') as HTMLFormElement;
  const editIdInput = document.getElementById('edit-id') as HTMLInputElement;
  const typeInput = document.getElementById('tx-type') as HTMLInputElement;
  const amountInput = document.getElementById('tx-amount') as HTMLInputElement;
  const accountInput = document.getElementById('tx-account') as HTMLInputElement;
  const toAccountInput = document.getElementById('tx-to-account') as HTMLInputElement;
  const categoryInput = document.getElementById('tx-category') as HTMLInputElement;
  const dateInput = document.getElementById('tx-date') as HTMLInputElement;
  const noteInput = document.getElementById('tx-note') as HTMLTextAreaElement;
  const actionsContainer = document.getElementById('form-actions-container')!;
  const warningContainer = document.getElementById('tx-warning')!;

  const accountLabelText = document.getElementById('account-label-text')!;
  const accountSummaryBtn = document.getElementById('account-summary-btn') as HTMLButtonElement;
  const accountSummaryText = document.getElementById('account-summary-text')!;
  const destinationAccountField = document.getElementById('destination-account-field')!;
  const toAccountSummaryBtn = document.getElementById('to-account-summary-btn') as HTMLButtonElement;
  const toAccountSummaryText = document.getElementById('to-account-summary-text')!;
  const categoryContainer = document.getElementById('category-container')!;
  const pageTitle = document.getElementById('tx-page-title')!;

  const autofillSection = document.getElementById('autofill-section')!;
  const autofillList = document.getElementById('autofill-list')!;

  const catBtn = document.getElementById('category-dropdown-btn')!;
  const catMenu = document.getElementById('category-dropdown-menu')!;
  const catLabel = document.getElementById('selected-category-label')!;
  const categoryModal = document.getElementById('tx-category-modal') as HTMLDialogElement;
  const closeCategoryModalBtn = document.getElementById('close-category-modal')!;

  const accountModal = document.getElementById('tx-account-modal') as HTMLDialogElement;
  const accountModalTitle = document.getElementById('tx-account-modal-title')!;
  const closeAccountModalBtn = document.getElementById('close-account-modal')!;
  const accountModalCancelBtn = document.getElementById('account-modal-cancel')!;
  const sourceAccountList = document.getElementById('source-account-list')!;

  let submitting = false;
  let availableCategories: Category[] = [];
  let allAccounts: Account[] = [];
  let accountsById = new Map<string, Account>();
  let categoriesById = new Map<string, Category>();
  let historyCache: Transaction[] = [];
  let noteSuggestionTimer: number | null = null;
  let accountModalMode: 'source' | 'destination' = 'source';
  let pickerSourceId = '';
  let pickerToId = '';

  function toLocalDateKey(date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  dateInput.value = toLocalDateKey();
  bindCurrencyInput(amountInput);

  function getLucideIconHtml(iconName: string) {
    const template = document.querySelector(`#icon-templates template[data-icon-name="${iconName}"]`) as HTMLTemplateElement;
    if (template) return template.innerHTML;
    const defaultTemplate = document.querySelector(`#icon-templates template[data-icon-name="ArrowLeftRight"]`) as HTMLTemplateElement;
    return defaultTemplate ? defaultTemplate.innerHTML : '';
  }

  // ---------------------------------------------------------------
  // Ringkasan akun
  // ---------------------------------------------------------------

  function updateAccountSummary(): void {
    const source = accountsById.get(accountInput.value);
    const destination = accountsById.get(toAccountInput.value);
    const isTransfer = typeInput.value === 'transfer';

    accountLabelText.textContent = isTransfer ? 'Akun Asal' : 'Akun';
    destinationAccountField.classList.toggle('hidden', !isTransfer);

    if (!source) {
      accountSummaryText.className = 'truncate text-muted-foreground';
      accountSummaryText.textContent = isTransfer ? 'Pilih akun asal...' : 'Pilih akun...';
    } else {
      accountSummaryText.className = 'truncate font-bold text-foreground';
      accountSummaryText.textContent = source.name;
    }

    if (!destination) {
      toAccountSummaryText.className = 'truncate text-muted-foreground';
      toAccountSummaryText.textContent = 'Pilih akun tujuan...';
    } else {
      toAccountSummaryText.className = 'truncate font-bold text-foreground';
      toAccountSummaryText.textContent = destination.name;
    }
  }

  function setSelectedAccount(acc?: Account): void {
    accountInput.value = acc?.id ?? '';
    clearFieldError(accountSummaryBtn);
    updateAccountSummary();
  }

  function setSelectedToAccount(acc?: Account): void {
    toAccountInput.value = acc?.id ?? '';
    clearFieldError(toAccountSummaryBtn);
    updateAccountSummary();
  }

  // ---------------------------------------------------------------
  // Modal pilih akun
  // ---------------------------------------------------------------

  function accountRowHtml(acc: Account, selected: boolean): string {
    return `
      <button
        type="button"
        data-id="${escapeHtml(acc.id)}"
        class="account-pick-row flex w-full items-center gap-3.5 rounded-2xl border p-3.5 text-left transition ${
          selected
            ? 'border-blue-main bg-blue-soft'
            : 'border-border bg-card hover:bg-muted/50'
        }"
      >
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-soft text-primary">
          ${getLucideIconHtml(acc.icon || 'Wallet')}
        </span>
        <span class="min-w-0 flex-1 truncate text-xs font-bold text-foreground">${escapeHtml(acc.name)}</span>
        ${selected ? '<span class="shrink-0 text-[10px] font-bold text-blue-main">Dipilih</span>' : ''}
      </button>
    `;
  }

  function renderAccountPicker(): void {
    if (allAccounts.length === 0) {
      sourceAccountList.innerHTML = `
        <div class="rounded-2xl border border-dashed border-border bg-background/60 px-4 py-6 text-center">
          <p class="text-xs font-bold text-primary">Belum ada akun</p>
          <a href="/accounts" class="mt-1 inline-block text-[11px] font-bold text-blue-main underline underline-offset-2">
            Tambah akun dulu
          </a>
        </div>
      `;
      return;
    }

    const pickerAccounts =
      accountModalMode === 'destination'
        ? allAccounts.filter((acc) => acc.id !== accountInput.value)
        : allAccounts;

    if (pickerAccounts.length === 0) {
      sourceAccountList.innerHTML = `
        <div class="rounded-2xl border border-dashed border-border bg-background/60 px-4 py-6 text-center">
          <p class="text-xs font-bold text-primary">Tidak ada akun lain</p>
          <p class="mt-1 text-[10px] font-medium text-muted-foreground">Tambahkan dompet lain untuk transfer.</p>
        </div>
      `;
      return;
    }

    const selectedId = accountModalMode === 'source' ? pickerSourceId : pickerToId;
    sourceAccountList.innerHTML = pickerAccounts
      .map((acc) => accountRowHtml(acc, acc.id === selectedId))
      .join('');

    sourceAccountList.querySelectorAll<HTMLButtonElement>('.account-pick-row').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id || '';
        const account = accountsById.get(id);

        if (accountModalMode === 'source') {
          setSelectedAccount(account);
          pickerSourceId = id;

          if (typeInput.value === 'transfer') {
            if (toAccountInput.value === id) setSelectedToAccount(undefined);
            closeDialog(accountModal);
            window.setTimeout(() => openAccountPicker('destination'), 120);
          } else {
            closeDialog(accountModal);
            window.setTimeout(() => amountInput.focus({ preventScroll: true }), 80);
          }
          return;
        }

        setSelectedToAccount(account);
        pickerToId = id;
        closeDialog(accountModal);
        window.setTimeout(() => amountInput.focus({ preventScroll: true }), 80);
      });
    });
  }

  function openAccountPicker(mode: 'source' | 'destination'): void {
    if (categoryModal.open) closeDialog(categoryModal);

    accountModalMode = mode;
    pickerSourceId = accountInput.value;
    pickerToId = toAccountInput.value;

    accountModalTitle.textContent =
      mode === 'source'
        ? typeInput.value === 'transfer'
          ? 'Pilih Akun Asal'
          : 'Pilih Akun'
        : 'Pilih Akun Tujuan';

    renderAccountPicker();
    openDialog(accountModal, '.account-pick-row, #account-modal-cancel');
  }

  initDialog(accountModal, () => {
    const focusBtn = accountModalMode === 'destination' ? toAccountSummaryBtn : accountSummaryBtn;
    focusBtn.focus({ preventScroll: true });
  });

  closeAccountModalBtn.addEventListener('click', () => closeDialog(accountModal));
  accountModalCancelBtn.addEventListener('click', () => closeDialog(accountModal));

  accountSummaryBtn.addEventListener('click', () => {
    openAccountPicker('source');
  });

  toAccountSummaryBtn.addEventListener('click', () => {
    if (typeInput.value === 'transfer' && !accountInput.value) {
      openAccountPicker('source');
      return;
    }
    openAccountPicker('destination');
  });

  // ---------------------------------------------------------------
  // Kategori
  // ---------------------------------------------------------------

  function setSelectedCategory(cat?: Category): void {
    if (!cat) {
      categoryInput.value = '';
      catLabel.className = 'flex items-center gap-2 text-muted-foreground';
      catLabel.innerHTML = 'Pilih Kategori...';
      return;
    }

    categoryInput.value = cat.id;
    clearFieldError(catBtn);

    catLabel.className = 'flex items-center gap-2 font-bold text-foreground';
    catLabel.innerHTML = `
      <div class="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-soft text-primary">
        ${getLucideIconHtml(cat.icon || 'Utensils')}
      </div>
      <span>${escapeHtml(cat.name)}</span>
    `;
  }

  function renderCategoryOptions(type: TransactionType): void {
    const options = sortCategoriesByStoredOrder(
      availableCategories.filter((cat) => cat.type === type),
      readOrderForType(type)
    );

    if (options.length === 0) {
      const label = type === 'income' ? 'pemasukan' : 'pengeluaran';
      catMenu.innerHTML = `
        <p class="px-3 py-4 text-[11px] leading-relaxed text-muted-foreground">
          Belum ada kategori ${label}.
          <a href="/categories" class="font-bold text-blue-main underline underline-offset-2">Buat kategori</a>
          terlebih dahulu.
        </p>
      `;
      return;
    }

    catMenu.innerHTML = options
      .map((cat) => {
        return `
          <button type="button" data-id="${escapeHtml(cat.id)}" class="cat-option flex w-full items-center gap-3 rounded-2xl p-3.5 text-left transition-colors hover:bg-muted/50">
            <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-soft text-primary">${getLucideIconHtml(cat.icon || 'Utensils')}</div>
            <span class="min-w-0 flex-1 truncate text-xs font-bold text-foreground">${escapeHtml(cat.name)}</span>
            <span class="ml-auto rounded-md px-2 py-0.5 text-[10px] font-semibold ${cat.type === 'income' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-soft text-blue-main'}">${cat.type === 'income' ? 'Masuk' : 'Keluar'}</span>
          </button>
        `;
      })
      .join('');

    catMenu.querySelectorAll('.cat-option').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        const id = (event.currentTarget as HTMLElement).getAttribute('data-id');
        setSelectedCategory(availableCategories.find((cat) => cat.id === id));
        closeDialog(categoryModal);
      });
    });
  }

  initDialog(categoryModal);

  catBtn.addEventListener('click', () => {
    renderCategoryOptions(typeInput.value as TransactionType);
    openDialog(categoryModal, '.cat-option, #close-category-modal');
  });

  closeCategoryModalBtn.addEventListener('click', () => closeDialog(categoryModal));

  // ---------------------------------------------------------------
  // Saran kategori dari deskripsi
  // ---------------------------------------------------------------

  function normalizeNote(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function findSuggestedCategory(raw: string): Category | undefined {
    const query = normalizeNote(raw);
    const type = typeInput.value as TransactionType;

    if (query.length < 3 || type === 'transfer') return undefined;

    const candidates = historyCache
      .filter((tx) => tx.type === type && tx.note && normalizeNote(tx.note).length > 0)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);

    const match =
      candidates.find((tx) => normalizeNote(tx.note!) === query) ??
      candidates.find((tx) => normalizeNote(tx.note!).startsWith(query)) ??
      candidates.find((tx) => normalizeNote(tx.note!).includes(query));

    if (!match) return undefined;

    const category = categoriesById.get(match.categoryId);
    if (!category || category.type !== type) return undefined;

    return category;
  }

  noteInput.addEventListener('input', () => {
    if (noteSuggestionTimer !== null) window.clearTimeout(noteSuggestionTimer);

    noteSuggestionTimer = window.setTimeout(() => {
      noteSuggestionTimer = null;
      const suggested = findSuggestedCategory(noteInput.value);
      if (suggested) setSelectedCategory(suggested);
    }, 300);
  });

  amountInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      noteInput.focus({ preventScroll: true });
    }
  });

  noteInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;

    event.preventDefault();
    if (submitting) return;

    const submitButton =
      document.getElementById('save-btn') ??
      document.getElementById('submit-btn');

    if (submitButton instanceof HTMLButtonElement) {
      form.requestSubmit(submitButton);
    }
  });

  // ---------------------------------------------------------------
  // Tipe transaksi & akun
  // ---------------------------------------------------------------

  function handleTypeChange(type: TransactionType, openPicker = true): void {
    typeInput.value = type;

    if (type === 'transfer') {
      categoryContainer.classList.add('hidden');
      setSelectedCategory(undefined);
      updateAccountSummary();

      if (openPicker && (!accountInput.value || !toAccountInput.value)) {
        const mode = !accountInput.value ? 'source' : 'destination';
        window.setTimeout(() => openAccountPicker(mode), 0);
      }
      return;
    }

    categoryContainer.classList.remove('hidden');
    toAccountInput.value = '';
    renderCategoryOptions(type);
    updateAccountSummary();

    const selected = availableCategories.find((cat) => cat.id === categoryInput.value);
    if (selected && selected.type !== type) setSelectedCategory(undefined);
  }

  const typeTabBtns = document.querySelectorAll<HTMLElement>('.type-tab-btn');

  function setActiveTypeTab(type: TransactionType): void {
    typeTabBtns.forEach((btn) => {
      const active = btn.getAttribute('data-type') === type;
      btn.className = active
        ? 'type-tab-btn flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground shadow-soft transition-all active:scale-95'
        : 'type-tab-btn flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold text-muted-foreground transition-all hover:text-foreground active:scale-95';
    });
  }

  typeTabBtns.forEach((btn) => {
    btn.addEventListener('click', (event) => {
      const target = event.currentTarget as HTMLElement;
      const type = target.getAttribute('data-type') as TransactionType;

      setActiveTypeTab(type);
      handleTypeChange(type);
      clearAllErrors(form);
    });
  });

  async function getOrCreateTransferCategory(): Promise<string> {
    const categories = await getAllCategories();
    const existing = categories.find(
      (cat) => cat.type === 'transfer' && cat.name.toLowerCase() === 'transfer'
    );
    if (existing) return existing.id;

    const newId = await addCategory({
      name: 'Transfer',
      type: 'transfer',
      icon: 'ArrowLeftRight',
      color: 'text-blue-700 bg-blue-50',
    });
    return newId || '';
  }

  // ---------------------------------------------------------------
  // Isi Cepat (mengisi form, bukan menyimpan)
  // ---------------------------------------------------------------

  function renderAutoFillSection(): void {
    if (editIdInput.value) {
      autofillSection.classList.add('hidden');
      autofillList.innerHTML = '';
      return;
    }

    const patterns = buildQuickPatterns(historyCache, allAccounts, availableCategories);

    if (patterns.length === 0) {
      autofillSection.classList.add('hidden');
      autofillList.innerHTML = '';
      return;
    }

    autofillSection.classList.remove('hidden');

    autofillList.innerHTML = patterns
      .map((pattern, index) => {
        const { iconName } = getQuickPalette(pattern, categoriesById);
        const description = getQuickDescription(pattern, accountsById, categoriesById);
        const prefix =
          pattern.type === 'income' ? '+ ' : pattern.type === 'expense' ? '- ' : '';
        const amountColor =
          pattern.type === 'income'
            ? 'text-emerald-600'
            : pattern.type === 'expense'
              ? 'text-blue-main'
              : 'text-primary';

        return `
          <button
            type="button"
            data-index="${index}"
            class="autofill-card flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 text-left transition hover:border-blue-main hover:bg-blue-soft/50 active:scale-95"
          >
            <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-blue-soft text-blue-main">
              ${getLucideIconHtml(iconName)}
            </span>
            <span class="max-w-[110px] truncate text-[10px] font-bold text-foreground">${escapeHtml(description)}</span>
            <span class="text-[10px] font-extrabold tabular-nums ${amountColor}">${escapeHtml(formatAmountDisplay(pattern.amount, { prefix }))}</span>
          </button>
        `;
      })
      .join('');

    autofillList.querySelectorAll<HTMLButtonElement>('.autofill-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        const index = Number(btn.dataset.index);
        const pattern = patterns[index];
        if (pattern) applyQuickPattern(pattern);
      });
    });
  }

  function applyQuickPattern(pattern: QuickPattern): void {
    if (noteSuggestionTimer !== null) {
      window.clearTimeout(noteSuggestionTimer);
      noteSuggestionTimer = null;
    }

    setActiveTypeTab(pattern.type);
    handleTypeChange(pattern.type, false);

    setSelectedAccount(accountsById.get(pattern.accountId));

    if (pattern.type === 'transfer') {
      setSelectedToAccount(
        pattern.toAccountId ? accountsById.get(pattern.toAccountId) : undefined
      );
      setSelectedCategory(undefined);
    } else {
      setSelectedToAccount(undefined);
      setSelectedCategory(categoriesById.get(pattern.categoryId));
    }

    amountInput.value = formatNumberInput(String(pattern.amount));
    noteInput.value = pattern.note;
    clearAllErrors(form);
    amountInput.focus({ preventScroll: true });
  }

  // ---------------------------------------------------------------
  // Form actions
  // ---------------------------------------------------------------

  function renderFormActions(isEdit: boolean, editId?: string): void {
    if (isEdit) {
      actionsContainer.innerHTML = `
        <button type="button" id="delete-tx-btn" class="flex-1 rounded-2xl border border-red-200 bg-rose-50 py-3.5 text-xs font-bold text-rose-600 transition hover:bg-red-50 active:scale-95">Hapus</button>
        <button type="submit" id="submit-btn" class="flex-1 rounded-2xl bg-primary py-3.5 text-xs font-bold text-primary-foreground shadow-soft transition hover:opacity-90 active:scale-95">Perbarui</button>
      `;

      document.getElementById('delete-tx-btn')?.addEventListener('click', async () => {
        if (!editId || submitting) return;

        const confirmed = await confirmAction({
          title: 'Hapus transaksi?',
          message: 'Transaksi ini akan dihapus permanen dan saldo akan menyesuaikan kembali.',
          confirmLabel: 'Hapus Transaksi',
          variant: 'danger',
        });
        if (!confirmed) return;

        submitting = true;
        try {
          await deleteTransaction(editId);
          setFlash('Transaksi berhasil dihapus.');
          window.location.href = '/history';
        } catch {
          submitting = false;
          toast.error('Gagal menghapus transaksi. Coba lagi.');
        }
      });
      return;
    }

    actionsContainer.innerHTML = `
      <button type="submit" data-action="save-add" id="save-add-btn" class="flex-1 rounded-2xl border border-border bg-card py-3.5 text-xs font-bold text-muted-foreground transition hover:bg-muted active:scale-95">Simpan &amp; Tambah</button>
      <button type="submit" data-action="save" id="save-btn" class="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-primary py-3.5 text-xs font-bold text-primary-foreground shadow-soft transition hover:opacity-90 active:scale-95">Simpan Transaksi</button>
    `;
  }

  function renderFormWarnings(accounts: Account[], categories: Category[]): void {
    const warnings: string[] = [];

    if (accounts.length === 0) {
      warnings.push(`
        Belum ada dompet. Tambahkan akun dulu di
        <a href="/accounts" class="font-bold text-blue-main underline underline-offset-2">halaman Dompet</a>
        sebelum mencatat transaksi.
      `);
    }

    if (categories.length === 0) {
      warnings.push(`
        Belum ada kategori. Buat kategori di
        <a href="/categories" class="font-bold text-blue-main underline underline-offset-2">halaman Kategori</a>
        agar transaksi masuk/keluar bisa disimpan.
      `);
    }

    if (warnings.length === 0) {
      warningContainer.classList.add('hidden');
      warningContainer.innerHTML = '';
      return;
    }

    warningContainer.classList.remove('hidden');
    warningContainer.innerHTML = warnings
      .map(
        (message) => `
          <div class="rounded-2xl border border-blue-main/25 bg-blue-soft/50 p-3.5 text-[11px] leading-relaxed text-primary">
            ${message}
          </div>
        `
      )
      .join('');
  }

  // ---------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------

  async function initForm(): Promise<void> {
    const [accounts, allCategories, transactions] = await Promise.all([
      getAllAccounts(),
      getAllCategories(),
      getAllTransactions(),
    ]);

    allAccounts = sortByStoredOrder(accounts, readAccountOrder());
    accountsById = new Map(accounts.map((acc) => [acc.id, acc]));
    historyCache = transactions;

    const categories = allCategories.filter(
      (cat) => cat.name.toLowerCase() !== 'koreksi saldo'
    );
    availableCategories = categories;
    categoriesById = new Map(categories.map((cat) => [cat.id, cat]));

    renderFormWarnings(accounts, categories);
    renderCategoryOptions(typeInput.value as TransactionType);
    updateAccountSummary();

    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('id');

    if (editId) {
      const txToEdit = transactions.find((tx) => tx.id === editId);

      if (txToEdit) {
        editIdInput.value = txToEdit.id;
        pageTitle.textContent = 'Edit Transaksi';
        typeInput.value = txToEdit.type;

        setActiveTypeTab(txToEdit.type);

        handleTypeChange(txToEdit.type, false);

        amountInput.value = formatNumberInput(txToEdit.amount.toString());
        dateInput.value = txToEdit.date;
        noteInput.value = txToEdit.note || '';

        setSelectedAccount(accountsById.get(txToEdit.accountId));
        if (txToEdit.toAccountId) {
          setSelectedToAccount(accountsById.get(txToEdit.toAccountId));
        }
        if (txToEdit.categoryId) {
          setSelectedCategory(categoriesById.get(txToEdit.categoryId));
        }

        renderFormActions(true, editId);
        amountInput.focus({ preventScroll: true });
        return;
      }

      toast.error('Transaksi tidak ditemukan.');
    }

    renderFormActions(false);
    renderAutoFillSection();

    const initialType = urlParams.get('type');
    if (initialType === 'income' || initialType === 'expense' || initialType === 'transfer') {
      setActiveTypeTab(initialType);
      handleTypeChange(initialType, false);
      renderAutoFillSection();

      if (initialType === 'transfer') {
        if (accounts.length > 0) {
          const mode = accountInput.value ? 'destination' : 'source';
          window.setTimeout(() => openAccountPicker(mode), 80);
        }
        return;
      }
    }

    if (accounts.length > 0) {
      window.setTimeout(() => openAccountPicker('source'), 80);
    }
  }

  function buildErrors(type: TransactionType): FieldError[] {
    const errors: FieldError[] = [];

    const amountRaw = amountInput.value.trim();
    const amount = parseNumberInput(amountRaw);

    if (!amountRaw || !Number.isFinite(amount) || amount <= 0) {
      errors.push({ field: amountInput, message: 'Nominal harus lebih dari 0.' });
    } else if (!Number.isInteger(amount)) {
      errors.push({ field: amountInput, message: 'Nominal tidak boleh mengandung desimal.' });
    } else if (amount > 1_000_000_000_000) {
      errors.push({ field: amountInput, message: 'Nominal terlalu besar.' });
    }

    if (!dateInput.value) {
      errors.push({ field: dateInput, message: 'Tanggal wajib diisi.' });
    } else if (Number.isNaN(new Date(`${dateInput.value}T00:00:00`).getTime())) {
      errors.push({ field: dateInput, message: 'Tanggal tidak valid.' });
    }

    if (!accountInput.value) {
      errors.push({ field: accountSummaryBtn, message: 'Pilih akun terlebih dahulu.' });
    } else if (type === 'transfer') {
      if (!toAccountInput.value) {
        errors.push({ field: toAccountSummaryBtn, message: 'Pilih akun tujuan transfer.' });
      } else if (toAccountInput.value === accountInput.value) {
        errors.push({ field: toAccountSummaryBtn, message: 'Akun asal dan tujuan tidak boleh sama.' });
      }
    } else if (!categoryInput.value) {
      errors.push({ field: catBtn, message: 'Pilih kategori terlebih dahulu.' });
    }

    return errors;
  }

  function resetPartialForm(): void {
    amountInput.value = '';
    noteInput.value = '';
    setSelectedCategory(undefined);
    clearAllErrors(form);

    if (noteSuggestionTimer !== null) {
      window.clearTimeout(noteSuggestionTimer);
      noteSuggestionTimer = null;
    }

    if (categoryModal.open) closeDialog(categoryModal);
    amountInput.focus({ preventScroll: true });
  }

  clearOnInput([amountInput, dateInput, noteInput]);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitting) return;

    const submitter = event.submitter as HTMLButtonElement | null;
    const action = submitter?.dataset.action === 'save-add' ? 'save-add' : 'save';
    const editId = editIdInput.value;
    const type = typeInput.value as TransactionType;
    const amount = parseNumberInput(amountInput.value);
    const accountId = accountInput.value;
    const toAccountId = toAccountInput.value;
    const date = dateInput.value;
    const note = noteInput.value.trim();

    clearAllErrors(form);
    if (showFieldErrors(buildErrors(type))) {
      toast.error('Periksa kembali field yang ditandai.');
      return;
    }

    const actionButtons = [
      document.getElementById('save-btn'),
      document.getElementById('save-add-btn'),
      document.getElementById('submit-btn'),
    ].filter((btn): btn is HTMLButtonElement => btn instanceof HTMLButtonElement);

    const originalLabels = new Map(actionButtons.map((btn) => [btn, btn.textContent ?? '']));

    submitting = true;
    actionButtons.forEach((btn) => {
      btn.disabled = true;
    });
    if (submitter) submitter.textContent = 'Menyimpan...';

    try {
      let categoryId = categoryInput.value;
      if (type === 'transfer') {
        categoryId = await getOrCreateTransferCategory();
        if (!categoryId) {
          toast.error('Gagal menyiapkan kategori transfer.');
          return;
        }
      }

      const txPayload = {
        amount,
        type,
        accountId,
        ...(type === 'transfer' ? { toAccountId } : {}),
        categoryId,
        date,
        note: note || undefined,
      };

      if (editId) {
        const res = await updateTransaction(editId, txPayload);
        if (!res.success) {
          toast.error(res.message);
          return;
        }
        setFlash(res.message);
        window.location.href = '/history';
        return;
      }

      const newId = await addTransaction(txPayload);
      if (!newId) {
        toast.error('Gagal menyimpan transaksi.');
        return;
      }

      if (action === 'save-add') {
        historyCache.push({
          id: newId,
          amount,
          type,
          accountId,
          ...(type === 'transfer' ? { toAccountId } : {}),
          categoryId,
          date,
          note: note || undefined,
          createdAt: Date.now(),
        });

        renderAutoFillSection();
        toast.success('Transaksi disimpan.');
        resetPartialForm();
      } else {
        setFlash('Transaksi berhasil dicatat.');
        window.location.href = '/history';
      }
    } catch {
      toast.error('Terjadi kesalahan saat menyimpan transaksi. Coba lagi.');
    } finally {
      submitting = false;
      actionButtons.forEach((btn) => {
        btn.disabled = false;
        btn.textContent = originalLabels.get(btn) ?? btn.textContent;
      });
    }
  });

  initForm();
}
