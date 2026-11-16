"""Daftar instrumen terminal. Setiap instrumen punya simbol Yahoo Finance; yang tidak punya data otomatis dibuang."""
from __future__ import annotations

import json
from pathlib import Path

# (kode, simbol Yahoo, nama, wilayah)
INDEX = [
    ("IHSG", "^JKSE", "IDX Composite", "Indonesia"),
    ("LQ45", "^JKLQ45", "LQ45", "Indonesia"),
    ("SPX", "^GSPC", "S&P 500", "Amerika"),
    ("DJI", "^DJI", "Dow Jones Industrial", "Amerika"),
    ("NDX", "^NDX", "Nasdaq 100", "Amerika"),
    ("RTY", "^RUT", "Russell 2000", "Amerika"),
    ("VIX", "^VIX", "CBOE Volatility Index", "Amerika"),
    ("UKX", "^FTSE", "FTSE 100", "Eropa"),
    ("DAX", "^GDAXI", "DAX", "Eropa"),
    ("CAC", "^FCHI", "CAC 40", "Eropa"),
    ("SX5E", "^STOXX50E", "Euro Stoxx 50", "Eropa"),
    ("N225", "^N225", "Nikkei 225", "Asia-Pasifik"),
    ("HSI", "^HSI", "Hang Seng", "Asia-Pasifik"),
    ("SHCOMP", "000001.SS", "Shanghai Composite", "Asia-Pasifik"),
    ("KOSPI", "^KS11", "KOSPI", "Asia-Pasifik"),
    ("TWSE", "^TWII", "Taiwan Weighted", "Asia-Pasifik"),
    ("SENSEX", "^BSESN", "BSE Sensex", "Asia-Pasifik"),
    ("STI", "^STI", "Straits Times", "Asia-Pasifik"),
    ("KLCI", "^KLSE", "FBM KLCI", "Asia-Pasifik"),
    ("SET", "^SET.BK", "SET Thailand", "Asia-Pasifik"),
    ("AS51", "^AXJO", "S&P/ASX 200", "Asia-Pasifik"),
]
# (kode, simbol Yahoo, nama, desimal)
FX = [
    ("USDIDR", "IDR=X", "Dolar AS / Rupiah", 0),
    ("EURIDR", "EURIDR=X", "Euro / Rupiah", 0),
    ("SGDIDR", "SGDIDR=X", "Dolar Singapura / Rupiah", 0),
    ("JPYIDR", "JPYIDR=X", "Yen / Rupiah", 2),
    ("EURUSD", "EURUSD=X", "Euro / Dolar AS", 4),
    ("GBPUSD", "GBPUSD=X", "Pound / Dolar AS", 4),
    ("USDJPY", "JPY=X", "Dolar AS / Yen", 2),
    ("AUDUSD", "AUDUSD=X", "Dolar Australia / Dolar AS", 4),
    ("USDSGD", "SGD=X", "Dolar AS / Dolar Singapura", 4),
    ("USDCNY", "CNY=X", "Dolar AS / Yuan", 4),
    ("USDMYR", "MYR=X", "Dolar AS / Ringgit", 4),
    ("DXY", "DX-Y.NYB", "Indeks Dolar AS", 2),
]
# Komoditas = kontrak futures bulan terdekat di Yahoo (bukan harga spot). (kode, simbol, nama, satuan, desimal)
COMDTY = [
    ("XAUUSD", "GC=F", "Emas, futures COMEX (pendekatan spot)", "USD/oz", 2),
    ("XAGUSD", "SI=F", "Perak, futures COMEX", "USD/oz", 3),
    ("PLAT", "PL=F", "Platinum, futures NYMEX", "USD/oz", 2),
    ("COPPER", "HG=F", "Tembaga, futures COMEX", "USD/lb", 4),
    ("WTI", "CL=F", "Minyak mentah WTI", "USD/bbl", 2),
    ("BRENT", "BZ=F", "Minyak mentah Brent", "USD/bbl", 2),
    ("NATGAS", "NG=F", "Gas alam Henry Hub", "USD/MMBtu", 3),
    ("COAL", "MTF=F", "Batu bara API2 Rotterdam", "USD/ton", 2),
    ("CORN", "ZC=F", "Jagung CBOT", "USc/bu", 2),
    ("WHEAT", "ZW=F", "Gandum CBOT", "USc/bu", 2),
    ("SOY", "ZS=F", "Kedelai CBOT", "USc/bu", 2),
    ("COFFEE", "KC=F", "Kopi arabika ICE", "USc/lb", 2),
    ("SUGAR", "SB=F", "Gula ICE No.11", "USc/lb", 2),
    ("COCOA", "CC=F", "Kakao ICE", "USD/ton", 0),
]
# (kode, simbol Yahoo, nama, simbol Binance untuk harga live di browser)
CRYPTO = [
    ("BTCUSD", "BTC-USD", "Bitcoin", "BTCUSDT"),
    ("ETHUSD", "ETH-USD", "Ethereum", "ETHUSDT"),
    ("SOLUSD", "SOL-USD", "Solana", "SOLUSDT"),
    ("BNBUSD", "BNB-USD", "BNB", "BNBUSDT"),
    ("XRPUSD", "XRP-USD", "XRP", "XRPUSDT"),
    ("DOGEUSD", "DOGE-USD", "Dogecoin", "DOGEUSDT"),
    ("ADAUSD", "ADA-USD", "Cardano", "ADAUSDT"),
]
# Imbal hasil US Treasury dari Yahoo (dalam persen)
RATE = [
    ("US3M", "^IRX", "US T-Bill 13 minggu"),
    ("US5Y", "^FVX", "US Treasury 5 tahun"),
    ("US10Y", "^TNX", "US Treasury 10 tahun"),
    ("US30Y", "^TYX", "US Treasury 30 tahun"),
]
# (kode, simbol Yahoo, nama, sektor)
US_EQ = [
    ("AAPL", "AAPL", "Apple", "Technology"), ("MSFT", "MSFT", "Microsoft", "Technology"),
    ("NVDA", "NVDA", "NVIDIA", "Technology"), ("AMZN", "AMZN", "Amazon.com", "Consumer Cyclicals"),
    ("GOOGL", "GOOGL", "Alphabet", "Technology"), ("META", "META", "Meta Platforms", "Technology"),
    ("TSLA", "TSLA", "Tesla", "Consumer Cyclicals"), ("JPM", "JPM", "JPMorgan Chase", "Financials"),
    ("XOM", "XOM", "Exxon Mobil", "Energy"), ("BRKB", "BRK-B", "Berkshire Hathaway B", "Financials"),
]


def instruments() -> list[dict]:
    """Semua instrumen sebagai dict: code, y (simbol Yahoo), name, type, grp, ccy, dp, + kolom khusus."""
    idx = json.loads((Path(__file__).parent / "idx_names.json").read_text(encoding="utf-8"))
    out = []
    for code, (name, sector) in idx.items():
        out.append({"code": code, "y": code + ".JK", "name": name, "type": "EQUITY", "grp": "IDX", "sector": sector, "ccy": "IDR", "dp": 0})
    for code, y, name, sector in US_EQ:
        out.append({"code": code, "y": y, "name": name, "type": "EQUITY", "grp": "US", "sector": sector, "ccy": "USD", "dp": 2})
    for code, y, name, region in INDEX:
        out.append({"code": code, "y": y, "name": name, "type": "INDEX", "grp": region, "ccy": "", "dp": 2})
    for code, y, name, dp in FX:
        out.append({"code": code, "y": y, "name": name, "type": "FX", "grp": "FX", "ccy": "", "dp": dp})
    for code, y, name, unit, dp in COMDTY:
        out.append({"code": code, "y": y, "name": name, "type": "COMDTY", "grp": "Komoditas", "ccy": "USD", "unit": unit, "dp": dp})
    for code, y, name, bn in CRYPTO:
        out.append({"code": code, "y": y, "name": name, "type": "CRYPTO", "grp": "Kripto", "ccy": "USD", "bn": bn, "dp": None})
    for code, y, name in RATE:
        out.append({"code": code, "y": y, "name": name, "type": "RATE", "grp": "Suku bunga", "ccy": "", "dp": 3})
    return out
