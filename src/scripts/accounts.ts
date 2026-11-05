
import { getAllAccounts, addAccount, deleteAccount, getAccountCurrentBalance, updateAccount } from '../lib/db/accounts';
import { getAllTransactions } from '../lib/db/transactions';
import { closeDialog, initDialog, openDialog } from '../lib/ui/dialog';
import { toast } from '../lib/ui/toast';
import { confirmAction } from '../lib/ui/confirm';
import {
  clearAllErrors,
  clearOnInput,
  showFieldErrors,
  type FieldError,
} from '../lib/ui/validation';
import { emptyStateHtml } from '../lib/ui/empty-state';
import { escapeHtml } from '../lib/ui/html';
import {
  readAccountOrder,
  writeAccountOrder,
  sortByStoredOrder,
} from '../lib/ui/account-order';

export function initAccountsPage(): void {
  const modal = document.getElementById('account-modal') as HTMLDialogElement;
  const detailModal = document.getElementById('account-detail-modal') as HTMLDialogElement;
  const openModalBtn = document.getElementById('open-add-modal')!;
  const closeModalBtn = document.getElementById('close-modal')!;
  const cancelModalBtn = document.getElementById('cancel-modal')!;
  const closeDetailModalBtn = document.getElementById('close-detail-modal')!;

  const form = document.getElementById('account-form') as HTMLFormElement;
  const modalTitle = document.getElementById('modal-title')!;
  const editIdInput = document.getElementById('edit-id') as HTMLInputElement;
  const nameInput = document.getElementById('name') as HTMLInputElement;
  const balanceInput = document.getElementById('balance') as HTMLInputElement;
  const iconInput = document.getElementById('icon') as HTMLInputElement;
  const colorInput = document.getElementById('color') as HTMLInputElement;
  const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
  const listContainer = document.getElementById('accounts-list')!;

  const sortToggleBtn = document.getElementById('sort-toggle') as HTMLButtonElement;
  const sortToggleLabel = document.getElementById('sort-toggle-label')!;
  const sortIconDefault = document.getElementById('sort-icon-default')!;
  const sortIconDone = document.getElementById('sort-icon-done')!;

  const detailIconWrapper = document.getElementById('detail-modal-icon-wrapper')!;
  const detailName = document.getElementById('detail-modal-name')!;
  const detailBalance = document.getElementById('detail-modal-balance')!;
  const detailActivity = document.getElementById('detail-modal-activity')!;
  const detailEditBtn = document.getElementById('detail-edit-btn') as HTMLButtonElement;
  const detailDeleteBtn = document.getElementById('detail-delete-btn') as HTMLButtonElement;

  const iconBtns = document.querySelectorAll<HTMLElement>('.icon-opt');
  const colorBtns = document.querySelectorAll<HTMLElement>('.color-opt');

  let accountOrder = readAccountOrder();
  let sortMode = false;
  let workingOrder: string[] = [];
  let orderAtStart: string[] = [];
  let renderedAccountIds: string[] = [];

  // ---------------------------------------------------------------
  // Urutan akun (sort mode)
  // ---------------------------------------------------------------

  function updateSortUi(): void {
    const active = sortMode;

    sortToggleLabel.textContent = active ? 'Selesai' : 'Urutkan';
    sortToggleBtn.setAttribute('aria-pressed', String(active));
    sortIconDefault.style.display = active ? 'none' : 'flex';
    sortIconDone.style.display = active ? 'flex' : 'none';

    sortToggleBtn.classList.toggle('bg-accent-yellow', active);
    sortToggleBtn.classList.toggle('text-brand-navy', active);
    sortToggleBtn.classList.toggle('border-accent-yellow', active);
    sortToggleBtn.classList.toggle('bg-white/10', !active);
    sortToggleBtn.classList.toggle('text-slate-100', !active);
    sortToggleBtn.classList.toggle('border-white/10', !active);
  }

  function enterSortMode(): void {
    if (sortMode) return;

    sortMode = true;
    workingOrder = [...renderedAccountIds];
    orderAtStart = [...renderedAccountIds];
    updateSortUi();
    renderAccounts();
  }

  function exitSortMode(): void {
    if (!sortMode) return;

    const changed =
      workingOrder.length !== orderAtStart.length ||
      workingOrder.some((id, index) => id !== orderAtStart[index]);

    const finalOrder = [...workingOrder];

    sortMode = false;
    workingOrder = [];
    orderAtStart = [];

    if (changed) {
      accountOrder = finalOrder;
      writeAccountOrder(accountOrder);
      toast.success('Urutan akun disimpan.');
    }

    updateSortUi();
    renderAccounts();
  }

  function moveAccount(id: string, direction: -1 | 1): void {
    if (!sortMode) return;

    const index = workingOrder.indexOf(id);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= workingOrder.length) return;

    [workingOrder[index], workingOrder[target]] = [
      workingOrder[target],
      workingOrder[index],
    ];

    renderAccounts();
  }

  sortToggleBtn.addEventListener('click', () => {
    if (sortMode) exitSortMode();
    else enterSortMode();
  });

  // ---------------------------------------------------------------
  // Modal lifecycle
  // ---------------------------------------------------------------

  function resetForm() {
    form.reset();
    editIdInput.value = '';
    clearAllErrors(form);
    setSelectedIconInPicker('Wallet');
    setSelectedColorInPicker('text-brand-navy bg-amber-50');
  }

  function openModal(isEdit = false) {
    modalTitle.textContent = isEdit ? 'Edit Akun' : 'Tambah Akun Baru';
    submitBtn.textContent = isEdit ? 'Perbarui Akun' : 'Simpan Akun';
    openDialog(modal, '#name');
  }

  initDialog(detailModal);
  initDialog(modal, resetForm);

  openModalBtn.addEventListener('click', () => openModal(false));
  closeModalBtn.addEventListener('click', () => closeDialog(modal));
  cancelModalBtn.addEventListener('click', () => closeDialog(modal));
  closeDetailModalBtn.addEventListener('click', () => closeDialog(detailModal));

  // ---------------------------------------------------------------
  // Icon & color pickers
  // ---------------------------------------------------------------

  iconBtns.forEach((btn) => {
    btn.addEventListener('click', (event) => {
      const selectedVal = (event.currentTarget as HTMLElement).getAttribute('data-icon-val') || 'Wallet';
      iconInput.value = selectedVal;

      iconBtns.forEach((b) => {
        b.classList.remove('border-accent-yellow', 'bg-accent-yellow/10');
        b.classList.add('border-brand-border');
      });

      (event.currentTarget as HTMLElement).classList.remove('border-brand-border');
      (event.currentTarget as HTMLElement).classList.add('border-accent-yellow', 'bg-accent-yellow/10');
    });
  });

  colorBtns.forEach((btn) => {
    btn.addEventListener('click', (event) => {
      const selectedVal = (event.currentTarget as HTMLElement).getAttribute('data-color-val') || 'text-brand-navy bg-amber-50';
      colorInput.value = selectedVal;

      colorBtns.forEach((b) => b.classList.remove('ring-2', 'ring-offset-2', 'ring-amber-500'));
      (event.currentTarget as HTMLElement).classList.add('ring-2', 'ring-offset-2', 'ring-amber-500');
    });
  });

  function setSelectedIconInPicker(val: string) {
    iconInput.value = val;
    iconBtns.forEach((btn) => {
      if (btn.getAttribute('data-icon-val') === val) {
        btn.classList.remove('border-brand-border');
        btn.classList.add('border-accent-yellow', 'bg-accent-yellow/10');
      } else {
        btn.classList.remove('border-accent-yellow', 'bg-accent-yellow/10');
        btn.classList.add('border-brand-border');
      }
    });
  }

  function setSelectedColorInPicker(val: string) {
    colorInput.value = val;
    colorBtns.forEach((btn) => {
      if (btn.getAttribute('data-color-val') === val) {
        btn.classList.add('ring-2', 'ring-offset-2', 'ring-amber-500');
      } else {
        btn.classList.remove('ring-2', 'ring-offset-2', 'ring-amber-500');
      }
    });
  }

  function getLucideIconHtml(iconName: string) {
    const template = document.querySelector(`#icon-templates template[data-icon-name="${iconName}"]`) as HTMLTemplateElement;
    if (template) return template.innerHTML;
    const defaultTemplate = document.querySelector(`#icon-templates template[data-icon-name="Wallet"]`) as HTMLTemplateElement;
    return defaultTemplate ? defaultTemplate.innerHTML : '';
  }

  // ---------------------------------------------------------------
  // List rendering
  // ---------------------------------------------------------------

  listContainer.addEventListener('click', (event) => {
    const trigger = (event.target as HTMLElement).closest('[data-empty-action="add-account"]');
    if (trigger) openModal(false);
  });

  async function renderAccounts() {
    const [accounts, transactions] = await Promise.all([
      getAllAccounts(),
      getAllTransactions(),
    ]);

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthlyTransactions = transactions.filter((tx) => tx.date.startsWith(monthKey));

    const monthlyActivityEl = document.getElementById('micro-monthly-activity');
    if (monthlyActivityEl) monthlyActivityEl.textContent = `${monthlyTransactions.length} Tx`;
    
    const walletCountEl = document.getElementById('micro-wallet-count');
    if (walletCountEl) walletCountEl.textContent = `${accounts.length} Akun`;

    sortToggleBtn.style.display = accounts.length > 1 ? 'inline-flex' : 'none';

    if (accounts.length < 2 && sortMode) {
      sortMode = false;
      workingOrder = [];
      orderAtStart = [];
    }
    updateSortUi();

    if (accounts.length === 0) {
      renderedAccountIds = [];
      listContainer.innerHTML = emptyStateHtml({
        iconHtml: getLucideIconHtml('Wallet'),
        title: 'Belum ada dompet',
        description: 'Tambahkan akun pertama (BCA, Cash, e-wallet) untuk mulai mencatat saldo dan transaksi.',
        actionHtml: `
          <button
            type="button"
            data-empty-action="add-account"
            class="inline-flex items-center gap-1.5 rounded-xl bg-accent-yellow px-4 py-2 text-[11px] font-bold text-brand-navy shadow-xs transition hover:bg-accent-yellow-hover active:scale-95"
          >
            Tambah Dompet
          </button>
        `,
      });

      const totalBalEl = document.getElementById('total-combined-balance');
      if (totalBalEl) totalBalEl.textContent = 'Rp 0';
      const topWalletEl = document.getElementById('micro-top-wallet');
      if (topWalletEl) topWalletEl.textContent = '-';
      return;
    }

    let totalBalanceAll = 0;
    let highestBalance = -Infinity;
    let topWalletName = '-';

    const orderedAccounts = sortByStoredOrder(
      accounts,
      sortMode ? workingOrder : accountOrder
    );
    renderedAccountIds = orderedAccounts.map((acc) => acc.id);

    if (sortMode) workingOrder = [...renderedAccountIds];

    const accountCards = await Promise.all(
      orderedAccounts.map(async (acc, index) => {
        const currentBalance = await getAccountCurrentBalance(acc.id);
        totalBalanceAll += currentBalance;

        if (currentBalance > highestBalance) {
          highestBalance = currentBalance;
          topWalletName = acc.name;
        }

        const iconName = acc.icon || 'Wallet';
        const colorClass = acc.color || 'text-brand-navy bg-amber-50';
        const [textColor, bgColor] = colorClass.split(' ');

        // Total aktivitas akun ini pada bulan berjalan
        const activityCount = monthlyTransactions.filter(
          (tx) => tx.accountId === acc.id || tx.toAccountId === acc.id
        ).length;

        const sortControls = sortMode
          ? `
            <div class="flex flex-col gap-1">
              <button
                type="button"
                class="sort-move-btn flex h-6 w-6 items-center justify-center rounded-lg border border-brand-border/70 bg-brand-light text-brand-navy transition hover:border-accent-yellow disabled:pointer-events-none disabled:opacity-30"
                data-id="${escapeHtml(acc.id)}"
                data-move="up"
                aria-label="Naikkan ${escapeHtml(acc.name)}"
                ${index === 0 ? 'disabled' : ''}
              >
                ${getLucideIconHtml('ChevronUp')}
              </button>
              <button
                type="button"
                class="sort-move-btn flex h-6 w-6 items-center justify-center rounded-lg border border-brand-border/70 bg-brand-light text-brand-navy transition hover:border-accent-yellow disabled:pointer-events-none disabled:opacity-30"
                data-id="${escapeHtml(acc.id)}"
                data-move="down"
                aria-label="Turunkan ${escapeHtml(acc.name)}"
                ${index === orderedAccounts.length - 1 ? 'disabled' : ''}
              >
                ${getLucideIconHtml('ChevronDown')}
              </button>
            </div>
          `
          : '';

        return `
          <div 
            class="account-card flex justify-between items-center p-4 border ${sortMode ? 'border-accent-yellow/60 cursor-default' : 'border-brand-border/80 cursor-pointer hover:border-accent-yellow hover:shadow-md'} rounded-2xl bg-white shadow-xs transition"
            data-id="${escapeHtml(acc.id)}"
            data-name="${escapeHtml(acc.name)}"
            data-balance="${currentBalance}" 
            data-icon="${escapeHtml(iconName)}"
            data-color="${escapeHtml(colorClass)}"
            data-activity="${activityCount}"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${bgColor || 'bg-amber-50'} ${textColor || 'text-brand-navy'} shadow-xs border border-brand-border/50">
                ${getLucideIconHtml(iconName)}
              </div>
              <div class="min-w-0">
                <p class="font-bold text-brand-navy text-sm truncate">${escapeHtml(acc.name)}</p>
                <p class="text-xs text-text-secondary mt-0.5">${activityCount} aktivitas bulan ini</p>
              </div>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <div class="text-right">
                <p class="text-sm font-extrabold text-brand-navy">Rp ${currentBalance.toLocaleString('id-ID')}</p>
              </div>
              ${sortControls}
            </div>
          </div>
        `;
      })
    );

    const totalBalEl = document.getElementById('total-combined-balance');
    if (totalBalEl) totalBalEl.textContent = `Rp ${totalBalanceAll.toLocaleString('id-ID')}`;

    const topWalletEl = document.getElementById('micro-top-wallet');
    if (topWalletEl) topWalletEl.textContent = topWalletName;

    listContainer.innerHTML = accountCards.join('');

    document.querySelectorAll<HTMLElement>('.account-card').forEach((card) => {
      if (sortMode) return;

      card.addEventListener('click', (event) => {
        const el = event.currentTarget as HTMLElement;
        const id = el.getAttribute('data-id') || '';
        const name = el.getAttribute('data-name') || '';
        const balance = parseFloat(el.getAttribute('data-balance') || '0');
        const iconName = el.getAttribute('data-icon') || 'Wallet';
        const colorClass = el.getAttribute('data-color') || 'text-brand-navy bg-amber-50';
        const activity = el.getAttribute('data-activity') || '0';

        const [textColor, bgColor] = colorClass.split(' ');

        detailIconWrapper.className = `w-14 h-14 rounded-2xl mx-auto flex items-center justify-center shadow-xs border border-brand-border/50 mb-3 ${bgColor} ${textColor}`;
        detailIconWrapper.innerHTML = getLucideIconHtml(iconName);
        detailName.textContent = name;
        detailBalance.textContent = `Rp ${balance.toLocaleString('id-ID')}`;
        detailActivity.textContent = `Aktivitas: ${activity} transaksi`;

        detailEditBtn.onclick = () => {
          closeDialog(detailModal);
          editIdInput.value = id;
          nameInput.value = name;
          balanceInput.value = balance.toString();
          setSelectedIconInPicker(iconName);
          setSelectedColorInPicker(colorClass);
          clearAllErrors(form);
          openModal(true);
        };

        detailDeleteBtn.onclick = async () => {
          if (detailDeleteBtn.dataset.busy === '1') return;

          const confirmed = await confirmAction({
            title: 'Hapus akun?',
            message: `"${name}" akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`,
            confirmLabel: 'Hapus Akun',
            variant: 'danger',
          });
          if (!confirmed) return;

          detailDeleteBtn.dataset.busy = '1';
          detailDeleteBtn.disabled = true;

          try {
            const res = await deleteAccount(id);
            closeDialog(detailModal);

            if (!res.success) {
              toast.error(res.message);
              return;
            }

            toast.success(res.message || 'Akun berhasil dihapus.');
            await renderAccounts();
          } catch {
            toast.error('Gagal menghapus akun. Coba lagi.');
          } finally {
            detailDeleteBtn.dataset.busy = '0';
            detailDeleteBtn.disabled = false;
          }
        };

        openDialog(detailModal, '#close-detail-modal');
      });
    });

    listContainer.querySelectorAll<HTMLButtonElement>('.sort-move-btn').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        moveAccount(
          btn.getAttribute('data-id') || '',
          btn.getAttribute('data-move') === 'up' ? -1 : 1
        );
      });
    });
  }

  // ---------------------------------------------------------------
  // Validation + submit
  // ---------------------------------------------------------------

  clearOnInput([nameInput, balanceInput]);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitBtn.dataset.busy === '1') return;

    const editId = editIdInput.value;
    const name = nameInput.value.trim();
    const balanceRaw = balanceInput.value.trim();
    const targetBalance = Number(balanceRaw);
    const icon = iconInput.value;
    const color = colorInput.value;

    const errors: FieldError[] = [];

    if (!name) {
      errors.push({ field: nameInput, message: 'Nama akun wajib diisi.' });
    } else if (name.length > 40) {
      errors.push({ field: nameInput, message: 'Nama akun maksimal 40 karakter.' });
    } else {
      const existingAccounts = await getAllAccounts();
      const duplicate = existingAccounts.some(
        (acc) => acc.id !== editId && acc.name.trim().toLowerCase() === name.toLowerCase()
      );
      if (duplicate) {
        errors.push({ field: nameInput, message: 'Nama akun ini sudah dipakai.' });
      }
    }

    if (!balanceRaw || !Number.isFinite(targetBalance)) {
      errors.push({ field: balanceInput, message: 'Saldo harus berupa angka yang valid.' });
    }

    clearAllErrors(form);
    if (showFieldErrors(errors)) {
      toast.error('Periksa kembali field yang ditandai.');
      return;
    }

    submitBtn.dataset.busy = '1';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Menyimpan...';

    try {
      if (editId) {
        const res = await updateAccount(editId, { name, targetBalance, icon, color });
        if (!res.success) {
          toast.error(res.message);
          return;
        }
        toast.success(res.message);
      } else {
        const newId = await addAccount({ name, balance: targetBalance, icon, color });
        if (!newId) {
          toast.error('Gagal menyimpan akun.');
          return;
        }
        toast.success('Akun berhasil ditambahkan.');
      }

      closeDialog(modal);
      await renderAccounts();
    } catch {
      toast.error('Terjadi kesalahan saat menyimpan akun. Coba lagi.');
    } finally {
      submitBtn.dataset.busy = '0';
      submitBtn.disabled = false;
      submitBtn.textContent = editId ? 'Perbarui Akun' : 'Simpan Akun';
    }
  });

  renderAccounts();
}
