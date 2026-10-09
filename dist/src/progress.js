export const PROGRESS_KEY="web-lab-progress-v1";
export const APP_IDS=Object.freeze(["data-mirage","echo-vault","light-route","logic-foundry","neon-tactics","orbit-courier","packet-journey","parcel-panic","pixel-kitchen","pocket-city","route-race","sense-lab","swarm-garden","think-forge","traffic-lab"]);
const plain=o=>Boolean(o)&&typeof o==="object"&&!Array.isArray(o);
function entry(value){
  if(!plain(value)||Object.keys(value).length!==3||!Number.isInteger(value.completed)||!Number.isInteger(value.total)||value.completed<0||value.completed>value.total||value.total>1000||value.total<0)return null;
  if(typeof value.updatedAt!=="string"||value.updatedAt.length!==24)return null;
  const date=new Date(value.updatedAt);if(!Number.isFinite(date.getTime())||date.toISOString()!==value.updatedAt)return null;
  return {completed:value.completed,total:value.total,updatedAt:value.updatedAt};
}
export function readProgress(storage){
  try{
    const raw=storage.getItem(PROGRESS_KEY);if(!raw)return {version:1,apps:{}};
    if(raw.length>8192)return null;
    const data=JSON.parse(raw);if(!plain(data)||Object.keys(data).length!==2||data.version!==1||!plain(data.apps)||Object.keys(data.apps).length>15)return null;
    const apps={};for(const id of Object.keys(data.apps)){if(!APP_IDS.includes(id))return null;const record=entry(data.apps[id]);if(!record)return null;apps[id]=record;}
    return {version:1,apps};
  }catch{return null;}
}
export function writeProgress(storage,id,completed,total,updatedAt){
  const record=entry({completed,total,updatedAt});if(!APP_IDS.includes(id)||!record)return false;
  const data=readProgress(storage);if(!data)return false;
  data.apps[id]=record;try{storage.setItem(PROGRESS_KEY,JSON.stringify(data));return true;}catch{return false;}
}
export function clearProgress(storage,id){
  if(!APP_IDS.includes(id))return false;const data=readProgress(storage);if(!data)return false;
  if(!Object.hasOwn(data.apps,id))return true;
  delete data.apps[id];try{storage.setItem(PROGRESS_KEY,JSON.stringify(data));return true;}catch{return false;}
}
