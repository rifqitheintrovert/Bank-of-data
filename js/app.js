/* Panel, command line, tick loop, status bar, tape. */
(function(T){
var $=T.$,F=T.F,U=T.U,panes=[],active=0,layout=T.store.get("layout",4),lastSec="BBCA";
var NOISE={EQUITY:1,INDEX:1,CURNCY:1,COMDTY:1,CRYPTO:1,GO:1,"<GO>":1,IJ:1,JK:1,US:1,CORP:1,GOVT:1};

function mkPane(i){
  var el=document.createElement("section");el.className="pane";
  el.innerHTML='<div class="ph"><span class="t"><span class="n">'+(i+1)+'</span><span class="tt">kosong</span></span><span class="x">klik untuk aktif</span></div><div class="pb"></div>';
  $("#panes").appendChild(el);
  var p={i:i,el:el,body:el.querySelector(".pb"),sec:null,fn:null,tick:null,resize:null,
    exec:function(c){run(c,p)}};
  el.querySelector(".ph").addEventListener("click",function(){setActive(i)});
  el.addEventListener("mousedown",function(){if(active!==i)setActive(i)});
  if(window.ResizeObserver)new ResizeObserver(function(){if(p.resize)try{p.resize()}catch(e){}}).observe(p.body);
  panes.push(p);return p;
}
function setActive(i){
  active=i;panes.forEach(function(p,k){p.el.classList.toggle("act",k===i)});$("#prompt").textContent=i+1;
  if(layout===1)applyLayout();
}
function applyLayout(){
  var g=$("#panes");g.className="panes l"+layout;
  panes.forEach(function(p,k){var show=layout===4||(layout===2&&k<2)||(layout===1&&k===active);p.el.classList.toggle("hide",!show)});
  document.querySelectorAll("#layouts button").forEach(function(b){b.classList.toggle("on",+b.getAttribute("data-l")===layout)});
  T.store.set("layout",layout);
  setTimeout(function(){panes.forEach(function(p){if(p.resize)try{p.resize()}catch(e){}})},30);
}
function say(p,msg){p.body.innerHTML='<div class="err">'+msg+'</div>';p.tick=p.resize=null}

function run(raw,p){
  p=p||panes[active];
  var toks=raw.toUpperCase().replace(/[<>]/g," ").split(/\s+/).filter(function(t){return t&&!NOISE[t]});
  if(!toks.length)return;
  var fn=null,sec=null;
  toks.forEach(function(t){if(!fn&&F[t])fn=F[t];else if(!sec&&T.find(t))sec=T.find(t);else if(!sec&&!fn&&F[t])fn=F[t]});
  if(!fn&&!sec){say(p,'Perintah "'+toks.join(" ")+'" tidak dikenal. Ketik HELP untuk daftar fungsi.');titleOf(p,"?");return}
  if(!fn)fn=F.GP;
  var code=sec?sec.code:(p.sec||lastSec);
  if(fn.sec&&!T.find(code))code="BBCA";
  p.fn=fn;p.sec=fn.sec||sec?code:(sec?sec.code:p.sec);
  if(sec){lastSec=sec.code}
  p.tick=null;p.resize=null;p.tab=null;p.body.onclick=null;p.body.onmousemove=null;
  try{fn.render(p)}catch(e){say(p,"Gagal membuka "+fn.mn+": "+e.message)}
  titleOf(p,fn);
}
function titleOf(p,fn){
  var s=p.sec&&U[p.sec];
  p.el.querySelector(".tt").textContent=fn&&fn.mn?((fn.sec&&s?s.code+" · ":"")+fn.mn+" — "+(fn.sec&&s?s.name:fn.name)):"perintah tidak dikenal";
}

/* ---- tick utama ---- */
function loop(){
  T.tickAll();T.checkAlerts();
  panes.forEach(function(p){if(p.el.classList.contains("hide"))return;if(p.tick)try{p.tick()}catch(e){}});
  status();
}
function status(){
  var f=T.feed,h=function(k,v){var ok=/^live/.test(v);return'<span class="'+(ok?"ok":"no")+'">● '+k+': '+v+'</span>'};
  $("#status").innerHTML=h("Kripto",f.crypto)+h("FX",f.fx)+'<span class="no">○ Saham/Indeks/Komoditas: simulasi</span>';
}
function tape(){
  var codes=["IHSG","LQ45","SPX","NDX","DJI","UKX","N225","HSI","USDIDR","EURUSD","XAUUSD","WTI","COAL","BTCUSD","ETHUSD","BBCA","BBRI","TLKM","MEDC"];
  var one=codes.map(function(c){var s=U[c];return'<span><b class="sym">'+c+'</b> '+T.fx(s.px,s.dp)+' <span class="'+T.cls(T.chg(s))+'">'+T.pct(T.chg(s))+'</span></span>'}).join("");
  $("#tape").innerHTML=one+one;
}
function clocks(){
  var d=new Date(),z=function(tz){return d.toLocaleTimeString("en-GB",{timeZone:tz,hour:"2-digit",minute:"2-digit"})};
  $("#clocks").innerHTML='JKT <b>'+z("Asia/Jakarta")+'</b> · NYC <b>'+z("America/New_York")+'</b> · LON <b>'+z("Europe/London")+'</b>';
}

/* ---- init ---- */
function init(){
  for(var i=0;i<4;i++)mkPane(i);
  var fk=["WEI","EQS","IMAP","GP","DES","FA","SPLC","OMON","FXC","YCRV","CMDT","CRYP","ECO","TOP","MOST","PORT","ALRT","HELP"];
  $("#fkeys").innerHTML=fk.map(function(k){return'<button data-k="'+k+'" title="'+F[k].name+'">'+k+'</button>'}).join("");
  $("#fkeys").addEventListener("click",function(e){var k=e.target.getAttribute("data-k");if(k)run(k,panes[active])});
  var dl=document.createElement("datalist");dl.id="cmdlist";
  dl.innerHTML=Object.keys(U).concat(Object.keys(F)).map(function(k){return'<option value="'+k+'">'}).join("");document.body.appendChild(dl);
  $("#cmdform").addEventListener("submit",function(e){e.preventDefault();var v=$("#cmd").value;$("#cmd").value="";run(v,panes[active])});
  document.querySelectorAll("#layouts button").forEach(function(b){b.addEventListener("click",function(){layout=+b.getAttribute("data-l");applyLayout()})});
  document.addEventListener("keydown",function(e){
    if(e.target.tagName==="INPUT"||e.target.tagName==="SELECT"||e.ctrlKey||e.metaKey||e.altKey)return;
    if(e.key==="Escape"||(e.key.length===1&&/[a-zA-Z0-9?]/.test(e.key)))$("#cmd").focus();
  });
  window.addEventListener("resize",function(){panes.forEach(function(p){if(p.resize)try{p.resize()}catch(e){}})});
  run("WEI",panes[0]);run("BBCA GP",panes[1]);run("TOP",panes[2]);run("CRYP",panes[3]);
  setActive(1);applyLayout();clocks();status();tape();
  setInterval(loop,1000);setInterval(tape,3000);setInterval(clocks,10000);
  T.startFeeds();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(window.T);
