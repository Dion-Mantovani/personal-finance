let pointerDownTarget: EventTarget | null = null;
let mainOverflowBeforeLock: string | null = null;

function lockScroll(): void {
  document.documentElement.classList.add('overflow-hidden');

  const main = document.querySelector<HTMLElement>('main');
  if (main && mainOverflowBeforeLock === null) {
    mainOverflowBeforeLock = main.style.overflow;
    main.style.overflow = 'hidden';
  }
}

function unlockScrollIfNoOpenDialog(): void {
  if (document.querySelector('dialog[open]')) return;

  document.documentElement.classList.remove('overflow-hidden');

  const main = document.querySelector<HTMLElement>('main');
  if (main && mainOverflowBeforeLock !== null) {
    main.style.overflow = mainOverflowBeforeLock;
    mainOverflowBeforeLock = null;
  }
}

export function openDialog(
  dialog: HTMLDialogElement,
  focusSelector = '[data-autofocus]'
): void {
  if (dialog.open) return;

  dialog.showModal();
  lockScroll();

  const target = dialog.querySelector<HTMLElement>(focusSelector);
  window.setTimeout(() => target?.focus({ preventScroll: true }), 40);
}

export function closeDialog(dialog: HTMLDialogElement): void {
  if (dialog.open) dialog.close();
  unlockScrollIfNoOpenDialog();
}

/**
 * Pasang perilaku standar: klik backdrop menutup dialog dan scroll body
 * dikunci selama dialog terbuka.
 */
export function initDialog(
  dialog: HTMLDialogElement,
  onClose?: () => void
): void {
  dialog.addEventListener('pointerdown', (event) => {
    pointerDownTarget = event.target;
  });

  dialog.addEventListener('click', (event) => {
    // Klik hanya di area backdrop (target = elemen dialog), bukan panel isi.
    if (event.target === dialog && pointerDownTarget === dialog) {
      closeDialog(dialog);
    }
  });

  dialog.addEventListener('close', () => {
    pointerDownTarget = null;
    unlockScrollIfNoOpenDialog();
    onClose?.();
  });
}
