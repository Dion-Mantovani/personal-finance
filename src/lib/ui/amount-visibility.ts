const STORAGE_KEY = 'pf:amounts-hidden';
const MASK = '••••••';

export function getAmountsHidden(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setAmountsHidden(hidden: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, hidden ? '1' : '0');
  } catch {
    // localStorage bisa diblokir; abaikan.
  }
}

export interface AmountFormatOptions {
  prefix?: string;
  suffix?: string;
  signed?: boolean;
}

/**
 * Format nominal untuk tampilan UI. Saat mode sembunyi aktif, teks diganti mask.
 * Nilai input form tidak memakai helper ini.
 */
export function formatRupiah(value: number, options: AmountFormatOptions = {}): string {
  if (getAmountsHidden()) return MASK;

  const absolute = Math.abs(value).toLocaleString('id-ID');
  const sign = options.signed && value < 0 ? '-' : '';
  return `${sign}${options.prefix ?? ''}Rp ${absolute}${options.suffix ?? ''}`;
}

export function getAmountMask(): string {
  return MASK;
}
