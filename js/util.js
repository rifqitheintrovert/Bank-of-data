/* Helpers umum: format angka, RNG berbenih, canvas. */
window.T=window.T||{};
(function(T){
T.$=function(s,r){return(r||document).querySelector(s)};
T.hash=function(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
T.rng=function(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}};
T.fx=function(v,dp){if(v==null||isNaN(v))return"-";return v.toLocaleString("en-US",{minimumFractionDigits:dp,maximumFractionDigits:dp})};
T.pct=function(v,d){if(v==null||isNaN(v))return"-";return(v>=0?"+":"")+v.toFixed(d==null?2:d)+"%"};
T.cls=function(v){return v>=0?"up":"down"};
T.big=function(v){var a=Math.abs(v);if(a>=1e12)return(v/1e12).toFixed(2)+"T";if(a>=1e9)return(v/1e9).toFixed(2)+"B";if(a>=1e6)return(v/1e6).toFixed(2)+"M";if(a>=1e3)return(v/1e3).toFixed(1)+"K";return v.toFixed(0)};
T.p2=function(n){return("0"+n).slice(-2)};
T.hhmm=function(d){return T.p2(d.getHours())+":"+T.p2(d.getMinutes())};
T.fit=function(c){
  var d=window.devicePixelRatio||1,w=c.clientWidth,h=c.clientHeight;
  if(c.width!==Math.round(w*d)||c.height!==Math.round(h*d)){c.width=Math.round(w*d);c.height=Math.round(h*d)}
  var x=c.getContext("2d");x.setTransform(d,0,0,d,0,0);x.clearRect(0,0,w,h);
  x.font="10px IBM Plex Mono, monospace";x.textBaseline="middle";
  return{w:w,h:h,x:x};
};
T.store={
  get:function(k,def){try{var v=localStorage.getItem("bod_"+k);return v?JSON.parse(v):def}catch(e){return def}},
  set:function(k,v){try{localStorage.setItem("bod_"+k,JSON.stringify(v))}catch(e){}}
};
T.toast=function(msg){
  var box=T.$("#toasts"),d=document.createElement("div");d.className="toast";d.textContent=msg;box.appendChild(d);
  setTimeout(function(){d.remove()},6000);
};
T.sma=function(a,n){var o=[],s=0;for(var i=0;i<a.length;i++){s+=a[i];if(i>=n)s-=a[i-n];o.push(i>=n-1?s/n:null)}return o};
/* CDF normal untuk Black-Scholes */
T.ncdf=function(x){var t=1/(1+.2316419*Math.abs(x)),d=.3989423*Math.exp(-x*x/2),p=d*t*(.3193815+t*(-.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));return x>0?1-p:p};
})(window.T);
