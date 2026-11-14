
import { getAllCategories, addCategory, deleteCategory, updateCategory } from '../lib/db/categories';
import type { TransactionType } from '../types/finance';
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
  readOrderForType,
  sortCategoriesByStoredOrder,
  writeOrderForType,
} from '../lib/ui/category-order';

export function initCategoriesPage(): void {
  let currentTab: TransactionType = 'expense';

  const modal = document.getElementById('category-modal') as HTMLDialogElement;
  const detailModal = document.getElementById('category-detail-modal') as HTMLDialogElement;
  const openModalBtn = document.getElementById('open-add-modal')!;
  const closeModalBtn = document.getElementById('close-modal')!;
  const cancelModalBtn = document.getElementById('cancel-modal')!;
  const closeDetailModalBtn = document.getElementById('close-detail-modal')!;

  const form = document.getElementById('category-form') as HTMLFormElement;
  const modalTitle = document.getElementById('modal-title')!;
  const editIdInput = document.getElementById('edit-id') as HTMLInputElement;
  const nameInput = document.getElementById('name') as HTMLInputElement;
  const typeInput = document.getElementById('type') as HTMLSelectElement;
  const iconInput = document.getElementById('icon') as HTMLInputElement;
  const colorInput = document.getElementById('color') as HTMLInputElement;
  const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
  const listContainer = document.getElementById('categories-list')!;

  const tabExpenseBtn = document.getElementById('tab-expense')!;
  const tabIncomeBtn = document.getElementById('tab-income')!;
  const categorySectionTitle = document.getElementById('category-section-title')!;
  const categoryCountBadge = document.getElementById('category-count-badge')!;
  const sortToggleBtn = document.getElementById('sort-toggle') as HTMLButtonElement;

  let sortMode = false;
  let workingOrder: string[] = [];
  let orderAtStart: string[] = [];
  let renderedCategoryIds: string[] = [];

  const detailIconWrapper = document.getElementById('detail-modal-icon-wrapper')!;
  const detailName = document.getElementById('detail-modal-name')!;
  const detailTypeBadge = document.getElementById('detail-modal-type-badge')!;
  const detailEditBtn = document.getElementById('detail-edit-btn') as HTMLButtonElement;
  const detailDeleteBtn = document.getElementById('detail-delete-btn') as HTMLButtonElement;

  const iconBtns = document.querySelectorAll<HTMLElement>('.icon-opt');
  const colorBtns = document.querySelectorAll<HTMLElement>('.color-opt');

  // ---------------------------------------------------------------
  // Modal lifecycle
  // ---------------------------------------------------------------

  function resetForm() {
    form.reset();
    editIdInput.value = '';
    typeInput.value = currentTab;
    clearAllErrors(form);
    setSelectedIconInPicker('Utensils');
    setSelectedColorInPicker('text-blue-700 bg-blue-50');
  }

  function openModal(isEdit = false) {
    if (!isEdit) typeInput.value = currentTab;
    modalTitle.textContent = isEdit ? 'Edit Kategori' : 'Tambah Kategori Baru';
    submitBtn.textContent = isEdit ? 'Perbarui Kategori' : 'Simpan Kategori';
    openDialog(modal, '#name');
  }

  initDialog(detailModal);
  initDialog(modal, resetForm);

  openModalBtn.addEventListener('click', () => openModal(false));
  closeModalBtn.addEventListener('click', () => closeDialog(modal));
  cancelModalBtn.addEventListener('click', () => closeDialog(modal));
  closeDetailModalBtn.addEventListener('click', () => closeDialog(detailModal));

  // ---------------------------------------------------------------
  // Tabs
  // ---------------------------------------------------------------

  function updateSortUi(): void {
    sortToggleBtn.textContent = sortMode ? 'Selesai' : 'Urutkan';
    sortToggleBtn.className = sortMode
      ? 'rounded-full bg-primary px-2.5 py-1 text-[9px] font-bold text-primary-foreground shadow-xs transition active:scale-95'
      : 'rounded-full border border-border bg-card px-2.5 py-1 text-[9px] font-bold text-muted-foreground transition-all hover:bg-muted active:scale-95';
    sortToggleBtn.classList.toggle('hidden', !sortMode && renderedCategoryIds.length < 2);
  }

  function startSortMode(): void {
    if (sortMode) return;
    sortMode = true;
    workingOrder = [...renderedCategoryIds];
    orderAtStart = [...renderedCategoryIds];
    renderCategories();
  }

  function saveSortMode(): boolean {
    if (!sortMode) return false;

    const changed =
      workingOrder.length !== orderAtStart.length ||
      workingOrder.some((id, index) => id !== orderAtStart[index]);

    if (changed) writeOrderForType(currentTab, workingOrder);

    sortMode = false;
    workingOrder = [];
    orderAtStart = [];
    return changed;
  }

  function finishSortMode(): void {
    const changed = saveSortMode();
    renderCategories();
    if (changed) toast.success('Urutan kategori disimpan.');
  }

  function moveCategory(id: string, direction: -1 | 1): void {
    if (!sortMode) return;

    const index = workingOrder.indexOf(id);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= workingOrder.length) return;

    [workingOrder[index], workingOrder[target]] = [
      workingOrder[target],
      workingOrder[index],
    ];
    renderCategories();
  }

  sortToggleBtn.addEventListener('click', () => {
    if (sortMode) finishSortMode();
    else startSortMode();
  });

  tabExpenseBtn.addEventListener('click', () => switchTab('expense'));
  tabIncomeBtn.addEventListener('click', () => switchTab('income'));

  function switchTab(tab: TransactionType) {
    const changed = saveSortMode();
    currentTab = tab;
    typeInput.value = tab;

    if (tab === 'expense') {
      tabExpenseBtn.className = 'tab-btn flex items-center justify-center gap-2 rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground shadow-soft transition-all';
      tabIncomeBtn.className = 'tab-btn flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold text-muted-foreground transition-all hover:text-foreground';
      categorySectionTitle.textContent = 'Kategori Pengeluaran';
    } else {
      tabIncomeBtn.className = 'tab-btn flex items-center justify-center gap-2 rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground shadow-soft transition-all';
      tabExpenseBtn.className = 'tab-btn flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold text-muted-foreground transition-all hover:text-foreground';
      categorySectionTitle.textContent = 'Kategori Pemasukan';
    }

    renderCategories();
    if (changed) toast.success('Urutan kategori disimpan.');
  }

  // ---------------------------------------------------------------
  // Icon & color pickers
  // ---------------------------------------------------------------

  iconBtns.forEach((btn) => {
    btn.addEventListener('click', (event) => {
      const selectedVal = (event.currentTarget as HTMLElement).getAttribute('data-icon-val') || 'Utensils';
      iconInput.value = selectedVal;

      iconBtns.forEach((b) => {
        b.classList.remove('border-blue-main', 'bg-blue-soft', 'text-primary');
        b.classList.add('border-border', 'text-muted-foreground');
      });

      (event.currentTarget as HTMLElement).classList.remove('border-border', 'text-muted-foreground');
      (event.currentTarget as HTMLElement).classList.add('border-blue-main', 'bg-blue-soft', 'text-primary');
    });
  });

  colorBtns.forEach((btn) => {
    btn.addEventListener('click', (event) => {
      const selectedVal = (event.currentTarget as HTMLElement).getAttribute('data-color-val') || 'text-blue-700 bg-blue-50';
      colorInput.value = selectedVal;

      colorBtns.forEach((b) => b.classList.remove('ring-2', 'ring-offset-2', 'ring-blue-main'));
      (event.currentTarget as HTMLElement).classList.add('ring-2', 'ring-offset-2', 'ring-blue-main');
    });
  });

  function setSelectedIconInPicker(val: string) {
    iconInput.value = val;
    iconBtns.forEach((btn) => {
      if (btn.getAttribute('data-icon-val') === val) {
        btn.classList.remove('border-border', 'text-muted-foreground');
        btn.classList.add('border-blue-main', 'bg-blue-soft', 'text-primary');
      } else {
        btn.classList.remove('border-blue-main', 'bg-blue-soft', 'text-primary');
        btn.classList.add('border-border', 'text-muted-foreground');
      }
    });
  }

  function setSelectedColorInPicker(val: string) {
    colorInput.value = val;
    colorBtns.forEach((btn) => {
      if (btn.getAttribute('data-color-val') === val) {
        btn.classList.add('ring-2', 'ring-offset-2', 'ring-blue-main');
      } else {
        btn.classList.remove('ring-2', 'ring-offset-2', 'ring-blue-main');
      }
    });
  }

  function getLucideIconHtml(iconName: string) {
    const template = document.querySelector(`#icon-templates template[data-icon-name="${iconName}"]`) as HTMLTemplateElement;
    if (template) return template.innerHTML;
    const defaultTemplate = document.querySelector(`#icon-templates template[data-icon-name="Utensils"]`) as HTMLTemplateElement;
    return defaultTemplate ? defaultTemplate.innerHTML : '';
  }

  // ---------------------------------------------------------------
  // List rendering
  // ---------------------------------------------------------------

  listContainer.addEventListener('click', (event) => {
    const trigger = (event.target as HTMLElement).closest('[data-empty-action="add-category"]');
    if (trigger) openModal(false);
  });

  async function renderCategories() {
    const allCategories = await getAllCategories();
    const filteredCategories = allCategories.filter(
      (cat) => cat.name.toLowerCase() !== 'koreksi saldo' && cat.type === currentTab
    );

    const storedOrder = readOrderForType(currentTab);
    let orderedCategories = sortCategoriesByStoredOrder(
      filteredCategories,
      sortMode ? workingOrder : storedOrder
    );

    if (sortMode && orderedCategories.length < 2) {
      sortMode = false;
      workingOrder = [];
      orderAtStart = [];
      orderedCategories = sortCategoriesByStoredOrder(filteredCategories, storedOrder);
    }

    renderedCategoryIds = orderedCategories.map((cat) => cat.id);
    if (sortMode) workingOrder = [...renderedCategoryIds];

    categoryCountBadge.textContent = `${orderedCategories.length} Kategori`;

    // Tombol dashed hanya tampil kalau tab aktif sudah punya kategori.
    openModalBtn.classList.toggle('hidden', orderedCategories.length === 0);
    updateSortUi();

    listContainer.className = sortMode ? 'space-y-2' : 'grid grid-cols-2 gap-3';

    if (orderedCategories.length === 0) {
      const label = currentTab === 'income' ? 'pemasukan' : 'pengeluaran';
      listContainer.innerHTML = emptyStateHtml({
        iconHtml: getLucideIconHtml('Utensils'),
        title: `Belum ada kategori ${label}`,
        description: 'Buat kategori agar transaksi lebih rapi dan mudah dicari kembali.',
        actionHtml: `
          <button
            type="button"
            data-empty-action="add-category"
            class="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-[11px] font-bold text-white shadow-xs transition hover:opacity-90 active:scale-95"
          >
            Tambah Kategori
          </button>
        `,
        className: sortMode ? '' : 'col-span-2',
      });
      return;
    }

    if (sortMode) {
      listContainer.innerHTML = orderedCategories
        .map((cat, index) => {
          const iconName = cat.icon || 'Utensils';
          const colorClass = cat.color || 'text-blue-700 bg-blue-50';
          const [textColor, bgColor] = colorClass.split(' ');

          return `
            <div
              class="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-xs"
              data-id="${escapeHtml(cat.id)}"
            >
              <div class="flex min-w-0 items-center gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${bgColor || 'bg-blue-50'} ${textColor || 'text-primary'}">
                  ${getLucideIconHtml(iconName)}
                </div>
                <span class="min-w-0 truncate text-xs font-bold text-foreground">${escapeHtml(cat.name)}</span>
              </div>
              <div class="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  class="sort-category-btn flex h-6 w-6 items-center justify-center rounded-lg border border-border bg-background text-primary transition hover:border-blue-main disabled:pointer-events-none disabled:opacity-20"
                  data-id="${escapeHtml(cat.id)}"
                  data-direction="up"
                  aria-label="Naikkan ${escapeHtml(cat.name)}"
                  ${index === 0 ? 'disabled' : ''}
                >
                  ${getLucideIconHtml('ChevronUp')}
                </button>
                <button
                  type="button"
                  class="sort-category-btn flex h-6 w-6 items-center justify-center rounded-lg border border-border bg-background text-primary transition hover:border-blue-main disabled:pointer-events-none disabled:opacity-20"
                  data-id="${escapeHtml(cat.id)}"
                  data-direction="down"
                  aria-label="Turunkan ${escapeHtml(cat.name)}"
                  ${index === orderedCategories.length - 1 ? 'disabled' : ''}
                >
                  ${getLucideIconHtml('ChevronDown')}
                </button>
              </div>
            </div>
          `;
        })
        .join('');

      listContainer.querySelectorAll<HTMLButtonElement>('.sort-category-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          moveCategory(
            btn.dataset.id || '',
            btn.dataset.direction === 'up' ? -1 : 1
          );
        });
      });
      return;
    }

    listContainer.innerHTML = orderedCategories
      .map((cat) => {
        const iconName = cat.icon || 'Utensils';
        const colorClass = cat.color || 'text-blue-700 bg-blue-50';
        const [textColor, bgColor] = colorClass.split(' ');

        return `
          <div
            class="category-card flex items-center gap-3 rounded-[22px] border border-border bg-card p-4 text-left shadow-soft transition-colors hover:bg-muted/40 active:scale-[0.99] cursor-pointer"
            data-id="${escapeHtml(cat.id)}"
            data-name="${escapeHtml(cat.name)}"
            data-type="${escapeHtml(cat.type)}"
            data-icon="${escapeHtml(iconName)}"
            data-color="${escapeHtml(colorClass)}"
          >
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${bgColor || 'bg-blue-50'} ${textColor || 'text-primary'}">
              ${getLucideIconHtml(iconName)}
            </div>
            <span class="min-w-0 truncate text-sm font-semibold text-foreground">${escapeHtml(cat.name)}</span>
          </div>
        `;
      })
      .join('');

    listContainer.querySelectorAll<HTMLElement>('.category-card').forEach((card) => {
      card.addEventListener('click', (event) => {
        const el = event.currentTarget as HTMLElement;
        const id = el.getAttribute('data-id') || '';
        const name = el.getAttribute('data-name') || '';
        const type = el.getAttribute('data-type') || 'expense';
        const iconName = el.getAttribute('data-icon') || 'Utensils';
        const colorClass = el.getAttribute('data-color') || 'text-blue-700 bg-blue-50';

        detailIconWrapper.className = 'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white';
        detailIconWrapper.innerHTML = getLucideIconHtml(iconName);
        detailName.textContent = name;

        if (type === 'income') {
          detailTypeBadge.textContent = 'Kategori Pemasukan';
        } else {
          detailTypeBadge.textContent = 'Kategori Pengeluaran';
        }

        detailEditBtn.onclick = () => {
          closeDialog(detailModal);
          editIdInput.value = id;
          nameInput.value = name;
          typeInput.value = type;
          setSelectedIconInPicker(iconName);
          setSelectedColorInPicker(colorClass);
          clearAllErrors(form);
          openModal(true);
        };

        detailDeleteBtn.onclick = async () => {
          if (detailDeleteBtn.dataset.busy === '1') return;

          const confirmed = await confirmAction({
            title: 'Hapus kategori?',
            message: `"${name}" akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`,
            confirmLabel: 'Hapus Kategori',
            variant: 'danger',
          });
          if (!confirmed) return;

          detailDeleteBtn.dataset.busy = '1';
          detailDeleteBtn.disabled = true;

          try {
            const res = await deleteCategory(id);
            closeDialog(detailModal);

            if (!res.success) {
              toast.error(res.message);
              return;
            }

            toast.success(res.message || 'Kategori berhasil dihapus.');
            await renderCategories();
          } catch {
            toast.error('Gagal menghapus kategori. Coba lagi.');
          } finally {
            detailDeleteBtn.dataset.busy = '0';
            detailDeleteBtn.disabled = false;
          }
        };

        openDialog(detailModal, '#close-detail-modal');
      });
    });
  }

  // ---------------------------------------------------------------
  // Validation + submit
  // ---------------------------------------------------------------

  clearOnInput([nameInput, typeInput]);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitBtn.dataset.busy === '1') return;

    const editId = editIdInput.value;
    const name = nameInput.value.trim();
    const type = typeInput.value as TransactionType;
    const icon = iconInput.value;
    const color = colorInput.value;

    const errors: FieldError[] = [];

    if (!name) {
      errors.push({ field: nameInput, message: 'Nama kategori wajib diisi.' });
    } else if (name.length > 30) {
      errors.push({ field: nameInput, message: 'Nama kategori maksimal 30 karakter.' });
    } else if (name.toLowerCase() === 'koreksi saldo') {
      errors.push({ field: nameInput, message: 'Nama ini dipakai sistem untuk penyesuaian saldo.' });
    } else {
      const existingCategories = await getAllCategories();
      const duplicate = existingCategories.some(
        (cat) =>
          cat.id !== editId &&
          cat.type === type &&
          cat.name.trim().toLowerCase() === name.toLowerCase()
      );
      if (duplicate) {
        errors.push({
          field: nameInput,
          message: `Kategori ${type === 'income' ? 'pemasukan' : 'pengeluaran'} dengan nama ini sudah ada.`,
        });
      }
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
        const res = await updateCategory(editId, { name, type, icon, color });
        if (!res.success) {
          toast.error(res.message);
          return;
        }
        toast.success(res.message);
      } else {
        const newId = await addCategory({ name, type, icon, color });
        if (!newId) {
          toast.error('Gagal menyimpan kategori.');
          return;
        }
        toast.success('Kategori berhasil ditambahkan.');
      }

      closeDialog(modal);
      switchTab(type);
    } catch {
      toast.error('Terjadi kesalahan saat menyimpan kategori. Coba lagi.');
    } finally {
      submitBtn.dataset.busy = '0';
      submitBtn.disabled = false;
      submitBtn.textContent = editId ? 'Perbarui Kategori' : 'Simpan Kategori';
    }
  });

  renderCategories();
}
