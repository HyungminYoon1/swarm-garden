import {rng,clamp} from "./ui.js";
export const WIDTH=960,HEIGHT=600;
export const presets=Object.freeze({school:{separation:1.5,alignment:1.1,cohesion:.8,vision:75},flock:{separation:1.1,alignment:2.5,cohesion:.5,vision:100},scatter:{separation:2.8,alignment:.1,cohesion:.05,vision:45}});
export function validate(p){for(const key of ["separation","alignment","cohesion"])if(!Number.isFinite(p[key])||p[key]<0||p[key]>3)throw new RangeError("Invalid rule");if(!Number.isFinite(p.vision)||p.vision<30||p.vision>130)throw new RangeError("Invalid vision");}
export function createWorld(count=160,seed=1){if(!Number.isInteger(count)||count<40||count>280)throw new RangeError("Invalid flock size");const random=rng(seed);return {seed,boids:Array.from({length:count},()=>{const a=random()*Math.PI*2;return {x:random()*WIDTH,y:random()*HEIGHT,vx:Math.cos(a)*70,vy:Math.sin(a)*70};}),obstacles:[],time:0};}
const delta=(n,size)=>n>size/2?n-size:n<-size/2?n+size:n;
const limit=(x,y,max)=>{const n=Math.hypot(x,y);return n>max?[x*max/n,y*max/n]:[x,y];};
export function addObstacle(world,x,y){if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>WIDTH||y<0||y>HEIGHT)throw new RangeError("Invalid obstacle");if(world.obstacles.length>=12)throw new RangeError("장애물은 12개까지 놓을 수 있습니다.");world.obstacles.push({x,y,r:32});}
export function step(world,p,dt=1/60,pointer=null){
  validate(p);if(!Number.isFinite(dt)||dt<=0||dt>.05)throw new RangeError("Invalid timestep");
  const old=world.boids,next=[];
  for(let i=0;i<old.length;i++){
    const b=old[i];let sx=0,sy=0,ax=0,ay=0,cx=0,cy=0,n=0;
    for(let j=0;j<old.length;j++){if(i===j)continue;const o=old[j],dx=delta(o.x-b.x,WIDTH),dy=delta(o.y-b.y,HEIGHT),d2=dx*dx+dy*dy;if(d2>p.vision*p.vision||d2<.0001)continue;n++;ax+=o.vx;ay+=o.vy;cx+=dx;cy+=dy;if(d2<28*28){sx-=dx/d2;sy-=dy/d2;}}
    let fx=sx*p.separation*1500,fy=sy*p.separation*1500;
    if(n){fx+=(ax/n-b.vx)*p.alignment*.8+cx/n*p.cohesion*.7;fy+=(ay/n-b.vy)*p.alignment*.8+cy/n*p.cohesion*.7;}
    for(const obstacle of world.obstacles){const dx=delta(b.x-obstacle.x,WIDTH),dy=delta(b.y-obstacle.y,HEIGHT),d=Math.hypot(dx,dy)||.01;if(d<obstacle.r+65){const force=(obstacle.r+65-d)*6;fx+=dx/d*force;fy+=dy/d*force;}}
    if(pointer){const dx=delta(pointer.x-b.x,WIDTH),dy=delta(pointer.y-b.y,HEIGHT),d=Math.hypot(dx,dy)||1,sign=pointer.mode==="avoid"?-1:1;if(d<260){fx+=dx/d*sign*80;fy+=dy/d*sign*80;}}
    [fx,fy]=limit(fx,fy,160);let [vx,vy]=limit(b.vx+fx*dt,b.vy+fy*dt,110);const speed=Math.hypot(vx,vy);if(speed<35){const a=speed<.001?i:Math.atan2(vy,vx);vx=Math.cos(a)*35;vy=Math.sin(a)*35;}
    let x=(b.x+vx*dt+WIDTH)%WIDTH,y=(b.y+vy*dt+HEIGHT)%HEIGHT;
    for(const o of world.obstacles){const dx=delta(x-o.x,WIDTH),dy=delta(y-o.y,HEIGHT),d=Math.hypot(dx,dy);if(d<o.r+3){const a=d<.001?i:Math.atan2(dy,dx);x=(o.x+Math.cos(a)*(o.r+3)+WIDTH)%WIDTH;y=(o.y+Math.sin(a)*(o.r+3)+HEIGHT)%HEIGHT;}}
    next.push({x,y,vx,vy});
  }
  world.boids=next;world.time+=dt;
}
export function metrics(world){let x=0,y=0,speed=0;for(const b of world.boids){const s=Math.hypot(b.vx,b.vy);speed+=s;x+=b.vx/(s||1);y+=b.vy/(s||1);}return {count:world.boids.length,order:clamp(Math.hypot(x,y)/world.boids.length,0,1),speed:speed/world.boids.length,obstacles:world.obstacles.length};}
