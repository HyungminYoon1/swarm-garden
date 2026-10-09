import {createWorld,presets,step,metrics,addObstacle,validate,torusDistance,WIDTH,HEIGHT} from "./model.js";
import {expose,tool,number,canvasPointer,clamp} from "./ui.js";
import {createMission,missionTypes,missionEnvironment,objectiveMetrics,stepMission,setBeacon,releaseBeacon} from "./missions.js";
import {compareRuns} from "./analysis.js";
import {loadRecord,saveRecord,clearRecord,emptyRecord,recordResult} from "./storage.js";
const $=s=>document.querySelector(s),canvas=$("#field"),ctx=canvas.getContext("2d");
let storage;try{storage=window.localStorage;}catch{}
const loaded=loadRecord(storage);
let record=loaded.record,lastRun=null,startRules=null,ruleChanges=0;
let seed=21,mission=createMission("funnel",seed),world=mission.world,rules={...record.rules},mode="guide",pointer=null,running=false,frame=0,last=0,accumulator=0,trail=record.trail;
let announcedStage=-1,announcedStatus="",metricFrame=0;
const labels={occupancy:"도착",coherence:"결속",order:"정렬"};
function settingsText(value){return `분리 ${value.separation.toFixed(1)} · 정렬 ${value.alignment.toFixed(1)} · 응집 ${value.cohesion.toFixed(1)} · 시야 ${value.vision}px`;}
function renderRecord(message){
  $("#saved-status").textContent=message??`완료 임무 ${record.achievements.length} / 3`;
  $("#recent-runs").replaceChildren();
  for(const r of record.recent){const item=document.createElement("li");item.textContent=`${missionTypes[r.type].name} · ${r.status==="success"?"성공":"실패"} · ${r.stages}/3 · ${r.time.toFixed(1)}초 · 위험 ${r.damage.toFixed(2)} 무리·초`;$("#recent-runs").append(item);}
}
function persist(){
  record={...record,rules:{...rules},trail};
  const result=saveRecord(storage,record,new Date().toISOString());
  renderRecord(!result.saved?"저장할 수 없음 · 현재 페이지에서만 유지":!result.progress?`완료 임무 ${record.achievements.length} / 3 · 갤러리 요약 갱신 불가`:undefined);
}
function showAnalysis(){
  const r=mission.report,a=r.analysis,spec=missionTypes[mission.type];
  $("#analysis-panel").hidden=false;
  $("#analysis-result").textContent=`${r.reason} · ${r.stages}/3 · ${r.time.toFixed(1)}초 · 유도 ${r.spent.toFixed(1)}초 · 위험 ${r.damage.toFixed(2)} 무리·초`;
  $("#analysis-conditions").textContent=mission.status==="success"?"세 집결지 조건 충족":`종료 시 부족: ${[...a.unmet.map(k=>`${labels[k]} ${(a.final[k]*100).toFixed(1)}% / ${(spec[k]*100).toFixed(0)}%`),...(a.final.hold+1e-9<spec.hold?[`연속 유지 ${a.final.hold.toFixed(2)} / ${spec.hold}초`]:[])].join(" · ")||"없음 (종료 한도 우선)"}`;
  $("#analysis-missing").textContent=`조건 미달 시간: ${Object.entries(a.missing).map(([key,n])=>`${labels[key]} ${n.toFixed(1)}초`).join(" · ")} · 유지 끊김 ${a.resets}회`;
  $("#analysis-settings").textContent=`시작: ${settingsText(startRules)} · 시작 후 규칙 변경 ${ruleChanges}회${ruleChanges?` · 종료: ${settingsText(rules)}`:""}`;
  const rows=$("#analysis-intervals");rows.replaceChildren();
  for(const b of a.gaps){const row=document.createElement("tr");for(const value of [`${b.from.toFixed(1)}–${b.to.toFixed(1)}초 / ${b.stage+1}번`,Object.entries(b.missing).map(([k,n])=>`${labels[k]} ${n.toFixed(2)}초`).join(" · "),`${b.distance.toFixed(0)}px`,`${b.exposure.toFixed(3)}`]){const cell=document.createElement("td");cell.textContent=value;row.append(cell);}rows.append(row);}
  const intervalText=b=>`${b.from.toFixed(1)}–${b.to.toFixed(1)}초 · ${b.stage+1}번 집결지`;
  $("#analysis-risk").textContent=a.risk.length?`최대 노출 구간: ${intervalText(a.risk[0])} · ${a.risk[0].exposure.toFixed(3)} 무리·초 · 목표 거리 ${a.risk[0].distance.toFixed(0)}px`:"위험권 노출 없음";
  $("#analysis-resets").textContent=a.interruptions.length?`유지 끊김 최다: ${intervalText(a.interruptions[0])} · ${a.interruptions[0].resets}회`:"유지 끊김 없음";
  const current={type:mission.type,seed,report:r,startRules:{...startRules},ruleChanges};
  const comparison=compareRuns(lastRun,current),signed=(n,d=1)=>`${n>=0?"+":""}${n.toFixed(d)}`;
  $("#analysis-comparison").textContent=comparison?`직전 동일 임무·시드 대비: 확보 ${signed(comparison.stages,0)} · 경과 ${signed(comparison.time)}초 · 유도 ${signed(comparison.spent)}초 · 위험 ${signed(comparison.damage,3)} 무리·초. 이전 시작: ${settingsText(lastRun.startRules)} · 규칙 변경 ${lastRun.ruleChanges}회. 조작 경로도 결과에 영향을 줍니다.`:"비교할 직전 동일 임무·시드 결과 없음";
  lastRun=current;record=recordResult(record,mission);persist();$("#replay-settings").disabled=false;
}
function sync(){
  for(const key of ["separation","alignment","cohesion","vision"]){$("#"+key).value=rules[key];$("#"+key+"-out").value=rules[key].toFixed(key==="vision"?0:1);}
  $("#size").value=world.boids.length;$("#size").disabled=Boolean(mission);$("#size-out").value=String(world.boids.length);$("#seed").textContent=`시드 ${seed}`;$("#seed-input").value=seed;$("#count").textContent=`${world.boids.length}개체`;$("#trail").checked=trail;
  $("#mode-label").textContent=(mission?"유도점 · ":"커서 · ")+{guide:"모으기",avoid:"피하기",obstacle:"장애물"}[mode];
  for(const b of document.querySelectorAll("[data-mode]")){b.setAttribute("aria-pressed",String(b.dataset.mode===mode));b.disabled=Boolean(mission&&b.dataset.mode==="obstacle");}
  for(const b of document.querySelectorAll("[data-experience]"))b.setAttribute("aria-pressed",String(b.dataset.experience===(mission?.type??"lab")));
  $("#clear").disabled=Boolean(mission);$("#release").disabled=!mission||!mission.beacon;$("#retake").hidden=!mission;
  const terminal=mission&&["success","failure"].includes(mission.status);
  $("#play").disabled=Boolean(terminal);$("#play").textContent=running?"일시정지":mission?.status==="ready"?"미션 시작":"재생";
  $("#mission-panel").hidden=!mission;$("#lab-intro").hidden=Boolean(mission);updateMetrics();
}
function updateMetrics(){const m=metrics(world);$("#order").textContent=`${Math.round(m.order*100)}%`;$("#speed").textContent=`${m.speed.toFixed(0)} px/s`;$("#obstacles").textContent=`${m.obstacles} / 12`;if(mission)updateMission();}
function updateMission(){
  const spec=missionTypes[mission.type],m=objectiveMetrics(mission),terminal=["success","failure"].includes(mission.status);
  $("#mission-title").textContent=spec.name;$("#mission-description").textContent=spec.description;
  $("#mission-condition").textContent=`도착 ${Math.round(spec.occupancy*100)}% · 결속 ${Math.round(spec.coherence*100)}% · 정렬 ${Math.round(spec.order*100)}% 이상을 동시에 ${spec.hold}초 유지 (시뮬레이션 시간)`;
  const held=mission.status==="success"?spec.hold:mission.hold;
  const checks={arrival:[m.occupancy,spec.occupancy],coherence:[m.coherence,spec.coherence],heading:[m.order,spec.order],hold:[held/spec.hold,1]};
  for(const [id,[value,target]] of Object.entries(checks)){$("#"+id+"-meter").value=value;$("#"+id+"-value").textContent=id==="hold"?`${held.toFixed(1)} / ${spec.hold}초`:`${Math.round(value*100)} / ${Math.round(target*100)}%`;$("#"+id+"-value").classList.toggle("met",value>=target);}
  $("#time-left").textContent=`${Math.max(0,spec.time-mission.ticks/60).toFixed(1)}초`;
  $("#budget-left").textContent=`${Math.max(0,spec.budget-mission.spent).toFixed(1)} / ${spec.budget}초`;
  $("#damage-value").textContent=mission.hazards.length?`${mission.damage.toFixed(2)} / ${spec.damage.toFixed(2)} 무리·초`:"위험권 없음";
  $("#beacon-state").textContent=mission.spent>=spec.budget?"유도 소진":mission.beacon?"유도 켜짐":"유도 꺼짐";
  $("#release").disabled=!mission.beacon;
  for(const [i,el] of [...document.querySelectorAll("[data-gate]")].entries()){el.textContent=`${i+1} ${i<mission.stage?"확보":i===mission.stage?"현재 목표":"대기"}`;el.classList.toggle("current",i===mission.stage);el.classList.toggle("done",i<mission.stage);}
  if(announcedStage!==mission.stage||announcedStatus!==mission.status){
    announcedStage=mission.stage;announcedStatus=mission.status;
    $("#mission-status").textContent=terminal?`${mission.status==="success"?"성공":"실패"} · ${mission.report.reason}`:mission.status==="ready"?"준비 · 유도점을 놓고 시작하세요.":`${mission.stage+1}번 집결지로 이동`;
  }
}
function selectExperience(type,sameSeed=true){
  setRunning(false);if(!sameSeed)seed=seed===4294967295?1:seed+1;
  mission=type==="lab"?null:createMission(type,seed);world=mission?mission.world:createWorld(160,seed);
  mode="guide";pointer=null;startRules=null;ruleChanges=0;announcedStage=-1;announcedStatus="";$("#analysis-panel").hidden=true;
  $("#feedback").textContent="";
  $("#comparison-baseline").textContent=lastRun&&mission?.type===lastRun.type&&seed===lastRun.seed?`비교 기준: 직전 ${lastRun.report.stages}/3 · ${lastRun.report.time.toFixed(1)}초 · ${settingsText(lastRun.startRules)}`:"";
  draw(true);sync();
}
function placeBeacon(point){
  if(setBeacon(mission,clamp(point.x,0,WIDTH-.001),clamp(point.y,0,HEIGHT-.001),mode))$("#feedback").textContent="유도점 배치됨";
  else $("#feedback").textContent="종료 또는 유도 소진";
  sync();draw(true);
}
function draw(clear=false){
  ctx.fillStyle=!trail||clear?"#07141f":"rgba(7,20,31,.2)";ctx.fillRect(0,0,WIDTH,HEIGHT);
  if(!trail||clear){ctx.strokeStyle="#163445";ctx.lineWidth=.5;for(let x=0;x<WIDTH;x+=80){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,HEIGHT);ctx.stroke();}for(let y=0;y<HEIGHT;y+=80){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(WIDTH,y);ctx.stroke();}}
  if(mission){
    for(const zone of mission.hazards){ctx.fillStyle="rgba(255,105,114,.12)";ctx.strokeStyle="#ff6972";ctx.lineWidth=2;ctx.beginPath();ctx.arc(zone.x,zone.y,zone.r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle="#ffadb3";ctx.font="15px monospace";ctx.fillText("위험권",zone.x-24,zone.y);}
    mission.gates.forEach((g,i)=>{ctx.strokeStyle=i<mission.stage?"#78dfa0":i===mission.stage?"#f9df93":"#48697c";ctx.fillStyle=i===mission.stage?"rgba(249,223,147,.06)":"rgba(72,105,124,.03)";ctx.lineWidth=i===mission.stage?3:1;ctx.setLineDash(i>mission.stage?[6,6]:[]);ctx.beginPath();ctx.arc(g.x,g.y,g.r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=ctx.strokeStyle;ctx.font="bold 30px monospace";ctx.textAlign="center";ctx.fillText(`${i+1}${i<mission.stage?" ✓":""}`,g.x,g.y-g.r+35);});
    const env=missionEnvironment(mission);
    if(env.windX||env.windY){ctx.strokeStyle="#70bff2";ctx.lineWidth=2;for(let x=60;x<WIDTH;x+=150){const y=70;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+env.windX,y+env.windY);ctx.lineTo(x+env.windX-6,y+env.windY-Math.sign(env.windY)*8);ctx.stroke();}}
    if(mission.beacon){const b=mission.beacon;ctx.strokeStyle=b.mode==="avoid"?"#ffb596":"#9eeecf";ctx.lineWidth=2;ctx.beginPath();ctx.arc(b.x,b.y,22,0,Math.PI*2);ctx.moveTo(b.x-30,b.y);ctx.lineTo(b.x+30,b.y);ctx.moveTo(b.x,b.y-30);ctx.lineTo(b.x,b.y+30);ctx.stroke();ctx.font="14px monospace";ctx.fillStyle=ctx.strokeStyle;ctx.fillText("유도",b.x,b.y+42);}
  }
  for(const o of world.obstacles){ctx.fillStyle="#112c40";ctx.strokeStyle="#6389a0";ctx.lineWidth=2;ctx.beginPath();ctx.arc(o.x,o.y,o.r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle="#aecbdc";ctx.font="16px monospace";ctx.textAlign="center";ctx.fillText("×",o.x,o.y+6);}
  world.boids.forEach((b,i)=>{ctx.save();ctx.translate(b.x,b.y);ctx.rotate(Math.atan2(b.vy,b.vx));ctx.fillStyle=mission&&mission.hazards.some(z=>torusDistance(b,z)<z.r)?"#ff6972":["#65f1da","#61bffc","#f1e68d"][i%3];ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=5;ctx.beginPath();ctx.moveTo(7,0);ctx.lineTo(-4,-3);ctx.lineTo(-2,0);ctx.lineTo(-4,3);ctx.closePath();ctx.fill();ctx.restore();});
  if(pointer){ctx.strokeStyle=mission?"#d8e9f2":pointer.mode==="avoid"?"#ffb596":"#9eeecf";ctx.lineWidth=1.5;ctx.setLineDash(mission?[4,4]:[]);ctx.beginPath();ctx.arc(pointer.x,pointer.y,18,0,Math.PI*2);ctx.moveTo(pointer.x-26,pointer.y);ctx.lineTo(pointer.x+26,pointer.y);ctx.moveTo(pointer.x,pointer.y-26);ctx.lineTo(pointer.x,pointer.y+26);ctx.stroke();ctx.setLineDash([]);if(mission){ctx.fillStyle="#d8e9f2";ctx.font="20px monospace";ctx.textAlign="center";ctx.fillText("조준 · Enter",pointer.x,pointer.y-32);}}
}
function tick(now){frame=0;if(!running)return;accumulator+=Math.min((now-(last||now))/1000,.08)*(mission ? .6 : 1);last=now;let n=0;while(accumulator>=1/60&&n++<5){if(mission){startRules??={...rules};stepMission(mission,rules);if(mission.report){showAnalysis();setRunning(false);draw(true);return;}}else step(world,rules,1/60,pointer);accumulator-=1/60;}draw();if(++metricFrame%6===0)updateMetrics();frame=requestAnimationFrame(tick);}
function setRunning(value){running=Boolean(value)&&!document.hidden&&!(mission&&["success","failure"].includes(mission.status));if(frame)cancelAnimationFrame(frame);frame=0;last=0;accumulator=0;if(running)frame=requestAnimationFrame(tick);sync();}
function reset(count=world.boids.length){if(mission){selectExperience(mission.type,false);return;}seed=seed===4294967295?1:seed+1;world=createWorld(count,seed);pointer=null;draw(true);sync();}
function configure(input){const next={...rules};for(const key of ["separation","alignment","cohesion"])if(input[key]!==undefined)next[key]=number(input[key],0,3,key);if(input.vision!==undefined)next.vision=number(input.vision,30,130,"vision");validate(next);const count=input.count===undefined?world.boids.length:number(input.count,40,280,"count");if(!Number.isInteger(count))throw new RangeError("count must be integer");if(mission&&input.count!==undefined)throw new RangeError("미션의 개체 수는 60으로 고정됩니다. 자유 실험에서 변경하세요.");if(mission?.status==="active"&&Object.keys(next).some(k=>next[k]!==rules[k]))ruleChanges++;rules=next;if(count!==world.boids.length)reset(count);persist();sync();if(!running)draw(true);return summary();}
function summary(){return {seed,running,rules:{...rules},...metrics(world),mission:mission?{type:mission.type,status:mission.status,stage:mission.stage,time:mission.ticks/60,spent:mission.spent,damage:mission.damage,hold:mission.hold,beacon:mission.beacon?{...mission.beacon}:null,objectives:objectiveMetrics(mission),report:mission.report}:null};}
for(const key of ["separation","alignment","cohesion","vision"])$("#"+key).addEventListener("input",event=>configure({[key]:Number(event.target.value)}));$("#size").addEventListener("input",event=>configure({count:Number(event.target.value)}));
for(const b of document.querySelectorAll("[data-preset]"))b.addEventListener("click",()=>configure(presets[b.dataset.preset]));for(const b of document.querySelectorAll("[data-mode]"))b.addEventListener("click",()=>{mode=b.dataset.mode;pointer=null;if(mission?.beacon)mission.beacon.mode=mode;sync();if(!running)draw(true);});
$("#play").addEventListener("click",()=>setRunning(!running));$("#reset").addEventListener("click",()=>reset());$("#retake").addEventListener("click",()=>selectExperience(mission.type));$("#clear").addEventListener("click",()=>{if(mission)return;world.obstacles=[];draw(true);sync();});$("#trail").addEventListener("change",event=>{trail=event.target.checked;persist();draw(true);});
$("#replay-settings").addEventListener("click",()=>{if(!lastRun)return;rules={...lastRun.startRules};seed=lastRun.seed;selectExperience(lastRun.type);persist();});
$("#clear-record").addEventListener("click",()=>{const result=clearRecord(storage);if(!result.cleared){renderRecord("기록을 지울 수 없음");return;}record=emptyRecord();lastRun=null;$("#replay-settings").disabled=true;$("#comparison-baseline").textContent="";$("#analysis-panel").hidden=true;rules={...record.rules};trail=record.trail;selectExperience(mission?.type??"lab");renderRecord(result.progress?"기록 지움":"기록 지움 · 갤러리 요약 삭제 불가");});
$("#release").addEventListener("click",()=>{if(mission)releaseBeacon(mission);sync();draw(true);});
for(const b of document.querySelectorAll("[data-experience]"))b.addEventListener("click",()=>selectExperience(b.dataset.experience));
$("#seed-apply").addEventListener("click",()=>{try{const next=number($("#seed-input").value,1,4294967295,"seed");if(!Number.isInteger(next))throw new RangeError("시드는 정수로 입력하세요.");seed=next;selectExperience(mission?.type??"lab");}catch(error){$("#feedback").textContent=error.message;}});
canvas.addEventListener("pointermove",event=>{if(mission||mode==="obstacle")return;pointer={...canvasPointer(canvas,event),mode};if(!running)draw(true);});canvas.addEventListener("pointerleave",()=>{pointer=null;if(!running)draw(true);});canvas.addEventListener("pointerdown",event=>{const point=canvasPointer(canvas,event);canvas.focus({preventScroll:true});if(mission){pointer=null;placeBeacon(point);return;}if(mode==="obstacle"){try{addObstacle(world,point.x,point.y);$("#feedback").textContent="장애물 배치됨";}catch(error){$("#feedback").textContent=error.message;}sync();draw(true);}else{pointer={...point,mode};if(!running)draw(true);}});
canvas.addEventListener("keydown",event=>{const moves={ArrowLeft:[-25,0],ArrowRight:[25,0],ArrowUp:[0,-25],ArrowDown:[0,25]};if(moves[event.key]){event.preventDefault();pointer??={x:mission?.beacon?.x??WIDTH/2,y:mission?.beacon?.y??HEIGHT/2,mode:mode==="avoid"?"avoid":"guide"};pointer.x=clamp(pointer.x+moves[event.key][0],0,WIDTH-.001);pointer.y=clamp(pointer.y+moves[event.key][1],0,HEIGHT-.001);draw(true);}else if(event.key==="Enter"){event.preventDefault();if(mission){placeBeacon(pointer??{x:WIDTH/2,y:HEIGHT/2});pointer=null;}else if(mode==="obstacle"){try{addObstacle(world,pointer?.x??WIDTH/2,pointer?.y??HEIGHT/2);}catch(error){$("#feedback").textContent=error.message;}}draw(true);sync();}else if(event.code==="Space"&&mission){event.preventDefault();releaseBeacon(mission);sync();draw(true);}});
document.addEventListener("visibilitychange",()=>{if(document.hidden)setRunning(false);});selectExperience("funnel");
renderRecord(loaded.state==="unavailable"?"저장된 기록을 읽을 수 없음":undefined);
expose([tool("read_swarm_state","Read flock rules and computed aggregate motion, without changing playback.",{},summary,true),tool("configure_swarm","Change bounded flock rules or count, using the same visible controls.",{count:{type:"integer",minimum:40,maximum:280},separation:{type:"number",minimum:0,maximum:3},alignment:{type:"number",minimum:0,maximum:3},cohesion:{type:"number",minimum:0,maximum:3},vision:{type:"number",minimum:30,maximum:130}},configure),tool("set_swarm_playback","Play or pause the flock animation.",{running:{type:"boolean"}},input=>{if(typeof input.running!=="boolean")throw new TypeError("running required");setRunning(input.running);return summary();})]);
