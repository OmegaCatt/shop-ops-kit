import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {createStaticServer} from '../server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),server=createStaticServer();
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});
 const p=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(process.env.SHOP_OPS_QA_BASE_URL||`http://127.0.0.1:${server.address().port}`);
 const load=async()=>{await p.locator('#demo-publication').click();await p.waitForFunction(()=>document.querySelectorAll('.publication-change').length===3&&!document.querySelector('#publication-json').disabled)};
 const downloadJSON=async selector=>{const wait=p.waitForEvent('download');await p.locator(selector).click();return JSON.parse(await readFile(await(await wait).path(),'utf8'))};
 const card=key=>p.locator('.publication-change').filter({has:p.locator('strong').filter({hasText:key})});
 await load();assert.match(await p.locator('#publication-summary').innerText(),/1 blokováno/);
 assert.equal((await downloadJSON('#export-button')).demo,true);
 assert.deepEqual((await downloadJSON('#publication-json')).summary,{approved:0,pending:2,blocked:1,rejected:0,expired:0});
 await card('MON-27|CZ').getByLabel('Důvod MON-27|CZ',{exact:true}).fill('Zkontrolováno podle zdroje.');
 await card('MON-27|CZ').getByRole('button',{name:'Schválit',exact:true}).click();
 assert.equal(await card('DOCK-1|CZ').getByRole('button',{name:'Schválit',exact:true}).isDisabled(),true);
 const report=await downloadJSON('#publication-json');assert.equal(report.summary.approved,1);assert.equal(report.approved[0].change.key,'MON-27|CZ');
 const wait=p.waitForEvent('download');await p.locator('#approved-csv').click();const csv=await readFile(await(await wait).path(),'utf8');assert.equal(csv.trim().split(/\r?\n/).length,2);assert.doesNotMatch(csv,/DOCK-1|KEY-1/);
 p.once('dialog',dialog=>dialog.dismiss());await p.locator('#demo-publication').click();assert.equal((await downloadJSON('#publication-json')).summary.approved,1);
 await p.locator('#toast').waitFor({state:'hidden'});await p.locator('#publication-panel').scrollIntoViewIfNeeded();await mkdir(root+'docs',{recursive:true});await p.screenshot({path:root+'docs/demo-workflow.png'});
 await p.setViewportSize({width:390,height:844});await p.locator('.demo-walkthrough').scrollIntoViewIfNeeded();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await p.screenshot({path:root+'docs/demo-mobile.png'});await p.setViewportSize({width:1440,height:1000});
 p.once('dialog',dialog=>dialog.accept());await load();assert.equal((await downloadJSON('#publication-json')).summary.approved,0);
 // A prepared copy draft on fictional data still counts as work.
 await p.locator('#draft-product').selectOption('MON-27|CZ');await p.locator('#draft-create').click();await p.locator('#draft-preview pre').last().waitFor();
 const draft=await p.locator('#draft-preview').innerText();p.once('dialog',dialog=>dialog.dismiss());await p.locator('#demo-publication').click();assert.equal(await p.locator('#draft-preview').innerText(),draft);
 const own='sku;market;title;price;currency;stock;url\nOWN;CZ;Vlastní fiktivní položka;100;CZK;2;/cz/own\n';
 await p.locator('#catalog-file').setInputFiles({name:'own.csv',mimeType:'text/csv',buffer:Buffer.from(own)});await p.waitForFunction(()=>document.querySelector('#catalog-table').textContent.includes('OWN'));
 assert.equal((await downloadJSON('#export-button')).demo,false);
 p.once('dialog',dialog=>dialog.dismiss());await p.locator('#demo-publication').click();assert.match(await p.locator('#catalog-table').innerText(),/OWN/);
 p.once('dialog',dialog=>dialog.accept());await load();assert.doesNotMatch(await p.locator('#catalog-table').innerText(),/OWN/);
 // A custom previous export must clear the demo flag even if current rows remain fictional.
 await p.locator('#previous-file').setInputFiles({name:'previous.csv',mimeType:'text/csv',buffer:Buffer.from(own)});await p.waitForFunction(()=>document.querySelector('#toast').textContent.includes('Předchozí export'));
 assert.equal((await downloadJSON('#export-button')).demo,false);
 // A slow local file read started before loading the demo cannot replace it later.
 await p.evaluate(()=>{const original=File.prototype.text;File.prototype.text=function(){if(this.name!=='slow.csv')return original.call(this);return new Promise(resolve=>{window.releaseSlow=async()=>resolve(await original.call(this))})}});
 await p.locator('#catalog-file').setInputFiles({name:'slow.csv',mimeType:'text/csv',buffer:Buffer.from(own)});await p.waitForFunction(()=>typeof window.releaseSlow==='function');
 p.once('dialog',dialog=>dialog.accept());await load();await p.evaluate(async()=>{await window.releaseSlow();await new Promise(requestAnimationFrame)});
 assert.doesNotMatch(await p.locator('#catalog-table').innerText(),/OWN/);assert.equal((await downloadJSON('#export-button')).demo,true);
 assert.deepEqual(errors,[]);console.log('PASS demo: three real changes, no preapproval, blocked price, approved-only CSV, truthful demo flag, confirm accept/cancel preserving approval/draft/custom data, mobile.');
}finally{await browser?.close();await new Promise(r=>server.close(r))}
