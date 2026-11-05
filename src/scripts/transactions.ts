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
  buildQuickPatterns,
  getQuickDescription,
  getQuickPalette,
  type QuickPattern,
} from '../lib/ui/quick-patterns';

export function initTransactionsPage(): void {
  const form = document.getElementById('tx-form') as HTMLFormElement;
  const editIdInput = document.getElementById('edit-id') as HTMLInputElement;
  const typeInput = document.getElementById('tx-type') as HTMLInputElement;
  const amountInput = document.getElementById('tx-amount') as HTMLInputElement;
  const accountInput = document.getElementById('tx-account') as HTMLInputElement;
  const toAccountInput = document.getElementById('tx-to-account') as HTMLInputElement;
  const categoryInput = document.getElementById('tx-category') as HTMLInputElement;
  const dateInput = document.getElementById('tx-date') as HTMLInputElement;
  const noteInput = document.getElementById('tx-note') as HTMLInputElement;
  const actionsContainer = document.getElementById('form-actions-container')!;
  const warningContainer = document.getElementById('tx-warning')!;

  const accountLabelText = document.getElementById('account-label-text')!;
  const accountSummaryBtn = document.getElementById('account-summary-btn') as HTMLButtonElement;
  const accountSummaryText = document.getElementById('account-summary-text')!;
  const categoryContainer = document.getElementById('category-container')!;
  const pageTitle = document.getElementById('tx-page-title')!;

  const autofillSection = document.getElementById('autofill-section')!;
  const autofillList = document.getElementById('autofill-list')!;

  const catBtn = document.getElementById('category-dropdown-btn')!;
  const catMenu = document.getElementById('category-dropdown-menu')!;
  const catLabel = document.getElementById('selected-category-label')!;

  const accountModal = document.getElementById('tx-account-modal') as HTMLDialogElement;
  const accountModalTitle = document.getElementById('tx-account-modal-title')!;
  const closeAccountModalBtn = document.getElementById('close-account-modal')!;
  const accountModalCancelBtn = document.getElementById('account-modal-cancel')!;
  const accountModalConfirmBtn = document.getElementById('account-modal-confirm') as HTMLButtonElement;
  const sourceAccountHeading = document.getElementById('source-account-heading')!;
  const sourceAccountList = document.getElementById('source-account-list')!;
  const destinationAccountSection = document.getElementById('destination-account-section')!;
  const destinationAccountList = document.getElementById('destination-account-list')!;
  const accountModalHint = document.getElementById('account-modal-hint')!;

  let submitting = false;
  let availableCategories: Category[] = [];
  let allAccounts: Account[] = [];
  let accountsById = new Map<string, Account>();
  let categoriesById = new Map<string, Category>();
  let historyCache: Transaction[] = [];
  let noteSuggestionTimer: number | null = null;
  let accountModalMode: 'source' | 'transfer' = 'source';
  let pickerSourceId = '';
  let pickerToId = '';

  function toLocalDateKey(date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  dateInput.value = toLocalDateKey();

  function getLucideIconHtml(iconName: string) {
    const template = document.querySelector(`#icon-templates template[data-icon-name="${iconName}"]`) as HTMLTemplateElement;
    if (template) return template.innerHTML;
    const defaultTemplate = document.querySelector(`#icon-templates template[data-icon-name="ArrowLeftRight"]`) as HTMLTemplateElement;
    return defaultTemplate ? defaultTemplate.innerHTML : '';
  }

  function formatIDR(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(value);
  }

  // ---------------------------------------------------------------
  // Ringkasan akun
  // ---------------------------------------------------------------

  function updateAccountSummary(): void {
    const source = accountsById.get(accountInput.value);
    const destination = accountsById.get(toAccountInput.value);
    const isTransfer = typeInput.value === 'transfer';

    accountLabelText.textContent = isTransfer ? 'Akun Transfer' : 'Akun';

    if (!source) {
      accountSummaryText.className = 'truncate text-text-secondary';
      accountSummaryText.textContent = isTransfer ? 'Pilih akun sumber...' : 'Pilih akun...';
      return;
    }

    accountSummaryText.className = 'truncate font-bold text-brand-navy';

    if (isTransfer) {
      accountSummaryText.textContent = destination
        ? `${source.name} → ${destination.name}`
        : `${source.name} → pilih tujuan`;
    } else {
      accountSummaryText.textContent = source.name;
    }
  }

  function setSelectedAccount(acc?: Account): void {
    accountInput.value = acc?.id ?? '';
    clearFieldError(accountSummaryBtn);
    updateAccountSummary();
  }

  function setSelectedToAccount(acc?: Account): void {
    toAccountInput.value = acc?.id ?? '';
    clearFieldError(accountSummaryBtn);
    updateAccountSummary();
  }

  // ---------------------------------------------------------------
  // Modal pilih akun
  // ---------------------------------------------------------------

  function accountRowHtml(acc: Account, selected: boolean): string {
    const [textColor, bgColor] = (acc.color || 'text-brand-navy bg-amber-50').split(' ');

    return `
      <button
        type="button"
        data-id="${escapeHtml(acc.id)}"
        class="account-pick-row flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition ${
          selected
            ? 'border-accent-yellow bg-accent-yellow/5'
            : 'border-brand-border/70 bg-white hover:border-accent-yellow'
        }"
      >
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand-border/40 ${bgColor || 'bg-amber-50'} ${textColor || 'text-brand-navy'}">
          ${getLucideIconHtml(acc.icon || 'Wallet')}
        </span>
        <span class="min-w-0 flex-1 truncate text-sm font-bold text-brand-navy">${escapeHtml(acc.name)}</span>
        ${selected ? '<span class="shrink-0 text-[10px] font-bold text-accent-yellow-hover">Dipilih</span>' : ''}
      </button>
    `;
  }

  function updateAccountConfirmState(): void {
    if (accountModalMode !== 'transfer') {
      accountModalConfirmBtn.classList.add('hidden');
      accountModalHint.classList.add('hidden');
      return;
    }

    accountModalConfirmBtn.classList.remove('hidden');

    const same = Boolean(pickerSourceId && pickerToId && pickerSourceId === pickerToId);
    const valid = Boolean(pickerSourceId && pickerToId && !same);

    accountModalConfirmBtn.disabled = !valid;
    accountModalConfirmBtn.classList.toggle('opacity-50', !valid);
    accountModalConfirmBtn.classList.toggle('pointer-events-none', !valid);

    if (same) {
      accountModalHint.textContent = 'Akun sumber dan tujuan tidak boleh sama.';
      accountModalHint.classList.remove('hidden');
    } else {
      accountModalHint.textContent = '';
      accountModalHint.classList.add('hidden');
    }
  }

  function renderAccountPicker(): void {
    if (allAccounts.length === 0) {
      sourceAccountList.innerHTML = `
        <div class="rounded-xl border border-dashed border-brand-border bg-brand-light/60 px-4 py-5 text-center">
          <p class="text-xs font-bold text-brand-navy">Belum ada akun</p>
          <a href="/accounts" class="mt-1 inline-block text-[11px] font-bold text-accent-yellow-hover underline underline-offset-2">
            Tambah akun dulu
          </a>
        </div>
      `;
      destinationAccountList.innerHTML = '';
      updateAccountConfirmState();
      return;
    }

    sourceAccountList.innerHTML = allAccounts
      .map((acc) => accountRowHtml(acc, acc.id === pickerSourceId))
      .join('');

    sourceAccountList.querySelectorAll<HTMLButtonElement>('.account-pick-row').forEach((btn) => {
      btn.addEventListener('click', () => {
        pickerSourceId = btn.dataset.id || '';

        if (accountModalMode === 'source') {
          setSelectedAccount(accountsById.get(pickerSourceId));
          closeDialog(accountModal);
          window.setTimeout(() => amountInput.focus({ preventScroll: true }), 80);
          return;
        }

        if (pickerToId === pickerSourceId) pickerToId = '';
        renderAccountPicker();
      });
    });

    destinationAccountList.innerHTML = allAccounts
      .map((acc) => accountRowHtml(acc, acc.id === pickerToId))
      .join('');

    destinationAccountList.querySelectorAll<HTMLButtonElement>('.account-pick-row').forEach((btn) => {
      btn.addEventListener('click', () => {
        pickerToId = btn.dataset.id || '';
        renderAccountPicker();
      });
    });

    updateAccountConfirmState();
  }

  function openAccountPicker(mode: 'source' | 'transfer'): void {
    catMenu.classList.add('hidden');

    accountModalMode = mode;
    pickerSourceId = accountInput.value;
    pickerToId = toAccountInput.value;

    if (mode === 'source') {
      accountModalTitle.textContent = 'Pilih Akun';
      sourceAccountHeading.textContent = 'Akun Sumber';
      destinationAccountSection.classList.add('hidden');
      accountModalConfirmBtn.classList.add('hidden');
    } else {
      accountModalTitle.textContent = 'Pilih Akun Transfer';
      sourceAccountHeading.textContent = 'Dari Akun';
      destinationAccountSection.classList.remove('hidden');
      accountModalConfirmBtn.classList.remove('hidden');
    }

    renderAccountPicker();
    openDialog(accountModal, '.account-pick-row, #account-modal-cancel');
  }

  initDialog(accountModal, () => {
    accountSummaryBtn.focus({ preventScroll: true });
  });

  closeAccountModalBtn.addEventListener('click', () => closeDialog(accountModal));
  accountModalCancelBtn.addEventListener('click', () => closeDialog(accountModal));

  accountModalConfirmBtn.addEventListener('click', () => {
    if (accountModalMode !== 'transfer') return;
    if (!pickerSourceId || !pickerToId || pickerSourceId === pickerToId) return;

    setSelectedAccount(accountsById.get(pickerSourceId));
    setSelectedToAccount(accountsById.get(pickerToId));
    closeDialog(accountModal);
    window.setTimeout(() => amountInput.focus({ preventScroll: true }), 80);
  });

  accountSummaryBtn.addEventListener('click', () => {
    openAccountPicker(typeInput.value === 'transfer' ? 'transfer' : 'source');
  });

  // ---------------------------------------------------------------
  // Kategori
  // ---------------------------------------------------------------

  function setSelectedCategory(cat?: Category): void {
    if (!cat) {
      categoryInput.value = '';
      catLabel.className = 'flex items-center gap-2 text-text-secondary';
      catLabel.innerHTML = 'Pilih Kategori...';
      return;
    }

    categoryInput.value = cat.id;
    clearFieldError(catBtn);

    const [textColor, bgColor] = (cat.color || 'text-brand-navy bg-amber-50').split(' ');
    catLabel.className = 'flex items-center gap-2 text-brand-navy font-bold';
    catLabel.innerHTML = `
      <div class="w-6 h-6 rounded-lg flex items-center justify-center ${bgColor} ${textColor} border border-brand-border/40">
        ${getLucideIconHtml(cat.icon || 'Utensils')}
      </div>
      <span>${escapeHtml(cat.name)}</span>
    `;
  }

  function renderCategoryOptions(type: TransactionType): void {
    const options = availableCategories.filter((cat) => cat.type === type);

    if (options.length === 0) {
      const label = type === 'income' ? 'pemasukan' : 'pengeluaran';
      catMenu.innerHTML = `
        <p class="px-3 py-3 text-[11px] leading-relaxed text-text-secondary">
          Belum ada kategori ${label}.
          <a href="/categories" class="font-bold text-accent-yellow-hover underline underline-offset-2">Buat kategori</a>
          terlebih dahulu.
        </p>
      `;
      return;
    }

    catMenu.innerHTML = options
      .map((cat) => {
        const [textColor, bgColor] = (cat.color || 'text-brand-navy bg-amber-50').split(' ');
        return `
          <button type="button" data-id="${escapeHtml(cat.id)}" class="cat-option w-full flex items-center gap-2 px-3 py-2 hover:bg-brand-light rounded-xl transition text-sm text-left">
            <div class="w-6 h-6 rounded-lg flex items-center justify-center ${bgColor} ${textColor} border border-brand-border/40">${getLucideIconHtml(cat.icon || 'Utensils')}</div>
            <span class="font-bold text-brand-navy">${escapeHtml(cat.name)}</span>
            <span class="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${cat.type === 'income' ? 'bg-finance-green/10 text-finance-green' : 'bg-rose-50 text-finance-red'}">${cat.type}</span>
          </button>
        `;
      })
      .join('');

    catMenu.querySelectorAll('.cat-option').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        const id = (event.currentTarget as HTMLElement).getAttribute('data-id');
        setSelectedCategory(availableCategories.find((cat) => cat.id === id));
        catMenu.classList.add('hidden');
      });
    });
  }

  document.addEventListener('click', (event) => {
    if (!catBtn.contains(event.target as Node) && !catMenu.contains(event.target as Node)) {
      catMenu.classList.add('hidden');
    }
  });

  catBtn.addEventListener('click', () => catMenu.classList.toggle('hidden'));

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
        window.setTimeout(() => openAccountPicker('transfer'), 0);
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
        ? 'type-tab-btn flex items-center justify-center gap-1 rounded-xl bg-brand-navy py-2 text-xs font-bold text-white shadow-xs transition-all'
        : 'type-tab-btn flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-medium text-text-secondary transition-all hover:bg-brand-light hover:text-brand-navy';
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
      color: 'text-brand-navy bg-amber-50',
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
        const { textColor, bgColor, iconName } = getQuickPalette(pattern, categoriesById);
        const description = getQuickDescription(pattern, accountsById, categoriesById);
        const prefix =
          pattern.type === 'income' ? '+ ' : pattern.type === 'expense' ? '- ' : '';
        const amountColor =
          pattern.type === 'income'
            ? 'text-finance-green'
            : pattern.type === 'expense'
              ? 'text-finance-red'
              : 'text-brand-navy';

        return `
          <button
            type="button"
            data-index="${index}"
            class="autofill-card flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-brand-border/70 bg-white px-2.5 text-left transition hover:border-accent-yellow active:scale-95"
          >
            <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-brand-border/40 ${bgColor} ${textColor}">
              ${getLucideIconHtml(iconName)}
            </span>
            <span class="max-w-[96px] truncate text-[10px] font-bold text-brand-navy">${escapeHtml(description)}</span>
            <span class="text-[10px] font-extrabold tabular-nums ${amountColor}">${prefix}${escapeHtml(formatIDR(pattern.amount))}</span>
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

    amountInput.value = String(pattern.amount);
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
        <button type="button" id="delete-tx-btn" class="flex-1 rounded-xl bg-rose-50 py-3 text-xs font-semibold text-finance-red transition hover:bg-rose-100 active:scale-95">Hapus</button>
        <button type="submit" id="submit-btn" class="flex-1 rounded-xl bg-brand-navy py-3 text-xs font-bold text-white shadow-xs transition hover:bg-brand-navy/90 active:scale-95">Perbarui</button>
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
      <button type="submit" data-action="save-add" id="save-add-btn" class="flex-1 rounded-xl bg-brand-light py-3 text-[11px] font-semibold text-text-primary transition hover:bg-slate-200 active:scale-95">Simpan &amp; Tambah Lagi</button>
      <button type="submit" data-action="save" id="save-btn" class="flex-1 rounded-xl bg-brand-navy py-3 text-xs font-bold text-white shadow-xs transition hover:bg-brand-navy/90 active:scale-95">Simpan Transaksi</button>
    `;
  }

  function renderFormWarnings(accounts: Account[], categories: Category[]): void {
    const warnings: string[] = [];

    if (accounts.length === 0) {
      warnings.push(`
        Belum ada dompet. Tambahkan akun dulu di
        <a href="/accounts" class="font-bold text-accent-yellow-hover underline underline-offset-2">halaman Dompet</a>
        sebelum mencatat transaksi.
      `);
    }

    if (categories.length === 0) {
      warnings.push(`
        Belum ada kategori. Buat kategori di
        <a href="/categories" class="font-bold text-accent-yellow-hover underline underline-offset-2">halaman Kategori</a>
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
          <div class="rounded-2xl border border-accent-yellow/30 bg-accent-yellow/5 p-3.5 text-[11px] leading-relaxed text-brand-navy">
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

    allAccounts = accounts;
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

        amountInput.value = txToEdit.amount.toString();
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

    if (accounts.length > 0) {
      window.setTimeout(() => openAccountPicker('source'), 80);
    }
  }

  function buildErrors(type: TransactionType): FieldError[] {
    const errors: FieldError[] = [];

    const amountRaw = amountInput.value.trim();
    const amount = Number(amountRaw);

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
        errors.push({ field: accountSummaryBtn, message: 'Pilih akun tujuan transfer.' });
      } else if (toAccountInput.value === accountInput.value) {
        errors.push({ field: accountSummaryBtn, message: 'Akun asal dan tujuan tidak boleh sama.' });
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

    catMenu.classList.add('hidden');
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
    const amount = Number(amountInput.value);
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
