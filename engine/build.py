"""Bangun data situs dari sumber publik (tanpa API key).

  python -m engine.build --out site/data --cache .cache      data asli
  python -m engine.build --out site/data --demo              data ACAK untuk uji tampilan tanpa internet

Keluaran: quotes.json, hist/<KODE>.json, intra/<KODE>.json, econ.json, news.json, fund.json
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import logging
import math
import re
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import requests

from .universe import instruments

log = logging.getLogger("build")
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"}
FIELDS = ["Open", "High", "Low", "Close", "Volume"]
NOW = lambda: datetime.now(timezone.utc)  # noqa: E731


def sig(x, n: int = 7):
    """Bulatkan ke n angka penting; NaN/inf -> None."""
    try:
        x = float(x)
    except (TypeError, ValueError):
        return None
    return float(f"{x:.{n}g}") if math.isfinite(x) else None


def dump(path: Path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def load(path: Path, default=None):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return default


# ---------------------------------------------------------------- Yahoo Finance (harga)
def _split(df, symbols):
    out = {}
    if df is None or df.empty:
        return out
    if not isinstance(df.columns, pd.MultiIndex):
        if len(symbols) == 1:
            out[symbols[0]] = df[[c for c in FIELDS if c in df.columns]].dropna(subset=["Close"]).copy()
        return out
    lv0 = set(df.columns.get_level_values(0))
    for s in symbols:
        try:
            sub = df[s] if s in lv0 else df.xs(s, axis=1, level=1)
        except KeyError:
            continue
        sub = sub[[c for c in FIELDS if c in sub.columns]].dropna(subset=["Close"]).copy()
        if len(sub):
            out[s] = sub
    return out


def fetch_yahoo(symbols, interval="1d", period="5y", chunk=90, retries=3):
    """OHLCV per simbol. Dipecah per `chunk` agar ramah rate-limit; simbol yang gagal dicoba ulang satu per satu."""
    import yfinance as yf

    res, last_err = {}, None
    for i in range(0, len(symbols), chunk):
        part = symbols[i:i + chunk]
        for attempt in range(retries):
            try:
                df = yf.download(part, period=period, interval=interval, group_by="ticker",
                                 auto_adjust=False, threads=True, progress=False, timeout=30)
                got = _split(df, part)
                if got:
                    res.update(got)
                    break
            except Exception as e:  # noqa: BLE001
                last_err = e
            time.sleep(4 * (attempt + 1))
        time.sleep(1.0)
    for s in [s for s in symbols if s not in res][:40]:
        try:
            one = yf.download(s, period=period, interval=interval, auto_adjust=False, threads=False, progress=False, timeout=30)
            if one is not None and not one.empty:
                if isinstance(one.columns, pd.MultiIndex):
                    one.columns = one.columns.get_level_values(0)
                one = one[[c for c in FIELDS if c in one.columns]].dropna(subset=["Close"])
                if len(one):
                    res[s] = one
        except Exception as e:  # noqa: BLE001
            last_err = e
    return res, last_err


def norm_daily(df):
    idx = pd.to_datetime(df.index)
    if idx.tz is not None:
        idx = idx.tz_localize(None)
    df = df.copy()
    df.index = idx.normalize()
    return df[~df.index.duplicated(keep="last")].sort_index()


def series_json(df, intraday=False):
    df = df.sort_index()
    if intraday:
        idx = pd.to_datetime(df.index)
        idx = idx.tz_localize("UTC") if idx.tz is None else idx.tz_convert("UTC")
        t = [int(x.timestamp()) for x in idx]
    else:
        t = [x.strftime("%Y-%m-%d") for x in df.index]
    vol = df["Volume"].fillna(0) if "Volume" in df else pd.Series(0, index=df.index)
    return {"t": t, "o": [sig(x) for x in df["Open"]], "h": [sig(x) for x in df["High"]], "l": [sig(x) for x in df["Low"]],
            "c": [sig(x) for x in df["Close"]], "v": [int(x) if math.isfinite(x) else 0 for x in vol]}


def quote(df, ann=252):
    """Ringkasan harga dari bar harian: terakhir, sebelumnya, return, rentang 52 minggu, volatilitas historis."""
    c = df["Close"].astype(float)
    last = float(c.iloc[-1])
    prev = float(c.iloc[-2]) if len(c) > 1 else None

    def ret(n):
        return sig(last / float(c.iloc[-1 - n]) - 1, 5) if len(c) > n and c.iloc[-1 - n] > 0 else None

    yr = c.index[-1].year
    base = c[c.index.year < yr]
    lr = np.log(c[c > 0]).diff().dropna()

    def hv(n):
        return sig(float(lr.tail(n).std()) * math.sqrt(ann), 4) if len(lr) >= n else None

    v = df["Volume"].fillna(0).astype(float) if "Volume" in df else pd.Series(0.0, index=df.index)
    row = df.iloc[-1]
    return {"p": sig(last), "pc": sig(prev), "o": sig(row["Open"]), "h": sig(row["High"]), "l": sig(row["Low"]),
            "v": int(v.iloc[-1]), "d": c.index[-1].strftime("%Y-%m-%d"),
            "r1w": ret(5), "r1m": ret(21), "r3m": ret(63), "r1y": ret(252),
            "ytd": sig(last / float(base.iloc[-1]) - 1, 5) if len(base) else None,
            "hi": sig(df["High"].tail(252).max()), "lo": sig(df["Low"].tail(252).min()),
            "val": sig(float((c * v).tail(20).mean()), 5), "hv30": hv(30), "hv90": hv(90),
            "sp": [sig(x, 5) for x in c.tail(30)]}


# ---------------------------------------------------------------- FRED (makro AS + beberapa seri Indonesia, kurva UST)
def fred(sid: str, start: str):
    r = requests.get("https://fred.stlouisfed.org/graph/fredgraph.csv", params={"id": sid, "cosd": start}, headers=UA, timeout=25)
    r.raise_for_status()
    rows = []
    for i, line in enumerate(csv.reader(io.StringIO(r.text))):
        if i == 0 or len(line) < 2:
            continue
        try:
            rows.append((line[0], float(line[1])))
        except ValueError:
            continue
    return rows


MACRO = [  # (negara, nama, seri FRED, satuan, cara hitung)
    ("US", "Fed Funds target (batas atas)", "DFEDTARU", "%", "level"),
    ("US", "Inflasi CPI YoY", "CPIAUCSL", "%", "yoy"),
    ("US", "Inflasi CPI inti YoY", "CPILFESL", "%", "yoy"),
    ("US", "Tingkat pengangguran", "UNRATE", "%", "level"),
    ("US", "PDB riil QoQ (disetahunkan)", "A191RL1Q225SBEA", "%", "level"),
    ("US", "Non-farm payrolls (perubahan bulanan)", "PAYEMS", "ribu", "diff"),
    ("US", "Selisih imbal hasil 10Y-2Y", "T10Y2Y", "%", "level"),
    ("ID", "Imbal hasil obligasi pemerintah 10Y", "IRLTLT01IDM156N", "%", "level"),
    ("ID", "Inflasi CPI YoY", "IDNCPIALLMINMEI", "%", "yoy"),
    ("ID", "Suku bunga antarbank 3 bulan", "IR3TIB01IDM156N", "%", "level"),
]
CURVE = [("1M", "DGS1MO"), ("3M", "DGS3MO"), ("6M", "DGS6MO"), ("1Y", "DGS1"), ("2Y", "DGS2"), ("3Y", "DGS3"),
         ("5Y", "DGS5"), ("7Y", "DGS7"), ("10Y", "DGS10"), ("20Y", "DGS20"), ("30Y", "DGS30")]


def fetch_macro():
    start = (NOW() - timedelta(days=365 * 3)).strftime("%Y-%m-%d")
    cutoff = (NOW() - timedelta(days=540)).strftime("%Y-%m-%d")
    out, fails = [], []
    for cty, name, sid, unit, how in MACRO:
        try:
            rows = fred(sid, start)
            if not rows or rows[-1][0] < cutoff:        # seri sudah tidak diperbarui -> jangan tampilkan sebagai angka terkini
                fails.append(sid + " (usang)")
                continue
            d, v = rows[-1]
            pv = rows[-2][1] if len(rows) > 1 else None
            if how == "yoy":
                by = dict(rows)
                def yoy(date):
                    b = by.get(str(int(date[:4]) - 1) + date[4:])
                    return (by[date] / b - 1) * 100 if b else None
                v, pv = yoy(d), (yoy(rows[-2][0]) if len(rows) > 1 else None)
                if v is None:
                    fails.append(sid + " (yoy)")
                    continue
            elif how == "diff":
                if len(rows) < 3:
                    continue
                v, pv = rows[-1][1] - rows[-2][1], rows[-2][1] - rows[-3][1]
            out.append({"cty": cty, "name": name, "val": sig(v, 4), "prev": sig(pv, 4), "unit": unit, "date": d, "src": "FRED " + sid})
        except Exception as e:  # noqa: BLE001
            fails.append(f"{sid} ({type(e).__name__})")
        time.sleep(0.25)
    if not out:
        raise RuntimeError("semua seri FRED gagal: " + ", ".join(fails))
    return out, fails


def fetch_curve():
    start = (NOW() - timedelta(days=420)).strftime("%Y-%m-%d")
    data = {}
    for ten, sid in CURVE:
        try:
            data[ten] = fred(sid, start)
        except Exception as e:  # noqa: BLE001
            log.warning("kurva %s gagal: %s", sid, e)
        time.sleep(0.25)
    if len(data) < 6:
        raise RuntimeError("kurva UST: hanya %d tenor" % len(data))
    last_date = max(rows[-1][0] for rows in data.values() if rows)

    def at(rows, date):
        best = None
        for d, v in rows:
            if d <= date:
                best = v
        return best

    def shift(days):
        return (datetime.strptime(last_date, "%Y-%m-%d") - timedelta(days=days)).strftime("%Y-%m-%d")

    tenors = [t for t, _ in CURVE if data.get(t)]
    return {"date": last_date, "tenors": tenors,
            "now": [at(data[t], last_date) for t in tenors],
            "m1": [at(data[t], shift(30)) for t in tenors],
            "y1": [at(data[t], shift(365)) for t in tenors],
            "src": "FRED (US Treasury par yield, seri DGS)"}


# ---------------------------------------------------------------- World Bank (indikator tahunan lintas negara)
WB = [("NY.GDP.MKTP.KD.ZG", "Pertumbuhan PDB riil", "%"), ("FP.CPI.TOTL.ZG", "Inflasi (CPI, rata-rata tahunan)", "%"),
      ("SL.UEM.TOTL.ZS", "Pengangguran (estimasi ILO)", "%"), ("BN.CAB.XOKA.GD.ZS", "Transaksi berjalan (% PDB)", "%"),
      ("NY.GDP.MKTP.CD", "PDB nominal", "USD")]
WB_CTY = ["IDN", "USA", "CHN", "JPN", "IND", "SGP", "MYS", "DEU"]


def fetch_wb():
    out = []
    for ind, name, unit in WB:
        try:
            r = requests.get(f"https://api.worldbank.org/v2/country/{';'.join(WB_CTY)}/indicator/{ind}",
                             params={"format": "json", "mrnev": 1, "per_page": 100}, headers=UA, timeout=25)
            r.raise_for_status()
            rows = {x["countryiso3code"]: [sig(x["value"], 5), x["date"]] for x in r.json()[1] if x.get("value") is not None}
            if rows:
                out.append({"ind": ind, "name": name, "unit": unit, "rows": rows})
        except Exception as e:  # noqa: BLE001
            log.warning("World Bank %s gagal: %s", ind, e)
        time.sleep(0.25)
    if not out:
        raise RuntimeError("World Bank gagal semua")
    return out


# ---------------------------------------------------------------- Berita (RSS: Google News, CNBC Indonesia)
GN_ID = "https://news.google.com/rss/search?q={q}&hl=id&gl=ID&ceid=ID:id"
GN_EN = "https://news.google.com/rss/search?q={q}&hl=en-US&gl=US&ceid=US:en"
FEEDS = [
    ("Pasar ID", GN_ID.format(q="IHSG+saham+when:3d")), ("Pasar ID", GN_ID.format(q="bursa+efek+indonesia+asing+when:3d")),
    ("Pasar ID", "https://www.cnbcindonesia.com/market/rss"),
    ("Makro ID", GN_ID.format(q="Bank+Indonesia+suku+bunga+rupiah+when:3d")),
    ("Komoditas", GN_ID.format(q="harga+emas+dunia+when:3d")), ("Komoditas", GN_ID.format(q="harga+batu+bara+minyak+mentah+when:3d")),
    ("Global", GN_EN.format(q="Wall+Street+stocks+Fed+when:2d")), ("Global", GN_EN.format(q="Treasury+yields+inflation+when:2d")),
    ("Komoditas", GN_EN.format(q="gold+price+oil+price+when:2d")), ("Kripto", GN_EN.format(q="bitcoin+crypto+market+when:2d")),
]
TICKER_FEED = GN_ID.format(q="{t}+saham+when:14d")
AMBIG = {"RAJA", "MEGA", "BUKA", "PANI", "CUAN", "INDY", "ESSA", "HEAL", "SILO", "ACES", "AVIA"}   # kode yang juga kata umum
KEYS = [(r"\b(gold|emas)\b", "XAUUSD"), (r"\bbitcoin\b", "BTCUSD"), (r"\bethereum\b", "ETHUSD"), (r"\b(oil|crude|minyak mentah)\b", "WTI"),
        (r"\b(coal|batu bara|batubara)\b", "COAL"), (r"\brupiah\b", "USDIDR"), (r"\bIHSG\b", "IHSG"),
        (r"(wall street|s&p 500)", "SPX"), (r"\bnasdaq\b", "NDX"), (r"\b(treasury|yield)", "US10Y")]
_CODE = re.compile(r"(?<![A-Za-z])[A-Z]{4}(?![A-Za-z])")


def parse_feed(url):
    import feedparser
    try:
        r = requests.get(url, headers=UA, timeout=15)
        if r.status_code != 200:
            return []
        fp = feedparser.parse(r.content)
    except Exception as e:  # noqa: BLE001
        log.warning("feed gagal %s: %s", url[:70], e)
        return []
    items = []
    for e in fp.entries:
        title = (e.get("title") or "").strip()
        src = ""
        if " - " in title:
            title, src = title.rsplit(" - ", 1)
        src = src or (e.get("source", {}) or {}).get("title", "") or re.sub(r"^https?://(www\.)?", "", url).split("/")[0]
        ts = None
        for k in ("published_parsed", "updated_parsed"):
            if e.get(k):
                ts = datetime(*e[k][:6], tzinfo=timezone.utc)
                break
        if title and ts:
            items.append({"title": title, "source": src, "link": e.get("link", ""), "ts": ts})
    return items


def fetch_news(inst, cache_path: Path, budget_s=120):
    idx = {i["code"]: i["name"] for i in inst if i["grp"] == "IDX"}
    # alias = 2 kata pertama nama emiten (3 kata untuk bank, agar "Bank Negara"/"Bank Syariah" tidak salah cocok)
    alias = {c: " ".join(n.split()[:3 if n.lower().startswith("bank") else 2]).lower() for c, n in idx.items()}
    cache = load(cache_path, {}) or {}
    news = {n["id"]: n for n in cache.get("items", [])}
    seen_tk = cache.get("tk", {})
    now = NOW()

    def tags(title):
        low = title.lower()
        out = {c for c in _CODE.findall(title) if c in idx and c not in AMBIG}
        out |= {c for c, a in alias.items() if len(a) > 7 and a in low}
        out |= {code for pat, code in KEYS if re.search(pat, title, re.I)}
        return out

    def add(it, cat, extra=()):
        key = hashlib.md5(it["title"].lower().encode()).hexdigest()[:10]
        k = sorted(tags(it["title"]) | set(extra))
        if key in news:
            news[key]["k"] = sorted(set(news[key]["k"]) | set(k))
            return
        news[key] = {"id": key, "t": it["title"][:220], "s": it["source"][:40], "u": it["link"], "ts": int(it["ts"].timestamp()), "c": cat, "k": k}

    got = 0
    for cat, url in FEEDS:
        items = parse_feed(url)
        got += len(items)
        for it in items[:40]:
            add(it, cat)
    t0 = time.time()
    todo = sorted(idx, key=lambda c: seen_tk.get(c, 0))          # yang paling lama belum dicek lebih dulu
    for c in todo:
        if time.time() - t0 > budget_s or now.timestamp() - seen_tk.get(c, 0) < 6 * 3600:
            break
        kept = 0
        for it in parse_feed(TICKER_FEED.format(t=c)):
            low = it["title"].lower()
            hit = (alias[c] in low) or (f"({c})" in it["title"]) or (c not in AMBIG and re.search(rf"(?<![A-Za-z]){c}(?![A-Za-z])", it["title"]))
            if hit:
                add(it, "Emiten", [c])
                kept += 1
                if kept >= 8:
                    break
        seen_tk[c] = int(now.timestamp())
        time.sleep(0.4)
    cut = now.timestamp() - 14 * 86400
    items = sorted((n for n in news.values() if n["ts"] >= cut), key=lambda n: -n["ts"])[:900]
    dump(cache_path, {"items": items, "tk": seen_tk})
    if not got and not items:
        raise RuntimeError("semua feed berita gagal")
    return items


# ---------------------------------------------------------------- Fundamental (Yahoo Finance: info + laporan tahunan)
INFO = {"mcap": "marketCap", "shares": "sharesOutstanding", "pe": "trailingPE", "fpe": "forwardPE", "pbv": "priceToBook",
        "ps": "priceToSalesTrailing12Months", "ev_ebitda": "enterpriseToEbitda", "eps": "trailingEps", "bvps": "bookValue",
        "roe": "returnOnEquity", "roa": "returnOnAssets", "npm": "profitMargins", "opm": "operatingMargins", "gpm": "grossMargins",
        "rev_g": "revenueGrowth", "eps_g": "earningsGrowth", "der": "debtToEquity", "cr": "currentRatio", "dps": "dividendRate",
        "payout": "payoutRatio", "beta": "beta", "emp": "fullTimeEmployees",
        "tp": "targetMeanPrice", "tp_hi": "targetHighPrice", "tp_lo": "targetLowPrice", "n_an": "numberOfAnalystOpinions"}
TEXT = {"industry": "industry", "ysector": "sector", "web": "website", "cur": "financialCurrency", "city": "city", "rec": "recommendationKey"}
STMT = {"income_stmt": {"rev": ["Total Revenue", "Operating Revenue"], "gp": ["Gross Profit"], "op": ["Operating Income"],
                        "ebitda": ["EBITDA", "Normalized EBITDA"], "ni": ["Net Income", "Net Income Common Stockholders"], "eps": ["Basic EPS", "Diluted EPS"]},
        "balance_sheet": {"ta": ["Total Assets"], "tl": ["Total Liabilities Net Minority Interest"], "eq": ["Stockholders Equity", "Common Stock Equity"],
                          "debt": ["Total Debt"], "cash": ["Cash And Cash Equivalents", "Cash Cash Equivalents And Short Term Investments"]},
        "cashflow": {"cfo": ["Operating Cash Flow"], "capex": ["Capital Expenditure"], "fcf": ["Free Cash Flow"]}}
FUND_V = 1


def fund_one(sym):
    import yfinance as yf

    tk = yf.Ticker(sym)
    info = tk.info or {}
    if not info or (info.get("marketCap") is None and info.get("longName") is None and info.get("shortName") is None):
        return None
    out = {k: sig(info.get(y), 6) for k, y in INFO.items()}
    out.update({k: (str(info[y])[:120] if info.get(y) else None) for k, y in TEXT.items()})
    desc = info.get("longBusinessSummary")
    out["desc"] = (desc[:900].rsplit(" ", 1)[0] + "…") if desc and len(desc) > 900 else desc
    if out.get("der") is not None:
        out["der"] = sig(out["der"] / 100.0, 4)          # Yahoo memberi DER dalam persen
    years = {}
    for attr, rows in STMT.items():
        try:
            df = getattr(tk, attr)
            if df is None or not len(df.columns):
                continue
            for col in list(df.columns)[:5]:
                y = years.setdefault(int(col.year), {"y": int(col.year)})
                for key, names in rows.items():
                    for n in names:
                        if n in df.index:
                            y[key] = sig(df.loc[n][col], 6)
                            break
        except Exception as e:  # noqa: BLE001 — laporan opsional
            log.debug("%s %s: %s", attr, sym, e)
    out["years"] = [years[y] for y in sorted(years) if any(v is not None for k, v in years[y].items() if k != "y")]
    out["t"] = NOW().strftime("%Y-%m-%d")
    out["v"] = FUND_V
    return out


def fetch_fund(inst, cache_path: Path, max_age_days=7, budget_s=420):
    cache = load(cache_path, {}) or {}
    today = NOW().date()

    def age(c):
        try:
            if cache[c].get("v") != FUND_V:
                return 10 ** 6
            return (today - datetime.strptime(cache[c]["t"], "%Y-%m-%d").date()).days
        except Exception:  # noqa: BLE001
            return 10 ** 6

    todo = [i for i in inst if i["type"] == "EQUITY" and age(i["code"]) >= max_age_days]
    t0, ok, fail, streak = time.time(), 0, 0, 0
    for i in todo:
        if time.time() - t0 > budget_s:
            break
        try:
            d = fund_one(i["y"])
        except Exception as e:  # noqa: BLE001
            d = None
            log.debug("fundamental %s gagal: %s", i["code"], e)
        if d:
            cache[i["code"]] = d
            ok, streak = ok + 1, 0
        else:
            fail, streak = fail + 1, streak + 1
            if streak >= 8:
                log.warning("Fundamental: Yahoo menolak %d kali berturut-turut, berhenti dan pakai cache", streak)
                break
        time.sleep(0.2)
    dump(cache_path, cache)
    log.info("Fundamental: %d diambil, %d gagal, %d antre, tersedia %d", ok, fail, max(0, len(todo) - ok - fail), len(cache))
    return cache, {"baru": ok, "gagal": fail, "antre": max(0, len(todo) - ok - fail)}


# ---------------------------------------------------------------- Data demo (ACAK, hanya untuk uji tampilan)
def demo_frames(inst, seed=7):
    rng = np.random.default_rng(seed)
    days = pd.bdate_range(end=pd.Timestamp.today().normalize(), periods=1300)
    mins = pd.date_range(end=pd.Timestamp.now(tz="UTC").floor("15min"), periods=5 * 28, freq="15min")
    daily, intra = {}, {}
    for i in inst:
        base = float(rng.uniform(50, 9000))

        def walk(n, vol):
            c = base * np.exp(np.cumsum(rng.normal(0, vol, n)))
            o = np.r_[c[0], c[:-1]]
            return pd.DataFrame({"Open": o, "High": np.maximum(o, c) * (1 + rng.uniform(0, vol, n)), "Low": np.minimum(o, c) * (1 - rng.uniform(0, vol, n)),
                                 "Close": c, "Volume": rng.integers(1e5, 5e7, n)})
        d = walk(len(days), 0.015)
        d.index = days
        m = walk(len(mins), 0.002)
        m.index = mins
        daily[i["y"]], intra[i["y"]] = d, m
    return daily, intra


def demo_extras(inst):
    rng = np.random.default_rng(3)
    fund = {}
    for i in inst:
        if i["type"] != "EQUITY":
            continue
        years = [{"y": 2021 + k, "rev": 1e13 * (1 + .1 * k), "gp": 4e12, "op": 3e12, "ebitda": 3.5e12, "ni": 2e12 * (1 + .08 * k), "eps": 100 + 8 * k,
                  "ta": 5e13, "tl": 3e13, "eq": 2e13, "debt": 1e13, "cash": 5e12, "cfo": 2.5e12, "capex": -1e12, "fcf": 1.5e12} for k in range(5)]
        fund[i["code"]] = {"mcap": float(rng.uniform(1e13, 1e15)), "pe": float(rng.uniform(5, 30)), "pbv": float(rng.uniform(.6, 5)), "roe": float(rng.uniform(.03, .3)),
                           "dps": 25.0, "npm": .15, "der": .8, "beta": 1.0, "tp": None, "industry": "DEMO", "cur": i["ccy"],
                           "desc": "[DEMO] Deskripsi perusahaan tampil di sini pada data asli.", "years": years, "t": "2026-01-01", "v": FUND_V}
    now = int(time.time())
    news = [{"id": f"d{k}", "t": f"[DEMO] Contoh judul berita nomor {k + 1}", "s": "Demo", "u": "https://example.com", "ts": now - k * 1800,
             "c": ["Pasar ID", "Global", "Emiten", "Komoditas"][k % 4], "k": ["BBCA"] if k % 3 == 0 else []} for k in range(24)]
    econ = {"macro": [{"cty": "US", "name": "[DEMO] Fed Funds", "val": 4.5, "prev": 4.75, "unit": "%", "date": "2026-01-01", "src": "demo"},
                      {"cty": "ID", "name": "[DEMO] CPI YoY", "val": 2.1, "prev": 2.0, "unit": "%", "date": "2026-01-01", "src": "demo"}],
            "curve": {"date": "2026-01-01", "tenors": [t for t, _ in CURVE], "now": [4.3, 4.3, 4.2, 4.1, 4.0, 4.0, 4.1, 4.2, 4.3, 4.6, 4.5],
                      "m1": [4.4, 4.4, 4.3, 4.2, 4.1, 4.1, 4.2, 4.3, 4.4, 4.7, 4.6], "y1": [5.3, 5.3, 5.2, 4.9, 4.6, 4.4, 4.3, 4.3, 4.3, 4.6, 4.5], "src": "demo"},
            "wb": [{"ind": "X", "name": "[DEMO] Pertumbuhan PDB", "unit": "%", "rows": {"IDN": [5.0, "2025"], "USA": [2.8, "2025"]}}]}
    return fund, news, econ


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="site/data")
    ap.add_argument("--cache", default=".cache")
    ap.add_argument("--demo", action="store_true", help="data acak untuk uji tampilan (tanpa internet)")
    ap.add_argument("--no-fund", action="store_true")
    a = ap.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    out, cache = Path(a.out), Path(a.cache)
    inst = instruments()
    syms = [i["y"] for i in inst]
    src = {}
    stamp = lambda: NOW().strftime("%Y-%m-%dT%H:%M:%SZ")  # noqa: E731

    if a.demo:
        daily, intra = demo_frames(inst)
        src["harga"] = {"ok": True, "n": len(daily), "t": stamp(), "ket": "DEMO acak"}
    else:
        daily, err = fetch_yahoo(syms, "1d", "5y")
        src["harga_harian"] = {"ok": bool(daily), "n": len(daily), "dari": len(syms), "t": stamp(), "ket": "Yahoo Finance, harian 5 tahun" + (f"; error terakhir: {err}" if err and len(daily) < len(syms) else "")}
        intra, err2 = fetch_yahoo(syms, "15m", "5d")
        src["harga_intraday"] = {"ok": bool(intra), "n": len(intra), "dari": len(syms), "t": stamp(), "ket": "Yahoo Finance, 15 menit 5 hari"}

    quotes, meta, missing = {}, {}, []
    for i in inst:
        df = daily.get(i["y"])
        if df is None or len(df) < 2:
            missing.append(i["code"])
            continue
        df = norm_daily(df)
        ann = 365 if i["type"] == "CRYPTO" else 252
        try:
            quotes[i["code"]] = quote(df, ann)
        except Exception as e:  # noqa: BLE001
            log.warning("quote %s gagal: %s", i["code"], e)
            missing.append(i["code"])
            continue
        meta[i["code"]] = {k: v for k, v in i.items() if k not in ("code",) and v is not None}
        dump(out / "hist" / f"{i['code']}.json", series_json(df))
        m = intra.get(i["y"])
        if m is not None and len(m) > 1:
            dump(out / "intra" / f"{i['code']}.json", series_json(m, intraday=True))
            quotes[i["code"]]["it"] = 1
    log.info("Harga: %d instrumen, %d tanpa data: %s", len(quotes), len(missing), " ".join(missing))
    if len(quotes) < 0.5 * len(inst):
        raise SystemExit("Terlalu sedikit instrumen berhasil diambil; deploy dibatalkan supaya data lama tetap tampil.")

    def cached(name, fn):
        """Jalankan fn; simpan hasil ke cache. Kalau gagal pakai hasil terakhir yang berhasil (ditandai basi)."""
        p = cache / f"{name}.json"
        try:
            val = fn()
            dump(p, {"t": stamp(), "val": val})
            return val, {"ok": True, "t": stamp()}
        except Exception as e:  # noqa: BLE001
            log.warning("%s gagal: %s", name, e)
            old = load(p)
            if old:
                return old["val"], {"ok": False, "t": old["t"], "ket": f"gagal ({type(e).__name__}); memakai data terakhir"}
            return None, {"ok": False, "t": None, "ket": f"gagal: {e}"[:160]}

    if a.demo:
        fund, news, econ = demo_extras(inst)
    else:
        macro_res, s = cached("macro", fetch_macro)
        macro, fails = macro_res if macro_res else ([], [])
        src["makro"] = {**s, "n": len(macro), "ket": s.get("ket") or ("FRED" + (("; seri dilewati: " + ", ".join(fails)) if fails else ""))}
        curve, s = cached("curve", fetch_curve)
        src["kurva_ust"] = {**s, "ket": s.get("ket") or "FRED seri DGS"}
        wb, s = cached("wb", fetch_wb)
        src["world_bank"] = {**s, "n": len(wb or []), "ket": s.get("ket") or "World Bank API, tahunan"}
        econ = {"macro": macro, "curve": curve, "wb": wb or []}
        try:
            news = fetch_news(inst, cache / "news.json")
            src["berita"] = {"ok": True, "n": len(news), "t": stamp(), "ket": "Google News RSS, CNBC Indonesia RSS"}
        except Exception as e:  # noqa: BLE001
            news = (load(cache / "news.json", {}) or {}).get("items", [])
            src["berita"] = {"ok": False, "n": len(news), "t": stamp(), "ket": f"gagal: {e}"[:160]}
        if a.no_fund:
            fund = load(cache / "fund.json", {}) or {}
        else:
            try:
                fund, st = fetch_fund(inst, cache / "fund.json")
                src["fundamental"] = {"ok": bool(fund), "n": len(fund), "t": stamp(), "ket": f"Yahoo Finance, diperbarui mingguan; run ini: {st['baru']} baru, {st['gagal']} gagal, {st['antre']} antre"}
            except Exception as e:  # noqa: BLE001
                fund = load(cache / "fund.json", {}) or {}
                src["fundamental"] = {"ok": False, "n": len(fund), "t": stamp(), "ket": f"gagal: {e}"[:160]}

    for code, f in fund.items():            # kapitalisasi pasar ikut di quotes agar heatmap/screener tidak perlu memuat fund.json
        if code in quotes and f.get("mcap"):
            quotes[code]["mc"] = f["mcap"]
            for k in ("pe", "pbv", "roe", "dps"):
                if f.get(k) is not None:
                    quotes[code][k] = f[k]
    dump(out / "econ.json", econ)
    dump(out / "news.json", {"gen": stamp(), "items": news})
    dump(out / "fund.json", {c: f for c, f in fund.items() if c in quotes})
    dump(out / "quotes.json", {"gen": stamp(), "demo": bool(a.demo), "src": src, "inst": meta, "q": quotes, "missing": missing})
    log.info("Selesai: %s", json.dumps({k: (v.get("ok"), v.get("n")) for k, v in src.items()}))


if __name__ == "__main__":
    main()
