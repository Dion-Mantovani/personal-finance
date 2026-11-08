/**
 * Helper format nominal khusus UI.
 *
 * Nilai yang disimpan ke database tetap berupa number mentah (mis. 20500).
 * Helper ini hanya mengatur tampilan input agar memakai pemisah ribuan (20.500).
 */

export function formatNumberInput(value: string): string {
  const digits = value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!digits) return '';

  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function parseNumberInput(value: string): number {
  const digits = value.replace(/\D/g, '');
  return digits ? Number(digits) : NaN;
}

function applyFormat(input: HTMLInputElement, preserveCaret: boolean): void {
  const raw = input.value;
  const caret = input.selectionStart ?? raw.length;
  const digitsBeforeCaret = preserveCaret
    ? raw.slice(0, caret).replace(/\D/g, '').length
    : 0;

  const formatted = formatNumberInput(raw);
  if (input.value !== formatted) input.value = formatted;

  if (!preserveCaret || document.activeElement !== input) return;

  let position = formatted.length;
  if (digitsBeforeCaret === 0) {
    position = 0;
  } else {
    let seen = 0;
    for (let index = 0; index < formatted.length; index += 1) {
      if (/\d/.test(formatted[index])) {
        seen += 1;
        if (seen === digitsBeforeCaret) {
          position = index + 1;
          break;
        }
      }
    }
  }

  input.setSelectionRange(position, position);
}

/**
 * Pasang format ribuan real-time pada input nominal.
 * Input sebaiknya bertipe text + inputmode numeric, bukan type="number",
 * karena type="number" tidak bisa menampilkan pemisah ribuan.
 */
export function bindCurrencyInput(input: HTMLInputElement): void {
  input.addEventListener('input', () => applyFormat(input, true));
  input.addEventListener('blur', () => applyFormat(input, false));
}
