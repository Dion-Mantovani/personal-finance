export interface FieldError {
  field: HTMLElement;
  message: string;
}

function getFieldContainer(field: HTMLElement): HTMLElement | null {
  return field.closest<HTMLElement>('[data-field]') ?? field.parentElement;
}

export function setFieldError(field: HTMLElement, message: string): void {
  const container = getFieldContainer(field);
  if (!container) return;

  field.dataset.invalid = 'true';
  field.setAttribute('aria-invalid', 'true');

  let errorEl = container.querySelector<HTMLElement>('[data-field-error]');
  if (!errorEl) {
    errorEl = document.createElement('p');
    errorEl.setAttribute('data-field-error', '');
    errorEl.className = 'mt-1 text-[11px] font-semibold leading-snug text-finance-red';
    container.appendChild(errorEl);
  }

  if (!errorEl.id) {
    errorEl.id = `field-error-${field.id || Math.random().toString(36).slice(2, 8)}`;
  }

  errorEl.textContent = message;
  field.setAttribute('aria-describedby', errorEl.id);
}

export function clearFieldError(field: HTMLElement): void {
  delete field.dataset.invalid;
  field.removeAttribute('aria-invalid');

  const container = getFieldContainer(field);
  if (!container) return;

  const errorEl = container.querySelector<HTMLElement>('[data-field-error]');
  if (!errorEl) return;

  if (field.getAttribute('aria-describedby') === errorEl.id) {
    field.removeAttribute('aria-describedby');
  }
  errorEl.remove();
}

export function clearAllErrors(container: ParentNode): void {
  container.querySelectorAll<HTMLElement>('[data-invalid="true"]').forEach((field) => {
    delete field.dataset.invalid;
    field.removeAttribute('aria-invalid');
    field.removeAttribute('aria-describedby');
  });

  container.querySelectorAll('[data-field-error]').forEach((el) => el.remove());
}

/**
 * Tampilkan semua error dan fokus ke field pertama yang invalid.
 * Return true kalau ada error.
 */
export function showFieldErrors(errors: FieldError[]): boolean {
  if (errors.length === 0) return false;

  errors.forEach(({ field, message }) => setFieldError(field, message));

  const first = errors[0]?.field;
  if (first) {
    first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => first.focus({ preventScroll: true }), 260);
  }

  return true;
}

/**
 * Hapus error sebuah field begitu pengguna mengetik / mengubah nilai.
 */
export function clearOnInput(fields: HTMLElement[]): void {
  fields.forEach((field) => {
    const eventName = field instanceof HTMLSelectElement ? 'change' : 'input';
    field.addEventListener(eventName, () => clearFieldError(field));
  });
}
