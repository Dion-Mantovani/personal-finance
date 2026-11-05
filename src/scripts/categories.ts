
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
    setSelectedColorInPicker('text-brand-navy bg-amber-50');
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

  tabExpenseBtn.addEventListener('click', () => switchTab('expense'));
  tabIncomeBtn.addEventListener('click', () => switchTab('income'));

  function switchTab(tab: TransactionType) {
    currentTab = tab;
    typeInput.value = tab;

    if (tab === 'expense') {
      tabExpenseBtn.className = 'tab-btn flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-200 bg-white text-brand-navy shadow-xs';
      tabIncomeBtn.className = 'tab-btn flex-1 py-2.5 rounded-xl font-medium text-xs text-text-secondary hover:text-brand-navy flex items-center justify-center gap-1.5 transition-all duration-200';
      categorySectionTitle.textContent = 'Kategori Pengeluaran';
    } else {
      tabIncomeBtn.className = 'tab-btn flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-200 bg-white text-brand-navy shadow-xs';
      tabExpenseBtn.className = 'tab-btn flex-1 py-2.5 rounded-xl font-medium text-xs text-text-secondary hover:text-brand-navy flex items-center justify-center gap-1.5 transition-all duration-200';
      categorySectionTitle.textContent = 'Kategori Pemasukan';
    }

    renderCategories();
  }

  // ---------------------------------------------------------------
  // Icon & color pickers
  // ---------------------------------------------------------------

  iconBtns.forEach((btn) => {
    btn.addEventListener('click', (event) => {
      const selectedVal = (event.currentTarget as HTMLElement).getAttribute('data-icon-val') || 'Utensils';
      iconInput.value = selectedVal;

      iconBtns.forEach((b) => {
        b.classList.remove('border-accent-yellow', 'bg-accent-yellow/10', 'text-brand-navy');
        b.classList.add('border-brand-border', 'text-text-secondary');
      });

      (event.currentTarget as HTMLElement).classList.remove('border-brand-border', 'text-text-secondary');
      (event.currentTarget as HTMLElement).classList.add('border-accent-yellow', 'bg-accent-yellow/10', 'text-brand-navy');
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
        btn.classList.remove('border-brand-border', 'text-text-secondary');
        btn.classList.add('border-accent-yellow', 'bg-accent-yellow/10', 'text-brand-navy');
      } else {
        btn.classList.remove('border-accent-yellow', 'bg-accent-yellow/10', 'text-brand-navy');
        btn.classList.add('border-brand-border', 'text-text-secondary');
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

    categoryCountBadge.textContent = `${filteredCategories.length} Kategori`;

    if (filteredCategories.length === 0) {
      const label = currentTab === 'income' ? 'pemasukan' : 'pengeluaran';
      listContainer.innerHTML = emptyStateHtml({
        iconHtml: getLucideIconHtml('Utensils'),
        title: `Belum ada kategori ${label}`,
        description: 'Buat kategori agar transaksi lebih rapi dan mudah dicari kembali.',
        actionHtml: `
          <button
            type="button"
            data-empty-action="add-category"
            class="inline-flex items-center gap-1.5 rounded-xl bg-accent-yellow px-4 py-2 text-[11px] font-bold text-brand-navy shadow-xs transition hover:bg-accent-yellow-hover active:scale-95"
          >
            Tambah Kategori
          </button>
        `,
        className: 'col-span-2',
      });
      return;
    }

    listContainer.innerHTML = filteredCategories.map((cat) => {
      const iconName = cat.icon || 'Utensils';
      const colorClass = cat.color || 'text-brand-navy bg-amber-50';
      const [textColor, bgColor] = colorClass.split(' ');

      return `
        <div 
          class="category-card p-3.5 border border-brand-border/80 rounded-2xl bg-white shadow-xs hover:border-accent-yellow hover:shadow-md transition cursor-pointer flex items-center gap-3"
          data-id="${escapeHtml(cat.id)}"
          data-name="${escapeHtml(cat.name)}"
          data-type="${escapeHtml(cat.type)}"
          data-icon="${escapeHtml(iconName)}"
          data-color="${escapeHtml(colorClass)}"
        >
          <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${bgColor || 'bg-amber-50'} ${textColor || 'text-brand-navy'} shadow-xs border border-brand-border/50">
            ${getLucideIconHtml(iconName)}
          </div>
          <div class="min-w-0">
            <p class="font-bold text-brand-navy text-sm truncate">${escapeHtml(cat.name)}</p>
            <p class="text-[11px] text-text-secondary font-medium mt-0.5">${cat.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</p>
          </div>
        </div>
      `;
    }).join('');

    document.querySelectorAll<HTMLElement>('.category-card').forEach((card) => {
      card.addEventListener('click', (event) => {
        const el = event.currentTarget as HTMLElement;
        const id = el.getAttribute('data-id') || '';
        const name = el.getAttribute('data-name') || '';
        const type = el.getAttribute('data-type') || 'expense';
        const iconName = el.getAttribute('data-icon') || 'Utensils';
        const colorClass = el.getAttribute('data-color') || 'text-brand-navy bg-amber-50';

        const [textColor, bgColor] = colorClass.split(' ');

        detailIconWrapper.className = `w-14 h-14 rounded-2xl mx-auto flex items-center justify-center shadow-xs border border-brand-border/50 mb-3 ${bgColor} ${textColor}`;
        detailIconWrapper.innerHTML = getLucideIconHtml(iconName);
        detailName.textContent = name;
        
        if (type === 'income') {
          detailTypeBadge.textContent = 'Pemasukan';
          detailTypeBadge.className = 'text-xs font-semibold px-3 py-1 rounded-full bg-finance-green/10 text-finance-green';
        } else {
          detailTypeBadge.textContent = 'Pengeluaran';
          detailTypeBadge.className = 'text-xs font-semibold px-3 py-1 rounded-full bg-rose-50 text-finance-red';
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
