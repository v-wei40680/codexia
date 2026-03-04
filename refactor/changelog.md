# Refactor Changelog

Semua perubahan di dokumen ini mengikuti semantic versioning.

---

## [0.26.0] - 2026-03-03

### Added

- Mobile-aware layout path dengan deteksi `useIsMobile` di shell utama.
- Overlay drawer behavior untuk sidebar dan right panel pada mode mobile.
- Prosedur regenerate bindings (`codex app-server generate-ts -o src/bindings`) sebagai baseline compatibility step.

### Changed

- Root viewport layout diubah ke `100dvh` untuk behavior mobile yang lebih aman.
- Header/sidebar/settings spacing desktop offset disesuaikan agar hanya aktif di desktop Tauri.
- Compatibility layer terhadap bindings terbaru:
  - payload `ThreadStartParams`, `ThreadResumeParams`, `ThreadForkParams`, `TurnStartParams` diselaraskan.
  - `SandboxPolicy` mapping diupdate mengikuti schema terbaru.
  - event handling menghapus branch lama yang tidak lagi ada di bindings terbaru.
- Store config tidak lagi bergantung pada tipe personality/mode dari bindings lama; diganti type lokal terkontrol.

### Fixed

- Kegagalan compile karena missing bindings (`@/bindings*`) setelah setup baru.
- Kegagalan compile karena protocol/type mismatch antara kode lama dan output bindings baru.
- `npx tsc --noEmit` kembali lulus.

### Validation

- ✅ `codex app-server generate-ts -o src/bindings`
- ✅ `npx tsc --noEmit`

---

## [0.26.1] - 2026-03-03

### Changed

- Runtime guard event stream ditingkatkan untuk ekstraksi `threadId` tanpa `as any`.
- Deduplikasi event `turn/diff/updated` pada store dipertegas dengan tipe langsung.
- Normalisasi data thread menggunakan `ThreadLike` typed parsing pada service/settings.

### Validation

- ✅ `npx tsc --noEmit`

---

## [0.27.0] - 2026-03-03

### Added

- Mobile composer compact behavior (control wrapping dan compact sizing).
- Adaptive terminal height strategy untuk mobile viewport.
- Settings mobile single-column navigation via section selector.

### Changed

- Input area mobile menambahkan safe-area bottom padding dan tuning tinggi textarea.
- Tombol send/stop di composer dibuat lebih besar pada mobile.
- Thread list actions (pin/archive) dibuat visible pada mobile tanpa hover.
- Right panel files mode mobile diubah ke overlay tree + backdrop dismiss.

### Validation

- ✅ `npx tsc --noEmit`

---

## [0.27.1] - 2026-03-03

### Changed

- `AppLayout` melakukan lazy loading untuk view non-kritis guna menurunkan beban initial load.
- Menambahkan `Suspense` fallback ringan saat perpindahan ke view async.
- View utama (`codex`, `history`) tetap eager untuk menjaga responsivitas alur utama.

### Validation

- ✅ `npx tsc --noEmit`
- ✅ `npm run build`
- ℹ️ `bunx tsc --noEmit` tidak tersedia di environment saat validasi.
- ⚠️ Headless smoke test (`390x844`, `768x1024`, `1366x768`) dijalankan via static preview; ditemukan 404/ws backend dependency, runtime error `transformCallback/dimensions`, dan overflow lebar root.
