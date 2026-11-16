/* Fungsi terminal bagian 1: HELP, monitor (WEI/EQS/CMDT/CRYP), MOST, IMAP, GP, DES, FA, RV.
   Kontrak: T.F[KODE] = {mn,name,desc,sec,render(p,alive)}.
   p.body = elemen isi panel, p.sec = kode instrumen, p.st = state fungsi (bertahan saat data diperbarui),
   p.tick = dipanggil saat ada harga live baru, p.dispose = pembersih (mis. grafik), p.exec(cmd) = jalankan perintah di panel ini. */
(T => {
  const F = T.F = {}, U = T.U, esc = T.esc;
  const reg = T.reg = (mn, name, desc, sec, render) => { F[mn] = { mn, name, desc, sec, render }; };
  const flash = s => s.live ? (s.dir > 0 ? "fu" : s.dir < 0 ? "fd" : "") : "";

  /* ---- kolom standar instrumen ---- */
  const ret = (id, label) => ({ id, label, get: s => s[id], html: v => T.pc(v, 1) });
  const COL = T.COL_DEF = {
    code: { id: "code", label: "Kode", left: true, get: s => s.code, html: (v, s) => `<span class="sym">${v}</span>${s.live ? ' <span class="live">●</span>' : ""}` },
    name: { id: "name", label: "Nama", left: true, get: s => s.name, html: v => `<span class="dim">${esc(v)}</span>` },
    px: { id: "px", label: "Terakhir", get: s => s.px, html: (v, s) => T.px(s) },
    chg: { id: "chg", label: "%1H", get: s => s.type === "RATE" ? s.px - s.prev : T.chg(s), html: (v, s) => s.type === "RATE" ? `<span class="${T.cls(v)}">${(v * 100).toFixed(1)} bp</span>` : T.pc(v) },
    r1w: ret("r1w", "%1Mg"), r1m: ret("r1m", "%1Bl"), r3m: ret("r3m", "%3Bl"), ytd: ret("ytd", "%YTD"), r1y: ret("r1y", "%1Th"),
    val: { id: "val", label: "Nilai/hr 20H", get: s => s.val, html: v => v ? T.big(v) : "-" },
    mc: { id: "mc", label: "Kap. pasar", get: s => s.mc, html: v => T.big(v) },
    pe: { id: "pe", label: "PER", get: s => s.pe, html: v => T.num(v, 1) },
    pbv: { id: "pbv", label: "PBV", get: s => s.pbv, html: v => T.num(v, 2) },
    roe: { id: "roe", label: "ROE", get: s => s.roe, html: v => v == null ? "-" : (v * 100).toFixed(1) + "%" },
    dy: { id: "dy", label: "DY", get: s => s.dps && s.px ? s.dps / s.px : null, html: v => v == null ? "-" : (v * 100).toFixed(1) + "%" },
    sector: { id: "sector", label: "Sektor", left: true, get: s => s.sector || "", html: v => `<span class="dim">${esc(v)}</span>` },
    unit: { id: "unit", label: "Satuan", left: true, get: s => s.unit || "", html: v => `<span class="dim">${esc(v)}</span>` },
    hv: { id: "hv30", label: "Vol 30H", get: s => s.hv30, html: v => v == null ? "-" : (v * 100).toFixed(0) + "%" },
    d: { id: "d", label: "Tgl bar", get: s => s.d, html: (v, s) => `<span class="${T.stale(s) > 4 ? "warn" : "dim"}">${v ? v.slice(8) + "/" + v.slice(5, 7) : "-"}</span>` }
  };
  const cols = ids => ids.split(" ").map(k => COL[k]);

  /* ---- tabel yang bisa diurutkan (klik judul kolom) ---- */
  T.table = (host, p, o) => {
    if (p.st.sort === undefined) p.st.sort = o.sort || null;
    const draw = () => {
      let rows = o.rows();
      const s = p.st.sort, col = s && o.cols.find(c => c.id === s.id);
      if (col) rows = rows.filter(r => !r.hdr).sort((a, b) => {
        const x = col.get(a), y = col.get(b);
        if (x == null || x === "") return (y == null || y === "") ? 0 : 1;
        if (y == null || y === "") return -1;
        return (typeof x === "string" ? x.localeCompare(y) : x - y) * s.dir;
      });
      host.innerHTML = `<table><thead><tr>${o.cols.map(c => `<th data-s="${c.id}" class="srt${c.left ? " l" : ""}">${c.label}${col && s.id === c.id ? (s.dir > 0 ? " ▲" : " ▼") : ""}</th>`).join("")}</tr></thead><tbody>` +
        (rows.length ? rows.map(r => r.hdr ? `<tr><td colspan="${o.cols.length}" class="grp">${esc(r.hdr)}</td></tr>`
          : `<tr class="r ${flash(r)}${o.mark && o.mark(r) ? " sel" : ""}" data-c="${r.code}">${o.cols.map(c => `<td class="${c.left ? "l" : ""}">${c.html(c.get(r), r)}</td>`).join("")}</tr>`).join("")
          : `<tr><td colspan="${o.cols.length}" class="dim">Tidak ada data.</td></tr>`) + "</tbody></table>";
    };
    host.onclick = e => {
      const th = e.target.closest("th[data-s]"), tr = e.target.closest("tr[data-c]");
      if (th) { const id = th.getAttribute("data-s"), s = p.st.sort; p.st.sort = s && s.id === id ? (s.dir < 0 ? { id, dir: 1 } : null) : { id, dir: -1 }; draw(); }
      else if (tr) (o.onRow || (c => p.pick(c)))(tr.getAttribute("data-c"));
    };
    draw();
    return draw;
  };
  const monitor = (p, list, colIds, note) => {
    p.body.innerHTML = `<div class="tb"></div><div class="note">${note}</div>`;
    p.tick = T.table(p.body.firstChild, p, { cols: cols(colIds), rows: list });
  };
  const DELAY = "Sumber: Yahoo Finance, tertunda ±15 menit ditambah jeda pembaruan. Klik judul kolom untuk mengurutkan, klik baris untuk grafik.";

  /* ---- HELP ---- */
  reg("HELP", "Bantuan dan daftar fungsi", "Semua fungsi terminal", false, p => {
    p.body.innerHTML = `<div class="pad">Ketik <b class="sym">[KODE] [FUNGSI]</b> lalu Enter. Contoh: <b class="sym">BBCA GP</b>, <b class="sym">MEDC FA</b>, <b class="sym">XAUUSD GP</b>, <b class="sym">WEI</b>.
      Perintah berlaku untuk panel aktif (garis amber); klik judul panel untuk memilihnya. Tanda <span class="live">●</span> berarti harga live, selain itu data tertunda. <b class="sym">DATA</b> menampilkan status tiap sumber.</div>
      <div class="menu">${Object.keys(F).filter(k => F[k].mn === k).sort().map(k => `<button data-k="${k}"><b>${k}</b>${esc(F[k].name)}<br><span class="dim">${esc(F[k].desc)}${F[k].sec ? " · butuh kode" : ""}</span></button>`).join("")}</div>`;
    p.body.onclick = e => { const b = e.target.closest("button[data-k]"); if (b) p.exec(b.getAttribute("data-k")); };
  });

  /* ---- monitor ---- */
  reg("WEI", "Indeks saham dunia", "Indeks per wilayah dengan return 1 hari sampai 1 tahun", false, p => {
    const order = ["Indonesia", "Asia-Pasifik", "Eropa", "Amerika"];
    monitor(p, () => order.flatMap(g => [{ hdr: g }, ...T.byType("INDEX", g)]), "code name px chg r1w r1m ytd r1y d", DELAY);
  });
  reg("CMDT", "Komoditas", "Futures bulan terdekat: logam, energi, pertanian", false, p =>
    monitor(p, () => T.byType("COMDTY"), "code name px chg r1w r1m ytd unit d", DELAY + " Harga adalah kontrak futures, bukan spot. CPO, nikel, dan batu bara tidak tersedia di sumber gratis."));
  reg("CRYP", "Kripto", "Harga live dari Binance, return dari Yahoo Finance", false, p =>
    monitor(p, () => T.byType("CRYPTO"), "code name px chg r1w r1m ytd hv d", `Harga live: Binance (${esc(T.live.state)}). %1H dihitung terhadap penutupan harian UTC terakhir dari Yahoo Finance.`));
  reg("EQS", "Screener saham", "Saham IDX dan AS: return, likuiditas, valuasi; urutkan dan saring per sektor", false, p => {
    const st = p.st; st.grp = st.grp || "IDX"; st.sector = st.sector || "";
    const draw = () => {
      const all = T.byType("EQUITY", st.grp), secs = [...new Set(all.map(s => s.sector))].sort();
      p.body.innerHTML = `<div class="tabs">${["IDX", "US"].map(g => `<button data-g="${g}" class="${g === st.grp ? "on" : ""}">${g}</button>`).join("")}
        <select id="sec" aria-label="Sektor"><option value="">Semua sektor</option>${secs.map(x => `<option${x === st.sector ? " selected" : ""}>${esc(x)}</option>`).join("")}</select>
        <span class="sp"></span><span class="dim">${all.length} saham</span></div><div class="tb"></div><div class="note">${DELAY} Valuasi dari Yahoo Finance (mingguan); kosong berarti belum terambil.</div>`;
      const tbl = T.table(p.body.querySelector(".tb"), p, { cols: cols("code name px chg r1w r1m ytd val mc pe pbv roe dy sector"), rows: () => all.filter(s => !st.sector || s.sector === st.sector) });
      p.body.querySelector(".tabs").onclick = e => { const g = e.target.getAttribute("data-g"); if (g) { st.grp = g; st.sector = ""; draw(); } };
      p.body.querySelector("#sec").onchange = e => { st.sector = e.target.value; tbl(); };
    };
    draw();
  });
  reg("MOST", "Top mover IDX", "Naik/turun terbesar, nilai transaksi, dekat tertinggi 52 minggu", false, p => {
    const st = p.st; st.tab = st.tab || "G";
    const tabs = { G: ["Naik terbesar", s => -T.chg(s)], L: ["Turun terbesar", s => T.chg(s)], V: ["Nilai transaksi", s => -(s.val || 0)], H: ["Dekat high 52mg", s => -(s.px / s.hi)] };
    const draw = () => {
      const l = T.byType("EQUITY", "IDX").filter(s => T.chg(s) != null).sort((a, b) => tabs[st.tab][1](a) - tabs[st.tab][1](b)).slice(0, 20);
      p.body.innerHTML = `<div class="tabs">${Object.keys(tabs).map(k => `<button data-t="${k}" class="${k === st.tab ? "on" : ""}">${tabs[k][0]}</button>`).join("")}</div>
        <table><thead><tr><th>#</th><th class="l">Kode</th><th class="l">Nama</th><th>Terakhir</th><th>%1H</th><th>Nilai/hr 20H</th><th>% dari high 52mg</th></tr></thead><tbody>${l.map((s, i) =>
        `<tr class="r" data-c="${s.code}"><td class="dim">${i + 1}</td><td class="l sym">${s.code}</td><td class="l dim">${esc(s.name)}</td><td>${T.px(s)}</td><td>${T.pc(T.chg(s))}</td><td>${T.big(s.val)}</td><td>${T.pc(s.px / s.hi - 1, 1)}</td></tr>`).join("")}</tbody></table>
        <div class="note">Dari ${T.byType("EQUITY", "IDX").length} saham IDX yang dipantau terminal ini, bukan seluruh bursa.</div>`;
    };
    p.body.onclick = e => { const t = e.target.getAttribute("data-t"), tr = e.target.closest("tr[data-c]"); if (t) { st.tab = t; draw(); } else if (tr) p.pick(tr.getAttribute("data-c")); };
    draw();
  });

  /* ---- IMAP: peta panas ---- */
  reg("IMAP", "Peta panas saham IDX", "Per sektor; ukuran = nilai transaksi atau kapitalisasi, warna = return", false, p => {
    const st = p.st; st.size = st.size || "val"; st.by = st.by || "chg";
    const get = s => st.by === "chg" ? T.chg(s) : s[st.by], span = { chg: .03, r1w: .08, r1m: .15 };
    const color = c => { if (c == null) return "#222"; const a = Math.min(Math.abs(c) / span[st.by], 1), k = Math.round(60 + a * 90); return c >= 0 ? `rgb(16,${k},52)` : `rgb(${k + 10},24,30)`; };
    const draw = () => {
      const by = {};
      T.byType("EQUITY", "IDX").forEach(s => { const w = st.size === "mc" ? s.mc : s.val; if (w > 0) (by[s.sector] = by[s.sector] || []).push([s, w]); });
      const secs = Object.keys(by).map(k => [k, by[k].sort((a, b) => b[1] - a[1]), by[k].reduce((a, x) => a + x[1], 0)]).sort((a, b) => b[2] - a[2]);
      const tot = secs.reduce((a, x) => a + x[2], 0) || 1;
      p.body.innerHTML = `<div class="tabs"><span class="dim">Ukuran</span>${[["val", "Nilai transaksi"], ["mc", "Kapitalisasi"]].map(o => `<button data-z="${o[0]}" class="${o[0] === st.size ? "on" : ""}">${o[1]}</button>`).join("")}
        <span class="dim">Warna</span>${[["chg", "1 hari"], ["r1w", "1 minggu"], ["r1m", "1 bulan"]].map(o => `<button data-b="${o[0]}" class="${o[0] === st.by ? "on" : ""}">${o[1]}</button>`).join("")}</div>
        <div class="heat">${secs.length ? secs.map(([k, list, sum]) => `<div class="sc" style="flex:${Math.max(sum / tot * 100, 4)} 1 ${Math.round(90 + sum / tot * 500)}px"><b>${esc(k)}</b><div class="st">${list.map(([s, w]) =>
          `<div class="tile" data-c="${s.code}" title="${esc(s.name)}" style="flex:${Math.max(w / sum * 100, 3)} 1 ${Math.round(40 + w / sum * 120)}px;background:${color(get(s))}"><b>${s.code}</b><span>${T.pct(get(s), 1)}</span></div>`).join("")}</div></div>`).join("")
          : '<div class="err">Kapitalisasi pasar belum terambil. Pakai ukuran nilai transaksi.</div>'}</div>`;
    };
    p.body.onclick = e => { const z = e.target.getAttribute("data-z"), b = e.target.getAttribute("data-b"), t = e.target.closest(".tile"); if (z) { st.size = z; draw(); } else if (b) { st.by = b; draw(); } else if (t) p.pick(t.getAttribute("data-c")); };
    draw();
  });

  /* ---- GP: grafik harga ---- */
  const TF = { "1H": { intra: 1, hours: 24 }, "5H": { intra: 1 }, "1B": { n: 22 }, "3B": { n: 66 }, "6B": { n: 126 }, "1T": { n: 252 }, "5T": { n: 0 } };
  reg("GP", "Grafik harga", "Lilin atau garis, volume, MA20/50/200; intraday 15 menit dan harian 5 tahun", true, (p, alive) => {
    const s = U[p.sec], st = p.st, dp = T.dp(s);
    st.tf = st.tf || "6B"; st.mode = st.mode || "candle"; if (st.ma === undefined) st.ma = true;
    p.body.innerHTML = `<div class="chartpane"><div class="tabs"><span id="tfs"></span><span class="sp"></span><span id="opts"></span></div>
      <div class="hd"><span class="sym">${s.code}</span><span class="dim">${esc(s.name)}</span><span class="big" id="px"></span><span id="chg"></span><span class="dim" id="per"></span><span class="dim" id="ohlc"></span></div>
      <div class="cw" id="cw"></div><div class="note" id="src"></div></div>`;
    const q = id => p.body.querySelector(id);
    let chart = null, bars = [];
    const head = () => { q("#px").textContent = T.px(s); q("#chg").innerHTML = COL.chg.html(COL.chg.get(s), s) + (s.live ? ' <span class="live">● LIVE</span>' : ""); };
    const legend = b => { b = b || bars[bars.length - 1]; if (b) q("#ohlc").textContent = `O ${T.fx(b.open, dp)}  H ${T.fx(b.high, dp)}  L ${T.fx(b.low, dp)}  C ${T.fx(b.close, dp)}${b.volume ? "  V " + T.big(b.volume) : ""}`; };
    const tabs = () => {
      q("#tfs").innerHTML = Object.keys(TF).map(k => `<button data-t="${k}" class="${k === st.tf ? "on" : ""}">${k}</button>`).join("");
      q("#opts").innerHTML = [["candle", "Lilin", st.mode === "candle"], ["line", "Garis", st.mode === "line"], ["ma", "MA", st.ma]].map(o => `<button data-o="${o[0]}" class="${o[2] ? "on" : ""}">${o[1]}</button>`).join("");
    };
    const draw = async () => {
      const cfg = TF[st.tf];
      if (chart) { chart.remove(); chart = null; }
      q("#cw").innerHTML = '<div class="pad dim">Memuat…</div>';
      let all;
      try { all = T.toBars(await (cfg.intra ? T.intra(s.code) : T.hist(s.code)), !!cfg.intra); }
      catch (e) { if (alive()) q("#cw").innerHTML = `<div class="err">${cfg.intra ? "Data intraday tidak tersedia untuk instrumen ini. Pilih 1B atau lebih panjang." : esc(e.message)}</div>`; return; }
      if (!alive() || TF[st.tf] !== cfg) return;
      let keep = all.length;
      if (cfg.hours) { const from = all[all.length - 1].time - cfg.hours * 3600; keep = all.filter(b => b.time > from).length; }
      else if (cfg.n) keep = Math.min(cfg.n, all.length);
      bars = all.slice(all.length - keep);
      q("#cw").innerHTML = "";
      chart = T.priceChart(q("#cw"), { bars, dp, mode: st.mode, ma: st.ma && !cfg.intra, maLines: cfg.intra ? [] : T.maLines(all, keep), intraday: !!cfg.intra, onHover: legend });
      const r = bars[bars.length - 1].close / bars[0].open - 1;
      q("#per").innerHTML = `periode ${T.pc(r)}`;
      q("#src").textContent = (cfg.intra ? "Bar 15 menit, jam dalam WIB. " : "Bar harian. MA20 oranye, MA50 biru, MA200 merah muda. ") + "Sumber: Yahoo Finance (tertunda)" + (s.live ? "; bar terakhir mengikuti harga live Binance." : ".") + (s.type === "COMDTY" ? " Kontrak futures bulan terdekat." : "");
      legend();
    };
    q(".tabs").onclick = e => {
      const t = e.target.getAttribute("data-t"), o = e.target.getAttribute("data-o");
      if (!t && !o) return;
      if (t) st.tf = t; if (o === "candle" || o === "line") st.mode = o; if (o === "ma") st.ma = !st.ma;
      tabs(); draw();
    };
    tabs(); head();
    p.tick = () => { head(); if (chart && s.live) chart.tickLast(s.px); };
    p.dispose = () => { if (chart) chart.remove(); };
    return draw();
  });

  /* ---- DES: deskripsi ---- */
  reg("DES", "Deskripsi instrumen", "Harga, return, volatilitas, profil dan valuasi emiten", true, async (p, alive) => {
    const s = U[p.sec], dp = T.dp(s), xs = (v, d) => v == null || isNaN(v) ? "-" : T.num(v, d) + "x";
    let f = null;
    const draw = () => {
      const pos = s.hi > s.lo ? (s.px - s.lo) / (s.hi - s.lo) * 100 : 50, kv = rows => `<div class="kv">${rows.filter(Boolean).map(r => `<div>${r[0]}</div><div>${r[1]}</div>`).join("")}</div>`;
      let h = `<div class="pad"><div class="hd0"><span class="sym big2">${s.code}</span><span>${esc(s.name)}</span><span class="dim">${s.type} · ${esc(s.grp)}${s.sector ? " · " + esc(s.sector) : ""}</span></div>
        <div class="hd0"><span class="big">${T.px(s)}</span>${COL.chg.html(COL.chg.get(s), s)}${s.live ? '<span class="live">● LIVE</span>' : `<span class="dim">bar ${s.d}</span>`}</div>
        <div class="cols"><div><div class="sec">HARGA</div>${kv([["Penutupan sebelumnya", T.fx(s.prev, dp)], ["Buka / tertinggi / terendah", `${T.fx(s.o, dp)} / ${T.fx(s.h, dp)} / ${T.fx(s.l, dp)}`],
          s.v ? ["Volume", T.big(s.v)] : null, s.val ? ["Nilai transaksi rata-rata 20H", T.big(s.val)] : null, ["Rentang 52 minggu", `${T.fx(s.lo, dp)} – ${T.fx(s.hi, dp)}`]])}
          <div class="rng"><i style="width:${Math.max(2, Math.min(100, pos))}%"></i></div></div>
        <div><div class="sec">RETURN &amp; RISIKO</div>${kv([["1 minggu", T.pc(s.r1w)], ["1 bulan", T.pc(s.r1m)], ["3 bulan", T.pc(s.r3m)], ["YTD", T.pc(s.ytd)], ["1 tahun", T.pc(s.r1y)],
          ["Volatilitas historis 30H / 90H", `${s.hv30 == null ? "-" : (s.hv30 * 100).toFixed(1) + "%"} / ${s.hv90 == null ? "-" : (s.hv90 * 100).toFixed(1) + "%"}`]])}</div></div>`;
      if (s.type === "EQUITY") {
        if (f) {
          const dy = f.dps && s.px ? f.dps / s.px : null, up = f.tp && s.px ? f.tp / s.px - 1 : null;
          h += `<div class="cols"><div><div class="sec">VALUASI</div>${kv([["Kapitalisasi pasar", T.big(f.mcap)], ["PER / PER forward", `${xs(f.pe, 1)} / ${xs(f.fpe, 1)}`], ["PBV", xs(f.pbv)], ["EV/EBITDA", xs(f.ev_ebitda, 1)],
            ["Dividend yield", dy == null ? "-" : (dy * 100).toFixed(1) + "%"], ["Beta", T.num(f.beta)]])}</div>
            <div><div class="sec">PROFITABILITAS</div>${kv([["ROE", f.roe == null ? "-" : (f.roe * 100).toFixed(1) + "%"], ["ROA", f.roa == null ? "-" : (f.roa * 100).toFixed(1) + "%"], ["Margin bersih", f.npm == null ? "-" : (f.npm * 100).toFixed(1) + "%"],
            ["DER", xs(f.der)], f.tp ? ["Target analis (rata-rata)", `${T.fx(f.tp, dp)} ${T.pc(up, 0)} · ${f.n_an || "?"} analis`] : null, ["Industri", esc(f.industry || "-")]])}</div></div>
            ${f.desc ? `<div class="sec">BISNIS</div><div class="desc">${esc(f.desc)}</div>` : ""}<div class="note">Fundamental: Yahoo Finance, diambil ${esc(f.t)}. Deskripsi dalam bahasa sumber.${f.fx ? ` Emiten melapor dalam ${esc(f.fx.cur)}: PER dan PBV dihitung dari laporan tahunan ${esc(f.fx.y)} dengan kurs terakhir, bukan angka 12 bulan berjalan.` : ""}</div>`;
        } else h += `<div class="note">${f === false ? "Fundamental emiten ini belum terambil dari Yahoo Finance (diambil bertahap, mingguan)." : "Memuat fundamental…"}</div>`;
      }
      if (s.unit) h += `<div class="note">Satuan: ${esc(s.unit)}. Kontrak futures bulan terdekat, bukan harga spot.</div>`;
      p.body.innerHTML = h + "</div>";
    };
    draw(); p.tick = draw;
    if (s.type === "EQUITY") { try { f = (await T.get("fund"))[s.code] || false; } catch (e) { f = false; } if (alive()) draw(); }
  });

  /* ---- FA: laporan keuangan ---- */
  const ROWS = {
    IS: [["Pendapatan", "rev"], ["Laba kotor", "gp"], ["Laba usaha", "op"], ["EBITDA", "ebitda"], ["Laba bersih", "ni"]],
    BS: [["Total aset", "ta"], ["Total liabilitas", "tl"], ["Ekuitas", "eq"], ["Utang berbunga", "debt"], ["Kas dan setara kas", "cash"]],
    CF: [["Arus kas operasi", "cfo"], ["Belanja modal", "capex"], ["Arus kas bebas", "fcf"]]
  };
  reg("FA", "Analisis keuangan", "Laba rugi, neraca, arus kas, dan rasio tahunan dari laporan emiten", true, async (p, alive) => {
    const s = U[p.sec], st = p.st; st.tab = st.tab || "IS";
    if (s.type !== "EQUITY") { p.body.innerHTML = '<div class="err">FA hanya untuk saham. Contoh: BBCA FA.</div>'; return; }
    p.body.innerHTML = '<div class="pad dim">Memuat laporan keuangan…</div>';
    let f; try { f = (await T.get("fund"))[s.code]; } catch (e) { f = null; }
    if (!alive()) return;
    if (!f || !f.years || !f.years.length) { p.body.innerHTML = `<div class="err">Laporan keuangan ${s.code} belum tersedia dari Yahoo Finance. Data diambil bertahap; coba lagi setelah pembaruan berikutnya.</div>`; return; }
    const ys = f.years, cur = f.cur || s.ccy, div = cur === "IDR" ? 1e9 : 1e6, unit = cur === "IDR" ? "Rp miliar" : cur + " juta";
    const cell = v => v == null ? '<td class="dim">-</td>' : `<td class="${v < 0 ? "down" : ""}">${T.fx(v / div, 0)}</td>`;
    const draw = () => {
      let h = `<div class="tabs">${[["IS", "Laba rugi"], ["BS", "Neraca"], ["CF", "Arus kas"], ["RT", "Rasio"]].map(t => `<button data-t="${t[0]}" class="${t[0] === st.tab ? "on" : ""}">${t[1]}</button>`).join("")}<span class="sp"></span><span class="dim">${s.code} · ${st.tab === "RT" ? "rasio" : unit} · tahun fiskal</span></div>
        <table><thead><tr><th>Item</th>${ys.map(y => `<th>${y.y}</th>`).join("")}</tr></thead><tbody>`;
      if (st.tab === "RT") {
        const R = [["Margin kotor", y => y.gp / y.rev, "%"], ["Margin usaha", y => y.op / y.rev, "%"], ["Margin bersih", y => y.ni / y.rev, "%"], ["ROE", y => y.ni / y.eq, "%"], ["ROA", y => y.ni / y.ta, "%"],
          ["Utang berbunga / ekuitas", y => y.debt / y.eq, "x"], ["Liabilitas / aset", y => y.tl / y.ta, "x"], ["EPS dasar", y => y.eps, ""]];
        R.forEach(r => { h += `<tr><td>${r[0]}</td>${ys.map(y => { const v = r[1](y); return v == null || !isFinite(v) ? '<td class="dim">-</td>' : `<td>${r[2] === "%" ? (v * 100).toFixed(1) + "%" : T.num(v, 2) + r[2]}</td>`; }).join("")}</tr>`; });
        [["Pertumbuhan pendapatan", "rev"], ["Pertumbuhan laba bersih", "ni"]].forEach(g => { h += `<tr><td>${g[0]}</td>${ys.map((y, i) => i && ys[i - 1][g[1]] > 0 && y[g[1]] != null ? `<td>${T.pc(y[g[1]] / ys[i - 1][g[1]] - 1, 1)}</td>` : '<td class="dim">-</td>').join("")}</tr>`; });
      } else ROWS[st.tab].forEach(r => { h += `<tr><td>${r[0]}</td>${ys.map(y => cell(y[r[1]])).join("")}</tr>`; });
      p.body.innerHTML = h + `</tbody></table><div class="note">Sumber: Yahoo Finance (laporan tahunan, mata uang laporan ${esc(cur)}), diambil ${esc(f.t)}. Baris kosong berarti pos itu tidak dilaporkan di sumber, umum pada bank. Cocokkan dengan laporan resmi emiten sebelum dipakai riset.</div>`;
    };
    p.body.onclick = e => { const t = e.target.getAttribute("data-t"); if (t) { st.tab = t; draw(); } };
    draw();
  });

  /* ---- RV: valuasi relatif ---- */
  reg("RV", "Valuasi relatif", "Bandingkan dengan emiten sesektor: PER, PBV, ROE, yield, return", true, p => {
    const s = U[p.sec];
    if (s.type !== "EQUITY") { p.body.innerHTML = '<div class="err">RV hanya untuk saham. Contoh: BBCA RV.</div>'; return; }
    const peers = () => T.byType("EQUITY", s.grp).filter(x => x.sector === s.sector);
    const med = k => T.median(peers().map(x => COL[k].get(x)));
    p.body.innerHTML = '<div class="tb"></div><div class="pad" id="med"></div><div class="note">Pembanding: saham sesektor yang dipantau terminal ini, bukan seluruh bursa. Valuasi dari Yahoo Finance; untuk emiten yang melapor dalam USD, PER dan PBV dihitung dari laporan tahunan terakhir dengan kurs terakhir.</div>';
    T.table(p.body.querySelector(".tb"), p, { cols: cols("code name px mc pe pbv roe dy ytd r1y"), rows: peers, mark: r => r.code === s.code, sort: { id: "mc", dir: -1 } });
    const line = (k, lab, f) => { const m = med(k), v = COL[k].get(s); return m == null || v == null ? "" : `<div>${lab}</div><div>${f(v)} vs median ${f(m)} <span class="${v < m ? "up" : "down"}">(${T.pct(v / m - 1, 0)})</span></div>`; };
    p.body.querySelector("#med").innerHTML = `<div class="sec">${s.code} VS MEDIAN SEKTOR ${esc(s.sector.toUpperCase())} (${peers().length} saham)</div><div class="kv">${line("pe", "PER", v => T.num(v, 1) + "x")}${line("pbv", "PBV", v => T.num(v) + "x")}</div>
      <div class="dim">Hijau berarti lebih murah dari median. Murah belum tentu menarik: cek kualitas laba di FA.</div>`;
  });
})(window.T);
