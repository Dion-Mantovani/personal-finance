/**
 * Escape teks sebelum dimasukkan ke innerHTML.
 * Dipakai untuk semua data yang berasal dari input pengguna (nama akun,
 * kategori, catatan transaksi, dsb).
 */
export function escapeHtml(value: string | number): string {
  return String(value).replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[char] ?? char;
  });
}
