const fs=require('node:fs');
const {load}=require('../harness.cjs');
const {getEraserFrame,createEraserRoute,ERASE_SECONDS:T}=load('eraser');
const w=900,h=406,r=createEraserRoute(w,h);
const total=r.guide.at(-1).cost;
const quantile=(a,q)=>a.slice().sort((a,b)=>a-b)[Math.floor((a.length-1)*q)];
const wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
const length=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
function metrics(hz,phase=0){
 const dt=1/hz,samples=[];
 for(let i=0;i<=Math.floor(T*hz);i++){const t=Math.min(T,(i+phase)/hz); samples.push({...getEraserFrame(t/T,w,h).cursor,t});}
 const moves=samples.slice(1).map((b,i)=>({t:b.t,dist:length(samples[i],b),vx:(b.x-samples[i].x)/dt,vy:(b.y-samples[i].y)/dt,heading:Math.atan2(b.y-samples[i].y,b.x-samples[i].x)}));
 const turns=moves.slice(1).map((b,i)=>({t:b.t,deg:Math.abs(wrap(b.heading-moves[i].heading))*180/Math.PI,accel:Math.hypot(b.vx-moves[i].vx,b.vy-moves[i].vy)/dt,step:b.dist}));
 const worst=turns.sort((a,b)=>b.deg-a.deg).slice(0,8);
 return {hz,phase,zeroMoves:moves.filter(m=>m.dist<1e-7).length,movePx:{p50:quantile(moves.map(m=>m.dist),.5),p95:quantile(moves.map(m=>m.dist),.95),max:Math.max(...moves.map(m=>m.dist))},headingDeg:{p95:quantile(turns.map(m=>m.deg),.95),max:worst[0].deg},accelMax:Math.max(...turns.map(m=>m.accel)),worst};
}
let offset=0;
const curves=r.curves.map((c,i)=>{const count=(c.kind==='turn'?96:128)+(i===0?1:0),a=r.guide.slice(offset,offset+count);offset+=count;
 return {index:i,kind:c.kind,duration:(a.at(-1).cost-a[0].cost)/total*T,length:a.at(-1).length-a[0].length,maxCurvature:Math.max(...a.map(p=>p.curvature)),minRadius:1/Math.max(...a.map(p=>p.curvature)),x:c.points[0].x,y:c.points[0].y};});
const output={dimensions:[w,h],totalLength:r.guide.at(-1).length,avgSpeed:r.guide.at(-1).length/T,curveCount:curves.length,sweepCount:curves.filter(c=>c.kind==='sweep').length,curves,metrics:[60,120,144,240,10,5].flatMap(hz=>[0,.37].map(phase=>metrics(hz,phase)))};
fs.writeFileSync(__dirname+'/eraser-motion-metrics.json',JSON.stringify(output,null,2));
console.log(JSON.stringify({...output,curves:curves.filter(c=>c.kind==='turn'),metrics:output.metrics.map(({worst,...rest})=>rest)},null,2));
