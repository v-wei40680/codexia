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

## Phase 3 — Mobile UX & Interaction Enhancement (`v0.27.0`, Planned)

### Objective

Meningkatkan kenyamanan pemakaian di device kecil setelah foundation siap.

### Planned Work

- Composer compact mode untuk mobile:
  - Toolbar wrapping
  - Touch target >= 40px
  - Pengurangan kontrol sekunder di viewport sempit
- Bottom terminal height adaptif berdasarkan viewport.
- Thread list touch-first actions (tidak mengandalkan hover).
- Right panel files mode mobile optimization (tree default hidden + reveal action lebih jelas).
- Settings view mobile single-column navigation polish.

### Success Criteria

- Navigasi utama nyaman one-hand usage.
- Tidak ada elemen kontrol kecil/bertabrakan di viewport sempit.
- Tidak ada overflow UX kritikal di chat composer/terminal.

---

## Phase 4 — Hardening & Cleanup (`v0.26.1`, Planned)

### Objective

Menurunkan technical debt pasca compatibility patch.

### Planned Work

- Mengurangi `any` yang masih tersisa pada layer event/service.
- Memperketat tipe object response user input dan approval flow.
- Menambahkan guard runtime untuk perbedaan minor schema lintas versi Codex CLI.
- Tambah dokumentasi internal untuk prosedur regenerate bindings.

### Success Criteria

- Type safety lebih konsisten.
- Maintenance lintas versi protocol lebih mudah.

---

## Validation Checklist

- [x] Generate bindings berhasil
- [x] TypeScript check (`npx tsc --noEmit`) hijau
- [ ] Mobile manual smoke test (390x844)
- [ ] Tablet smoke test (768x1024)
- [ ] Desktop regression sanity check

---

## Rollout Notes

1. Pertahankan command generate bindings sebagai bagian workflow development.
2. Jalankan TS check setelah setiap wave refactor.
3. Untuk merge utama, pisahkan commit berdasarkan phase (layout vs bindings) agar review lebih mudah.

