# Nevua Chat

Aplikasi chat sederhana berbasis Next.js dan Supabase.

## Fitur

- Login user dan admin
- Chat pribadi dan grup
- Status online/offline
- Upload gambar dan file
- Manajemen user oleh admin
- Realtime message dengan Supabase

## Menjalankan Project

Install dependency:

```bash
npm install
```

Buat file `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Jalankan aplikasi:

```bash
npm run dev
```

Buka `http://localhost:3000` di browser.

## Database

Migration Supabase berada di folder `supabase/migrations`.

Untuk menerapkan migration ke project Supabase:

```bash
npx supabase db push
```

## Command

```bash
npm run dev        # Development server
npm run build      # Production build
npm run start      # Jalankan production build
npm run typecheck  # Cek TypeScript
```
