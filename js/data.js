/* Universe instrumen, mesin simulasi harga, dan feed live (Binance WebSocket + kurs FX Frankfurter). */
(function(T){
var U=T.U={},ORDER={};
function add(code,name,type,mkt,px,dp,vol,x){
  var r=T.rng(T.hash(code));
  var o={code:code,name:name,type:type,mkt:mkt,px:px,base:px,dp:dp,vol:vol,prev:px*(1+(r()-.5)*.02),live:false,dir:0,r:T.rng(T.hash(code+"t")),sector:"",cap:0,vlm:Math.round(1e6*(1+r()*30))};
  if(x)for(var k in x)o[k]=x[k];
  U[code]=o;(ORDER[type]=ORDER[type]||[]).push(code);
}
/* Saham IDX: kode, nama, harga, sektor, kapitalisasi (Rp triliun). Angka ilustrasi. */
[["BBCA","Bank Central Asia",9850,"Keuangan",1214],["BBRI","Bank Rakyat Indonesia",4180,"Keuangan",633],["BMRI","Bank Mandiri",5900,"Keuangan",551],
 ["BBNI","Bank Negara Indonesia",4600,"Keuangan",172],["TLKM","Telkom Indonesia",2760,"Telekomunikasi",273],["EXCL","XL Axiata",2350,"Telekomunikasi",31],
 ["ISAT","Indosat Ooredoo",2200,"Telekomunikasi",71],["ASII","Astra International",4650,"Industri",188],["UNVR","Unilever Indonesia",1900,"Konsumer",72],
 ["ICBP","Indofood CBP",11200,"Konsumer",131],["INDF","Indofood Sukses Makmur",7300,"Konsumer",64],["CPIN","Charoen Pokphand",4700,"Konsumer",77],
 ["KLBF","Kalbe Farma",1450,"Kesehatan",68],["GOTO","GoTo Gojek Tokopedia",70,"Teknologi",83],["AMMN","Amman Mineral",8500,"Pertambangan",611],
 ["BREN","Barito Renewables",9800,"Energi",1310],["BYAN","Bayan Resources",19500,"Energi",650],["ADRO","Alamtri Resources",2400,"Energi",74],
 ["PTBA","Bukit Asam",2700,"Energi",31],["ITMG","Indo Tambangraya",25000,"Energi",28],["MEDC","Medco Energi Internasional",1280,"Energi",32],
 ["PGAS","Perusahaan Gas Negara",1550,"Energi",38],["AKRA","AKR Corporindo",1250,"Energi",25],["ANTM","Aneka Tambang",1650,"Pertambangan",40],
 ["INCO","Vale Indonesia",3300,"Pertambangan",33],["MDKA","Merdeka Copper Gold",2200,"Pertambangan",53],["TPIA","Chandra Asri Pacific",7600,"Industri",660],
 ["SMGR","Semen Indonesia",3300,"Bahan Baku",22],["MAPI","Mitra Adiperkasa",1450,"Konsumer",24],["JSMR","Jasa Marga",4400,"Infrastruktur",32],
 ["CTRA","Ciputra Development",1100,"Properti",20]
].forEach(function(s){add(s[0],s[1],"EQUITY","IDX",s[2],0,.005,{sector:s[3],cap:s[4],ccy:"IDR"})});
[["AAPL","Apple Inc",228.4,"Teknologi",3450],["MSFT","Microsoft Corp",420.5,"Teknologi",3120],["NVDA","NVIDIA Corp",140.2,"Teknologi",3430],["AMZN","Amazon.com",205.2,"Konsumer",2150],
 ["GOOGL","Alphabet Inc",175.6,"Teknologi",2150],["META","Meta Platforms",590.1,"Teknologi",1490],["TSLA","Tesla Inc",330.3,"Konsumer",1060],["JPM","JPMorgan Chase",242.1,"Keuangan",680]
].forEach(function(s){add(s[0],s[1],"EQUITY","US",s[2],2,.009,{sector:s[3],cap:s[4]*16.2,ccy:"USD"})});
add("SHEL","Shell plc","EQUITY","LSE",2650,0,.006,{sector:"Energi",cap:3100,ccy:"GBp"});

[["IHSG","IDX Composite",7200,"ID"],["LQ45","LQ45 Index",900,"ID"],["SPX","S&P 500",5900,"US"],["DJI","Dow Jones",43000,"US"],["NDX","Nasdaq 100",20500,"US"],
 ["UKX","FTSE 100",8200,"EU"],["DAX","DAX",19400,"EU"],["CAC","CAC 40",7300,"EU"],["N225","Nikkei 225",39000,"AS"],["HSI","Hang Seng",20000,"AS"],
 ["SHCOMP","Shanghai Composite",3350,"AS"],["KOSPI","KOSPI",2500,"AS"],["STI","Straits Times",3750,"AS"],["KLCI","FBM KLCI",1600,"AS"],["AS51","S&P/ASX 200",8350,"AS"]
].forEach(function(s){add(s[0],s[1],"INDEX","INDEKS",s[2],2,.0045,{region:s[3]})});

[["USDIDR","Dolar AS / Rupiah",16250,0,.0012],["EURUSD","Euro / Dolar AS",1.085,4,.0015],["GBPUSD","Pound / Dolar AS",1.27,4,.0015],["USDJPY","Dolar AS / Yen",153.5,2,.0018],
 ["AUDUSD","Dolar Australia / Dolar AS",0.655,4,.0018],["USDSGD","Dolar AS / Dolar Singapura",1.34,4,.001],["USDCNY","Dolar AS / Yuan",7.2,4,.0008],["USDMYR","Dolar AS / Ringgit",4.45,4,.001]
].forEach(function(s){add(s[0],s[1],"FX","FX",s[2],s[3],s[4])});

[["XAUUSD","Emas spot (USD/oz)",2650.5,2,.004],["XAGUSD","Perak spot (USD/oz)",31.2,3,.007],["WTI","Minyak mentah WTI",71.4,2,.008],["BRENT","Minyak mentah Brent",75.2,2,.008],
 ["NATGAS","Gas alam Henry Hub",2.95,3,.015],["COAL","Batu bara Newcastle",140.2,2,.008],["CPO","Minyak sawit (MYR/ton)",4350,0,.007],["NICKEL","Nikel LME (USD/ton)",15400,0,.007],["COPPER","Tembaga LME (USD/ton)",9100,0,.007]
].forEach(function(s){add(s[0],s[1],"COMDTY","KOMODITAS",s[2],s[3],s[4])});

[["BTCUSD","Bitcoin",98000,0,.012,"BTCUSDT"],["ETHUSD","Ethereum",3400,1,.015,"ETHUSDT"],["SOLUSD","Solana",210,2,.02,"SOLUSDT"],
 ["BNBUSD","BNB",620,1,.014,"BNBUSDT"],["XRPUSD","XRP",1.1,4,.02,"XRPUSDT"],["DOGEUSD","Dogecoin",0.38,5,.025,"DOGEUSDT"]
].forEach(function(s){add(s[0],s[1],"CRYPTO","KRIPTO",s[2],s[3],s[4],{bn:s[5]})});

T.ORDER=ORDER;
T.byType=function(t){return(ORDER[t]||[]).map(function(c){return U[c]})};
T.chg=function(s){return(s.px/s.prev-1)*100};
/* Aliases pencarian: BBCA.JK, BBCA IJ, dll */
T.find=function(tok){tok=tok.toUpperCase().replace(/\.(JK|IJ)$/,"");return U[tok]||null};

/* ---- Fundamental ilustrasi (rasio kurasi untuk emiten tertentu) ---- */
T.FUND={
 BBCA:{pe:24.1,pbv:4.6,dy:2.6,sup:["Vendor core banking","Penyedia pusat data"],cus:["Ritel & UMKM","Korporasi"],cmp:["BBRI","BMRI","BBNI"],desc:"Bank swasta terbesar di Indonesia dengan fokus transaksi dan tabungan ritel."},
 BBRI:{pe:11.3,pbv:2.2,dy:7.8,sup:["Jaringan agen BRILink","Vendor TI"],cus:["Mikro & UMKM"],cmp:["BBCA","BMRI","BBNI"],desc:"Bank dengan portofolio mikro dan UMKM terbesar, jaringan unit paling luas."},
 BMRI:{pe:8.4,pbv:1.7,dy:7.5,sup:["Vendor TI","Penyedia pusat data"],cus:["Korporasi","Ritel"],cmp:["BBCA","BBRI","BBNI"],desc:"Bank BUMN dengan basis korporasi dan komersial yang kuat."},
 TLKM:{pe:13,pbv:2.3,dy:5.5,sup:["Mitratel (menara)","Vendor perangkat jaringan"],cus:["Ritel seluler","Korporasi"],cmp:["ISAT","EXCL"],desc:"Operator telekomunikasi terintegrasi: seluler, fixed broadband, dan menara."},
 ASII:{pe:6.9,pbv:1,dy:7.1,sup:["Toyota","Daihatsu","Honda (prinsipal)"],cus:["Konsumen otomotif","Tambang & alat berat"],cmp:["UNTR"],desc:"Konglomerasi otomotif, alat berat, jasa keuangan, agribisnis, dan infrastruktur."},
 MEDC:{pe:5.8,pbv:.9,dy:1.9,sup:["Kontraktor pengeboran","Penyedia FPSO"],cus:["PLN","Pembeli minyak & gas"],cmp:["PGAS","AKRA","ENRG"],desc:"Perusahaan energi terintegrasi: minyak dan gas, kelistrikan, dan tambang (Amman)."},
 ADRO:{pe:5,pbv:.8,dy:9,sup:["Kontraktor tambang","Logistik tongkang"],cus:["PLN","Pembeli ekspor"],cmp:["PTBA","ITMG","BYAN"],desc:"Pelaku batu bara yang bertransformasi ke mineral dan energi hijau."},
 GOTO:{pe:-8,pbv:1.2,dy:0,sup:["Mitra pengemudi","Merchant"],cus:["Konsumen","Merchant"],cmp:["Grab","Shopee"],desc:"Ekosistem on-demand, e-commerce, dan layanan keuangan."}
};
T.MAC=[["BI Rate","ID","5.75%","Tahan"],["Fed Funds Rate","US","4.50%","Turun"],["CPI YoY","ID","2.1%","Rendah"],["CPI YoY","US","2.9%","Stabil"],["PDB YoY","ID","5.0%","Stabil"],
 ["PDB YoY","US","2.8%","Stabil"],["Pengangguran","ID","4.9%","Turun"],["Pengangguran","US","4.2%","Stabil"],["Cadangan devisa","ID","USD 150B","Naik"],["PMI Manufaktur","ID","50.4","Naik"]];

/* ---- Mesin simulasi ---- */
T.tickAll=function(){
  Object.keys(U).forEach(function(k){
    var s=U[k];if(s.live)return;
    var old=s.px,step=(s.r()-.5)*2*s.vol*.12+(s.base-s.px)/s.base*.002;
    s.px=Math.max(s.px*(1+step),1e-6);s.dir=s.px>old?1:s.px<old?-1:0;
  });
};
/* ---- Seri harga (OHLCV) ---- */
var TF=T.TF={"1D":{n:96,ms:15*60e3,bi:"15m"},"5D":{n:120,ms:60*60e3,bi:"1h"},"1M":{n:180,ms:4*3600e3,bi:"4h"},"6M":{n:180,ms:864e5,bi:"1d"},"1Y":{n:260,ms:864e5*1.4,bi:"1d"},"5Y":{n:260,ms:864e5*7,bi:"1w"}};
var cache={};
T.series=function(code,tf){
  var key=code+"|"+tf;if(cache[key])return cache[key];
  var s=U[code],cfg=TF[tf],r=T.rng(T.hash(key)),n=cfg.n,p=1,out=[],mult=tf==="5Y"?3:tf==="1Y"?2:tf==="6M"?1.5:tf==="1M"?1.2:1;
  var t0=Date.now()-n*cfg.ms;
  for(var i=0;i<n;i++){
    var o=p,c=o*(1+(r()-.5)*2*s.vol*mult);
    out.push({t:t0+i*cfg.ms,o:o,c:c,h:Math.max(o,c)*(1+r()*s.vol*.4),l:Math.min(o,c)*(1-r()*s.vol*.4),v:Math.round(s.vlm*(.4+r()*1.2))});p=c;
  }
  var k=s.px/p;out.forEach(function(b){b.o*=k;b.c*=k;b.h*=k;b.l*=k});
  cache[key]={bars:out,real:false};return cache[key];
};
T.liveBar=function(code){
  var s=U[code];Object.keys(cache).forEach(function(k){
    if(k.indexOf(code+"|")!==0)return;var b=cache[k].bars,l=b[b.length-1];l.c=s.px;l.h=Math.max(l.h,s.px);l.l=Math.min(l.l,s.px);
  });
};
/* Riwayat nyata kripto dari Binance REST (CORS terbuka). Gagal -> tetap simulasi. */
T.loadReal=function(code,tf,cb){
  var s=U[code];if(!s||!s.bn)return;var key=code+"|"+tf;if(cache[key]&&cache[key].real)return;
  fetch("https://api.binance.com/api/v3/klines?symbol="+s.bn+"&interval="+TF[tf].bi+"&limit="+TF[tf].n)
   .then(function(r){return r.json()}).then(function(a){
     if(!Array.isArray(a)||!a.length)return;
     cache[key]={real:true,bars:a.map(function(k){return{t:k[0],o:+k[1],h:+k[2],l:+k[3],c:+k[4],v:+k[5]}})};cb&&cb();
   }).catch(function(){});
};

/* ---- Feed live ---- */
T.feed={crypto:"mati",fx:"mati"};
T.startFeeds=function(){
  try{
    var map={};T.byType("CRYPTO").forEach(function(s){map[s.bn.toLowerCase()]=s});
    var ws=new WebSocket("wss://stream.binance.com:9443/stream?streams="+Object.keys(map).map(function(k){return k+"@miniTicker"}).join("/"));
    ws.onopen=function(){T.feed.crypto="live"};
    ws.onmessage=function(m){
      var d=JSON.parse(m.data).data;if(!d||!d.s)return;var s=map[d.s.toLowerCase()];if(!s)return;
      var np=+d.c;s.dir=np>s.px?1:np<s.px?-1:0;s.px=np;s.prev=+d.o;s.live=true;T.liveBar(s.code);
    };
    ws.onclose=ws.onerror=function(){if(T.feed.crypto==="live")T.feed.crypto="putus";T.byType("CRYPTO").forEach(function(s){s.live=false})};
  }catch(e){}
  function fxLoad(){
    var d2=new Date(),d1=new Date(Date.now()-10*864e5),f=function(d){return d.toISOString().slice(0,10)};
    fetch("https://api.frankfurter.app/"+f(d1)+".."+f(d2)+"?from=USD&to=IDR,EUR,GBP,JPY,AUD,SGD,CNY,MYR")
     .then(function(r){return r.json()}).then(function(j){
       var days=Object.keys(j.rates).sort(),last=j.rates[days[days.length-1]],prv=j.rates[days[days.length-2]]||last;
       function setp(code,fn){var s=U[code];if(!s)return;s.px=fn(last);s.prev=fn(prv);s.base=s.px;s.live=true}
       setp("USDIDR",function(r){return r.IDR});setp("EURUSD",function(r){return 1/r.EUR});setp("GBPUSD",function(r){return 1/r.GBP});
       setp("USDJPY",function(r){return r.JPY});setp("AUDUSD",function(r){return 1/r.AUD});setp("USDSGD",function(r){return r.SGD});
       setp("USDCNY",function(r){return r.CNY});setp("USDMYR",function(r){return r.MYR});T.feed.fx="live ("+days[days.length-1]+")";
     }).catch(function(){T.feed.fx="gagal (pakai simulasi)"});
  }
  fxLoad();setInterval(fxLoad,10*60e3);
};
/* Kurs silang: berapa USD per 1 unit mata uang */
T.usdPer=function(c){
  var m={USD:1,IDR:1/U.USDIDR.px,EUR:U.EURUSD.px,GBP:U.GBPUSD.px,JPY:1/U.USDJPY.px,AUD:U.AUDUSD.px,SGD:1/U.USDSGD.px,CNY:1/U.USDCNY.px,MYR:1/U.USDMYR.px};return m[c];
};

/* ---- Laporan keuangan ilustrasi (deterministik per emiten) ---- */
T.financials=function(code){
  var s=U[code],r=T.rng(T.hash("fin"+code)),f=T.FUND[code],pe=f&&f.pe>0?f.pe:10+r()*14;
  var ni=s.cap/pe,yrs=[],y0=new Date().getFullYear()-1,margin=.08+r()*.18,bank=s.sector==="Keuangan",g=.04+r()*.12;
  if(bank)margin=.28+r()*.1;
  for(var i=4;i>=0;i--){
    var k=Math.pow(1+g,-i)*(1+(r()-.5)*.08),n=ni*k,rev=n/margin*(1+(r()-.5)*.04);
    var ebitda=n*1.55,ta=rev*(bank?9:1.6),eq=ta*(bank?.11:.5),debt=bank?ta*.08:ta*.2,cash=ta*(bank?.1:.1),cfo=n*(.9+r()*.4),capex=-n*(.3+r()*.3);
    yrs.push({y:y0-i,rev:rev,ebitda:ebitda,ni:n,eps:n*1e12/(s.cap*1e12/s.px),ta:ta,eq:eq,debt:debt,cash:cash,cfo:cfo,capex:capex,fcf:cfo+capex,tl:ta-eq});
  }
  return yrs;
};
})(window.T);
