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

## [0.26.1] - Planned

### Planned

- Hardening tipe untuk mengurangi `any` pada event/service layer.
- Normalisasi type guard untuk approval/request-user-input flow.
- Dokumentasi workflow regenerate bindings + troubleshooting matrix versi Codex CLI.

---

## [0.27.0] - Planned

### Planned

- Mobile UX enhancement wave:
  - Composer compact layout
  - Touch target optimization
  - Adaptive terminal height
  - Thread action UX touch-first
  - Settings mobile navigation polishing

