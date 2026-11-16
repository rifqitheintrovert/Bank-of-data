# Bank of Data Terminal

Terminal pasar lintas aset bergaya Bloomberg: saham IDX dan AS, indeks dunia, valas, komoditas, kripto, imbal hasil, makro, dan berita. **Semua angka berasal dari sumber data asli** dan diperbarui otomatis oleh GitHub Actions; tidak ada harga simulasi. Gratis, tanpa server, tanpa API key.

**Live:** https://rifqitheintrovert.github.io/Bank-of-data/ · **Repo:** https://github.com/rifqitheintrovert/Bank-of-data

> Bukan rekomendasi investasi. Data tertunda dan bisa salah. Cek ulang ke sumber resmi sebelum mengambil keputusan.

## Fungsi

Ketik `[KODE] [FUNGSI]` lalu Enter, mis. `BBCA GP`, `MEDC FA`, `XAUUSD`, `WEI`. Layout 1, 2, atau 4 panel; klik instrumen di satu panel mengganti instrumen di panel lain.

| Kode | Isi | Sumber |
|---|---|---|
| `WEI` | Indeks saham dunia per wilayah, return 1 hari s.d. 1 tahun | Yahoo Finance |
| `EQS` | Screener 89 saham IDX + 10 saham AS: return, nilai transaksi, PER, PBV, ROE, yield; urut dan saring per sektor | Yahoo Finance |
| `IMAP` | Peta panas IDX per sektor; ukuran = nilai transaksi / kapitalisasi, warna = return 1 hari / minggu / bulan | Yahoo Finance |
| `MOST` | Naik/turun terbesar, nilai transaksi, dekat high 52 minggu | Yahoo Finance |
| `GP` | Grafik lilin/garis, volume, MA20/50/200; intraday 15 menit (5 hari) dan harian (5 tahun) | Yahoo Finance |
| `DES` | Harga, return, volatilitas historis, valuasi, profitabilitas, target analis, deskripsi bisnis | Yahoo Finance |
| `FA` | Laba rugi, neraca, arus kas, rasio; 4-5 tahun fiskal | Yahoo Finance |
| `RV` | Valuasi relatif terhadap median sektor | Yahoo Finance |
| `CN` / `TOP` | Berita per instrumen / berita pasar per kategori (judul + tautan ke penerbit) | Google News RSS, CNBC Indonesia |
| `FXC` | Matriks kurs silang 9 mata uang + monitor pasangan | Yahoo Finance |
| `CMDT` | Komoditas (futures bulan terdekat): emas, perak, platinum, minyak, gas, tembaga, pertanian | Yahoo Finance |
| `CRYP` | Kripto, **harga live** | Binance (WebSocket) + Yahoo Finance |
| `YCRV` | Kurva US Treasury: terakhir vs 1 bulan vs 1 tahun lalu | The Fed H.15 (lewat DBnomics) |
| `ECO` | Fed funds, makro AS/Indonesia (opsional, lihat di bawah), perbandingan 8 negara | The Fed, FRED, World Bank |
| `OMON` | Rantai opsi **teoretis** Black-Scholes dari volatilitas historis; r dan volatilitas bisa diubah | hitungan sendiri |
| `PORT` / `ALRT` | Portofolio (nilai dan untung/rugi dalam rupiah) dan alert harga; tersimpan di browser | localStorage |
| `DATA` | Status tiap sumber, waktu data dibuat, instrumen yang tidak punya data | engine |

## Cara kerja

```
GitHub Actions (cron)                          GitHub Pages
┌─────────────────────────────────┐            ┌───────────────────────────┐
│ Yahoo Finance  harga, fundamental│            │ index.html + js/ + css/   │
│ The Fed/FRED   kurva UST, makro  │──engine──▶ │ data/quotes.json          │──▶ Browser / HP
│ World Bank     indikator tahunan │  (Python)  │ data/hist, intra, fund,   │
│ Google News, CNBC ID  berita     │            │      econ, news           │
└─────────────────────────────────┘            └───────────────────────────┘
                              Binance (WebSocket) ──harga kripto live──▶ Browser
```

- Jadwal: tiap 30 menit saat jam bursa BEI (Senin-Jumat), tiap 2 jam di luar itu. Halaman mengecek data baru tiap 5 menit.
- Kalau satu sumber gagal, engine memakai hasil terakhir yang berhasil dan menandainya di `DATA`. Kalau harga gagal total, deploy dibatalkan supaya data lama tetap tampil.
- Fundamental diambil bertahap dan disegarkan seminggu sekali (cache Actions).

## Deploy

1. **Settings → Pages → Source: GitHub Actions** (sekali saja).
2. Tab **Actions → Update Bank of Data → Run workflow**, atau cukup push ke `main`.
3. Buka `https://USERNAME.github.io/Bank-of-data/`. Bisa dipasang ke layar utama HP (Add to Home Screen).

### Opsional: makro lengkap
Settings → Secrets and variables → Actions → **New repository secret**:

| Secret | Fungsi |
|---|---|
| `FRED_API_KEY` | CPI, pengangguran, PDB, payrolls AS dan beberapa seri Indonesia di `ECO`. Key gratis dari fred.stlouisfed.org (akun → API Keys). Tanpa key, bagian itu nonaktif. |

## Jalankan di komputer sendiri

```bash
pip install -r requirements.txt
python -m engine.build                 # data asli → site/data
python -m engine.build --demo          # data ACAK untuk uji tampilan tanpa internet (muncul banner merah)
python -m http.server -d site 8000     # buka http://localhost:8000
```

Menambah instrumen: edit `engine/universe.py` (kode, simbol Yahoo, nama). Saham IDX: tambah di `engine/idx_names.json`.

## Keterbatasan (penting)

- **Bukan real-time.** Yahoo Finance tertunda ±10-15 menit, ditambah jeda jadwal 30 menit (atau 2 jam di luar jam BEI) dan keterlambatan cron GitHub 5-20 menit. Hanya kripto yang live.
- **Komoditas = futures, bukan spot.** `XAUUSD` memakai futures emas COMEX (`GC=F`), selisihnya beberapa dolar dari spot. CPO, nikel, dan batu bara tidak ada di sumber gratis (kontrak batu bara di Yahoo sudah tidak diperbarui, jadi dibuang).
- **Kurva SBN dan BI Rate tidak tersedia** dari sumber gratis yang stabil (PHEI/IBPA berbayar). Kalender rilis ekonomi juga tidak ada.
- **Makro terbatas tanpa key.** Situs FRED menolak akses dari server GitHub Actions, jadi tanpa `FRED_API_KEY` yang tampil hanya Fed funds efektif dan kurva UST (rilis H.15, terlambat beberapa hari kerja) serta tabel World Bank (tahunan; API-nya kadang lambat atau mati).
- **Bar harian hari berjalan** kadang belum ada di Yahoo; engine lalu menyusunnya dari bar 15 menit (volume bisa sedikit berbeda dari angka resmi bursa). Jumlahnya tercatat di `DATA`.
- **Fundamental dari Yahoo Finance**, bukan dari laporan keuangan resmi: sebagian pos kosong (terutama bank), emiten yang melapor dalam USD ditampilkan dalam mata uang laporannya, dan bisa terlambat dari rilis terbaru. Cocokkan dengan laporan emiten sebelum dipakai riset.
- **Opsi hanya teoretis.** BEI tidak punya opsi saham yang likuid; `OMON` bukan kuotasi pasar.
- **Berita hanya judul**, dicocokkan ke instrumen secara otomatis dari kode atau nama, jadi bisa meleset.
- **Cakupan IDX 89 saham** (likuid/kapitalisasi besar), bukan seluruh bursa. Untuk seluruh BEI dan sinyal kuantitatif pakai [IDX Quant Terminal](https://github.com/rifqitheintrovert/idx-quant-terminal).
- **Tidak ada:** riset bank investasi, rantai pasok terverifikasi, pelacakan kapal, order book, broker summary. Semua itu data berbayar/berlisensi.
- Yahoo Finance adalah sumber tidak resmi dan bisa berubah atau menolak akses kapan saja; status tiap sumber terlihat di `DATA`.

## Struktur

```
engine/   universe.py · idx_names.json · build.py
site/     index.html · css/terminal.css · js/{util,data,charts,funcs1,funcs2,app}.js · vendor/ · icons/ · data/ (dibuat Actions)
.github/workflows/update.yml
```

Chart: TradingView Lightweight Charts™ (Apache-2.0).
