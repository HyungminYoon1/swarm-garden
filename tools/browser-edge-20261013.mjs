import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {mkdir,writeFile} from "node:fs/promises";
import {resolve,basename} from "node:path";
const require=createRequire(resolve(process.env.PLAYWRIGHT_PACKAGE||"../output/playwright/implement-20261012/package.json"));
const {chromium}=require("playwright");
const app=basename(process.cwd()),base=process.env.EDGE_BASE_URL||"http://127.0.0.1:59540";
assert.equal(new URL(base).hostname,"127.0.0.1","isolated loopback only");
const out=resolve("output/playwright/edge-20261013");await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true,args:["--mute-audio"]});
const checks=[],errors=[];
const check=(value,label)=>{assert(value,label);checks.push(label);};
async function click(page,selector,width){const el=page.locator(selector);if(width<500)await el.tap();else await el.click();}
async function settled(page){await page.waitForFunction(()=>!document.querySelector("#run").disabled&&document.querySelector("#result-label").textContent.startsWith("최종"));}
async function finishTrace(page){for(let i=0;i<150&&!await page.locator("#step").isDisabled();i++)await page.locator("#step").click();assert(await page.locator("#step").isDisabled());}
async function choose(page,label){await page.locator("#operation-choices button").filter({has:page.getByText(label,{exact:true})}).click();await finishTrace(page);}
async function mainFlow(page,width){

  const seed=await page.locator("#seed").innerText();
  for(const value of ["","0","4294967296"]){await page.locator("#seed-input").fill(value);await click(page,"#seed-apply",width);check(await page.locator("#seed").innerText()===seed,width+": invalid seed preserves world "+value);}
  await page.locator("#seed-input").fill("21");await click(page,"#seed-apply",width);
  await page.locator("#field").focus();await page.keyboard.press("ArrowRight");await page.keyboard.press("Enter");
  check((await page.locator("#beacon-state").innerText())==="유도 켜짐",width+": keyboard beacon set");
  await page.keyboard.press("Space");check((await page.locator("#beacon-state").innerText())==="유도 꺼짐",width+": keyboard beacon release");
  await click(page,"#play",width);await page.waitForTimeout(350);await click(page,"#play",width);await click(page,"#retake",width);
  check((await page.locator("#time-left").innerText())==="65.0초",width+": retry restores mission clock");
  check((await page.locator("#budget-left").innerText()).startsWith("24.0"),width+": retry restores budget");
  await click(page,'[data-experience="lab"]',width);await click(page,'[data-mode="obstacle"]',width);await page.locator("#field").focus();
  for(let i=0;i<13;i++)await page.keyboard.press("Enter");
  check((await page.locator("#obstacles").innerText())==="12 / 12",width+": rapid repeat respects obstacle cap");
  check((await page.locator("#feedback").innerText()).includes("12개"),width+": obstacle overflow feedback");
  await click(page,"#clear",width);check((await page.locator("#obstacles").innerText())==="0 / 12",width+": obstacle clear");
  await click(page,'[data-experience="funnel"]',width);

}
async function fixtures(browser) {

  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:"reduce"});
  const page=await context.newPage();page.on("pageerror",e=>errors.push(e.message));page.setDefaultTimeout(15000);

  try{
    await page.addInitScript(()=>{Storage.prototype.setItem=function(){};});
    await page.goto(base+"/"+app+"/");
    await page.locator("#alignment").focus();await page.keyboard.press("ArrowRight");
    check((await page.locator("#saved-status").innerText()).includes("저장할 수 없음"),"TEST_DOUBLE unconfirmed settings save is visible");
    await page.locator("#play").tap();await page.waitForTimeout(200);
    // Visibility fixture exercises the real listener without claiming OS backgrounding.
    await page.evaluate(()=>{Object.defineProperty(document,"hidden",{configurable:true,value:true});document.dispatchEvent(new Event("visibilitychange"));});
    check((await page.locator("#play").innerText())!=="일시정지","TEST_DOUBLE hidden document pauses");
    await page.evaluate(()=>{Object.defineProperty(document,"hidden",{configurable:true,value:false});document.dispatchEvent(new Event("visibilitychange"));});
    check((await page.locator("#play").innerText())!=="일시정지","TEST_DOUBLE visible document does not auto resume");
    await page.screenshot({path:out+"/storage-readback.png",fullPage:true});
  }finally{await context.close();}
}

try{
  for(const width of process.env.EDGE_FIXTURES_ONLY?[]:[1440,390,320]){
    const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width<500,isMobile:width<500,reducedMotion:"reduce"});
    const page=await context.newPage();page.setDefaultTimeout(15000);page.on("pageerror",e=>errors.push(e.message));
    try{
      await page.goto(base+"/"+app+"/");
      await mainFlow(page,width);
      check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),width+": no horizontal overflow");
      await page.screenshot({path:out+"/viewport-"+width+".png",fullPage:true});
    }catch(e){await page.screenshot({path:out+"/FAIL-"+width+".png",fullPage:true});throw e;}finally{await context.close();}
  }
  await fixtures(browser);
  check(errors.length===0,"no uncaught browser exceptions");
}finally{
  await writeFile(out+"/browser.json",JSON.stringify({app,checks,errors,fixtureNote:"Only named injected timing/storage fixtures are TEST_DOUBLE. Main UI uses actual browser input.",remoteCI:"NOT_RUN",live:"NOT_RUN"},null,2));
  await browser.close();
}
console.log(JSON.stringify({app,checks:checks.length,errors}));
