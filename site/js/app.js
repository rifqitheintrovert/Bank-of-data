/* Panel, command line, pembaruan data, status bar, ticker tape. */
(T => {
  const $ = T.$, F = T.F, U = T.U, panes = [];
  let active = 0, layout = T.store.get("layout", window.innerWidth < 900 ? 1 : 4), seq = 0;
  const NOISE = { EQUITY: 1, INDEX: 1, CURNCY: 1, COMDTY: 1, CRYPTO: 1, GO: 1, IJ: 1, JK: 1, US: 1, CORP: 1, GOVT: 1 };
  const DEFAULTS = ["WEI", "IHSG GP", "TOP", "MOST"];
  const visible = p => !p.el.classList.contains("hide");

  function mkPane(i) {
    const el = document.createElement("section"); el.className = "pane";
    el.innerHTML = `<div class="ph"><span class="t"><span class="n">${i + 1}</span><span class="tt">kosong</span></span></div><div class="pb"></div>`;
    $("#panes").appendChild(el);
    const p = { i, el, body: el.querySelector(".pb"), sec: null, fn: null, st: {}, cmd: null, tick: null, resize: null, dispose: null, token: 0 };
    p.exec = c => run(c, p);
    p.pick = code => pick(code, p);
    el.addEventListener("mousedown", () => { if (active !== i) setActive(i); });
    if (window.ResizeObserver) new ResizeObserver(() => { if (p.resize) try { p.resize(); } catch (e) { /* panel sedang diganti */ } }).observe(p.body);
    panes.push(p);
  }
  function setActive(i) {
    active = i; panes.forEach((p, k) => p.el.classList.toggle("act", k === i)); $("#prompt").textContent = i + 1;
    if (layout === 1) applyLayout();
  }
  function applyLayout() {
    $("#panes").className = "panes l" + layout;
    panes.forEach((p, k) => p.el.classList.toggle("hide", !(layout === 4 || (layout === 2 && k < 2) || (layout === 1 && k === active))));
    document.querySelectorAll("#layouts button").forEach(b => b.classList.toggle("on", +b.getAttribute("data-l") === layout));
    T.store.set("layout", layout);
    if (!visible(panes[active])) setActive(0);
  }
  const fail = (p, msg) => { p.body.innerHTML = `<div class="err">${T.esc(msg)}</div>`; p.tick = p.resize = null; };

  function run(raw, p, keep) {
    p = p || panes[active];
    const toks = String(raw).toUpperCase().replace(/[<>]/g, " ").split(/\s+/).filter(t => t && !NOISE[t]);
    if (!toks.length) return;
    let fn = null, sec = null;
    toks.forEach(t => { if (!fn && F[t]) fn = F[t]; else if (!sec && T.find(t)) sec = T.find(t); });
    if (p.dispose) { try { p.dispose(); } catch (e) { /* sudah dilepas */ } }
    p.dispose = p.tick = p.resize = null; p.body.onclick = null; p.token = ++seq;
    const tok = p.token, title = p.el.querySelector(".tt");
    if (!fn && !sec) { p.fn = null; p.cmd = null; title.textContent = "perintah tidak dikenal"; fail(p, `"${toks.join(" ")}" tidak dikenal. Ketik HELP untuk daftar fungsi, atau kode instrumen seperti BBCA, IHSG, XAUUSD.`); return; }
    if (!fn) fn = F.GP;
    let code = sec ? sec.code : p.sec;
    if (fn.sec && !(code && U[code])) code = U.IHSG ? "IHSG" : Object.keys(U)[0];
    if (!keep || fn !== p.fn || code !== p.sec) p.st = {};
    p.fn = fn; if (fn.sec || sec) p.sec = code;
    p.cmd = (fn.sec ? code + " " : "") + fn.mn;
    const s = fn.sec && U[code];
    title.textContent = (s ? s.code + " · " : "") + fn.mn + " · " + (s ? s.name : fn.name);
    p.body.scrollTop = 0;
    try { Promise.resolve(fn.render(p, () => p.token === tok)).catch(e => { if (p.token === tok) fail(p, `Gagal membuka ${fn.mn}: ${e.message}`); }); }
    catch (e) { fail(p, `Gagal membuka ${fn.mn}: ${e.message}`); }
    saveCmds();
  }
  /* Klik instrumen di sebuah panel: panel lain yang sedang menampilkan fungsi per-instrumen ikut berganti;
     kalau tidak ada, grafik dibuka di panel berikutnya (atau panel yang sama pada layout 1 panel). */
  function pick(code, from) {
    const others = panes.filter(p => p !== from && visible(p));
    const linked = others.filter(p => p.fn && p.fn.sec);
    if (linked.length) linked.forEach(p => run(code + " " + p.fn.mn, p, true));
    else run(code + " GP", others.length ? others[0] : from);
  }
  const saveCmds = () => T.store.set("cmds", panes.map(p => p.cmd));

  function status() {
    const age = T.ageMin(), m = T.meta, bad = Object.values(m.src).filter(s => s.ok === false).length;
    $("#status").innerHTML = `<span class="${age > 180 ? "no" : "ok"}">● Data ${T.wib(m.gen)} · ${age < 90 ? age + " mnt lalu" : Math.round(age / 60) + " jam lalu"}</span>
      <span class="${T.live.state === "live" ? "ok" : "no"}">● Kripto ${T.esc(T.live.state)}</span><span>${Object.keys(U).length} instrumen</span>
      ${bad ? `<span class="no">${bad} sumber bermasalah, ketik DATA</span>` : ""}<span class="dim">Yahoo Finance tertunda ±15 menit · bukan rekomendasi investasi</span>`;
    $("#banner").innerHTML = m.demo ? '<div class="demo-bar">DATA DEMO (ACAK). Angka di layar ini bukan harga pasar. Jalankan engine tanpa --demo untuk data asli.</div>'
      : age > 24 * 60 ? `<div class="warn-bar">Data terakhir dibuat ${Math.round(age / 60)} jam lalu. Cek tab Actions di GitHub: pembaruan otomatis mungkin berhenti.</div>` : "";
  }
  function tape() {
    const codes = ["IHSG", "LQ45", "USDIDR", "XAUUSD", "WTI", "BRENT", "SPX", "NDX", "N225", "HSI", "US10Y", "BTCUSD", "ETHUSD", "BBCA", "BBRI", "BMRI", "TLKM", "ASII", "MEDC"].filter(c => U[c]);
    const one = codes.map(c => { const s = U[c]; return `<span><b class="sym">${c}</b> ${T.px(s)} ${T.COL_DEF.chg.html(T.COL_DEF.chg.get(s), s)}</span>`; }).join("");
    $("#tape").innerHTML = one + one;
  }
  function clocks() {
    const z = tz => new Date().toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
    $("#clocks").innerHTML = `JKT <b>${z("Asia/Jakarta")}</b> · NYC <b>${z("America/New_York")}</b> · LON <b>${z("Europe/London")}</b>`;
  }
  async function refresh() {
    let changed = false;
    try { changed = await T.loadQuotes(); } catch (e) { /* tetap pakai data yang ada */ }
    if (changed) {
      panes.forEach(p => { if (p.cmd && visible(p) && !p.el.contains(document.activeElement)) run(p.cmd, p, true); });
      T.checkAlerts(); tape();
    }
    status();
  }

  async function init() {
    for (let i = 0; i < 4; i++) mkPane(i);
    try { await T.loadQuotes(); }
    catch (e) {
      $("#panes").innerHTML = `<div class="err">Data belum tersedia (${T.esc(e.message)}).<br><br>Data dibuat oleh GitHub Actions. Buka tab Actions di repo, jalankan workflow "Update Bank of Data", lalu muat ulang halaman ini.<br>Untuk uji lokal: <code>python -m engine.build --demo</code> lalu <code>python -m http.server -d site 8000</code>.</div>`;
      return;
    }
    const fk = ["WEI", "EQS", "IMAP", "MOST", "GP", "DES", "FA", "RV", "CN", "TOP", "FXC", "CMDT", "CRYP", "YCRV", "ECO", "OMON", "PORT", "ALRT", "DATA", "HELP"];
    $("#fkeys").innerHTML = fk.map(k => `<button data-k="${k}" title="${T.esc(F[k].name)}">${k}</button>`).join("");
    $("#fkeys").addEventListener("click", e => { const k = e.target.getAttribute("data-k"); if (k) run(k, panes[active]); });
    $("#cmdlist").innerHTML = Object.keys(U).sort().concat(Object.keys(F)).map(k => `<option value="${k}">`).join("");
    $("#cmdform").addEventListener("submit", e => { e.preventDefault(); const v = $("#cmd").value; $("#cmd").value = ""; run(v, panes[active]); });
    document.querySelectorAll("#layouts button").forEach(b => b.addEventListener("click", () => { layout = +b.getAttribute("data-l"); applyLayout(); panes.forEach(p => { if (visible(p) && !p.cmd) run(DEFAULTS[p.i], p); }); }));
    document.addEventListener("keydown", e => {
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.length === 1 && /[a-zA-Z0-9?]/.test(e.key)) $("#cmd").focus();
    });
    const saved = T.store.get("cmds", null);
    panes.forEach((p, i) => run((saved && saved[i]) || DEFAULTS[i], p));
    setActive(0); applyLayout(); clocks(); status(); tape(); T.startLive();
    setInterval(() => { if (!T.dirty) return; T.dirty = false; T.checkAlerts(); panes.forEach(p => { if (visible(p) && p.tick && !p.el.contains(document.activeElement)) try { p.tick(); } catch (e) { /* panel sedang diganti */ } }); }, 1000);
    setInterval(tape, 5000); setInterval(clocks, 15000); setInterval(status, 30000); setInterval(refresh, 5 * 60000);
    T.checkAlerts();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(window.T);
