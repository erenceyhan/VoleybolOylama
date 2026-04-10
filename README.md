# Takim Ismi Oylama Uygulamasi

Bu proje iki farkli modda calisabilir:

1. `Local demo modu`: veri sadece tarayicida tutulur.
2. `Supabase modu`: gercek uye kaydi, admin onayi, ortak oylar ve yorumlar veritabaninda tutulur.

## Su anki mimari

- `React + Vite + TypeScript`
- `Supabase Auth + Postgres`
- GitHub Pages ile uyumlu statik on yuz

## Yeni uyelik akisi

- Herkes `kullanici adi + sifre` ile kayit olur.
- Sifre kurali: en az `6` karakter ve en az `2` rakam.
- Yeni kayit olan uye once `onay bekliyor` durumunda kalir.
- Admin onay verince uye oy, yorum ve isim onerisi kullanabilir.
- Kullanicilar kendi yorumlarini, oylarini ve onerilerini silebilir.
- Admin gerekirse tum icerikleri gorebilir ve silebilir.

## Admin hesabi

Admin kullanici adi sabit olarak `erenceyhan` kabul edilir.

Ilk kurulumda admin hesabini once acman gerekir. Guvenlik nedeniyle admin sifresi kod icine yazilmadi. Istiyorsan ilk kayitta sifreni `eren2323` olarak kendin belirleyebilirsin.

## Guvenlik notu

- Sifreler goruntulenmez ve veritabaninda acik metin olarak tutulmaz.
- Supabase Auth sifreleri hash'li saklar.
- Bu nedenle "unutulan sifreyi veritabanindan bakip gormek" guvenli bir tasarim degildir ve uygulanmadi.

## Supabase kurulumu

### 1. SQL Editor

Supabase projesinde `SQL Editor` ac ve [supabase/schema.sql](/c:/Users/gamer/Desktop/oylama%20sistemi/supabase/schema.sql) dosyasinin guncel icerigini calistir.

Bu dosya sunlari ayarlar:

- `profiles`
- `suggestions`
- `votes`
- `comments`
- RLS policy kurallari
- kisi basi `3` onerilik limit
- admin onay fonksiyonu
- davet kodu mantigini kaldirma

Eger daha once eski SQL'i calistirdiysan yine problem degil; yeni dosya eski davet yapisini kapatacak sekilde hazirlandi.

### 2. Auth ayari

Supabase panelinde `Authentication > Providers > Email` altinda email/password acik olmali.

`Confirm email` kapali olmali.

### 3. Frontend env dosyasi

`.env` dosyasinda su alanlar olmali:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

## Onemli guvenlik notu

- Frontend tarafinda `postgresql://...` baglanti dizesi kullanilmaz.
- Frontend tarafinda sadece `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` kullanilir.
- Supabase arayuzunde buna `publishable key` deniyor olabilir; frontend icin kullanilmasi guvenli olan anahtar budur.
- `service_role` key ve gercek Postgres sifresi istemci koduna koyulmaz.

## Gelistirme

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 4173 --strictPort
```

Ardindan tarayicida:

```text
http://127.0.0.1:4173
```

## Build

```bash
npm run build
```

## GitHub Pages

- Bu repo GitHub Actions ile `main` branch'inden deploy olacak sekilde hazirlandi.
- Repo adi `VoleybolOylama` oldugu surece yayin adresi `https://erenceyhan.github.io/VoleybolOylama/` olacak.
- Eger ileride repo adini `erenceyhan.github.io` yaparsan veya custom domain baglarsan `vite.config.ts` icindeki otomatik base ayari kok dizine donecek sekilde zaten hazir.
- Public oldugu icin `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` degerleri `.env.production` icine eklendi.
