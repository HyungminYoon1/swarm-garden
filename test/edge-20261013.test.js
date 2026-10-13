import test from "node:test";
import assert from "node:assert/strict";
// Injected storage fixture, never a real user's browser data.
function device() {
  const data=new Map();
  return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
}
const stamp="2026-10-13T00:00:00.000Z";
const peer={completed:1,total:3,updatedAt:stamp};
import {emptyRecord,saveRecord,clearRecord,loadRecord,RECORD_KEY} from "../dist/src/storage.js";
import {readProgress,writeProgress,clearProgress,PROGRESS_KEY} from "../dist/src/progress.js";
import {createWorld,step,presets,WIDTH,HEIGHT,addObstacle} from "../dist/src/model.js";
import {createMission,setBeacon,stepMission,missionEnvironment} from "../dist/src/missions.js";
test("EDGE silent private write cannot report saved or publish summary",()=>{
  const s=device(),set=s.setItem;s.setItem=(k,v)=>{if(k!==RECORD_KEY)set(k,v);};
  assert.deepEqual(saveRecord(s,emptyRecord(),stamp),{saved:false,progress:false});assert.equal(s.getItem(PROGRESS_KEY),null);
});
test("EDGE silent private clear cannot remove summary",()=>{
  const s=device();saveRecord(s,emptyRecord(),stamp);const before=s.getItem(PROGRESS_KEY);s.removeItem=()=>{};
  assert.deepEqual(clearRecord(s),{cleared:false,progress:false});assert.equal(s.getItem(PROGRESS_KEY),before);
});
test("EDGE empty shared payload is corruption, not permission to overwrite",()=>{
  const s=device();s.setItem(PROGRESS_KEY,"");
  assert.equal(readProgress(s),null);assert.equal(writeProgress(s,"swarm-garden",1,3,stamp),false);
  assert.equal(s.getItem(PROGRESS_KEY),"");
});
test("EDGE silent aggregate writes and removals report failure",()=>{
  const s=device();writeProgress(s,"swarm-garden",1,3,stamp);s.setItem=()=>{};
  assert.equal(writeProgress(s,"swarm-garden",2,3,stamp),false);
  assert.equal(clearProgress(s,"swarm-garden"),false);
});
test("EDGE extreme populations retain deterministic torus and speed invariants",()=>{
  for(const count of [40,280]){
    const a=createWorld(count,4294967295),b=createWorld(count,4294967295);
    for(let i=0;i<4;i++){step(a,presets.school);step(b,presets.school);}
    assert.deepEqual(a,b);assert.equal(a.boids.length,count);
    for(const p of a.boids){assert(p.x>=0&&p.x<WIDTH&&p.y>=0&&p.y<HEIGHT);assert(Math.hypot(p.vx,p.vy)>=35-1e-8&&Math.hypot(p.vx,p.vy)<=110+1e-8);}
  }
});
test("EDGE invalid obstacle input leaves full world unchanged at cap",()=>{
  const w=createWorld(40,1);for(let i=0;i<12;i++)addObstacle(w,i,0);
  const before=structuredClone(w);
  for(const [x,y] of [[0,0],[-1,0],[WIDTH+1,0],[0,HEIGHT+1],[NaN,0],["1",0],[null,0]]){assert.throws(()=>addObstacle(w,x,y));assert.deepEqual(w,before);}
});
test("EDGE crosswind tick transition and invalid beacon are atomic",()=>{
  const m=createMission("crosswind",1);assert.equal(missionEnvironment(m).windY,28);
  m.ticks=479;assert.equal(missionEnvironment(m).windY,28);m.ticks=480;assert.equal(missionEnvironment(m).windY,-28);
  const before=structuredClone(m);
  for(const x of [-1,WIDTH,NaN,"0",null]){assert.throws(()=>setBeacon(m,x,0));assert.deepEqual(m,before);}
});
test("EDGE terminal report freezes world and fresh retry restores initial conditions",()=>{
  const m=createMission("funnel",21);m.ticks=3899;stepMission(m,presets.school);
  assert.equal(m.status,"failure");const before=structuredClone(m);
  assert.equal(setBeacon(m,0,0),false);stepMission(m,presets.school);assert.deepEqual(m,before);
  assert.deepEqual(createMission("funnel",21),createMission("funnel",21));
});
test("EDGE saved settings clone and repeated clear preserve peer",()=>{
  const s=device();writeProgress(s,"traffic-lab",1,3,stamp);s.setItem("peer-private","fixture");
  saveRecord(s,emptyRecord(),stamp);const r=loadRecord(s).record;r.rules.vision=30;
  assert.notEqual(loadRecord(s).record.rules.vision,30);
  clearRecord(s);clearRecord(s);assert.deepEqual(readProgress(s).apps,{"traffic-lab":peer});assert.equal(s.getItem("peer-private"),"fixture");
});
