import { getAllAccounts } from '../lib/db/accounts';
import { getAllCategories } from '../lib/db/categories';
import { getAllTransactions } from '../lib/db/transactions';
import {
  clearAllData,
  getDataCounts,
  importRecords,
} from '../lib/db/maintenance';
import { closeDialog, initDialog, openDialog } from '../lib/ui/dialog';
import { toast } from '../lib/ui/toast';
import { confirmAction } from '../lib/ui/confirm';
import { getProfileName, setProfileName } from '../lib/ui/profile';
import {
  mapForeignPayload,
  parseForeignPayload,
  type ForeignPayload,
  type MappedImport,
} from '../lib/import/foreign-format';

export function initSettingsPage(): void {
  const profileDialog = document.getElementById('profile-modal') as HTMLDialogElement;
  const openProfileBtn = document.getElementById('open-profile-modal') as HTMLButtonElement;
  const closeProfileBtn = document.getElementById('close-profile-modal') as HTMLButtonElement;
  const cancelProfileBtn = document.getElementById('cancel-profile') as HTMLButtonElement;
  const profileForm = document.getElementById('profile-form') as HTMLFormElement;
  const profileNameInput = document.getElementById('profile-name-input') as HTMLInputElement;
  const profileNameDisplay = document.getElementById('profile-name-display')!;

  const fileInput = document.getElementById('import-file') as HTMLInputElement;
  const pickFileBtn = document.getElementById('pick-import-file') as HTMLButtonElement;
  const fileNameEl = document.getElementById('import-file-name')!;
  const errorEl = document.getElementById('import-error')!;
  const previewEl = document.getElementById('import-preview')!;
  const summaryEl = document.getElementById('import-summary')!;
  const warningsEl = document.getElementById('import-warnings') as HTMLUListElement;
  const importBtn = document.getElementById('import-submit') as HTMLButtonElement;

  const countAccountsEl = document.getElementById('count-accounts')!;
  const countCategoriesEl = document.getElementById('count-categories')!;
  const countTransactionsEl = document.getElementById('count-transactions')!;

  const openClearBtn = document.getElementById('open-clear-dialog') as HTMLButtonElement;
  const clearDialog = document.getElementById('clear-data-dialog') as HTMLDialogElement;
  const clearInput = document.getElementById('clear-confirm-input') as HTMLInputElement;
  const clearCancelBtn = document.getElementById('clear-cancel') as HTMLButtonElement;
  const clearConfirmBtn = document.getElementById('clear-confirm') as HTMLButtonElement;

  let pendingPayload: ForeignPayload | null = null;
  let importing = false;

  // ------------------------------------------------------------------
  // Profil (nama tampil di sapaan Dashboard)
  // ------------------------------------------------------------------

  function refreshProfileDisplay(): void {
    profileNameDisplay.textContent = getProfileName();
  }

  function openProfileModal(): void {
    profileNameInput.value = getProfileName();
    openDialog(profileDialog, '#profile-name-input');
  }

  initDialog(profileDialog);
  refreshProfileDisplay();

  openProfileBtn.addEventListener('click', openProfileModal);
  closeProfileBtn.addEventListener('click', () => closeDialog(profileDialog));
  cancelProfileBtn.addEventListener('click', () => closeDialog(profileDialog));

  profileForm.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!profileNameInput.value.trim()) {
      toast.error('Nama tidak boleh kosong.');
      profileNameInput.focus();
      return;
    }

    setProfileName(profileNameInput.value);
    refreshProfileDisplay();
    closeDialog(profileDialog);
    toast.success('Profil diperbarui.');
  });

  function resetPreview(): void {
    pendingPayload = null;
    previewEl.classList.add('hidden');
    errorEl.classList.add('hidden');
    errorEl.textContent = '';
    summaryEl.textContent = '';
    warningsEl.innerHTML = '';
    warningsEl.classList.add('hidden');
    importBtn.disabled = true;
  }

  function resetFile(): void {
    fileInput.value = '';
    fileNameEl.classList.add('hidden');
    fileNameEl.textContent = '';
    resetPreview();
  }

  function showError(message: string): void {
    resetPreview();
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  }

  function renderPreview(mapped: MappedImport): void {
    previewEl.classList.remove('hidden');

    const parts = [
      `${mapped.accounts.length} akun baru`,
      `${mapped.categories.length} kategori baru`,
      `${mapped.transactions.length} transaksi siap diimport`,
    ];
    if (mapped.skippedTransactions > 0) {
      parts.push(`${mapped.skippedTransactions} transaksi dilewati`);
    }
    summaryEl.textContent = parts.join(' • ');

    warningsEl.innerHTML = '';
    if (mapped.warnings.length > 0) {
      warningsEl.classList.remove('hidden');
      mapped.warnings.slice(0, 5).forEach((warning) => {
        const item = document.createElement('li');
        item.textContent = warning;
        warningsEl.appendChild(item);
      });

      if (mapped.warnings.length > 5) {
        const item = document.createElement('li');
        item.textContent = `…dan ${mapped.warnings.length - 5} peringatan lainnya.`;
        warningsEl.appendChild(item);
      }
    } else {
      warningsEl.classList.add('hidden');
    }

    importBtn.disabled =
      mapped.accounts.length === 0 &&
      mapped.categories.length === 0 &&
      mapped.transactions.length === 0;
  }

  async function refreshCounts(): Promise<void> {
    const counts = await getDataCounts();
    countAccountsEl.textContent = String(counts.accounts);
    countCategoriesEl.textContent = String(counts.categories);
    countTransactionsEl.textContent = String(counts.transactions);
  }

  pickFileBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    resetPreview();
    fileNameEl.textContent = file.name;
    fileNameEl.classList.remove('hidden');

    if (file.size > 5 * 1024 * 1024) {
      showError('Ukuran file terlalu besar. Maksimal 5 MB.');
      return;
    }

    try {
      const text = await file.text();
      const payload = parseForeignPayload(text);

      const [accounts, categories, transactions] = await Promise.all([
        getAllAccounts(),
        getAllCategories(),
        getAllTransactions(),
      ]);

      const mapped = mapForeignPayload(payload, accounts, categories, transactions);
      pendingPayload = payload;
      renderPreview(mapped);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Gagal membaca file.');
    }
  });

  importBtn.addEventListener('click', async () => {
    if (!pendingPayload || importing) return;

    const confirmed = await confirmAction({
      title: 'Import data?',
      message:
        'Akun, kategori, dan transaksi dari file akan digabung dengan data yang sudah ada. Lanjutkan?',
      confirmLabel: 'Import',
    });
    if (!confirmed) return;

    importing = true;
    importBtn.disabled = true;
    importBtn.textContent = 'Mengimpor...';

    try {
      const [accounts, categories, transactions] = await Promise.all([
        getAllAccounts(),
        getAllCategories(),
        getAllTransactions(),
      ]);

      const mapped = mapForeignPayload(
        pendingPayload,
        accounts,
        categories,
        transactions
      );

      if (
        mapped.accounts.length === 0 &&
        mapped.categories.length === 0 &&
        mapped.transactions.length === 0
      ) {
        toast.info('Tidak ada data baru untuk diimport.');
        return;
      }

      await importRecords(mapped);

      toast.success(
        `Import selesai: ${mapped.accounts.length} akun, ${mapped.categories.length} kategori, ${mapped.transactions.length} transaksi.`
      );

      resetFile();
      await refreshCounts();
    } catch {
      toast.error('Gagal mengimpor data. Coba lagi.');
    } finally {
      importing = false;
      importBtn.disabled = false;
      importBtn.textContent = 'Import Data';
    }
  });

  function resetClearDialog(): void {
    clearInput.value = '';
    clearConfirmBtn.disabled = true;
    clearConfirmBtn.textContent = 'Hapus Semua';
  }

  initDialog(clearDialog, resetClearDialog);

  openClearBtn.addEventListener('click', () => {
    resetClearDialog();
    openDialog(clearDialog, '#clear-confirm-input');
  });

  clearInput.addEventListener('input', () => {
    clearConfirmBtn.disabled = clearInput.value.trim().toUpperCase() !== 'HAPUS';
  });

  clearCancelBtn.addEventListener('click', () => closeDialog(clearDialog));

  clearConfirmBtn.addEventListener('click', async () => {
    if (clearInput.value.trim().toUpperCase() !== 'HAPUS') return;

    clearConfirmBtn.disabled = true;
    clearConfirmBtn.textContent = 'Menghapus...';

    try {
      await clearAllData();
      localStorage.removeItem('pf:account-order');
      localStorage.removeItem('pf:quick-shortcuts');
      toast.success('Semua data berhasil dihapus.');
      closeDialog(clearDialog);
      await refreshCounts();
    } catch {
      toast.error('Gagal menghapus data. Coba lagi.');
    } finally {
      clearConfirmBtn.textContent = 'Hapus Semua';
      clearConfirmBtn.disabled = clearInput.value.trim().toUpperCase() !== 'HAPUS';
    }
  });

  refreshCounts();
}
