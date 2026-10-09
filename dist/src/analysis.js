// Pure fixed-tick measurements. No storage, UI, clock or causal diagnosis.
const keys=["occupancy","coherence","order"];
export function createAnalysis(){return {intervals:[],current:null,missing:{occupancy:0,coherence:0,order:0},resets:0};}
export function measureAnalysis(analysis,{tick,stage,metrics,spec,distance,reset}){
  let bin=analysis.current;
  if(!bin||bin.stage!==stage||bin.startTick+60<=tick-1){
    flushAnalysis(analysis);
    bin=analysis.current={stage,startTick:tick-1,endTick:tick,samples:0,exposure:0,distance:0,missing:{occupancy:0,coherence:0,order:0},resets:0};
  }
  bin.endTick=tick;bin.samples++;bin.exposure+=metrics.exposure/60;bin.distance+=distance;
  for(const key of keys)if(metrics[key]<spec[key]){bin.missing[key]++;analysis.missing[key]++;}
  if(reset){bin.resets++;analysis.resets++;}
}
export function flushAnalysis(analysis){
  if(!analysis.current)return;
  const b=analysis.current;
  analysis.intervals.push({stage:b.stage,from:b.startTick/60,to:b.endTick/60,exposure:b.exposure,distance:b.distance/b.samples,missing:Object.fromEntries(keys.map(k=>[k,b.missing[k]/60])),resets:b.resets});
  analysis.current=null;
}
export function finishAnalysis(analysis,metrics,spec,hold){
  flushAnalysis(analysis);
  const rank=(score)=>[...analysis.intervals].sort((a,b)=>score(b)-score(a)||a.from-b.from).slice(0,3);
  return {
    missing:Object.fromEntries(keys.map(k=>[k,analysis.missing[k]/60])),resets:analysis.resets,
    unmet:keys.filter(k=>metrics[k]<spec[k]),final:{...metrics,hold},
    risk:rank(b=>b.exposure).filter(b=>b.exposure>0),
    interruptions:rank(b=>b.resets).filter(b=>b.resets>0),
    // Counts can overlap: this is not elapsed time or an inferred cause.
    gaps:rank(b=>keys.reduce((n,k)=>n+b.missing[k],0)).filter(b=>keys.some(k=>b.missing[k]>0))
  };
}
export function compareRuns(previous,current){
  if(!previous||!current||previous.type!==current.type||previous.seed!==current.seed)return null;
  return {time:current.report.time-previous.report.time,stages:current.report.stages-previous.report.stages,spent:current.report.spent-previous.report.spent,damage:current.report.damage-previous.report.damage};
}
