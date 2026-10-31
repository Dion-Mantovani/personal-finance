# Product Requirement Document (PRD): Personal Finance App (Offline-First)

## 1. Project Overview
Personal Finance App adalah aplikasi pencatatan dan pengelolaan keuangan pribadi berbasis web yang mengusung pendekatan **Mobile-First** dan **Offline-First**. Aplikasi ini dirancang ultra-ringan, responsif, dan independen dari server eksternal untuk menjamin privasi data keuangan pengguna serta aksesibilitas tanpa koneksi internet.

- **Target User:** Pengguna pribadi yang membutuhkan pencatatan kas harian (Pemasukan, Pengeluaran, dan Transfer) secara cepat, intuitif, dan tanpa ribet.
- **Visual Design System:** Light mode base (`#F8FAFC`), Navy accents (`#0B132B`), Green/Red untuk indikator finansial, Amber (`#F59E0B`) untuk highlight aksi utama, serta elemen *glassmorphism* dan *Extended FAB*.

---

## 2. Tech Stack & Environment
- **Framework:** Astro (Static Site Generation / SSG)
- **Styling:** Tailwind CSS (v4)
- **Package Manager:** `pnpm`
- **Iconography:** `@lucide/astro`
- **Client-Side Database:** IndexedDB dengan pembungkus library `idb`
- **Architecture Style:** Pure Client-Side / Offline-First Single Page Application (SPA) behavior inside Astro components.

---

## 3. Core Features & Capabilities

### A. Core MVP (Completed)
1. **Accounts / Wallet Management (`/accounts`):**
   - CRUD Akun / Dompet Keuangan (BCA, Cash, E-Wallet, dll).
   - Card Total Saldo gabungan dengan indikator visual & 3 micro info (Jumlah Wallet, Dompet Utama/Top Wallet, Aktivitas Bulan Ini).
   - Pengaturan awal saldo dengan auto-kalkulasi "Koreksi Saldo".
   - Custom Icon & Color picker untuk setiap akun.
   - Flow Edit/Hapus via Modal Detail saat list item diklik.

2. **Categories Management (`/categories`):**
   - CRUD Kategori Transaksi.
   - Filter Tabs Segmented Control: *Pengeluaran (Expense)* vs *Pemasukan (Income)*.
   - Layout Grid 2 Kolom untuk keterbacaan yang ringkas di mobile.
   - Flow Edit/Hapus via Modal Detail saat list item diklik.

3. **Transaction History (`/history`):**
   - Log riwayat transaksi lengkap dengan *Grouping* berdasarkan tanggal (Descending).
   - Action Bar 1 baris yang fleksibel: **Month Picker** fungsional (sebelumnya/selanjutnya dengan format bulan singkatan seperti *Mei 2026*) & 3 quick icon buttons (Search, Filter, Export).
   - Quick Filter Tabs: *Semua*, *Keluar*, *Masuk*, dan *Transfer*.
   - Direct Edit Navigation: Klik pada list item langsung mengarah ke `/transactions?id={txId}` untuk pengeditan cepat.
   - Tampilan item dengan hierarki: Catatan/Deskripsi sebagai Headline utama, Kategori & Akun sebagai sub-teks.

4. **Transaction Entry & Form (`/transactions`):**
   - Dynamic Form untuk 3 tipe transaksi: *Pengeluaran*, *Pemasukan*, dan *Transfer Antar Akun*.
   - Segmented Control Tabs di bagian paling atas untuk pemilihan tipe transaksi secara cepat.
   - Input Nominal angka berukuran besar (*gagah & bold*) di bagian atas form.
   - Custom Dropdown Picker dengan icon & warna untuk Akun Asal, Akun Tujuan (Khusus Transfer), dan Kategori.
   - Dynamic Action Buttons: Mode Tambah (*Batal* & *Simpan Transaksi*) vs Mode Edit (*Hapus Transaksi* & *Perbarui*).

5. **Navigation & Structural Layout:**
   - Universal Reusable `<Header />` dengan tombol *Back* kondisional.
   - Extended Floating Action Button (FAB) di kanan bawah (Icon Plus + Teks "Tambah Akun" / "Catat Transaksi") yang berada di zona jempol (*thumb-zone ergonomics*).
   - Standardized Bottom Navigation Bar.

---

## 4. Current Phase & Next Requirements (Immediate Roadmap)

Saat ini proyek berada di fase **UI Refinement & Micro-Interactions UX**. Tugas utama selanjutnya adalah mengimplementasikan:

1. **Empty States:** Tampilan ilustrasi/teks placeholder yang estetik ketika data Akun, Kategori, atau Riwayat Transaksi masih kosong.
2. **Toast / Alert Notifications:** Feedback visual non-intrusif saat berhasil atau gagal menambah, memperbarui, atau menghapus data (menggantikan `alert()` bawaan browser).
3. **Confirmation Modals:** Modal konfirmasi kustom sebelum eksekusi tindakan destruktif (seperti menghapus Akun, Kategori, atau Transaksi).
4. **Form Validations:** Highlight visual red border/message pada field yang belum diisi.

---

## 5. IndexedDB Data Schema (`idb`)

Aplikasi menggunakan database bernama `finance_db` dengan versi schema `1`. 

```typescript
// src/types/finance.ts

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Account {
  id: string; // UUID v4 / Timestamp string
  name: string;
  balance: number; // Saldo awal / target balance
  icon: string; // Lucide icon name
  color: string; // Tailwind class string misal 'text-brand-navy bg-amber-50'
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  accountId: string; // Source account ID
  toAccountId?: string; // Target account ID (Only for 'transfer')
  categoryId: string;
  date: string; // YYYY-MM-DD
  note?: string;
  createdAt: string;
}
```

### Business Logic Rule for Accounts Balance Calculation:
Saldo terkini (*Current Balance*) sebuah akun tidak disimpan statis, melainkan dihitung secara terisolasi via fungsi JS:
`Current Balance = Initial Account Balance + Sum(Incomes) - Sum(Expenses) - Sum(Transfers Out) + Sum(Transfers In)`

---

## 6. Project Directory Structure

```text
├── src/
│   ├── components/
│   │   ├── Header.astro            # Reusable Header Component
│   │   └── BottomNav.astro         # Reusable Fixed Bottom Navigation
│   ├── layouts/
│   │   └── Layout.astro            # Global Base Layout (Fonts, Global CSS)
│   ├── lib/
│   │   └── db/
│   │       ├── index.ts            # IndexedDB Initialization (idb)
│   │       ├── accounts.ts         # Account CRUD & Balance logic
│   │       ├── categories.ts       # Category CRUD logic
│   │       └── transactions.ts     # Transaction CRUD logic
│   ├── pages/
│   │   ├── index.astro             # Dashboard Summary
│   │   ├── accounts.astro          # Manage Accounts Page
│   │   ├── categories.astro        # Manage Categories Page
│   │   ├── history.astro           # Transaction Logs Page
│   │   └── transactions.astro      # Transaction Entry / Edit Form
│   └── types/
│       └── finance.ts              # TypeScript interfaces
├── package.json
└── astro.config.mjs
```

---

## 7. Guidelines for OpenCode Execution
- **Pakai pnpm:** Selalu gunakan `pnpm` untuk menambah paket jika diperlukan.
- **Pertahankan UI Consistency:** Gunakan warna `brand-navy` (`#0B132B`), `accent-yellow` (`#F59E0B`), `finance-green`, dan `finance-red` yang sudah dikonfigurasi di Tailwind CSS.
- **Strict Client-Side JS:** Jangan memindahkan logika database ke Backend / API Endpoints. Semua transaksi data murni di-handle di browser via file modul `lib/db/*`.
- **Lucide Icons:** Gunakan paket `@lucide/astro` untuk komponen Astro statis, dan `template` HTML hidden jika butuh pemanggilan ikon dinamis di sisi script client.
```
eof

File PRD dalam format Markdown telah berhasil dibuat di editor. Lu bisa langsung ekspor atau bagikan file tersebut ke OpenCode atau AI agent lainnya!