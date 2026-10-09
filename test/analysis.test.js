import test from "node:test";
import assert from "node:assert/strict";
import {createAnalysis,measureAnalysis,finishAnalysis,compareRuns} from "../dist/src/analysis.js";
import {createMission,missionTypes,stepMission,setBeacon,objectiveMetrics} from "../dist/src/missions.js";
import {presets,torusDistance} from "../dist/src/model.js";
const tight={separation:.2,alignment:1.5,cohesion:2,vision:120};
function legalRun(type="funnel",rules=tight,seed=21){
  const m=createMission(type,seed);
  while(!m.report){const g=m.gates[m.stage];setBeacon(m,g.x,g.y);stepMission(m,rules);}
  return m;
}
test("intervals count overlapping condition time, resets, exposure and measured distance without causal labels",()=>{
  const a=createAnalysis(),spec=missionTypes.refuge,m={occupancy:.5,coherence:1,order:.2,exposure:.5};
  for(let tick=1;tick<=90;tick++)measureAnalysis(a,{tick,stage:tick<=60?0:1,metrics:m,spec,distance:tick<=60?100:200,reset:tick===30});
  const result=finishAnalysis(a,m,spec,0);
  assert.deepEqual(result.missing,{occupancy:1.5,coherence:0,order:1.5});assert.equal(result.resets,1);
  assert.deepEqual(result.unmet,["occupancy","order"]);assert.equal(a.intervals.length,2);
  assert.deepEqual(a.intervals.map(b=>[b.from,b.to,b.stage,b.distance]),[[0,1,0,100],[1,1.5,1,200]]);
  assert(Math.abs(result.risk[0].exposure-.5)<1e-8);assert.equal(result.interruptions[0].resets,1);
  assert.equal(result.gaps[0].stage,0);assert.equal(a.current,null);
});
test("stage transitions flush partial intervals and final samples are included",()=>{
  const a=createAnalysis(),metrics={occupancy:1,coherence:1,order:1,exposure:0};
  for(let tick=1;tick<=11;tick++)measureAnalysis(a,{tick,stage:tick<=5?0:1,metrics,spec:missionTypes.funnel,distance:30,reset:false});
  const result=finishAnalysis(a,metrics,missionTypes.funnel,1.5);
  assert.deepEqual(a.intervals.map(b=>[b.from,b.to,b.stage]),[[0,5/60,0],[5/60,11/60,1]]);
  assert.deepEqual(result.gaps,[]);assert.deepEqual(result.risk,[]);assert.deepEqual(result.interruptions,[]);assert.deepEqual(result.unmet,[]);
});
test("actual failed trajectory metrics equal independently accumulated tick measurements including terminal tick",()=>{
  const m=createMission("refuge"),missing={occupancy:0,coherence:0,order:0};let exposure=0,resets=0,previousHold=0,lastMetrics;
  while(!m.report){
    const gate={...m.gates[m.stage]},stage=m.stage;setBeacon(m,gate.x,gate.y);stepMission(m,presets.school);
    // The negative route never advances a gate; no progress or coordinate injection.
    assert.equal(m.stage,stage);lastMetrics=objectiveMetrics(m);
    for(const key of Object.keys(missing))if(lastMetrics[key]<missionTypes.refuge[key])missing[key]++;
    exposure+=lastMetrics.exposure/60;if(previousHold>0&&m.hold===0)resets++;previousHold=m.hold;
    const bin=m.analysis.current??m.analysis.intervals.at(-1);
    assert(bin);assert(m.world.boids.every(b=>Number.isFinite(torusDistance(b,gate))));
  }
  assert.equal(m.status,"failure");assert.deepEqual(m.report.analysis.missing,Object.fromEntries(Object.entries(missing).map(([k,n])=>[k,n/60])));
  assert.equal(m.report.analysis.resets,resets);assert.deepEqual(m.report.analysis.final,{...lastMetrics,hold:m.hold});
  assert(Math.abs(exposure-m.damage)<1e-8);
  assert(Math.abs(m.analysis.intervals.reduce((n,b)=>n+b.exposure,0)-m.damage)<1e-8);
  assert.equal(m.analysis.intervals.at(-1).to,m.report.time);
  assert.equal(m.report.analysis.risk[0].exposure,Math.max(...m.analysis.intervals.map(b=>b.exposure)));
});
test("real successful routes retain bounded intervals, terminal qualifying hold and exact replay evidence",()=>{
  for(const type of Object.keys(missionTypes)){
    const m=legalRun(type);assert.equal(m.status,"success");assert(m.report.analysis.final.hold+1e-9>=1.5);assert.deepEqual(m.report.analysis.unmet,[]);
    assert(m.analysis.intervals.length<=Math.ceil(missionTypes[type].time)+3);
    assert(Math.abs(m.analysis.intervals.reduce((n,b)=>n+b.to-b.from,0)-m.report.time)<1e-8);
    const before=structuredClone(m);stepMission(m,tight);assert.deepEqual(m,before);
  }
});
test("actual one-second path interval equals independent post-step mean torus distance and holds no raw coordinates",()=>{
  const m=createMission("funnel"),gate=m.gates[0];let sum=0;
  for(let i=0;i<60;i++){stepMission(m,presets.school);sum+=m.world.boids.reduce((n,b)=>n+torusDistance(b,gate),0)/60;}
  // This run has not completed the first target; flush the interval on its next tick.
  assert.equal(m.stage,0);stepMission(m,presets.school);
  assert(Math.abs(m.analysis.intervals[0].distance-sum/60)<1e-8);
  assert.deepEqual(Object.keys(m.analysis.intervals[0]),["stage","from","to","exposure","distance","missing","resets"]);
});
test("comparison rejects differing mission or seed and reports metric deltas without outcome inference",()=>{
  const a={type:"funnel",seed:21,report:{time:20,stages:2,spent:12,damage:.1}},b={type:"funnel",seed:21,report:{time:25,stages:3,spent:10,damage:.1}};
  assert.deepEqual(compareRuns(a,b),{time:5,stages:1,spent:-2,damage:0});
  assert.equal(compareRuns(null,b),null);assert.equal(compareRuns(a,{...b,seed:22}),null);assert.equal(compareRuns(a,{...b,type:"refuge"}),null);
});
