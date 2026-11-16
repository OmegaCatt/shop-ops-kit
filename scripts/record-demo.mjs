import {record,nodeServer} from './recording.mjs';
import {createStaticServer} from '../server.mjs';
import {fileURLToPath} from 'node:url';import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url));
await record({root,slug:'shop-ops-kit',start:()=>nodeServer(createStaticServer()),walk:async({p,cue,hold,ui})=>{
  await cue('Načteme tři změny katalogu a ověříme je před zveřejněním.');
  await ui.click(p.locator('#demo-publication'));await p.waitForFunction(()=>document.querySelectorAll('.publication-change').length===3);await p.locator('#publication-panel').scrollIntoViewIfNeeded();
  await cue('Tři skutečné změny: monitor, příliš vysoká cena stanice a neúplná klávesnice.');await hold(4);
  const card=key=>p.locator('.publication-change').filter({has:p.locator('strong').filter({hasText:key})});
  assert.equal(await card('DOCK-1|CZ').getByRole('button',{name:'Schválit',exact:true}).isDisabled(),true);
  await cue('Chybnou cenu nelze schválit. Rozhodnutí musí vycházet z původních podkladů.');await card('DOCK-1|CZ').scrollIntoViewIfNeeded();await hold(4);
  await cue('U změny monitoru doplníme důvod a potvrdíme schválení.');await ui.fill(card('MON-27|CZ').getByLabel('Důvod MON-27|CZ',{exact:true}), 'Zkontrolováno proti původnímu katalogu.');await ui.click(card('MON-27|CZ').getByRole('button',{name:'Schválit',exact:true}));
  await cue('Změna monitoru je schválená. Chybná cena zůstává blokovaná.');await hold(4);
  await cue('Stáhneme seznam schválených změn.');await hold(1.2);const pending=p.waitForEvent('download');await ui.click(p.locator('#approved-csv'));const csv=await readFile(await(await pending).path(),'utf8');assert.equal(csv.trim().split(/\r?\n/).length,2);assert.match(csv,/MON-27/);assert.doesNotMatch(csv,/DOCK-1|KEY-1/);
  await cue('CSV export obsahuje pouze jednu schválenou změnu monitoru.');await p.locator('#publication-panel').scrollIntoViewIfNeeded();await hold(4);
  return {changes:3,blockedPriceCannotBeApproved:true,approvedExportRows:1,excluded:['DOCK-1','KEY-1']};
}});
