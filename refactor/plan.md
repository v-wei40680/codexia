# Codexia Refactor Plan (Mobile-Friendly + Binding Compatibility)

## Scope

Dokumen ini mencatat rencana refactor bertahap dari awal sampai selesai untuk:

1. Mobile-friendly optimization (UI/UX dan responsive behavior)
2. Stabilitas tipe terhadap `codex app-server generate-ts` bindings terbaru
3. Validasi teknis (TypeScript strict check)

Baseline referensi kerja:

- Branch: `feat/mobile-friendly-optimization`
- Environment: Linux/web mode + Tauri-compatible frontend
- Validation target: `npx tsc --noEmit`

---

## Semver Strategy

Rencana ini menggunakan semantic versioning untuk refactor internal:

- **MAJOR**: perubahan API publik atau behavior utama yang incompatibility
- **MINOR**: penambahan fitur/refactor kompatibel (mobile mode baru, compatibility update)
- **PATCH**: perbaikan bug/non-breaking cleanup

Roadmap versi:

- `v0.26.0` → Refactor wave utama (mobile foundation + bindings compatibility)
- `v0.26.1` → Stabilization patch (typing cleanup & edge-case UX)
- `v0.27.0` → Enhancement wave (mobile UX phase lanjutan)
- `v0.27.1` → Validation + performance hardening

---

## Phase 1 — Mobile Layout Foundation (`v0.26.0`)

### Objective

Membuat shell layout utama menjadi mobile-aware tanpa mematahkan desktop behavior.

### Implemented

- Menambahkan mode mobile berbasis `useIsMobile` pada layout root.
- Mengubah container viewport root dari fixed desktop ke mobile-safe viewport (`100dvh`).
- Menonaktifkan behavior split panel desktop ketika mobile mode aktif.
- Menambahkan overlay/drawer behavior untuk:
  - Sidebar (left drawer + backdrop close)
  - Right panel (right drawer + backdrop close)
- Menambahkan auto-initial collapse saat pertama masuk mode mobile.
- Menormalkan offset header/sidebar/settings (`pl-20`) agar hanya aktif pada desktop Tauri.

### Technical Notes

- Desktop path tetap memakai `ResizablePanelGroup`.
- Mobile path dipisah secara eksplisit agar lifecycle panel desktop tidak mengganggu.
- Perubahan fokus di `AppLayout`, `MainHeader`, `SideBar`, `SettingsView`.

### Success Criteria

- Tidak ada horizontal split paksa di mobile.
- Sidebar/right panel dapat dibuka-tutup via overlay.
- Header spacing tidak boros di mobile/web.

---

## Phase 2 — Bindings Compatibility Refactor (`v0.26.0`)

### Objective

Menyelaraskan kode frontend terhadap hasil `generate-ts` terbaru agar strict TypeScript lulus.

### Implemented

- Menjalankan ulang bindings generation:
  - `codex app-server generate-ts -o src/bindings`
- Menyesuaikan service/state dari schema lama ke schema baru:
  - `SandboxPolicy` mapping baru
  - `Thread*Params` field yang deprecated dihapus dari payload
  - `UserInput` text payload disesuaikan
- Menghapus ketergantungan tipe lama (`Personality`, `ModeKind`) dari bindings lama, diganti tipe lokal store.
- Menyesuaikan event handling yang tidak ada lagi di schema baru (contoh event plan delta lama).
- Menyesuaikan komponen approval/skills untuk field yang tidak lagi wajib/tersedia.
- Menyesuaikan bentuk respons untuk request user input store.

### Technical Notes

- Fokus patch pada kompatibilitas compile-time, mempertahankan behavior semaksimal mungkin.
- Beberapa field tambahan list params tetap diteruskan secara kompatibel melalui object extension.

### Success Criteria

- Error `Cannot find module '@/bindings...'` hilang.
- Error mismatch tipe protocol lama vs baru hilang.
- `npx tsc --noEmit` berhasil.

---

## Phase 3 — Mobile UX & Interaction Enhancement (`v0.27.0`, Completed)

### Objective

Meningkatkan kenyamanan pemakaian di device kecil setelah foundation siap.

### Implemented (Phase 3A)

- Composer mobile compact behavior:
  - toolbar controls wrap di viewport sempit
  - select width diperkecil untuk menjaga ruang input
  - kontrol plan toggle ditingkatkan touch area
- Input area mobile improvements:
  - safe-area padding bawah
  - textarea mobile height tuning
  - tombol send/stop diperbesar untuk touch
- Bottom terminal adaptive height:
  - mobile menggunakan `42dvh`
  - desktop mempertahankan tinggi setara `18rem`
- Thread list touch-first actions:
  - tombol pin/archive tetap terlihat di mobile (tidak tergantung hover)

### Implemented (Phase 3B)

- Right panel files mode mobile optimization:
  - file tree default hidden saat mobile
  - file tree dibuka sebagai overlay panel dengan backdrop close
  - viewer tetap full-width agar tidak sempit saat tree aktif
- Settings mobile navigation polish:
  - mode mobile memakai top bar + section selector
  - pemilihan section via dropdown (single-column flow)
  - mempertahankan desktop settings split layout tanpa regresi

### Success Criteria

- Navigasi utama nyaman one-hand usage.
- Tidak ada elemen kontrol kecil/bertabrakan di viewport sempit.
- Tidak ada overflow UX kritikal di chat composer/terminal.

---

## Phase 4 — Hardening & Cleanup (`v0.26.1`, Completed)

### Objective

Menurunkan technical debt pasca compatibility patch.

### Implemented

- Menambahkan runtime guard terstruktur untuk ekstraksi `threadId` dari event stream.
- Menghapus penggunaan `as any` pada event reasoning/thread/turn path yang sudah bisa ditipkan langsung.
- Memperketat tipe deduplikasi event `turn/diff/updated` pada store.
- Menambahkan tipe `ThreadLike` eksplisit pada normalisasi thread service/settings agar parsing response lebih aman.
- Menjaga compile strict tetap hijau setelah hardening (`npx tsc --noEmit`).

### Success Criteria

- Type safety lebih konsisten.
- Maintenance lintas versi protocol lebih mudah.

---

## Phase 5 — Validation & Performance Hardening (`v0.27.1`, Completed)

### Objective

Meningkatkan kesiapan rilis dengan validasi build penuh dan mengurangi beban initial load.

### Implemented

- Melakukan audit hasil bundle production untuk mengidentifikasi hotspot module berat.
- Mengubah import view non-kritis di `AppLayout` menjadi lazy loading + `Suspense` fallback:
  - `SettingsView`
  - `AgentsView`
  - `UsageView`
  - `MarketplaceView`
  - `CCView`
  - `LoginView`
  - `LearnView`
  - `AutoMationsView`
- Menjaga view inti (`codex`, `history`) tetap eager agar UX utama tetap responsif.
- Menambahkan loading fallback ringan untuk transisi view asynchronous.

### Validation Notes

- `bunx tsc --noEmit` tidak tersedia di environment ini (`bunx: command not found`).
- Validasi TS fallback berhasil melalui `npx tsc --noEmit`.
- Production build berhasil melalui `npm run build`.
- Output build menunjukkan chunk split view berjalan (chunk per-view terpisah muncul).

### Success Criteria

- Initial bundle tidak lagi membawa seluruh view sekaligus.
- Validasi compile/build tetap hijau pasca-optimasi.

---

## Validation Checklist

- [x] Generate bindings berhasil
- [x] TypeScript check (`npx tsc --noEmit`) hijau
- [x] Phase 3A compile check (`npx tsc --noEmit`) hijau
- [x] Phase 3B compile check (`npx tsc --noEmit`) hijau
- [x] Phase 5 compile check (`npx tsc --noEmit`) hijau
- [x] Phase 5 production build (`npm run build`) hijau
- [x] Headless smoke run executed (`refactor/smoke/summary.json`)
- [ ] Mobile manual smoke test (390x844)
- [ ] Tablet smoke test (768x1024)
- [ ] Desktop regression sanity check

### Smoke Test Findings (2026-03-04)

- Eksekusi smoke test headless selesai untuk viewport:
  - 390x844
  - 768x1024
  - 1366x768
- Artefak hasil disimpan di:
  - `refactor/smoke/summary.json`
  - `refactor/smoke/*.png`
- Temuan utama:
  - Request API `404` di mode static preview (backend app-server tidak aktif).
  - WebSocket `/ws` handshake gagal di preview static (expected jika endpoint backend tidak ada).
  - Runtime error `transformCallback` sudah ditrace ke unguarded `@tauri-apps/api/event.listen` di web mode dan dipatch.
  - Terdeteksi horizontal overflow (`rootScrollWidth = 50000`) pada semua viewport.
- Status akhir smoke:
  - Functional backend-dependent flow belum bisa dianggap pass tanpa app-server live.
  - UI overflow issue terkonfirmasi dan sudah dipatch di `BottomTerminal` (deferred xterm init saat panel tertutup).
  - Re-run smoke setelah patch menunjukkan overflow sudah hilang di semua viewport (`rootScrollWidth == rootClientWidth`).
  - Re-run smoke setelah patch listener guard menunjukkan error `transformCallback` tidak muncul lagi; tersisa error `404` backend dependency.

---

## Rollout Notes

1. Pertahankan command generate bindings sebagai bagian workflow development.
2. Jalankan TS check setelah setiap wave refactor.
3. Untuk merge utama, pisahkan commit berdasarkan phase (layout vs bindings) agar review lebih mudah.
