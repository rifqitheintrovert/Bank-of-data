/* Fungsi terminal bagian 2: FXC, YCRV, ECO, IMAP, SPLC, OMON, PORT, ALRT. */
(function(T){
var U=T.U,reg=T.reg;

/* ---- FXC: matriks kurs silang ---- */
reg("FXC","Matriks kurs silang","Kurs silang 8 mata uang, live bila feed FX tersedia",false,function(p){
  var cc=["USD","IDR","EUR","GBP","JPY","AUD","SGD","CNY"];
  function draw(){
    var h='<table><thead><tr><th></th>'+cc.map(function(c){return'<th>'+c+'</th>'}).join("")+'</tr></thead><tbody>';
    cc.forEach(function(a){h+='<tr><td class="sym">'+a+'</td>'+cc.map(function(b){
      if(a===b)return'<td class="dim">-</td>';var v=T.usdPer(a)/T.usdPer(b);return'<td>'+T.fx(v,v>=1000?0:v>=100?2:4)+'</td>'}).join("")+'</tr>'});
    p.body.innerHTML=h+'</tbody></table><div class="note">Baris = 1 unit mata uang baris dalam mata uang kolom. Sumber: '+(U.USDIDR.live?"Frankfurter (live harian)":"simulasi")+'.</div>';
  }
  draw();p.tick=draw;
});

/* ---- YCRV: kurva imbal hasil ---- */
var TEN=["1Y","2Y","3Y","5Y","7Y","10Y","15Y","20Y","30Y"];
var CUR={ID:[6.0,6.15,6.3,6.5,6.65,6.8,6.95,7.05,7.1],US:[4.35,4.2,4.1,4.1,4.2,4.25,4.4,4.55,4.45]};
var PREV={ID:CUR.ID.map(function(v,i){return v+0.04*Math.sin(i)+0.03}),US:CUR.US.map(function(v,i){return v-0.06+0.02*i/4})};
reg("YCRV","Kurva imbal hasil","SBN vs US Treasury (simulasi)",false,function(p){
  p.body.innerHTML='<div class="chartpane"><div class="cw"><canvas id="cv"></canvas></div><div id="tb" style="max-height:42%;overflow:auto"></div></div>';
  var cv=p.body.querySelector("#cv");
  function draw(){
    ["ID","US"].forEach(function(k){CUR[k]=CUR[k].map(function(v){return v+(Math.random()-.5)*.003})});
    T.drawCurve(cv,TEN,[{vals:CUR.ID,color:"#ff4d4d"},{vals:CUR.US,color:"#4aa8ff"},{vals:PREV.ID,color:"#ff4d4d88",dash:[4,4]},{vals:PREV.US,color:"#4aa8ff88",dash:[4,4]}],3,8);
    var h='<table><thead><tr><th>Tenor</th><th>SBN %</th><th>UST %</th><th>Selisih bp</th></tr></thead><tbody>'+TEN.map(function(t,i){
      return'<tr><td class="sym">'+t+'</td><td class="down">'+CUR.ID[i].toFixed(3)+'</td><td style="color:var(--blue)">'+CUR.US[i].toFixed(3)+'</td><td>'+Math.round((CUR.ID[i]-CUR.US[i])*100)+'</td></tr>'}).join("")+
      '</tbody></table><div class="note">Merah: SBN. Biru: UST. Putus-putus: perkiraan 1 bulan lalu. Simulasi.</div>';
    p.body.querySelector("#tb").innerHTML=h;
  }
  draw();p.tick=draw;p.resize=draw;
});

/* ---- ECO: kalender ekonomi ---- */
reg("ECO","Kalender ekonomi","Agenda rilis data makro (contoh)",false,function(p){
  var ev=[["ID","Neraca perdagangan","3.2B","2.9B",0,3],["US","Initial jobless claims","225K","221K",0,2],["EU","PDB QoQ","0.3%","0.2%",1,2],["ID","Keputusan BI Rate","5.75%","5.75%",1,3],
   ["US","Non-farm payrolls","180K","150K",2,3],["US","CPI YoY","2.9%","2.6%",3,3],["CN","PMI manufaktur","50.2","50.1",3,2],["JP","Keputusan BoJ","0.25%","0.25%",4,3],
   ["ID","CPI YoY","2.1%","1.9%",5,3],["US","Notulen FOMC","-","-",6,2]];
  var base=new Date(),h='<table><thead><tr><th>Waktu</th><th class="l">Neg.</th><th class="l">Event</th><th>Survei</th><th>Sebelumnya</th><th>Penting</th></tr></thead><tbody>';
  ev.forEach(function(e,i){var d=new Date(base.getTime()+(e[4]-1)*864e5);d.setHours(8+(i%9),30,0,0);
    h+='<tr><td>'+d.toLocaleDateString("id-ID",{day:"2-digit",month:"short"})+' '+T.hhmm(d)+'</td><td class="l sym">'+e[0]+'</td><td class="l">'+e[1]+'</td><td>'+e[2]+'</td><td class="dim">'+e[3]+'</td><td class="star">'+"★".repeat(e[5])+'</td></tr>'});
  p.body.innerHTML=h+'</tbody></table><div class="note">Agenda contoh. Tanggal digeser relatif terhadap hari ini, nilai survei ilustrasi.</div>'+
   '<div class="sec" style="margin:6px 8px 0">INDIKATOR MAKRO</div><table><thead><tr><th>Indikator</th><th>Neg.</th><th>Nilai</th><th>Tren</th></tr></thead><tbody>'+
   T.MAC.map(function(m){return'<tr><td>'+m[0]+'</td><td class="sym">'+m[1]+'</td><td class="amb">'+m[2]+'</td><td>'+m[3]+'</td></tr>'}).join("")+'</tbody></table>';
});

/* ---- IMAP: heatmap pasar ---- */
reg("IMAP","Peta panas saham IDX","Ukuran = kapitalisasi, warna = perubahan harian",false,function(p){
  function color(c){var a=Math.min(Math.abs(c)/2.5,1),g=Math.round(70+a*70),r=Math.round(70+a*70);return c>=0?"rgb(20,"+g+",50)":"rgb("+r+",25,30)"}
  function draw(){
    var by={};T.byType("EQUITY").filter(function(s){return s.mkt==="IDX"}).forEach(function(s){(by[s.sector]=by[s.sector]||[]).push(s)});
    p.body.innerHTML='<div class="heat">'+Object.keys(by).map(function(k){var tot=by[k].reduce(function(a,s){return a+s.cap},0);
      return'<div class="sc" style="flex:'+Math.max(tot,40)+' 1 '+Math.max(80,Math.sqrt(tot)*6)+'px"><b>'+k+'</b><div class="st">'+by[k].map(function(s){
        return'<div class="tile" data-c="'+s.code+'" style="flex:'+Math.max(s.cap,8)+' 1 46px;background:'+color(T.chg(s))+'"><b>'+s.code+'</b><span>'+T.pct(T.chg(s),1)+'</span></div>'}).join("")+'</div></div>'}).join("")+'</div>';
  }
  p.body.onclick=function(e){var t=e.target.closest(".tile");if(t)p.exec(t.getAttribute("data-c")+" GP")};
  draw();p.tick=draw;
});

/* ---- SPLC: rantai pasok ---- */
reg("SPLC","Rantai pasok","Pemasok, pelanggan, kompetitor",true,function(p){
  var s=U[p.sec],f=T.FUND[s.code];
  if(!f){p.body.innerHTML='<div class="err">Data rantai pasok untuk '+s.code+' belum tersedia. Tersedia: '+Object.keys(T.FUND).join(", ")+'.</div>';return}
  function col(x,list,color,anchor){return list.map(function(n,i){var y=60+i*44;return'<g><line x1="'+(anchor==="end"?200:400)+'" y1="'+(150)+'" x2="'+(anchor==="end"?200:400)+'" y2="'+y+'" stroke="none"/><text x="'+x+'" y="'+y+'" fill="'+color+'" text-anchor="'+anchor+'" font-size="11">'+n+'</text><line x1="'+(anchor==="end"?x+6:x-6)+'" y1="'+(y-3)+'" x2="'+(anchor==="end"?255:345)+'" y2="150" stroke="'+color+'" stroke-opacity=".4"/></g>'}).join("")}
  p.body.innerHTML='<svg viewBox="0 0 600 300" style="width:100%;height:100%;min-height:240px"><rect x="255" y="130" width="90" height="40" fill="#2a1a00" stroke="#ffa028"/><text x="300" y="150" fill="#ffd34d" text-anchor="middle" font-size="13">'+s.code+'</text>'+
   '<text x="194" y="30" fill="#8c6d3c" text-anchor="end" font-size="10">PEMASOK</text><text x="406" y="30" fill="#8c6d3c" font-size="10">PELANGGAN</text><text x="300" y="250" fill="#8c6d3c" text-anchor="middle" font-size="10">KOMPETITOR</text>'+
   col(194,f.sup,"#4aa8ff","end")+col(406,f.cus,"#2fd06b","start")+f.cmp.map(function(c,i){return'<text x="'+(300+(i-(f.cmp.length-1)/2)*80)+'" y="275" fill="#ff4d4d" text-anchor="middle" font-size="11">'+c+'</text>'}).join("")+'</svg>'+
   '<div class="note">Peta hubungan bisnis kurasi manual (ilustrasi), bukan data pemasok terverifikasi.</div>';
});

/* ---- OMON: opsi (Black-Scholes) ---- */
reg("OMON","Monitor opsi","Rantai opsi teoretis (Black-Scholes)",true,function(p){
  var s=U[p.sec],days=p.days||30;
  if(s.type!=="EQUITY"&&s.type!=="INDEX"){p.body.innerHTML='<div class="err">OMON untuk saham dan indeks.</div>';return}
  function bs(S,K,t,r,v,call){var d1=(Math.log(S/K)+(r+v*v/2)*t)/(v*Math.sqrt(t)),d2=d1-v*Math.sqrt(t);
    return call?{p:S*T.ncdf(d1)-K*Math.exp(-r*t)*T.ncdf(d2),d:T.ncdf(d1)}:{p:K*Math.exp(-r*t)*T.ncdf(-d2)-S*T.ncdf(-d1),d:T.ncdf(d1)-1}}
  function draw(){
    var t=days/365,iv0=.22+s.vol*8,step=Math.max(Math.round(s.px*.02/(s.px>1000?50:1))*(s.px>1000?50:1),s.px>100?5:1),atm=Math.round(s.px/step)*step,h='<div class="tabs">'+[7,30,60,90].map(function(d){return'<button data-d="'+d+'" class="'+(d===days?"on":"")+'">'+d+'h</button>'}).join("")+'<span class="sp"></span><span class="dim">spot '+T.fx(s.px,s.dp)+' · r 5.75% · IV dasar '+(iv0*100).toFixed(0)+'%</span></div>'+
     '<table><thead><tr><th>Call</th><th>Delta</th><th>IV</th><th>Strike</th><th>IV</th><th>Delta</th><th>Put</th></tr></thead><tbody>';
    for(var i=-5;i<=5;i++){var K=atm+i*step,iv=iv0*(1+Math.abs(i)*.03),c=bs(s.px,K,t,.0575,iv,true),q=bs(s.px,K,t,.0575,iv,false);
      h+='<tr class="'+(i===0?"fu":"")+'"><td class="up">'+T.fx(c.p,s.px>100?1:3)+'</td><td>'+c.d.toFixed(2)+'</td><td class="dim">'+(iv*100).toFixed(1)+'</td><td class="sym" style="text-align:center">'+T.fx(K,s.dp)+'</td><td class="dim">'+(iv*100).toFixed(1)+'</td><td>'+q.d.toFixed(2)+'</td><td class="down">'+T.fx(q.p,s.px>100?1:3)+'</td></tr>'}
    p.body.innerHTML=h+'</tbody></table><div class="note">Harga teoretis dengan volatilitas diasumsikan, bukan kuotasi pasar.</div>';
  }
  p.body.onclick=function(e){var d=e.target.getAttribute("data-d");if(d){days=p.days=+d;draw()}};draw();p.tick=draw;
});

/* ---- PORT: portofolio (tersimpan di browser) ---- */
reg("PORT","Portofolio","Posisi dan P&L, disimpan di browser ini",false,function(p){
  function draw(){
    var pos=T.store.get("pos",[]),tot=0,cost=0;
    var h='<div class="form"><input id="c" placeholder="KODE"><input id="q" placeholder="Jumlah" type="number" step="any"><input id="k" placeholder="Harga rata2" type="number" step="any"><button id="add">Tambah</button></div><table><thead><tr><th>Kode</th><th>Jml</th><th>Avg</th><th>Terakhir</th><th>Nilai</th><th>P&amp;L</th><th>%</th><th></th></tr></thead><tbody>';
    pos.forEach(function(x,i){var s=U[x.c];if(!s)return;var v=s.px*x.q,c=x.k*x.q;tot+=v;cost+=c;
      h+='<tr><td class="sym">'+x.c+'</td><td>'+T.fx(x.q,2)+'</td><td>'+T.fx(x.k,s.dp)+'</td><td>'+T.fx(s.px,s.dp)+'</td><td>'+T.fx(v,0)+'</td><td class="'+T.cls(v-c)+'">'+T.fx(v-c,0)+'</td><td class="'+T.cls(v-c)+'">'+T.pct((v/c-1)*100)+'</td><td><button class="x-btn" data-i="'+i+'">hapus</button></td></tr>'});
    h+='</tbody></table><div class="pad"><span class="dim">Total nilai (campur mata uang, tanpa konversi): </span><b>'+T.fx(tot,0)+'</b> <span class="'+T.cls(tot-cost)+'">'+T.pct(cost?(tot/cost-1)*100:0)+'</span></div><div class="note">Disimpan lokal di browser (localStorage), tidak dikirim ke server mana pun.</div>';
    p.body.innerHTML=h;
    p.body.querySelector("#add").onclick=function(){
      var c=p.body.querySelector("#c").value.trim().toUpperCase(),q=+p.body.querySelector("#q").value,k=+p.body.querySelector("#k").value;
      if(!U[c]||!q||!k){T.toast("Isi kode valid, jumlah, dan harga rata-rata.");return}
      var a=T.store.get("pos",[]);a.push({c:c,q:q,k:k});T.store.set("pos",a);draw();
    };
    p.body.querySelectorAll("[data-i]").forEach(function(b){b.onclick=function(){var a=T.store.get("pos",[]);a.splice(+b.getAttribute("data-i"),1);T.store.set("pos",a);draw()}});
  }
  draw();
  p.tick=function(){ /* hindari render ulang saat mengetik: hanya perbarui bila form kosong */
    var f=p.body.querySelector(".form");if(f&&!f.contains(document.activeElement))draw()};
});

/* ---- ALRT: alert harga ---- */
reg("ALRT","Alert harga","Beri notifikasi saat harga melewati level",false,function(p){
  function draw(){
    var al=T.store.get("alerts",[]);
    var h='<div class="form"><input id="c" placeholder="KODE"><select id="d"><option value=">">&gt;=</option><option value="<">&lt;=</option></select><input id="v" placeholder="Level" type="number" step="any"><button id="add">Pasang</button></div><table><thead><tr><th>Kode</th><th>Kondisi</th><th>Level</th><th>Terakhir</th><th>Status</th><th></th></tr></thead><tbody>';
    al.forEach(function(a,i){var s=U[a.c];h+='<tr><td class="sym">'+a.c+'</td><td>'+(a.d===">"?"naik ke":"turun ke")+'</td><td>'+T.fx(a.v,s.dp)+'</td><td>'+T.fx(s.px,s.dp)+'</td><td class="'+(a.hit?"up":"dim")+'">'+(a.hit?"TERPICU":"menunggu")+'</td><td><button class="x-btn" data-i="'+i+'">hapus</button></td></tr>'});
    p.body.innerHTML=h+'</tbody></table><div class="note">Alert dicek tiap detik selama halaman terbuka. Tersimpan di browser ini saja.</div>';
    p.body.querySelector("#add").onclick=function(){
      var c=p.body.querySelector("#c").value.trim().toUpperCase(),d=p.body.querySelector("#d").value,v=+p.body.querySelector("#v").value;
      if(!U[c]||!v){T.toast("Isi kode valid dan level.");return}
      var a=T.store.get("alerts",[]);a.push({c:c,d:d,v:v,hit:false});T.store.set("alerts",a);draw();
    };
    p.body.querySelectorAll("[data-i]").forEach(function(b){b.onclick=function(){var a=T.store.get("alerts",[]);a.splice(+b.getAttribute("data-i"),1);T.store.set("alerts",a);draw()}});
  }
  draw();p.tick=function(){var f=p.body.querySelector(".form");if(f&&!f.contains(document.activeElement))draw()};
});
T.checkAlerts=function(){
  var al=T.store.get("alerts",[]),ch=false;
  al.forEach(function(a){var s=U[a.c];if(!s||a.hit)return;if((a.d===">"&&s.px>=a.v)||(a.d==="<"&&s.px<=a.v)){a.hit=true;ch=true;T.toast("ALERT "+a.c+" "+(a.d===">"?"naik ke ":"turun ke ")+T.fx(a.v,s.dp)+" (terakhir "+T.fx(s.px,s.dp)+")")}});
  if(ch)T.store.set("alerts",al);
};
})(window.T);
