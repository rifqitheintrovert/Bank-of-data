/* Fungsi terminal bagian 2: FXC, YCRV, ECO, TOP, CN, OMON, PORT, ALRT, DATA. */
(T => {
  const U = T.U, reg = T.reg, esc = T.esc, COL = T.COL_DEF;
  const cols = ids => ids.split(" ").map(k => COL[k]);
  const safeUrl = u => /^https?:\/\//i.test(u || "") ? esc(u) : "#";

  /* ---- FXC: kurs ---- */
  reg("FXC", "Kurs valuta asing", "Matriks kurs silang dan monitor pasangan mata uang", false, p => {
    const cc = ["USD", "IDR", "EUR", "GBP", "JPY", "AUD", "SGD", "CNY", "MYR"].filter(c => T.usdPer(c));
    let h = `<table><thead><tr><th></th>${cc.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>`;
    cc.forEach(a => { h += `<tr><td class="sym">${a}</td>${cc.map(b => { if (a === b) return '<td class="dim">-</td>'; const v = T.usdPer(a) / T.usdPer(b); return `<td>${T.fx(v, v >= 1000 ? 0 : v >= 100 ? 2 : v >= 1 ? 4 : 6)}</td>`; }).join("")}</tr>`; });
    p.body.innerHTML = h + '</tbody></table><div class="note">Baris = 1 unit mata uang baris dalam mata uang kolom, dihitung dari pasangan terhadap USD.</div><div class="tb"></div><div class="note">Sumber: Yahoo Finance (tertunda).</div>';
    T.table(p.body.querySelector(".tb"), p, { cols: cols("code name px chg r1w r1m ytd r1y d"), rows: () => T.byType("FX") });
  });

  /* ---- YCRV: kurva imbal hasil ---- */
  reg("YCRV", "Kurva imbal hasil", "US Treasury: hari ini, 1 bulan lalu, 1 tahun lalu", false, async (p, alive) => {
    p.body.innerHTML = '<div class="pad dim">Memuat…</div>';
    let e = null; try { e = await T.get("econ"); } catch (x) { /* ditangani di bawah */ }
    if (!alive()) return;
    const c = e && e.curve, id10 = e && (e.macro || []).find(m => m.cty === "ID" && /10Y/.test(m.name));
    const idNote = id10 ? `Indonesia 10Y: <b class="amb">${T.num(id10.val)}%</b> per ${esc(id10.date)} (${esc(id10.src)}, bulanan).` : "Kurva SBN Indonesia tidak tersedia dari sumber gratis (PHEI/IBPA berbayar).";
    if (!c) {
      const r = T.byType("RATE");
      p.body.innerHTML = `<div class="err">Kurva lengkap (The Fed H.15) belum tersedia. Menampilkan titik dari Yahoo Finance.</div><div class="tb"></div><div class="note">${idNote}</div>`;
      T.table(p.body.querySelector(".tb"), p, { cols: cols("code name px chg d"), rows: () => r });
      return;
    }
    p.body.innerHTML = `<div class="chartpane"><div class="cw"><canvas></canvas></div><div class="scroll"><table><thead><tr><th>Tenor</th><th>Terakhir %</th><th>1 bulan lalu</th><th>Δ bp</th><th>1 tahun lalu</th><th>Δ bp</th></tr></thead><tbody>${c.tenors.map((t, i) => {
      const d = (a, b) => a == null || b == null ? '<td class="dim">-</td>' : `<td class="${T.cls(a - b)}">${((a - b) * 100).toFixed(0)}</td>`;
      return `<tr><td class="sym">${t}</td><td>${T.num(c.now[i])}</td><td class="dim">${T.num(c.m1[i])}</td>${d(c.now[i], c.m1[i])}<td class="dim">${T.num(c.y1[i])}</td>${d(c.now[i], c.y1[i])}</tr>`;
    }).join("")}</tbody></table>
      <div class="note">US Treasury par yield per ${esc(c.date)}. Garis amber: terakhir. Biru putus-putus: 1 bulan lalu. Abu putus-putus: 1 tahun lalu. Sumber: ${esc(c.src)}. ${idNote}</div></div></div>`;
    const cv = p.body.querySelector("canvas");
    const draw = () => T.drawCurve(cv, c.tenors, [{ vals: c.y1, color: "#777", dash: [3, 4] }, { vals: c.m1, color: "#4aa3e8", dash: [5, 4] }, { vals: c.now, color: "#ffa028" }]);
    draw(); p.resize = draw;
  });

  /* ---- ECO: makro ---- */
  reg("ECO", "Indikator ekonomi", "Suku bunga dan makro (The Fed, FRED), perbandingan negara (World Bank)", false, async (p, alive) => {
    p.body.innerHTML = '<div class="pad dim">Memuat…</div>';
    let e; try { e = await T.get("econ"); } catch (x) { p.body.innerHTML = `<div class="err">${esc(x.message)}</div>`; return; }
    if (!alive()) return;
    const m = e.macro || [], wb = e.wb || [], name = { US: "Amerika Serikat", ID: "Indonesia" }, old = d => (Date.now() - new Date(d)) / 864e5 > 120;
    let h = "";
    if (m.length) {
      h += '<table><thead><tr><th>Indikator</th><th>Terakhir</th><th>Sebelumnya</th><th>Periode</th><th class="l">Sumber</th></tr></thead><tbody>';
      ["ID", "US"].forEach(c => {
        const rows = m.filter(x => x.cty === c); if (!rows.length) return;
        h += `<tr><td colspan="5" class="grp">${name[c]}</td></tr>` + rows.map(x => `<tr><td>${esc(x.name)}</td><td class="amb">${T.num(x.val, x.unit === "ribu" ? 0 : 2)}${x.unit === "%" ? "%" : " " + esc(x.unit)}</td><td class="dim">${T.num(x.prev, x.unit === "ribu" ? 0 : 2)}</td><td class="${old(x.date) ? "warn" : "dim"}">${esc(x.date)}</td><td class="l dim">${esc(x.src)}</td></tr>`).join("");
      });
      h += '</tbody></table><div class="note">Periode berwarna kuning berarti data lebih tua dari 4 bulan. ${(T.meta.src.makro || {}).ok === null ? "CPI, pengangguran, PDB, dan payrolls butuh secret FRED_API_KEY (gratis, lihat README). " : ""}BI Rate dan kalender rilis tidak tersedia dari sumber gratis yang stabil, jadi tidak ditampilkan.</div>';
    } else h += '<div class="err">Data makro belum tersedia. Ketik DATA untuk status sumber.</div>';
    if (wb.length) {
      const ct = ["IDN", "USA", "CHN", "JPN", "IND", "SGP", "MYS", "DEU"];
      h += `<div class="sec pad0">PERBANDINGAN NEGARA (TAHUNAN)</div><table><thead><tr><th>Indikator</th>${ct.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${wb.map(w =>
        `<tr><td>${esc(w.name)}</td>${ct.map(c => { const r = w.rows[c]; return r ? `<td title="${esc(r[1])}">${w.unit === "USD" ? T.big(r[0]) : T.num(r[0], 1) + "%"}<span class="yr">${esc(String(r[1]).slice(2))}</span></td>` : '<td class="dim">-</td>'; }).join("")}</tr>`).join("")}</tbody></table>
        <div class="note">Sumber: World Bank. Angka kecil di kanan = tahun data. T = triliun, M = miliar (USD).</div>`;
    }
    p.body.innerHTML = h;
  });

  /* ---- berita ---- */
  const newsList = (items, p) => items.length ? `<div class="news">${items.map(n => `<a class="it" href="${safeUrl(n.u)}" target="_blank" rel="noopener noreferrer"><time>${T.ago(n.ts)}</time><span class="tag">${esc(n.c)}</span><span>${esc(n.t)} <span class="dim">· ${esc(n.s)}</span>${
    (n.k || []).filter(k => U[k] && k !== p.sec).slice(0, 4).map(k => ` <b class="chip" data-c="${k}">${k}</b>`).join("")}</span></a>`).join("")}</div>` : '<div class="pad dim">Belum ada berita untuk saringan ini.</div>';
  const chipClick = p => e => { const c = e.target.closest(".chip"); if (c) { e.preventDefault(); p.exec(c.getAttribute("data-c") + " CN"); } };
  reg("TOP", "Berita pasar", "Judul terbaru per kategori; klik untuk membuka sumber", false, async (p, alive) => {
    const st = p.st; st.cat = st.cat || "";
    p.body.innerHTML = '<div class="pad dim">Memuat berita…</div>';
    let j; try { j = await T.get("news"); } catch (x) { p.body.innerHTML = `<div class="err">${esc(x.message)}</div>`; return; }
    if (!alive()) return;
    const cats = [...new Set(j.items.map(n => n.c))];
    const draw = () => {
      p.body.innerHTML = `<div class="tabs"><button data-c="" class="${st.cat ? "" : "on"}">Semua</button>${cats.map(c => `<button data-c="${esc(c)}" class="${c === st.cat ? "on" : ""}">${esc(c)}</button>`).join("")}</div>
        ${newsList(j.items.filter(n => !st.cat || n.c === st.cat).slice(0, 120), p)}<div class="note">Sumber: Google News RSS dan CNBC Indonesia. Hanya judul; isi berita dibuka di situs penerbit.</div>`;
      p.body.querySelector(".tabs").onclick = e => { const c = e.target.getAttribute("data-c"); if (c != null && e.target.tagName === "BUTTON") { st.cat = c; draw(); } };
    };
    p.body.onclick = chipClick(p); draw();
  });
  reg("CN", "Berita instrumen", "Berita yang menyebut kode atau nama instrumen", true, async (p, alive) => {
    const s = U[p.sec];
    p.body.innerHTML = '<div class="pad dim">Memuat berita…</div>';
    let j; try { j = await T.get("news"); } catch (x) { p.body.innerHTML = `<div class="err">${esc(x.message)}</div>`; return; }
    if (!alive()) return;
    p.body.innerHTML = newsList(j.items.filter(n => (n.k || []).includes(s.code)).slice(0, 80), p) + `<div class="note">Berita 14 hari terakhir yang cocok dengan ${s.code} atau "${esc(s.name)}". Pencocokan otomatis, bisa meleset.</div>`;
    p.body.onclick = chipClick(p);
  });

  /* ---- OMON: opsi teoretis ---- */
  reg("OMON", "Opsi teoretis", "Rantai opsi Black-Scholes dari volatilitas historis; r dan volatilitas bisa diubah", true, p => {
    const s = U[p.sec], st = p.st, dp = T.dp(s);
    if (!(s.px > 0) || s.type === "RATE" || s.type === "FX") { p.body.innerHTML = '<div class="err">OMON untuk saham, indeks, komoditas, dan kripto.</div>'; return; }
    st.days = st.days || 30; if (st.r == null) st.r = s.ccy === "IDR" || s.grp === "Indonesia" ? 6 : 4.5;
    if (st.vol == null) st.vol = +(((s.hv30 || s.hv90 || .3)) * 100).toFixed(1);
    const yr = s.type === "CRYPTO" ? 365 : 252;
    const bs = (S, K, t, r, v, call) => { const d1 = (Math.log(S / K) + (r + v * v / 2) * t) / (v * Math.sqrt(t)), d2 = d1 - v * Math.sqrt(t); return call ? { p: S * T.ncdf(d1) - K * Math.exp(-r * t) * T.ncdf(d2), d: T.ncdf(d1) } : { p: K * Math.exp(-r * t) * T.ncdf(-d2) - S * T.ncdf(-d1), d: T.ncdf(d1) - 1 }; };
    const step = () => { const raw = s.px * 0.025, m = Math.pow(10, Math.floor(Math.log10(raw))); return [1, 2, 2.5, 5, 10].map(k => k * m).find(x => x >= raw) || raw; };
    p.body.innerHTML = `<div class="form"><span class="dim">Tenor</span><span id="dd"></span><label>r % <input id="r" type="number" step="0.05" value="${st.r}"></label><label>Vol % <input id="v" type="number" step="0.5" value="${st.vol}"></label>
      <span class="dim">HV30 ${s.hv30 == null ? "-" : (s.hv30 * 100).toFixed(1) + "%"} · HV90 ${s.hv90 == null ? "-" : (s.hv90 * 100).toFixed(1) + "%"}</span></div><div id="tb"></div>
      <div class="note">Harga TEORETIS Black-Scholes (opsi Eropa, tanpa dividen), tahun = ${yr} hari. Bukan kuotasi pasar: BEI tidak punya opsi saham yang likuid. Suku bunga r adalah asumsi yang kamu isi sendiri; volatilitas awal = volatilitas historis 30 hari.</div>`;
    const q = id => p.body.querySelector(id);
    const draw = () => {
      q("#dd").innerHTML = [7, 30, 60, 90, 180].map(d => `<button class="tabbtn${d === st.days ? " on" : ""}" data-d="${d}">${d}H</button>`).join("");
      const t = st.days / yr, r = st.r / 100, v = st.vol / 100, k = step(), atm = Math.round(s.px / k) * k, pd = s.px >= 100 ? Math.min(dp, 1) : Math.max(dp, 3);
      if (!(v > 0)) { q("#tb").innerHTML = '<div class="err">Isi volatilitas di atas 0.</div>'; return; }
      let h = '<table><thead><tr><th>Call</th><th>Delta</th><th>Strike</th><th>% dari spot</th><th>Delta</th><th>Put</th></tr></thead><tbody>';
      for (let i = -6; i <= 6; i++) { const K = atm + i * k; if (K <= 0) continue; const c = bs(s.px, K, t, r, v, true), u = bs(s.px, K, t, r, v, false);
        h += `<tr class="${i === 0 ? "sel" : ""}"><td class="up">${T.fx(c.p, pd)}</td><td>${c.d.toFixed(2)}</td><td class="sym">${T.fx(K, dp)}</td><td class="dim">${T.pct(K / s.px - 1, 1)}</td><td>${u.d.toFixed(2)}</td><td class="down">${T.fx(u.p, pd)}</td></tr>`; }
      q("#tb").innerHTML = h + `</tbody></table><div class="pad dim">Spot ${T.px(s)} · pergerakan 1 simpangan baku sampai jatuh tempo: ±${T.fx(s.px * v * Math.sqrt(t), dp)} (${(v * Math.sqrt(t) * 100).toFixed(1)}%)</div>`;
    };
    p.body.onclick = e => { const d = e.target.getAttribute("data-d"); if (d) { st.days = +d; draw(); } };
    q("#r").oninput = e => { st.r = +e.target.value || 0; draw(); };
    q("#v").oninput = e => { st.vol = +e.target.value || 0; draw(); };
    draw(); p.tick = draw;
  });

  /* ---- PORT: portofolio ---- */
  reg("PORT", "Portofolio", "Posisi, nilai dalam rupiah, dan untung/rugi; tersimpan di browser ini", false, p => {
    const table = () => {
      const pos = T.store.get("pos", []); let tot = 0, cost = 0, day = 0, miss = false;
      const rows = pos.map((x, i) => {
        const s = U[x.c]; if (!s) return `<tr><td class="sym">${esc(x.c)}</td><td colspan="7" class="dim">tidak ada data harga</td><td><button class="x-btn" data-i="${i}">hapus</button></td></tr>`;
        const dp = T.dp(s), v = T.toIDR(s.px * x.q, s.ccy), c = T.toIDR(x.k * x.q, s.ccy), d = T.toIDR((s.px - s.prev) * x.q, s.ccy);
        if (v == null) miss = true; else { tot += v; cost += c; day += d || 0; }
        return `<tr><td class="sym">${s.code}</td><td>${T.fx(x.q, x.q % 1 ? 4 : 0)}</td><td>${T.fx(x.k, dp)}</td><td>${T.px(s)}</td><td>${T.pc(T.chg(s))}</td><td>${v == null ? "-" : T.fx(v, 0)}</td><td class="${T.cls(v - c)}">${v == null ? "-" : T.fx(v - c, 0)}</td><td>${T.pc(s.px / x.k - 1)}</td><td><button class="x-btn" data-i="${i}">hapus</button></td></tr>`;
      }).join("");
      return `<table><thead><tr><th>Kode</th><th>Jumlah</th><th>Harga beli</th><th>Terakhir</th><th>%1H</th><th>Nilai (Rp)</th><th>Untung/rugi (Rp)</th><th>%</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="9" class="dim">Belum ada posisi. Isi form di atas.</td></tr>'}</tbody></table>
        <div class="pad"><div class="kv"><div>Total nilai</div><div><b>Rp ${T.fx(tot, 0)}</b></div><div>Untung/rugi total</div><div class="${T.cls(tot - cost)}">Rp ${T.fx(tot - cost, 0)} (${T.pct(cost ? tot / cost - 1 : 0)})</div><div>Perubahan hari ini</div><div class="${T.cls(day)}">Rp ${T.fx(day, 0)}</div></div>${miss ? '<div class="warn">Sebagian posisi tidak bisa dikonversi ke rupiah (kurs tidak tersedia).</div>' : ""}</div>`;
    };
    p.body.innerHTML = `<form class="form"><input id="c" placeholder="KODE" list="cmdlist" aria-label="Kode"><input id="q" placeholder="Jumlah" type="number" step="any" min="0" aria-label="Jumlah"><input id="k" placeholder="Harga beli" type="number" step="any" min="0" aria-label="Harga beli"><button>Tambah</button></form><div id="tb"></div>
      <div class="note">Jumlah saham IDX dalam lembar (1 lot = 100 lembar). Aset non-rupiah dikonversi memakai USDIDR terakhir. Disimpan hanya di browser ini (localStorage).</div>`;
    const draw = () => { p.body.querySelector("#tb").innerHTML = table(); };
    p.body.querySelector("form").onsubmit = e => {
      e.preventDefault();
      const g = id => p.body.querySelector(id), c = g("#c").value.trim().toUpperCase(), q = +g("#q").value, k = +g("#k").value;
      if (!U[c] || !(q > 0) || !(k > 0)) { T.toast("Isi kode yang ada di terminal, jumlah, dan harga beli."); return; }
      const a = T.store.get("pos", []); a.push({ c, q, k }); T.store.set("pos", a); g("#c").value = g("#q").value = g("#k").value = ""; draw();
    };
    p.body.querySelector("#tb").onclick = e => { const i = e.target.getAttribute("data-i"); if (i != null) { const a = T.store.get("pos", []); a.splice(+i, 1); T.store.set("pos", a); draw(); } };
    draw(); p.tick = draw;
  });

  /* ---- ALRT: alert harga ---- */
  reg("ALRT", "Alert harga", "Notifikasi di layar saat harga melewati level", false, p => {
    const table = () => {
      const al = T.store.get("alerts", []);
      return `<table><thead><tr><th>Kode</th><th>Kondisi</th><th>Level</th><th>Terakhir</th><th>Jarak</th><th>Status</th><th></th></tr></thead><tbody>${al.map((a, i) => { const s = U[a.c]; if (!s) return "";
        return `<tr><td class="sym">${s.code}</td><td>${a.d === ">" ? "naik ke" : "turun ke"}</td><td>${T.fx(a.v, T.dp(s))}</td><td>${T.px(s)}</td><td>${T.pc(a.v / s.px - 1, 1)}</td><td class="${a.hit ? "up" : "dim"}">${a.hit ? "TERPICU" : "menunggu"}</td><td><button class="x-btn" data-i="${i}">hapus</button></td></tr>`; }).join("") || '<tr><td colspan="7" class="dim">Belum ada alert.</td></tr>'}</tbody></table>`;
    };
    p.body.innerHTML = `<form class="form"><input id="c" placeholder="KODE" list="cmdlist" aria-label="Kode"><select id="d" aria-label="Kondisi"><option value=">">naik ke</option><option value="<">turun ke</option></select><input id="v" placeholder="Level" type="number" step="any" min="0" aria-label="Level"><button>Pasang</button></form><div id="tb"></div>
      <div class="note">Dicek saat halaman ini terbuka, setiap data diperbarui (kripto: setiap detik). Tidak ada notifikasi saat halaman tertutup. Tersimpan di browser ini saja.</div>`;
    const draw = () => { p.body.querySelector("#tb").innerHTML = table(); };
    p.body.querySelector("form").onsubmit = e => {
      e.preventDefault();
      const g = id => p.body.querySelector(id), c = g("#c").value.trim().toUpperCase(), d = g("#d").value, v = +g("#v").value;
      if (!U[c] || !(v > 0)) { T.toast("Isi kode yang ada di terminal dan level harga."); return; }
      const a = T.store.get("alerts", []); a.push({ c, d, v, hit: false }); T.store.set("alerts", a); g("#c").value = g("#v").value = ""; draw();
    };
    p.body.querySelector("#tb").onclick = e => { const i = e.target.getAttribute("data-i"); if (i != null) { const a = T.store.get("alerts", []); a.splice(+i, 1); T.store.set("alerts", a); draw(); } };
    draw(); p.tick = draw;
  });
  T.checkAlerts = () => {
    const al = T.store.get("alerts", []); let ch = false;
    al.forEach(a => { const s = U[a.c]; if (!s || a.hit) return; if ((a.d === ">" && s.px >= a.v) || (a.d === "<" && s.px <= a.v)) { a.hit = true; ch = true; T.toast(`ALERT ${a.c} ${a.d === ">" ? "naik ke" : "turun ke"} ${T.fx(a.v, T.dp(s))} (terakhir ${T.px(s)})`); } });
    if (ch) T.store.set("alerts", al);
  };

  /* ---- DATA: status sumber ---- */
  reg("DATA", "Status data", "Kapan data dibuat, status tiap sumber, instrumen tanpa data", false, p => {
    const m = T.meta, age = T.ageMin();
    p.body.innerHTML = `<div class="pad"><div class="kv"><div>Data dibuat</div><div>${T.wib(m.gen)} (${age} menit lalu)</div><div>Instrumen berdata</div><div>${Object.keys(U).length}</div><div>Harga kripto live</div><div>${esc(T.live.state)}</div></div></div>
      <table><thead><tr><th>Sumber</th><th>Status</th><th>Jumlah</th><th>Waktu</th><th class="l">Keterangan</th></tr></thead><tbody>${Object.keys(m.src).map(k => { const s = m.src[k];
        return `<tr><td>${esc(k.replace(/_/g, " "))}</td><td class="${s.ok ? "up" : s.ok === null ? "dim" : "down"}">${s.ok ? "OK" : s.ok === null ? "NONAKTIF" : "GAGAL"}</td><td>${s.n == null ? "-" : s.n + (s.dari ? "/" + s.dari : "")}</td><td class="dim">${s.t ? T.wib(s.t) : "-"}</td><td class="l dim wrap">${esc(s.ket || "")}</td></tr>`; }).join("")}</tbody></table>
      <div class="pad"><div class="sec">INSTRUMEN TANPA DATA DI SUMBER</div><div class="dim">${m.missing.length ? m.missing.map(esc).join(", ") : "Tidak ada."}</div></div>
      <div class="note">Data diperbarui otomatis oleh GitHub Actions: tiap 30 menit saat jam bursa BEI, tiap 2 jam di luar itu. Halaman ini mengecek data baru tiap 5 menit.</div>`;
  });
})(window.T);
