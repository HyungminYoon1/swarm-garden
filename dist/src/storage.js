import {validate,presets} from "./model.js";
import {missionTypes} from "./missions.js";
import {writeProgress,clearProgress} from "./progress.js";
export const RECORD_KEY="swarm-garden-record-v1";
const ids=Object.keys(missionTypes),ruleKeys=["separation","alignment","cohesion","vision"];
const exact=(o,keys)=>Boolean(o)&&typeof o==="object"&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const bounded=(n,max)=>typeof n==="number"&&Number.isFinite(n)&&n>=0&&n<=max;
export function cleanRules(rules){
  if(!exact(rules,ruleKeys))throw new RangeError("Invalid saved rules");validate(rules);return {...rules};
}
export function emptyRecord(){return {version:1,rules:{...presets.school},trail:true,achievements:[],recent:[]};}
export function validateRecord(data){
  if(!exact(data,["version","rules","trail","achievements","recent"])||data.version!==1||typeof data.trail!=="boolean")throw new RangeError("Invalid record");
  const rules=cleanRules(data.rules);
  if(!Array.isArray(data.achievements)||data.achievements.length>3||new Set(data.achievements).size!==data.achievements.length||data.achievements.some(id=>!ids.includes(id)))throw new RangeError("Invalid achievements");
  if(!Array.isArray(data.recent)||data.recent.length>5)throw new RangeError("Invalid history");
  const recent=data.recent.map(r=>{
    if(!exact(r,["type","status","time","stages","spent","damage","missing","resets"])||!ids.includes(r.type)||!["success","failure"].includes(r.status))throw new RangeError("Invalid result");
    const spec=missionTypes[r.type];
    if(!bounded(r.time,spec.time)||!Number.isInteger(r.stages)||r.stages<0||r.stages>3||!bounded(r.spent,Math.min(spec.budget,r.time)+1e-7)||!bounded(r.damage,r.time+1e-7)||!Number.isInteger(r.resets)||!bounded(r.resets,Math.floor(r.time*60)))throw new RangeError("Invalid result bounds");
    if(r.time<1/60||Math.abs(r.time*60-Math.round(r.time*60))>1e-7||r.time+1e-7<r.stages*spec.hold||r.damage>spec.damage+1/60+1e-7)throw new RangeError("Invalid simulation bounds");
    if((r.status==="success")!==(r.stages===3)||r.status==="success"&&(r.time>=spec.time||r.damage>=spec.damage))throw new RangeError("Invalid completion");
    if(r.status==="success"&&!data.achievements.includes(r.type))throw new RangeError("Missing completion");
    if(!exact(r.missing,["occupancy","coherence","order"])||Object.values(r.missing).some(n=>!bounded(n,r.time+1e-7)))throw new RangeError("Invalid measurements");
    return {...r,missing:{...r.missing}};
  });
  return {version:1,rules,trail:data.trail,achievements:[...data.achievements],recent};
}
export function loadRecord(storage){
  try{const raw=storage.getItem(RECORD_KEY);if(raw===null)return {record:emptyRecord(),state:"empty"};if(raw.length>8192)throw new RangeError("Record too large");return {record:validateRecord(JSON.parse(raw)),state:"saved"};}
  catch{return {record:emptyRecord(),state:"unavailable"};}
}
export function recordResult(record,mission){
  if(!mission.report||!["success","failure"].includes(mission.status))throw new RangeError("Unfinished mission");
  const {time,stages,spent,damage,analysis}=mission.report;
  const recent={type:mission.type,status:mission.status,time,stages,spent,damage,missing:{...analysis.missing},resets:analysis.resets};
  return validateRecord({...record,achievements:mission.status==="success"?[...new Set([...record.achievements,mission.type])]:record.achievements,recent:[recent,...record.recent].slice(0,5)});
}
export function saveRecord(storage,record,now){
  try{
    const data=validateRecord(record);storage.setItem(RECORD_KEY,JSON.stringify(data));
    const progress=writeProgress(storage,"swarm-garden",data.achievements.length,ids.length,now);
    return {saved:true,progress};
  }catch{return {saved:false,progress:false};}
}
export function clearRecord(storage){
  try{storage.removeItem(RECORD_KEY);return {cleared:true,progress:clearProgress(storage,"swarm-garden")};}
  catch{return {cleared:false,progress:false};}
}
