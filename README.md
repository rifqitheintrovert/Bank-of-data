# Bank of Data Terminal

Clone terminal pasar bergaya terminal profesional, jalan penuh di browser (HTML/CSS/JS statis, tanpa build).

**Online:** `https://rifqitheintrovert.github.io/Bank-of-data/` (aktifkan lewat Settings → Pages → Branch `main`, folder `/ (root)`).

## Cara pakai
Ketik `[KODE] [FUNGSI]` di command line lalu Enter, mis. `BBCA GP`, `MEDC FA`, `WEI`, `HELP`. Klik baris tabel untuk membuka grafik. Layout 1/2/4 panel di kanan atas.

## Fungsi
| Kode | Isi |
|---|---|
| WEI | Indeks saham dunia |
| EQS | Monitor saham IDX + global |
| IMAP | Peta panas saham IDX per sektor |
| GP | Grafik harga (lilin/garis, volume, SMA20/50) |
| DES | Deskripsi instrumen |
| FA | Laba rugi, neraca, arus kas, rasio (ilustrasi) |
| SPLC | Rantai pasok |
| OMON | Rantai opsi Black-Scholes |
| FXC | Matriks kurs silang |
| YCRV | Kurva imbal hasil SBN vs UST |
| CMDT / CRYP | Monitor komoditas / kripto |
| ECO | Kalender ekonomi + indikator makro |
| TOP | Berita (headline contoh) |
| MOST | Top gainer, loser, nilai transaksi |
| PORT / ALRT | Portofolio dan alert harga (localStorage) |

## Sumber data
- **LIVE:** kripto via Binance WebSocket + riwayat Binance REST; kurs FX via Frankfurter.
- **SIM:** saham, indeks, komoditas, kurva imbal hasil, makro, berita, laporan keuangan, opsi adalah data simulasi/ilustrasi untuk demo tampilan. Label `SIM`/`LIVE` tampil di tiap tabel.
- Bukan nasihat investasi. Ganti sumber SIM dengan API berlisensi (mis. Twelve Data, Finnhub, IDX) lewat `js/data.js`.

## Struktur
`index.html`, `css/terminal.css`, `js/{util,data,charts,funcs1,funcs2,app}.js`
