async (page) => {
  const checks=[],errors=[],assert=(ok,label)=>{if(!ok)throw new Error(label);checks.push(label);},output="../output/qa-20261013/swarm-garden";
  page.on("pageerror",e=>errors.push(e.message));await page.setViewportSize({width:1440,height:1000});
  await page.locator("#seed-input").fill("0");await page.locator("#seed-apply").click();
  assert((await page.locator("#feedback").innerText()).includes("Invalid seed"),"Zero seed rejected");
  assert((await page.locator("#seed").innerText())==="시드 21","Invalid seed preserves current world");
  await page.locator("#seed-input").fill("21");await page.locator("#seed-apply").click();
  await page.locator('[data-experience="refuge"]').click();
  const field=page.locator("#field");await field.scrollIntoViewIfNeeded();
  await field.evaluate(el=>el.addEventListener("pointerdown",e=>{const r=el.getBoundingClientRect();window.qaSwarmPoint={x:(e.clientX-r.left)*el.width/r.width,y:(e.clientY-r.top)*el.height/r.height};},{once:true}));
  const point=await field.evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.left+r.width*310/960,y:r.top+r.height*138/600};});
  await page.mouse.click(point.x,point.y);await page.locator("#play").click();
  await page.waitForFunction(()=>!document.querySelector("#analysis-panel").hidden,{},{timeout:60000});
  assert((await page.locator("#analysis-result").innerText()).includes("위험 노출"),"Actual motion reaches a measured exposure failure");
  const result=await page.locator("#analysis-result").innerText();
  assert(await page.locator("#play").isDisabled(),"Terminal mission cannot keep running");
  await page.locator("#rule-experiment summary").click();
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:output+"/desktop.png",fullPage:true});
  for(const width of [390,320]){await page.setViewportSize({width,height:844});await page.evaluate(()=>window.scrollTo(0,0));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`No overflow at ${width}`);await page.screenshot({path:output+`/mobile-${width}.png`,fullPage:true});}
  await page.locator("#retake").click();assert((await page.locator("#seed").innerText())==="시드 21","Retake retains the seed");
  assert((await page.locator("#budget-left").innerText()).startsWith("24.0"),"Retake restores guidance budget");
  assert((await page.locator("#time-left").innerText()).startsWith("75.0"),"Retake restores simulation time");
  await page.locator('[data-experience="lab"]').click();await page.locator('[data-mode="obstacle"]').click();
  await field.focus();for(let i=0;i<13;i++)await page.keyboard.press("Enter");
  assert((await page.locator("#obstacles").innerText())==="12 / 12","Obstacle cap survives repeated keyboard input");
  assert((await page.locator("#feedback").innerText()).includes("12개"),"Obstacle overflow explained");
  assert(errors.length===0,"No uncaught page errors");return {checks,errors,result,actualPointer:await page.evaluate(()=>window.qaSwarmPoint),screenshots:output};
}
