/* Grafik: harga memakai TradingView Lightweight Charts (vendor/), kurva imbal hasil dan sparkline memakai canvas. */
(T => {
  const C = { up: "#2ebd6b", down: "#f0474f", amber: "#ffa028", grid: "#171717", line: "#2b2b2b", text: "#8c8c8c", ma20: "#cf7d0e", ma50: "#2e8fd0", ma200: "#d0559a" };
  const WIB = 7 * 3600;

  /* opts: {bars:[{time,open,high,low,close,volume}], dp, mode:'candle'|'line', ma:bool, intraday:bool, onHover(bar|null)} */
  T.priceChart = (el, o) => {
    const L = window.LightweightCharts;
    if (!L) { el.innerHTML = '<div class="err">Pustaka grafik gagal dimuat.</div>'; return { remove() {}, tickLast() {} }; }
    const ch = L.createChart(el, {
      autoSize: true,
      layout: { background: { color: "#0a0a0a" }, textColor: C.text, fontFamily: "IBM Plex Mono, monospace", fontSize: 10 },
      grid: { vertLines: { color: C.grid }, horzLines: { color: C.grid } },
      rightPriceScale: { borderColor: C.line }, timeScale: { borderColor: C.line, timeVisible: !!o.intraday, secondsVisible: false },
      crosshair: { mode: 0 }, localization: { locale: "id-ID" }
    });
    const pf = { type: "price", precision: o.dp, minMove: Math.pow(10, -o.dp) };
    const main = o.mode === "line"
      ? ch.addAreaSeries({ lineColor: C.amber, topColor: "rgba(255,160,40,.25)", bottomColor: "rgba(255,160,40,0)", lineWidth: 2, priceFormat: pf })
      : ch.addCandlestickSeries({ upColor: C.up, downColor: C.down, borderVisible: false, wickUpColor: C.up, wickDownColor: C.down, priceFormat: pf });
    main.setData(o.mode === "line" ? o.bars.map(b => ({ time: b.time, value: b.close })) : o.bars);
    if (o.ma) (o.maLines || []).forEach(m => {
      ch.addLineSeries({ color: m.color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false }).setData(m.data);
    });
    if (o.bars.some(b => b.volume > 0)) {
      const vs = ch.addHistogramSeries({ priceScaleId: "vol", priceFormat: { type: "volume" }, priceLineVisible: false, lastValueVisible: false });
      ch.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
      vs.setData(o.bars.map(b => ({ time: b.time, value: b.volume, color: b.close >= b.open ? "rgba(46,189,107,.35)" : "rgba(240,71,79,.35)" })));
    }
    ch.timeScale().fitContent();
    const byTime = new Map(o.bars.map(b => [b.time, b]));
    ch.subscribeCrosshairMove(p => { if (o.onHover) o.onHover(p && p.time != null ? byTime.get(p.time) || null : null); });
    const last = o.bars[o.bars.length - 1];
    return {
      remove() { try { ch.remove(); } catch (e) { /* sudah dilepas */ } },
      /* perbarui bar terakhir dengan harga live */
      tickLast(px) {
        if (!last || !(px > 0)) return;
        last.close = px; last.high = Math.max(last.high, px); last.low = Math.min(last.low, px);
        try { main.update(o.mode === "line" ? { time: last.time, value: px } : { time: last.time, open: last.open, high: last.high, low: last.low, close: last.close }); } catch (e) { /* abaikan */ }
      }
    };
  };
  /* Ubah file seri {t,o,h,l,c,v} menjadi bar. Intraday digeser ke WIB agar sumbu waktu terbaca sebagai jam Jakarta. */
  T.toBars = (j, intraday) => {
    const out = [];
    for (let i = 0; i < j.t.length; i++) {
      if (j.c[i] == null) continue;
      const c = j.c[i];
      out.push({ time: intraday ? j.t[i] + WIB : j.t[i], open: j.o[i] == null ? c : j.o[i], high: j.h[i] == null ? c : j.h[i], low: j.l[i] == null ? c : j.l[i], close: c, volume: j.v[i] || 0 });
    }
    return out;
  };
  T.maLines = (all, keep) => [[20, C.ma20], [50, C.ma50], [200, C.ma200]].map(([n, color]) => {
    const m = T.sma(all.map(b => b.close), n), from = all.length - keep;
    return { color, data: all.map((b, i) => ({ time: b.time, value: m[i] })).filter((d, i) => i >= from && d.value != null) };
  }).filter(m => m.data.length > 1);

  T.spark = (cv, vals, color) => {
    const { w, h, x } = T.fit(cv); if (!vals || vals.length < 2) return;
    const hi = Math.max(...vals), lo = Math.min(...vals), d = hi - lo || 1;
    x.beginPath(); vals.forEach((v, i) => { const px = i / (vals.length - 1) * (w - 2) + 1, py = h - 2 - (v - lo) / d * (h - 4); i ? x.lineTo(px, py) : x.moveTo(px, py); });
    x.strokeStyle = color; x.lineWidth = 1.3; x.stroke();
  };
  /* series = [{vals,color,dash}], sumbu Y otomatis dari data */
  T.drawCurve = (cv, tenors, series) => {
    const { w, h, x } = T.fit(cv), L = 40, R = 14, Tp = 12, B = 22, pw = w - L - R, ph = h - Tp - B;
    const all = series.flatMap(s => s.vals).filter(v => v != null);
    if (!all.length || w < 80) return;
    const lo = Math.floor((Math.min(...all) - .15) * 2) / 2, hi = Math.ceil((Math.max(...all) + .15) * 2) / 2;
    const X = i => L + pw * i / (tenors.length - 1), Y = v => Tp + (hi - v) / (hi - lo) * ph;
    x.fillStyle = C.text; x.strokeStyle = C.grid; x.textAlign = "right"; x.lineWidth = 1;
    for (let v = lo; v <= hi + 1e-9; v += .5) { x.beginPath(); x.moveTo(L, Y(v)); x.lineTo(L + pw, Y(v)); x.stroke(); x.fillText(v.toFixed(1) + "%", L - 5, Y(v)); }
    x.textAlign = "center"; tenors.forEach((t, i) => x.fillText(t, X(i), h - 8));
    series.forEach(s => {
      x.beginPath(); let st = false;
      s.vals.forEach((v, i) => { if (v == null) return; st ? x.lineTo(X(i), Y(v)) : x.moveTo(X(i), Y(v)); st = true; });
      x.strokeStyle = s.color; x.lineWidth = s.dash ? 1.3 : 2; x.setLineDash(s.dash || []); x.stroke(); x.setLineDash([]);
      if (!s.dash) s.vals.forEach((v, i) => { if (v == null) return; x.beginPath(); x.arc(X(i), Y(v), 3, 0, 7); x.fillStyle = s.color; x.fill(); });
    });
  };
  T.COL = C;
})(window.T);
