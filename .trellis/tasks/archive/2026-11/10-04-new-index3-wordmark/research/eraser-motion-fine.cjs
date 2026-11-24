const {load}=require('../harness.cjs'); const {createEraserRoute}=load('eraser');
const r=createEraserRoute(900,406),T=4.8,total=r.guide.at(-1).cost;
let off=0; const details=r.curves.map((c,i)=>{const n=(c.kind==='turn'?96:128)+(i===0?1:0),ps=r.guide.slice(off,off+n);off+=n;const worst=ps.reduce((a,b)=>b.curvature>a.curvature?b:a);const localSpeed=total/T*worst.speed;
 return {index:i,kind:c.kind,startTime:ps[0].cost/total*T,endTime:ps.at(-1).cost/total*T,minRadius:1/worst.curvature,worst:{x:worst.x,y:worst.y,t:worst.cost/total*T,v:localSpeed,normalAcceleration:localSpeed**2*worst.curvature},minSpeed:Math.min(...ps.map(p=>p.speed))*total/T,maxSpeed:Math.max(...ps.map(p=>p.speed))*total/T};});
function continuous(t){const cost=t/T*total;let j=1;while(j<r.guide.length-1&&r.guide[j].cost<cost)j++;const a=r.guide[j-1],b=r.guide[j],f=(cost-a.cost)/(b.cost-a.cost);return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f};}
for(const hz of[480,1000]){const dt=1/hz,ps=Array.from({length:Math.floor(T*hz)+1},(_,i)=>continuous(i/hz));let heading=0,accel=0,prev;
 for(let i=1;i<ps.length;i++){const v={x:(ps[i].x-ps[i-1].x)/dt,y:(ps[i].y-ps[i-1].y)/dt};if(prev){const a=Math.atan2(v.y,v.x)-Math.atan2(prev.y,prev.x);heading=Math.max(heading,Math.abs(Math.atan2(Math.sin(a),Math.cos(a)))*180/Math.PI);accel=Math.max(accel,Math.hypot(v.x-prev.x,v.y-prev.y)/dt);}prev=v;}
 console.log(JSON.stringify({hz,maxHeadingDeltaDeg:heading,maxAccel:accel}));}
console.log(JSON.stringify(details.filter(c=>c.kind==='turn'),null,2));
