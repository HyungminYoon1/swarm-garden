import test from "node:test";
import assert from "node:assert/strict";
import {createMission,missionTypes,missionEnvironment,stepMission,setBeacon,releaseBeacon,objectiveMetrics} from "../dist/src/missions.js";
import {createWorld,step,presets,torusDistance,WIDTH,HEIGHT} from "../dist/src/model.js";

const types=Object.keys(missionTypes);
const tight={separation:.2,alignment:1.5,cohesion:2,vision:120};
function run(type,seed,rules=tight){
  const m=createMission(type,seed);
  while(!m.report){const g=m.gates[m.stage];setBeacon(m,g.x,g.y);stepMission(m,rules);}
  return m;
}
function bounded(world){
  assert.equal(world.boids.length,60);
  assert(world.obstacles.length<=12);
  for(const b of world.boids){assert(Number.isFinite(b.x+b.y+b.vx+b.vy));assert(b.x>=0&&b.x<WIDTH);assert(b.y>=0&&b.y<HEIGHT);assert(Math.hypot(b.vx,b.vy)>=35-1e-8);assert(Math.hypot(b.vx,b.vy)<=110+1e-8);}
}
test("mission creation is repeatable, varied, bounded and validates its inputs",()=>{
  for(const type of types){const a=createMission(type,21),b=createMission(type,22);assert.deepEqual(a,createMission(type,21));assert.notDeepEqual(a.world.boids,b.world.boids);assert.notDeepEqual(a.gates,b.gates);bounded(a.world);assert.equal(a.gates.length,3);assert.equal(a.status,"ready");assert.equal(a.spent,0);assert(a.hazards.length<=3);}
  for(const seed of [0,-1,1.1,NaN,Infinity,4294967296,"21"])assert.throws(()=>createMission("funnel",seed),RangeError);
  for(const type of ["missing","toString","__proto__"])assert.throws(()=>createMission(type),RangeError);
});
test("objectives measure toroidal occupancy, neighbours, direction and actual exposure",()=>{
  const m=createMission("refuge");m.gates[0]={x:5,y:300,r:20};m.hazards=[{x:5,y:300,r:20}];
  m.world.boids=Array.from({length:60},(_,i)=>({x:i<30?955:480,y:300,vx:i<30?60:-60,vy:0}));
  assert.equal(torusDistance({x:955,y:300},{x:5,y:300}),10);
  assert.deepEqual(objectiveMetrics(m),{occupancy:.5,coherence:1,exposure:.5,order:0});
  m.world.boids.forEach(b=>b.vx=60);assert.equal(objectiveMetrics(m).order,1);
});
test("only the current gate counts and visiting a point without a flock cannot complete it",()=>{
  const m=createMission("funnel"),g=m.gates[2];
  m.world.boids=m.world.boids.map(b=>({...b,x:g.x,y:g.y}));stepMission(m,tight);assert.equal(m.stage,0);assert.equal(m.hold,0);
  const current=m.gates[0];m.world.boids.forEach((b,i)=>{b.x=i===0?current.x:800;b.y=i===0?current.y:500;});
  stepMission(m,tight);assert.equal(m.stage,0);assert.equal(m.hold,0);
});
test("coherence uses measured neighbour distances including its exact boundary",()=>{
  const m=createMission();
  const pairs=distance=>Array.from({length:60},(_,i)=>{const pair=Math.floor(i/2);return {x:(pair%6)*150+(i%2)*distance,y:Math.floor(pair/6)*110,vx:60,vy:0};});
  m.world.boids=pairs(55);assert.equal(objectiveMetrics(m).coherence,1);
  m.world.boids=pairs(55.1);assert.equal(objectiveMetrics(m).coherence,0);
});
test("continuous hold resets when a measured condition is broken",()=>{
  const m=createMission("funnel"),g=m.gates[0];
  m.world.boids=Array.from({length:60},(_,i)=>({x:g.x+(i%10)*3,y:g.y+Math.floor(i/10)*3,vx:60,vy:0}));
  // Fixture checks scoring boundaries; solvability tests below never move agents directly.
  const calm={separation:0,alignment:1,cohesion:0,vision:100};
  for(let i=0;i<30;i++)stepMission(m,calm);assert(m.hold>.49);assert.equal(m.stage,0);
  m.world.boids.forEach(b=>{b.x=800;b.y=500;});stepMission(m,calm);assert.equal(m.hold,0);assert.equal(m.stage,0);
});
test("high occupancy without consistent heading fails the simultaneous goal",()=>{
  const m=createMission("funnel"),g=m.gates[0];m.world.boids=Array.from({length:60},(_,i)=>({x:g.x,y:g.y,vx:i<30?60:-60,vy:0}));
  stepMission(m,{separation:0,alignment:0,cohesion:0,vision:100});assert.equal(objectiveMetrics(m).occupancy,1);assert.equal(m.hold,0);
});
test("guidance consumes only active simulation ticks and expires without premature failure",()=>{
  const m=createMission("funnel");setBeacon(m,300,300);const initial=structuredClone(m);
  assert.deepEqual(m,initial);for(let i=0;i<60;i++)stepMission(m,presets.school);assert(Math.abs(m.spent-1)<1e-8);
  releaseBeacon(m);const spent=m.spent;for(let i=0;i<60;i++)stepMission(m,presets.school);assert.equal(m.spent,spent);
  m.spent=missionTypes.funnel.budget-1/120;setBeacon(m,300,300);stepMission(m,presets.school);assert.equal(m.spent,missionTypes.funnel.budget);assert.equal(m.beacon,null);assert.equal(m.status,"active");
  assert.equal(setBeacon(m,300,300),false);const t=m.ticks;stepMission(m,presets.school);assert.equal(m.ticks,t+1);
});
test("invalid beacon and environmental fields are rejected before world or counters change",()=>{
  const m=createMission();for(const point of [[NaN,10],[10,Infinity],[-1,0],[WIDTH,300],[300,HEIGHT]])assert.throws(()=>setBeacon(m,...point),RangeError);
  assert.throws(()=>setBeacon(m,300,300,"other"),RangeError);const copy=structuredClone(m);
  assert.throws(()=>stepMission(m,{...tight,cohesion:NaN}),RangeError);assert.deepEqual(m,copy);
  for(const env of [{windX:46,windY:0},{windX:0,windY:NaN},{windX:0,windY:0,hazards:[{x:100,y:100,r:200}]},{windX:0,windY:0,hazards:Array(4).fill({x:100,y:100,r:20})}]){
    const w=createWorld(40);const before=structuredClone(w);assert.throws(()=>step(w,presets.school,1/60,null,env),RangeError);assert.deepEqual(w,before);
  }
});
test("flow switches on exact simulation tick, and external forces change the actual trajectories",()=>{
  const m=createMission("crosswind");assert.equal(missionEnvironment(m).windY,28);m.ticks=479;assert.equal(missionEnvironment(m).windY,28);m.ticks=480;assert.equal(missionEnvironment(m).windY,-28);m.ticks=960;assert.equal(missionEnvironment(m).windY,28);
  const a=createWorld(40,5),b=structuredClone(a);step(a,presets.school);step(b,presets.school,1/60,null,{windX:10,windY:28,hazards:[]});assert.notDeepEqual(a.boids,b.boids);
});
test("failure on deadline and damage is measured, terminal and repeatably frozen",()=>{
  const m=createMission("funnel");m.ticks=missionTypes.funnel.time*60-1;stepMission(m,presets.school);assert.equal(m.status,"failure");assert.equal(m.report.reason,"제한 시간 종료");assert.equal(m.report.time,65);
  const r=createMission("refuge"),zone=r.hazards[0];r.world.boids.forEach(b=>{b.x=zone.x+5;b.y=zone.y;});r.damage=missionTypes.refuge.damage-.001;stepMission(r,tight);assert.equal(r.status,"failure");assert.equal(r.report.reason,"위험 노출 한도 초과");assert(r.damage>=missionTypes.refuge.damage);
  for(const terminal of [m,r]){const before=structuredClone(terminal);assert.equal(setBeacon(terminal,200,200),false);stepMission(terminal,tight);assert.deepEqual(terminal,before);}
});
test("deadline wins over a gate qualifying on the last tick",()=>{
  const m=createMission(),g=m.gates[0];m.ticks=missionTypes.funnel.time*60-1;m.hold=missionTypes.funnel.hold-1/60;
  m.world.boids=Array.from({length:60},()=>({x:g.x,y:g.y,vx:60,vy:0}));
  stepMission(m,{separation:0,alignment:1,cohesion:0,vision:100});assert.equal(m.status,"failure");assert.equal(m.stage,0);assert.equal(m.completed.length,0);
});
test("maximum lab count stays finite under bounded combined wind, hazards and pointer forces",()=>{
  const w=createWorld(280,77);w.obstacles=[{x:300,y:300,r:44}];for(let i=0;i<180;i++)step(w,presets.scatter,1/60,{x:600,y:300,mode:i%2?"guide":"avoid"},{windX:0,windY:45,hazards:[{x:700,y:300,r:150}]});
  assert.equal(w.boids.length,280);for(const b of w.boids){assert(Number.isFinite(b.x+b.y+b.vx+b.vy));assert(b.x>=0&&b.x<WIDTH&&b.y>=0&&b.y<HEIGHT);assert(Math.hypot(b.vx,b.vy)<=110+1e-8);}
});
for(const type of types){
  test(`${type}: all three goals are solvable by actual bounded movement on five representative seeds`,()=>{
    for(const seed of [21,22,35,123,9876]){
      const m=run(type,seed);assert.equal(m.status,"success",`${type} seed ${seed}`);bounded(m.world);assert(m.report.time<missionTypes[type].time);assert(m.spent<=missionTypes[type].budget);assert(m.damage<missionTypes[type].damage);assert.equal(m.completed.length,3);
      for(const gate of m.completed){assert(gate.occupancy>=missionTypes[type].occupancy);assert(gate.coherence>=missionTypes[type].coherence);assert(gate.order>=missionTypes[type].order);}
      const before=structuredClone(m);stepMission(m,tight);assert.deepEqual(m,before);
    }
  });
  test(`${type}: full mission replay reproduces identical motion, budgets and result`,()=>assert.deepEqual(run(type,21),run(type,21)));
  test(`${type}: defaults and scattered rules with the same direct route fail, so tuning matters`,()=>{
    for(const rules of [presets.school,presets.scatter]){const m=run(type,21,rules);assert.equal(m.status,"failure");assert(m.stage<3);bounded(m.world);}
  });
}
