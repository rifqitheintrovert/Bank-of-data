/* Lapisan data: membaca file JSON buatan engine (data/…) dan harga kripto langsung dari Binance. Tidak ada angka simulasi di sini. */
(T => {
  const U = T.U = {};
  T.meta = { gen: null, demo: false, src: {}, missing: [] };
  T.dirty = false;
  let cache = {};

  T.dp = s => s.dp != null ? s.dp : (s.px >= 1000 ? 1 : s.px >= 1 ? 2 : s.px >= 0.01 ? 4 : 6);
  T.chg = s => s.prev ? s.px / s.prev - 1 : null;
  T.px = s => T.fx(s.px, T.dp(s));
  T.byType = (type, grp) => Object.values(U).filter(s => s.type === type && (!grp || s.grp === grp));
  T.find = tok => U[String(tok).toUpperCase().replace(/\.(JK|IJ)$/, "")] || null;

  /* Muat ringkasan harga. Mengembalikan true bila ada data baru. */
  T.loadQuotes = async () => {
    const r = await fetch("data/quotes.json?t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) throw new Error("data/quotes.json HTTP " + r.status);
    const j = await r.json();
    if (j.gen === T.meta.gen) return false;
    Object.keys(U).forEach(c => { if (!j.q[c]) delete U[c]; });
    Object.keys(j.q).forEach(c => {
      const q = j.q[c], o = U[c] || (U[c] = { code: c, dir: 0 });
      const liveOk = o.live && Date.now() - o.liveT < 90e3;
      Object.assign(o, j.inst[c], q);
      if (!liveOk) { o.px = q.p; o.live = false; }
      o.prev = q.pc;
    });
    T.meta = { gen: j.gen, demo: !!j.demo, src: j.src || {}, missing: j.missing || [] };
    cache = {};
    return true;
  };
  /* File data lain, dimuat saat dibutuhkan dan disimpan sampai data berikutnya terbit. */
  T.get = name => cache[name] || (cache[name] = fetch(`data/${name}.json?g=${encodeURIComponent(T.meta.gen)}`)
    .then(r => { if (!r.ok) throw new Error(`data/${name}.json belum tersedia (HTTP ${r.status})`); return r.json(); })
    .catch(e => { delete cache[name]; throw e; }));
  T.hist = code => T.get("hist/" + code);
  T.intra = code => T.get("intra/" + code);
  T.ageMin = () => T.meta.gen ? Math.round((Date.now() - new Date(T.meta.gen)) / 60000) : null;
  /* Umur bar terakhir sebuah instrumen dalam hari, relatif ke waktu data dibuat */
  T.stale = s => s.d && T.meta.gen ? Math.floor((new Date(T.meta.gen) - new Date(s.d + "T00:00:00Z")) / 864e5) : 0;

  /* Harga kripto live: mirror data publik Binance (api.binance.com diblokir di sebagian jaringan Indonesia). */
  T.live = { state: "menyambung" };
  T.startLive = () => {
    const map = {};
    T.byType("CRYPTO").forEach(s => { if (s.bn) map[s.bn] = s.code; });
    const names = Object.keys(map);
    if (!names.length) { T.live.state = "tidak ada"; return; }
    let ws;
    try { ws = new WebSocket("wss://data-stream.binance.vision/stream?streams=" + names.map(n => n.toLowerCase() + "@miniTicker").join("/")); }
    catch (e) { T.live.state = "gagal"; return; }
    ws.onopen = () => { T.live.state = "live"; if (T.onStatus) T.onStatus(); };
    ws.onmessage = m => {
      let d; try { d = JSON.parse(m.data); } catch (e) { return; }
      d = d.data || d;
      const s = U[map[d.s]], np = +d.c;
      if (!s || !(np > 0)) return;
      s.dir = np > s.px ? 1 : np < s.px ? -1 : 0; s.px = np; s.live = true; s.liveT = Date.now(); T.dirty = true;
    };
    ws.onclose = () => { T.live.state = "putus, mencoba lagi"; if (T.onStatus) T.onStatus(); setTimeout(T.startLive, 15000); };
    ws.onerror = () => { try { ws.close(); } catch (e) { /* sudah tertutup */ } };
  };

  /* Nilai 1 unit mata uang dalam USD, dari pasangan FX yang tersedia */
  T.usdPer = c => {
    const g = k => U[k] && U[k].px;
    const m = { USD: 1, IDR: g("USDIDR") && 1 / g("USDIDR"), EUR: g("EURUSD"), GBP: g("GBPUSD"), JPY: g("USDJPY") && 1 / g("USDJPY"), AUD: g("AUDUSD"),
      SGD: g("USDSGD") && 1 / g("USDSGD"), CNY: g("USDCNY") && 1 / g("USDCNY"), MYR: g("USDMYR") && 1 / g("USDMYR") };
    return m[c] || null;
  };
  T.toIDR = (v, ccy) => { if (ccy === "IDR") return v; const a = T.usdPer(ccy || "USD"), b = T.usdPer("IDR"); return a && b ? v * a / b : null; };
})(window.T);
