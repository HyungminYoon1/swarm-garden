import {createWorld,step,metrics,torusDistance,WIDTH,HEIGHT} from "./model.js";
import {rng} from "./ui.js";
import {createAnalysis,measureAnalysis,finishAnalysis} from "./analysis.js";

// Simulation seconds, never wall-clock time. Definitions are bounded and immutable.
export const missionTypes=Object.freeze({
  funnel:Object.freeze({name:"01 · 바늘문 항해",description:"두 바위 통로와 세 집결지.",time:65,budget:24,damage:7,occupancy:.75,coherence:.85,order:.55,hold:1.5,radius:95}),
  crosswind:Object.freeze({name:"02 · 횡풍 릴레이",description:"꺾이는 경로 · 횡풍 방향은 8초마다 전환.",time:75,budget:24,damage:7,occupancy:.75,coherence:.85,order:.5,hold:1.5,radius:95}),
  refuge:Object.freeze({name:"03 · 위험권 구조",description:"두 위험권을 돌아 세 대피지로 이동.",time:75,budget:24,damage:.65,occupancy:.75,coherence:.85,order:.5,hold:1.5,radius:95})
});
export function createMission(type="funnel",seed=21){
  if(!Object.hasOwn(missionTypes,type))throw new RangeError("Unknown mission");
  if(!Number.isInteger(seed)||seed<1||seed>4294967295)throw new RangeError("Invalid seed");
  const random=rng(seed),world=createWorld(60,seed);
  for(let i=0;i<4;i++)random();
  const shift=Math.round((random()-.5)*60);
  for(const b of world.boids){b.x=100+random()*90;b.y=245+shift+random()*110;const angle=(random()-.5)*.9;b.vx=Math.cos(angle)*60;b.vy=Math.sin(angle)*60;}
  let gates,hazards=[],wind={windX:0,windY:0};
  if(type==="funnel"){
    gates=[{x:340,y:300+shift},{x:550,y:300-shift},{x:770,y:300+shift}];
    world.obstacles=[{x:430,y:220+shift,r:44},{x:430,y:380+shift,r:44},{x:660,y:220-shift,r:44},{x:660,y:380-shift,r:44}];
  }else if(type==="crosswind"){
    gates=[{x:335,y:180+shift},{x:550,y:410-shift},{x:780,y:220+shift}];
    world.obstacles=[{x:430,y:295,r:38},{x:670,y:340,r:38}];wind={windX:10,windY:28};
  }else{
    gates=[{x:310,y:145+shift},{x:570,y:150-shift},{x:780,y:320+shift}];
    hazards=[{x:440,y:300+shift,r:115},{x:710,y:465-shift,r:85}];
    world.obstacles=[{x:590,y:300,r:42}];
  }
  return {type,seed,world,gates:gates.map(g=>({...g,r:missionTypes[type].radius})),hazards,wind,stage:0,ticks:0,status:"ready",beacon:null,spent:0,damage:0,hold:0,completed:[],analysis:createAnalysis(),report:null};
}
export function missionEnvironment(mission){return {...mission.wind,windY:mission.type==="crosswind"?28*(Math.floor(mission.ticks/480)%2?-1:1):mission.wind.windY,hazards:mission.hazards};}
export function setBeacon(mission,x,y,mode="guide"){
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>=WIDTH||y<0||y>=HEIGHT||!["guide","avoid"].includes(mode))throw new RangeError("Invalid beacon");
  if(["success","failure"].includes(mission.status))return false;
  if(mission.spent>=missionTypes[mission.type].budget)return false;
  mission.beacon={x,y,mode};return true;
}
export function releaseBeacon(mission){mission.beacon=null;}
export function objectiveMetrics(mission){
  const boids=mission.world.boids,gate=mission.gates[Math.min(mission.stage,mission.gates.length-1)];
  let inside=0,connected=0,exposed=0;
  for(let i=0;i<boids.length;i++){
    const b=boids[i];if(torusDistance(b,gate)<=gate.r)inside++;
    if(boids.some((other,j)=>i!==j&&torusDistance(b,other)<=55))connected++;
    if(mission.hazards.some(zone=>torusDistance(b,zone)<zone.r))exposed++;
  }
  return {occupancy:inside/boids.length,coherence:connected/boids.length,exposure:exposed/boids.length,order:metrics(mission.world).order};
}
export function stepMission(mission,rules){
  if(["success","failure"].includes(mission.status))return mission.report;
  const spec=missionTypes[mission.type],dt=1/60;
  const powered=mission.beacon&&mission.spent<spec.budget;
  // step validates before any mission counters are changed.
  step(mission.world,rules,dt,powered?mission.beacon:null,missionEnvironment(mission));
  mission.status="active";mission.ticks++;
  if(powered)mission.spent=Math.min(spec.budget,mission.spent+dt);
  if(mission.spent>=spec.budget)mission.beacon=null;
  const m=objectiveMetrics(mission);mission.damage+=m.exposure*dt;
  const qualified=m.occupancy>=spec.occupancy&&m.coherence>=spec.coherence&&m.order>=spec.order;
  const gate=mission.gates[mission.stage],distance=mission.world.boids.reduce((sum,b)=>sum+torusDistance(b,gate),0)/mission.world.boids.length;
  measureAnalysis(mission.analysis,{tick:mission.ticks,stage:mission.stage,metrics:m,spec,distance,reset:!qualified&&mission.hold>0});
  mission.hold=qualified?mission.hold+dt:0;
  const measuredHold=mission.hold;
  // Hard limits take precedence over a gate completed on that same tick.
  if(mission.damage>=spec.damage||mission.ticks>=spec.time*60){
    mission.status="failure";
    mission.report={reason:mission.damage>=spec.damage?"위험 노출 한도 초과":"제한 시간 종료",time:mission.ticks/60,stages:mission.stage,spent:mission.spent,damage:mission.damage};
  }else if(mission.hold+1e-9>=spec.hold){
    mission.completed.push({time:mission.ticks/60,...m});mission.stage++;mission.hold=0;
    if(mission.stage===mission.gates.length){mission.status="success";mission.report={reason:"모든 집결지 확보",time:mission.ticks/60,stages:mission.stage,spent:mission.spent,damage:mission.damage};}
  }
  if(mission.report)mission.report.analysis=finishAnalysis(mission.analysis,m,spec,measuredHold);
  return mission.report;
}
