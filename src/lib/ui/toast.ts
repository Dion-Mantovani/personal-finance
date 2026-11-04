export type ToastVariant = 'success' | 'error' | 'info';

interface FlashToast {
  message: string;
  variant: ToastVariant;
}

const FLASH_KEY = 'pf:flash-toast';
const MAX_TOASTS = 3;
const DEFAULT_DURATION = 4000;

const ICONS: Record<ToastVariant, string> = {
  success: '<path d="M20 6 9 17l-5-5"/>',
  error:
    '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
};

const VARIANT_STYLES: Record<ToastVariant, { border: string; icon: string }> = {
  success: {
    border: 'border-finance-green/25',
    icon: 'bg-finance-green/10 text-finance-green',
  },
  error: {
    border: 'border-finance-red/25',
    icon: 'bg-finance-red/10 text-finance-red',
  },
  info: {
    border: 'border-accent-yellow/40',
    icon: 'bg-accent-yellow/10 text-accent-yellow-hover',
  },
};

function dismissToast(item: HTMLElement): void {
  if (item.dataset.leaving === '1') return;
  item.dataset.leaving = '1';
  item.classList.remove('toast-item-visible');
  item.classList.add('toast-item-leaving');
  window.setTimeout(() => item.remove(), 220);
}

export function showToast(
  message: string,
  variant: ToastVariant = 'success',
  duration = DEFAULT_DURATION
): void {
  const host = document.getElementById('toast-host');
  if (!host || !message) return;

  while (host.children.length >= MAX_TOASTS) {
    host.firstElementChild?.remove();
  }

  const styles = VARIANT_STYLES[variant];

  const item = document.createElement('div');
  item.className = `toast-item pointer-events-auto flex items-start gap-3 rounded-2xl border ${styles.border} bg-white p-3 shadow-xl`;
  item.setAttribute('role', variant === 'error' ? 'alert' : 'status');

  const icon = document.createElement('span');
  icon.className = `mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${styles.icon}`;
  icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" aria-hidden="true">${ICONS[variant]}</svg>`;

  const text = document.createElement('p');
  text.className = 'min-w-0 flex-1 text-[12px] font-semibold leading-snug text-brand-navy';
  text.textContent = message;

  const close = document.createElement('button');
  close.type = 'button';
  close.className =
    'shrink-0 rounded-md p-0.5 text-text-secondary transition hover:text-brand-navy active:scale-95';
  close.setAttribute('aria-label', 'Tutup notifikasi');
  close.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
  close.addEventListener('click', () => dismissToast(item));

  item.append(icon, text, close);
  host.appendChild(item);

  requestAnimationFrame(() => item.classList.add('toast-item-visible'));
  window.setTimeout(() => dismissToast(item), duration);
}

export const toast = {
  success: (message: string) => showToast(message, 'success'),
  error: (message: string) => showToast(message, 'error'),
  info: (message: string) => showToast(message, 'info'),
};

/**
 * Simpan pesan sukses sebelum redirect (full page load), lalu ditampilkan
 * oleh ToastHost di halaman tujuan.
 */
export function setFlash(message: string, variant: ToastVariant = 'success'): void {
  try {
    sessionStorage.setItem(FLASH_KEY, JSON.stringify({ message, variant }));
  } catch {
    // sessionStorage bisa diblokir (mode privat tertentu); abaikan.
  }
}

export function consumeFlash(): void {
  try {
    const raw = sessionStorage.getItem(FLASH_KEY);
    if (!raw) return;
    sessionStorage.removeItem(FLASH_KEY);

    const parsed = JSON.parse(raw) as Partial<FlashToast>;
    if (typeof parsed.message !== 'string' || !parsed.message) return;

    const variant: ToastVariant =
      parsed.variant === 'error' || parsed.variant === 'info'
        ? parsed.variant
        : 'success';
    showToast(parsed.message, variant);
  } catch {
    // Data flash rusak / tidak bisa dibaca: jangan ganggu halaman.
  }
}
