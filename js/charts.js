/* Penggambar grafik canvas: harga (lilin/garis + volume + SMA), sparkline, kurva imbal hasil. */
(function(T){
var UP="#2fd06b",DN="#ff4d4d",AM="#ffa028",GR="#2b2111",DIM="#8c6d3c";
function tl(tf,t){var d=new Date(t);if(tf==="1D")return T.hhmm(d);if(tf==="5D"||tf==="1M")return d.getDate()+"/"+(d.getMonth()+1)+" "+T.p2(d.getHours())+"h";return d.toLocaleDateString("en-GB",{month:"short",year:"2-digit"})}
/* opts: {bars, dp, mode:'candle'|'line', sma:bool, vol:bool, tf, hover:index} */
T.drawPrice=function(cv,o){
  var f=T.fit(cv),w=f.w,h=f.h,x=f.x,bars=o.bars,n=bars.length;if(!n||w<50)return;
  var L=6,R=64,Tp=6,B=18,vh=o.vol?Math.round(h*.18):0,pw=w-L-R,ph=h-Tp-B-vh,hi=-1e99,lo=1e99;
  bars.forEach(function(b){hi=Math.max(hi,b.h);lo=Math.min(lo,b.l)});var pad=(hi-lo)*.06||hi*.01;hi+=pad;lo-=pad;
  function Y(v){return Tp+(hi-v)/(hi-lo)*ph}
  var bw=pw/n;
  x.strokeStyle=GR;x.fillStyle=DIM;x.lineWidth=1;x.textAlign="left";
  for(var i=0;i<=5;i++){var v=lo+(hi-lo)*i/5,y=Y(v);x.beginPath();x.moveTo(L,y);x.lineTo(L+pw,y);x.stroke();x.fillText(T.fx(v,o.dp),L+pw+5,y)}
  x.textAlign="center";
  for(i=1;i<5;i++){var idx=Math.floor(n*i/5);x.fillText(tl(o.tf,bars[idx].t),L+bw*(idx+.5),h-7)}
  if(o.vol){var mv=Math.max.apply(null,bars.map(function(b){return b.v}))||1;
    bars.forEach(function(b,i){var hh=b.v/mv*(vh-4);x.fillStyle=b.c>=b.o?"#2fd06b55":"#ff4d4d55";x.fillRect(L+bw*i+1,h-B-hh,Math.max(1,bw-2),hh)})}
  if(o.mode==="line"){
    x.beginPath();bars.forEach(function(b,i){var cx=L+bw*(i+.5);i?x.lineTo(cx,Y(b.c)):x.moveTo(cx,Y(b.c))});
    x.strokeStyle=AM;x.lineWidth=1.6;x.stroke();x.lineTo(L+bw*(n-.5),Tp+ph);x.lineTo(L+bw*.5,Tp+ph);x.closePath();
    var g=x.createLinearGradient(0,Tp,0,Tp+ph);g.addColorStop(0,"#ffa02840");g.addColorStop(1,"#ffa02800");x.fillStyle=g;x.fill();
  }else bars.forEach(function(b,i){
    var cx=L+bw*(i+.5),col=b.c>=b.o?UP:DN;x.strokeStyle=col;x.fillStyle=col;x.lineWidth=1;
    x.beginPath();x.moveTo(cx,Y(b.h));x.lineTo(cx,Y(b.l));x.stroke();
    var y1=Y(Math.max(b.o,b.c)),y2=Y(Math.min(b.o,b.c));x.fillRect(cx-bw*.35,y1,Math.max(1,bw*.7),Math.max(1,y2-y1));
  });
  if(o.sma){[[20,"#4aa8ff"],[50,"#d86bff"]].forEach(function(p){
    var s=T.sma(bars.map(function(b){return b.c}),p[0]);x.beginPath();var st=false;
    s.forEach(function(v,i){if(v==null)return;var cx=L+bw*(i+.5);st?x.lineTo(cx,Y(v)):x.moveTo(cx,Y(v));st=true});
    x.strokeStyle=p[1];x.lineWidth=1.2;x.stroke()})}
  var last=bars[n-1].c,ly=Y(last),lc=last>=bars[0].o?UP:DN;
  x.setLineDash([3,3]);x.strokeStyle=lc;x.lineWidth=1;x.beginPath();x.moveTo(L,ly);x.lineTo(L+pw,ly);x.stroke();x.setLineDash([]);
  x.fillStyle=lc;x.fillRect(L+pw+1,ly-8,R-3,16);x.fillStyle="#000";x.textAlign="left";x.fillText(T.fx(last,o.dp),L+pw+4,ly);
  if(o.hover>=0&&o.hover<n){var hx=L+bw*(o.hover+.5);x.strokeStyle="#ffa02899";x.setLineDash([2,3]);x.beginPath();x.moveTo(hx,Tp);x.lineTo(hx,Tp+ph);x.stroke();x.setLineDash([])}
  cv._geo={L:L,pw:pw,n:n};
};
T.hoverIndex=function(cv,e){var g=cv._geo;if(!g)return-1;var r=cv.getBoundingClientRect(),i=Math.floor((e.clientX-r.left-g.L)/g.pw*g.n);return i>=0&&i<g.n?i:-1};
/* sparkline kecil dalam elemen canvas */
T.spark=function(cv,vals,color){
  var f=T.fit(cv),w=f.w,h=f.h,x=f.x;if(!vals.length)return;var hi=Math.max.apply(null,vals),lo=Math.min.apply(null,vals),d=hi-lo||1;
  x.beginPath();vals.forEach(function(v,i){var px=i/(vals.length-1)*(w-2)+1,py=h-2-(v-lo)/d*(h-4);i?x.lineTo(px,py):x.moveTo(px,py)});
  x.strokeStyle=color;x.lineWidth=1.3;x.stroke();
};
/* kurva imbal hasil: series = [{name,color,vals,dash}], tenors */
T.drawCurve=function(cv,tenors,series,lo,hi){
  var f=T.fit(cv),w=f.w,h=f.h,x=f.x,L=36,R=12,Tp=12,B=22,pw=w-L-R,ph=h-Tp-B;
  function X(i){return L+pw*i/(tenors.length-1)}function Y(v){return Tp+(hi-v)/(hi-lo)*ph}
  x.fillStyle=DIM;x.strokeStyle=GR;x.textAlign="right";
  for(var v=Math.ceil(lo);v<=hi;v+=1){x.beginPath();x.moveTo(L,Y(v));x.lineTo(L+pw,Y(v));x.stroke();x.fillText(v+"%",L-5,Y(v))}
  x.textAlign="center";tenors.forEach(function(t,i){x.fillText(t,X(i),h-8)});
  series.forEach(function(s){
    x.beginPath();s.vals.forEach(function(v,i){i?x.lineTo(X(i),Y(v)):x.moveTo(X(i),Y(v))});
    x.strokeStyle=s.color;x.lineWidth=2;x.setLineDash(s.dash||[]);x.stroke();x.setLineDash([]);
    if(!s.dash)s.vals.forEach(function(v,i){x.beginPath();x.arc(X(i),Y(v),3,0,7);x.fillStyle=s.color;x.fill()});
  });
};
})(window.T);
