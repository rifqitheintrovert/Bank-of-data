/* Fungsi terminal bagian 1: MENU, WEI, MON/monitor, GP, DES, FA, TOP, MOST.
   Kontrak: T.F[MNEMONIK]={name,desc,sec:bool,render(p)}; p.body = elemen, p.sec = kode, p.tick/p.resize opsional, p.exec(cmd) untuk buka perintah. */
(function(T){
var F=T.F={},U=T.U;
function reg(mn,name,desc,sec,render){F[mn]={mn:mn,name:name,desc:desc,sec:sec,render:render}}
T.reg=reg;
var conv=T.conv=function(s){return s.ccy==="IDR"?{u:"Rp T",k:1}:{u:"USD B",k:1/16.25}};
function flashCls(s){return s.dir>0?"fu":s.dir<0?"fd":""}

/* ---- tabel monitor generik ---- */
T.monitor=function(p,codes,opt){
  opt=opt||{};
  p.body.innerHTML='<div class="pb2"><table><thead><tr><th>Kode</th><th class="l">Nama</th><th>Terakhir</th><th>Chg</th><th>%Chg</th>'+(opt.extra?'<th>'+opt.extra[0]+'</th>':'')+'<th>Src</th></tr></thead><tbody></tbody></table></div>'+(opt.note?'<div class="note">'+opt.note+'</div>':'');
  var tb=p.body.querySelector("tbody");
  function draw(){
    tb.innerHTML=codes.map(function(c){
      if(typeof c==="object"&&c.hdr)return'<tr><td colspan="7" class="amb" style="background:#120d05">'+c.hdr+'</td></tr>';
      var s=U[c],d=s.px-s.prev;
      return'<tr class="r '+flashCls(s)+'" data-c="'+s.code+'"><td class="sym">'+s.code+'</td><td class="l dim">'+s.name+'</td><td>'+T.fx(s.px,s.dp)+'</td><td class="'+T.cls(d)+'">'+T.fx(d,s.dp)+'</td><td class="'+T.cls(d)+'">'+T.pct(T.chg(s))+'</td>'+(opt.extra?'<td>'+opt.extra[1](s)+'</td>':'')+'<td class="'+(s.live?"up":"dim")+'">'+(s.live?"LIVE":"SIM")+'</td></tr>';
    }).join("");
  }
  tb.onclick=function(e){var tr=e.target.closest("tr[data-c]");if(tr)p.exec(tr.getAttribute("data-c")+" GP")};
  draw();p.tick=draw;
};

/* ---- MENU / HELP ---- */
reg("HELP","Bantuan & menu fungsi","Daftar semua fungsi",false,function(p){
  var keys=Object.keys(F).sort();
  p.body.innerHTML='<div class="pad dim">Ketik <b class="sym">[KODE] [FUNGSI]</b> lalu Enter, contoh <b class="sym">BBCA GP</b>, <b class="sym">XAUUSD GP</b>, <b class="sym">WEI</b>. Klik baris tabel untuk membuka grafik. Panel aktif ditandai garis amber; klik judul panel untuk memilihnya. Data berlabel <b class="up">LIVE</b> berasal dari feed nyata, <b>SIM</b> adalah simulasi.</div><div class="menu">'+
   keys.map(function(k){return'<button data-k="'+k+'"><b>'+k+'</b>'+F[k].name+'<br><span class="dim">'+F[k].desc+(F[k].sec?" · butuh kode":"")+'</span></button>'}).join("")+'</div>';
  p.body.onclick=function(e){var b=e.target.closest("button[data-k]");if(b)p.exec(b.getAttribute("data-k"))};
});
F.MENU=F.HELP;

/* ---- WEI: indeks saham dunia ---- */
reg("WEI","Indeks saham dunia","World Equity Indices",false,function(p){
  var reg_={ID:"Indonesia",US:"Amerika",EU:"Eropa",AS:"Asia-Pasifik"},list=[];
  Object.keys(reg_).forEach(function(r){list.push({hdr:reg_[r]});T.byType("INDEX").filter(function(s){return s.region===r}).forEach(function(s){list.push(s.code)})});
  T.monitor(p,list,{note:"Nilai indeks simulasi. Klik baris untuk grafik."});
});

/* ---- FXC / CMDT / CRYP / EQS monitor ---- */
reg("CRYP","Monitor kripto","Harga kripto, live via Binance bila tersedia",false,function(p){T.monitor(p,T.ORDER.CRYPTO,{note:"Status feed: "+T.feed.crypto+". Sumber live: Binance WebSocket."})});
reg("CMDT","Monitor komoditas","Emas, minyak, batu bara, CPO, logam",false,function(p){T.monitor(p,T.ORDER.COMDTY,{note:"Komoditas masih simulasi."})});
reg("EQS","Monitor saham IDX","Saham IDX + referensi global",false,function(p){
  T.monitor(p,T.byType("EQUITY").map(function(s){return s.code}),{extra:["Sektor",function(s){return'<span class="dim">'+s.sector+'</span>'}],note:"Harga saham simulasi (bukan data bursa)."});
});

/* ---- GP: grafik harga ---- */
reg("GP","Grafik harga","Candle/garis, volume, SMA 20/50",true,function(p){
  var code=p.sec,s=U[code],tf=p.tf||"1D",mode=p.mode||"candle",sma=p.sma!==false,vol=p.vol!==false,hover=-1;
  p.body.innerHTML='<div class="chartpane"><div class="tabs"><span id="tfs"></span><span class="sp"></span><span id="opts"></span></div>'+
    '<div class="hd"><span class="sym">'+s.code+'</span><span class="dim">'+s.name+'</span><span class="big" id="px"></span><span id="chg"></span><span class="dim" id="ohlc"></span></div><div class="cw"><canvas id="cv"></canvas></div><div class="note" id="src"></div></div>';
  var cv=p.body.querySelector("#cv");
  function bars(){return T.series(code,tf)}
  function tabs(){
    p.body.querySelector("#tfs").innerHTML=Object.keys(T.TF).map(function(k){return'<button data-t="'+k+'" class="'+(k===tf?"on":"")+'">'+k+'</button>'}).join("");
    p.body.querySelector("#opts").innerHTML=[["candle","Lilin",mode==="candle"],["line","Garis",mode==="line"],["sma","SMA",sma],["vol","Vol",vol]].map(function(o){return'<button data-o="'+o[0]+'" class="'+(o[2]?"on":"")+'">'+o[1]+'</button>'}).join("");
  }
  function head(){
    var c=T.chg(s);p.body.querySelector("#px").textContent=T.fx(s.px,s.dp);var e=p.body.querySelector("#chg");e.textContent=T.pct(c);e.className=T.cls(c);
    var sr=bars();p.body.querySelector("#src").textContent=(sr.real?"Riwayat: data nyata Binance. ":"Riwayat: simulasi. ")+(s.live?"Harga: LIVE.":"Harga: simulasi.")+" Garis biru SMA20, ungu SMA50.";
    var b=sr.bars[hover>=0?hover:sr.bars.length-1];p.body.querySelector("#ohlc").textContent="O "+T.fx(b.o,s.dp)+"  H "+T.fx(b.h,s.dp)+"  L "+T.fx(b.l,s.dp)+"  C "+T.fx(b.c,s.dp);
  }
  function draw(){T.drawPrice(cv,{bars:bars().bars,dp:s.dp,mode:mode,sma:sma,vol:vol,tf:tf,hover:hover});head()}
  function load(){if(s.bn)T.loadReal(code,tf,draw)}
  p.body.onclick=function(e){
    var t=e.target.getAttribute("data-t"),o=e.target.getAttribute("data-o");
    if(t){tf=p.tf=t;load()}
    if(o==="candle"||o==="line")mode=p.mode=o;if(o==="sma")sma=p.sma=!sma;if(o==="vol")vol=p.vol=!vol;
    tabs();draw();
  };
  cv.onmousemove=function(e){hover=T.hoverIndex(cv,e);draw()};cv.onmouseleave=function(){hover=-1;draw()};
  tabs();load();draw();p.tick=draw;p.resize=draw;
});

/* ---- DES: deskripsi ---- */
reg("DES","Deskripsi instrumen","Profil, harga, statistik utama",true,function(p){
  var s=U[p.sec],f=T.FUND[s.code],sr=T.series(s.code,"1Y").bars,hi=Math.max.apply(null,sr.map(function(b){return b.h})),lo=Math.min.apply(null,sr.map(function(b){return b.l}));
  function draw(){
    var pos=(s.px-lo)/(hi-lo)*100,h='<div class="pad"><div class="hd" style="border:0;padding:0 0 6px"><span class="sym" style="font-size:16px">'+s.code+'</span><span>'+s.name+'</span><span class="dim">'+s.type+' · '+s.mkt+'</span></div>'+
     '<div class="hd" style="padding-left:0"><span class="big">'+T.fx(s.px,s.dp)+'</span><span class="'+T.cls(T.chg(s))+'">'+T.pct(T.chg(s))+'</span><span class="'+(s.live?"up":"dim")+'">'+(s.live?"LIVE":"SIM")+'</span></div>';
    h+='<div class="sec">HARGA</div><div class="kv"><div>Penutupan sebelumnya</div><div>'+T.fx(s.prev,s.dp)+'</div><div>Rentang 52 minggu</div><div>'+T.fx(lo,s.dp)+' – '+T.fx(hi,s.dp)+'</div></div>'+
     '<div style="height:5px;background:#241c10;margin:4px 0"><div style="height:100%;width:'+Math.max(2,Math.min(100,pos))+'%;background:var(--amber)"></div></div>';
    if(s.type==="EQUITY"){
      var c=conv(s);h+='<div class="sec">PROFIL</div><div class="kv"><div>Sektor</div><div>'+s.sector+'</div><div>Kapitalisasi pasar</div><div>'+c.u+' '+T.fx(s.cap*c.k,1)+'</div>'+
       (f?'<div>P/E</div><div>'+f.pe+'x</div><div>P/BV</div><div>'+f.pbv+'x</div><div>Dividend yield</div><div>'+f.dy+'%</div>':"")+'</div>';
      if(f)h+='<div class="sec">BISNIS</div><div>'+f.desc+'</div>';
      else h+='<div class="note">Rasio dan deskripsi kurasi belum ada untuk emiten ini. Gunakan FA untuk laporan ilustrasi.</div>';
    }
    h+='<div class="note">Angka ilustrasi untuk demo tampilan, bukan nasihat investasi.</div></div>';p.body.innerHTML=h;
  }
  draw();p.tick=draw;
});

/* ---- FA: analisis keuangan ---- */
reg("FA","Analisis keuangan","Laba rugi, neraca, arus kas, rasio (data ilustrasi)",true,function(p){
  var s=U[p.sec];if(s.type!=="EQUITY"){p.body.innerHTML='<div class="err">FA hanya untuk saham. Coba BBCA FA.</div>';return}
  var d=T.financials(s.code),c=conv(s),tab=p.tab||"IS";
  var defs={
   IS:[["Pendapatan","rev"],["EBITDA","ebitda"],["Laba bersih","ni"]],
   BS:[["Total aset","ta"],["Total liabilitas","tl"],["Ekuitas","eq"],["Utang berbunga","debt"],["Kas","cash"]],
   CF:[["Arus kas operasi","cfo"],["Belanja modal","capex"],["Arus kas bebas","fcf"]]};
  function draw(){
    var h='<div class="tabs">'+["IS:Laba Rugi","BS:Neraca","CF:Arus Kas","RT:Rasio"].map(function(t){var k=t.split(":");return'<button data-t="'+k[0]+'" class="'+(k[0]===tab?"on":"")+'">'+k[1]+'</button>'}).join("")+'<span class="sp"></span><span class="dim">'+s.code+' · '+c.u+' · tahunan</span></div><table><thead><tr><th>Item</th>'+d.map(function(y){return'<th>'+y.y+'</th>'}).join("")+'</tr></thead><tbody>';
    if(tab==="RT"){
      var rows=[["Margin laba bersih",function(y){return y.ni/y.rev*100},"%"],["ROE",function(y){return y.ni/y.eq*100},"%"],["ROA",function(y){return y.ni/y.ta*100},"%"],["Debt/Equity",function(y){return y.debt/y.eq},"x"],["EPS (Rp/USD)",function(y){return y.eps},""]];
      rows.forEach(function(r){h+='<tr><td>'+r[0]+'</td>'+d.map(function(y){return'<td>'+T.fx(r[1](y),r[2]?1:2)+r[2]+'</td>'}).join("")+'</tr>'});
      h+='<tr><td>Pertumbuhan laba</td>'+d.map(function(y,i){return i?'<td class="'+T.cls(y.ni-d[i-1].ni)+'">'+T.pct((y.ni/d[i-1].ni-1)*100,1)+'</td>':'<td class="dim">-</td>'}).join("")+'</tr>';
    }else defs[tab].forEach(function(r){h+='<tr><td>'+r[0]+'</td>'+d.map(function(y){return'<td>'+T.fx(y[r[1]]*c.k,1)+'</td>'}).join("")+'</tr>'});
    h+='</tbody></table><div class="note">DATA ILUSTRASI yang dibangkitkan dari kapitalisasi dan rasio perkiraan. Ganti dengan laporan keuangan resmi (IDX/EDGAR) sebelum dipakai analisis.</div>';
    p.body.innerHTML=h;
  }
  p.body.onclick=function(e){var t=e.target.getAttribute("data-t");if(t){tab=p.tab=t;draw()}};draw();
});

/* ---- TOP: berita (headline simulasi) ---- */
reg("TOP","Berita utama","Headline pasar dan emiten (contoh simulasi)",false,function(p){
  var s=p.sec?U[p.sec]:null,name=s?s.name:"IHSG",sector=s?s.sector:"perbankan",day=new Date().toDateString(),r=T.rng(T.hash(day+name));
  var T1=["{n}: analis pertahankan rekomendasi, target harga dinaikkan","Sektor {s} jadi sorotan investor asing pekan ini","{n} dan pelaku sektor {s} cermati data inflasi terbaru","Rupiah dan yield SBN bergerak terbatas jelang rapat bank sentral","Harga komoditas global menguat, saham {s} ikut bergerak","Bursa Asia dibuka bervariasi, investor menanti rilis data ekonomi AS","Arus modal asing ke pasar obligasi domestik berlanjut","{n}: manajemen bahas rencana ekspansi dan belanja modal","Emas bertahan di dekat level tertinggi, pasar tunggu sinyal The Fed","Pasar kripto konsolidasi, volume perdagangan menurun","Laporan keuangan kuartalan emiten {s} mulai dirilis","IHSG menguat terbatas ditopang saham berkapitalisasi besar"];
  var src=["Wire","Riset","Pasar","Komoditas","Makro"],now=Date.now();
  p.body.innerHTML='<div class="news">'+T1.map(function(t,i){var d=new Date(now-(i*23+Math.floor(r()*12))*60000);
    return'<div class="it"><time>'+T.hhmm(d)+'</time><span class="tag">['+src[Math.floor(r()*src.length)]+']</span><span>'+t.replace(/\{n\}/g,name).replace(/\{s\}/g,sector.toLowerCase())+'</span></div>'}).join("")+'</div><div class="note">Headline contoh yang dibangkitkan untuk demo. Belum tersambung ke penyedia berita.</div>';
});
F.N=F.TOP;

/* ---- MOST: gainer/loser/aktif ---- */
reg("MOST","Paling aktif / top mover","Gainer, loser, volume saham IDX",false,function(p){
  var tab=p.tab||"G";
  function draw(){
    var l=T.byType("EQUITY").filter(function(s){return s.mkt==="IDX"}).slice();
    l.sort(tab==="G"?function(a,b){return T.chg(b)-T.chg(a)}:tab==="L"?function(a,b){return T.chg(a)-T.chg(b)}:function(a,b){return b.vlm*b.px-a.vlm*a.px});
    p.body.innerHTML='<div class="tabs">'+[["G","Top Gainer"],["L","Top Loser"],["V","Nilai Transaksi"]].map(function(t){return'<button data-t="'+t[0]+'" class="'+(t[0]===tab?"on":"")+'">'+t[1]+'</button>'}).join("")+'</div><table><thead><tr><th>#</th><th class="l">Kode</th><th>Terakhir</th><th>%Chg</th><th>Nilai (Rp)</th></tr></thead><tbody>'+
     l.slice(0,15).map(function(s,i){return'<tr class="r" data-c="'+s.code+'"><td class="dim">'+(i+1)+'</td><td class="l sym">'+s.code+'</td><td>'+T.fx(s.px,0)+'</td><td class="'+T.cls(T.chg(s))+'">'+T.pct(T.chg(s))+'</td><td>'+T.big(s.vlm*s.px)+'</td></tr>'}).join("")+'</tbody></table><div class="note">Simulasi.</div>';
  }
  p.body.onclick=function(e){var t=e.target.getAttribute("data-t");if(t){tab=p.tab=t;draw();return}var tr=e.target.closest("tr[data-c]");if(tr)p.exec(tr.getAttribute("data-c")+" GP")};
  draw();p.tick=draw;
});
})(window.T);
