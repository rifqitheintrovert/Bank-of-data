/* Helper umum: format angka, penyimpanan lokal, statistik kecil. */
window.T = {};
(T => {
  T.$ = (s, r) => (r || document).querySelector(s);
  T.esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  T.fx = (v, dp) => (v == null || isNaN(v)) ? "-" : Number(v).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  /* v = pecahan (0.0123 -> +1.23%) */
  T.pct = (v, d) => (v == null || isNaN(v)) ? "-" : (v >= 0 ? "+" : "") + (v * 100).toFixed(d == null ? 2 : d) + "%";
  T.cls = v => v == null || isNaN(v) ? "dim" : v > 0 ? "up" : v < 0 ? "down" : "";
  T.pc = (v, d) => `<span class="${T.cls(v)}">${T.pct(v, d)}</span>`;
  /* T = triliun, M = miliar, jt = juta, rb = ribu */
  T.big = v => {
    if (v == null || isNaN(v)) return "-";
    const a = Math.abs(v);
    return a >= 1e12 ? (v / 1e12).toFixed(2) + " T" : a >= 1e9 ? (v / 1e9).toFixed(2) + " M" : a >= 1e6 ? (v / 1e6).toFixed(1) + " jt" : a >= 1e3 ? (v / 1e3).toFixed(1) + " rb" : v.toFixed(0);
  };
  T.num = (v, d) => (v == null || isNaN(v)) ? "-" : Number(v).toFixed(d == null ? 2 : d);
  T.p2 = n => ("0" + n).slice(-2);
  T.ago = ts => {
    const m = Math.max(0, Math.round((Date.now() / 1000 - ts) / 60));
    return m < 60 ? m + " mnt" : m < 48 * 60 ? Math.round(m / 60) + " jam" : Math.round(m / 1440) + " hr";
  };
  T.wib = iso => {
    const d = new Date(iso);
    return isNaN(d) ? "-" : d.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) + " WIB";
  };
  T.store = {
    get(k, def) { try { const v = localStorage.getItem("bod_" + k); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem("bod_" + k, JSON.stringify(v)); } catch (e) { /* penyimpanan tidak tersedia */ } }
  };
  T.toast = msg => {
    const d = document.createElement("div");
    d.className = "toast"; d.textContent = msg; T.$("#toasts").appendChild(d);
    setTimeout(() => d.remove(), 7000);
  };
  T.sma = (a, n) => { const o = []; let s = 0; for (let i = 0; i < a.length; i++) { s += a[i]; if (i >= n) s -= a[i - n]; o.push(i >= n - 1 ? s / n : null); } return o; };
  T.median = a => { const b = a.filter(x => x != null && !isNaN(x)).sort((x, y) => x - y); if (!b.length) return null; const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
  /* CDF normal standar (Abramowitz-Stegun) untuk Black-Scholes */
  T.ncdf = x => { const t = 1 / (1 + .2316419 * Math.abs(x)), d = .3989423 * Math.exp(-x * x / 2), p = d * t * (.3193815 + t * (-.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - p : p; };
  T.fit = c => {
    const d = window.devicePixelRatio || 1, w = c.clientWidth, h = c.clientHeight;
    if (c.width !== Math.round(w * d) || c.height !== Math.round(h * d)) { c.width = Math.round(w * d); c.height = Math.round(h * d); }
    const x = c.getContext("2d"); x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, w, h);
    x.font = "10px IBM Plex Mono, monospace"; x.textBaseline = "middle";
    return { w, h, x };
  };
})(window.T);
