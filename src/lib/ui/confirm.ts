import { closeDialog, initDialog, openDialog } from './dialog';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
}

let pendingResolve: ((value: boolean) => void) | null = null;
let wired = false;

function settle(value: boolean): void {
  const resolve = pendingResolve;
  pendingResolve = null;

  const dialog = document.getElementById(
    'app-confirm-dialog'
  ) as HTMLDialogElement | null;
  if (dialog?.open) closeDialog(dialog);

  resolve?.(value);
}

function wire(dialog: HTMLDialogElement): void {
  if (wired) return;
  wired = true;

  initDialog(dialog);
  document
    .getElementById('app-confirm-cancel')
    ?.addEventListener('click', () => settle(false));
  document
    .getElementById('app-confirm-ok')
    ?.addEventListener('click', () => settle(true));

  dialog.addEventListener('close', () => {
    if (!pendingResolve) return;
    const resolve = pendingResolve;
    pendingResolve = null;
    resolve(false);
  });
}

/**
 * Konfirmasi kustom pengganti window.confirm().
 * Resolve true hanya kalau pengguna menekan tombol konfirmasi.
 */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  const dialog = document.getElementById(
    'app-confirm-dialog'
  ) as HTMLDialogElement | null;
  const titleEl = document.getElementById('app-confirm-title');
  const messageEl = document.getElementById('app-confirm-message');
  const okBtn = document.getElementById('app-confirm-ok');
  const cancelBtn = document.getElementById('app-confirm-cancel');
  const iconEl = document.getElementById('app-confirm-icon');

  if (!dialog || !titleEl || !messageEl || !okBtn || !cancelBtn) {
    // Fallback terakhir kalau markup host tidak termuat.
    return Promise.resolve(window.confirm(options.message));
  }

  wire(dialog);

  if (pendingResolve) settle(false);

  return new Promise<boolean>((resolve) => {
    pendingResolve = resolve;

    titleEl.textContent = options.title;
    messageEl.textContent = options.message;
    okBtn.textContent = options.confirmLabel ?? 'Lanjutkan';
    cancelBtn.textContent = options.cancelLabel ?? 'Batal';

    const danger = options.variant === 'danger';

    okBtn.className = danger
      ? 'flex-1 rounded-xl bg-finance-red px-4 py-2.5 text-xs font-bold text-white transition hover:bg-red-600 active:scale-95'
      : 'flex-1 rounded-xl bg-accent-yellow px-4 py-2.5 text-xs font-bold text-brand-navy transition hover:bg-accent-yellow-hover active:scale-95';

    cancelBtn.className =
      'flex-1 rounded-xl bg-brand-light px-4 py-2.5 text-xs font-semibold text-text-primary transition hover:bg-slate-200 active:scale-95';

    if (iconEl) {
      iconEl.className = danger
        ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-finance-red/10 text-finance-red'
        : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-yellow/15 text-accent-yellow-hover';
    }

    openDialog(dialog, '#app-confirm-cancel');
  });
}
