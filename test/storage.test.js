import test from "node:test";
import assert from "node:assert/strict";
import {emptyRecord,validateRecord,loadRecord,saveRecord,clearRecord,recordResult,RECORD_KEY} from "../dist/src/storage.js";
import {readProgress,writeProgress,clearProgress,APP_IDS,PROGRESS_KEY} from "../dist/src/progress.js";
import {createMission,setBeacon,stepMission} from "../dist/src/missions.js";
import {presets} from "../dist/src/model.js";
const date="2026-10-09T00:00:00.000Z",tight={separation:.2,alignment:1.5,cohesion:2,vision:120};
function memory(){const data=new Map();return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};}
function run(type,rules=tight){const m=createMission(type);while(!m.report){const g=m.gates[m.stage];setBeacon(m,g.x,g.y);stepMission(m,rules);}return m;}
test("only real independent completions count; repeated wins, failure and unfinished attempts do not add badges",()=>{
  const initial=emptyRecord();assert.throws(()=>recordResult(initial,createMission("funnel")),RangeError);
  let record=recordResult(initial,run("funnel"));assert.deepEqual(record.achievements,["funnel"]);
  const win=run("funnel");for(let i=0;i<8;i++)record=recordResult(record,win);
  assert.equal(record.achievements.length,1);assert.equal(record.recent.length,5);
  record=recordResult(record,run("funnel",presets.school));assert.equal(record.achievements.length,1);assert.equal(record.recent[0].status,"failure");
  for(const type of ["crosswind","refuge"])record=recordResult(record,run(type));assert.equal(record.achievements.length,3);
  const storage=memory();assert.deepEqual(saveRecord(storage,record,date),{saved:true,progress:true});
  assert.deepEqual(readProgress(storage).apps["swarm-garden"],{completed:3,total:3,updatedAt:date});
  assert.deepEqual(loadRecord(storage).record,record);
  const raw=storage.data.get(RECORD_KEY);for(const name of ["seed","boids","beacon","intervals","actions","path","updatedAt"])assert(!raw.includes(`"${name}"`));
  assert.deepEqual(Object.keys(JSON.parse(storage.data.get(PROGRESS_KEY))),["version","apps"]);
});
test("malformed, oversized, unknown and impossible record inputs fail closed",()=>{
  const storage=memory();assert.equal(loadRecord(storage).state,"empty");assert.equal(storage.data.size,0);
  const bad=[{...emptyRecord(),version:2},{...emptyRecord(),seed:21},{...emptyRecord(),rules:{...presets.school,alignment:Infinity}},{...emptyRecord(),rules:{...presets.school,vision:131}},{...emptyRecord(),achievements:["unknown"]},{...emptyRecord(),achievements:["funnel","funnel"]},{...emptyRecord(),recent:Array(6).fill({})}];
  for(const record of bad){assert.throws(()=>validateRecord(record),RangeError);assert.equal(saveRecord(storage,record,date).saved,false);}
  const good=recordResult(emptyRecord(),run("funnel")),base=good.recent[0];
  for(const change of [{time:NaN},{time:0},{time:4},{time:66},{time:base.time+.001},{spent:25},{spent:base.time+1},{damage:-1},{stages:2},{resets:999999},{missing:{...base.missing,occupancy:66}},{seed:21}])assert.throws(()=>validateRecord({...good,recent:[{...base,...change}]}),RangeError);
  assert.throws(()=>validateRecord({...good,achievements:[]}),RangeError);
  for(const raw of ["{", "x".repeat(8193),JSON.stringify({version:2})]){storage.data.set(RECORD_KEY,raw);assert.equal(loadRecord(storage).state,"unavailable");assert.deepEqual(loadRecord(storage).record,emptyRecord());}
});
test("own clear preserves other app summary, all unrelated keys and never recreates own summary",()=>{
  const storage=memory();storage.setItem("other-private","untouched");
  assert.deepEqual(clearRecord(storage),{cleared:true,progress:true});assert.equal(storage.getItem(PROGRESS_KEY),null);
  writeProgress(storage,"traffic-lab",2,4,date);saveRecord(storage,recordResult(emptyRecord(),run("funnel")),date);
  const other=readProgress(storage).apps["traffic-lab"];
  assert.deepEqual(clearRecord(storage),{cleared:true,progress:true});assert.equal(storage.getItem(RECORD_KEY),null);
  assert.deepEqual(readProgress(storage).apps,{"traffic-lab":other});assert.equal(storage.getItem("other-private"),"untouched");
  assert.equal(loadRecord(storage).state,"empty");assert.deepEqual(readProgress(storage).apps,{"traffic-lab":other});
});
test("gallery summary is bounded to the exact 15 IDs and rejects private fields or malformed data without replacing it",()=>{
  const storage=memory();assert.equal(APP_IDS.length,15);assert.equal(new Set(APP_IDS).size,15);
  for(const id of APP_IDS)assert(writeProgress(storage,id,0,1000,date));assert.equal(Object.keys(readProgress(storage).apps).length,15);
  for(const args of [["missing",1,3,date],["__proto__",1,3,date],["swarm-garden",4,3,date],["swarm-garden",.5,3,date],["swarm-garden",0,1001,date],["swarm-garden",-1,3,date],["swarm-garden",1,3,"not a date"]])assert.equal(writeProgress(storage,...args),false);
  const bad=["{","x".repeat(8193),JSON.stringify({version:2,apps:{}}),JSON.stringify({version:1,apps:{unknown:{completed:0,total:3,updatedAt:date}}}),JSON.stringify({version:1,apps:{"swarm-garden":{completed:1,total:3,updatedAt:date,seed:21}}}),JSON.stringify({version:1,apps:{},actions:[]})];
  for(const raw of bad){storage.setItem(PROGRESS_KEY,raw);assert.equal(readProgress(storage),null);assert.equal(writeProgress(storage,"swarm-garden",1,3,date),false);assert.equal(clearProgress(storage,"swarm-garden"),false);assert.equal(storage.getItem(PROGRESS_KEY),raw);}
});
test("unavailable storage and quota fail safely; gallery failure does not claim own result save failed",()=>{
  const denied={getItem(){throw Error("denied");},setItem(){throw Error("quota");},removeItem(){throw Error("denied");}};
  assert.equal(loadRecord(denied).state,"unavailable");assert.deepEqual(saveRecord(denied,emptyRecord(),date),{saved:false,progress:false});assert.deepEqual(clearRecord(denied),{cleared:false,progress:false});
  const storage=memory();storage.setItem(PROGRESS_KEY,"broken");assert.deepEqual(saveRecord(storage,emptyRecord(),date),{saved:true,progress:false});assert.equal(storage.getItem(PROGRESS_KEY),"broken");
  assert.equal(writeProgress(denied,"swarm-garden",1,3,date),false);assert.equal(readProgress(denied),null);
});
