import test from 'node:test';
import assert from 'node:assert/strict';
import {preparePublication,decide,decisionStatus,publicationReport,approvedCsv} from '../workflow.mjs';
const before={sku:'A',market:'CZ',title:'Původní',price:'100',currency:'CZK',stock:'2',url:'/cz/a',_row:2};
const rules={sharedStock:true,expectedMarkets:['CZ'],threshold:20};
const now=Date.parse('2026-11-09T10:00:00Z');

test('approval needs a reason and does not modify the original change',async()=>{
 const current={...before,title:'Nový'};const context=await preparePublication([before],[current],rules);
 assert.throws(()=>decide(context,'A|CZ','approved','ano','',now));
 const decision=decide(context,'A|CZ','approved','Ověřeno podle podkladu.','',now);
 assert.equal(decisionStatus(context,context.changes[0],decision,now),'approved');assert.equal(current.title,'Nový');
 assert.equal(context.changes[0].before.title,'Původní');
});

test('review flags cannot approve blocked prices or duplicate identities',async()=>{
 const context=await preparePublication([before],[{...before,price:'-1'}],rules);
 assert.throws(()=>decide(context,'A|CZ','approved','Ověřeno podle podkladu.','2026-11-10',now),/blokuje/);
 assert.equal(decisionStatus(context,context.changes[0],null,now),'blocked');
 const duplicate=await preparePublication([before],[before,before],rules);assert.equal(duplicate.changes.length,0);assert.equal(duplicate.ambiguous.length,1);
});

test('medium issues require a bounded exception and expire at UTC end of day',async()=>{
 const context=await preparePublication([before],[{...before,title:''}],rules),change=context.changes[0];
 assert.throws(()=>decide(context,'A|CZ','approved','Dočasně schváleno.','',now));
 for(const date of ['2026-11-08','2026-12-31','2026-11-31'])assert.throws(()=>decide(context,'A|CZ','approved','Dočasně schváleno.',date,now));
 const decision=decide(context,'A|CZ','approved','Dočasně schváleno.','2026-11-10',now);
 assert.equal(decisionStatus(context,change,decision,now),'approved');
 assert.equal(decisionStatus(context,change,decision,Date.parse('2026-11-11T00:00:00Z')),'expired');
});

test('changed inputs and rules invalidate approvals even when row and issue IDs match',async()=>{
 const original=await preparePublication([before],[{...before,title:'Nový'}],rules);
 const decision=decide(original,'A|CZ','approved','Podklad byl ověřen.','',now);
 for(const changed of [await preparePublication([before],[{...before,title:'Jiný'}],rules),await preparePublication([before],[{...before,title:'Nový'}],{...rules,threshold:10})]){
  assert.notEqual(changed.fingerprint,original.fingerprint);assert.equal(decisionStatus(changed,changed.changes[0],decision,now),'pending');
 }
 const reordered=Object.fromEntries(Object.entries(before).reverse());assert.equal((await preparePublication([reordered],[{...before,title:'Nový'}],rules)).fingerprint,original.fingerprint);
});

test('export contains only valid approved changes with safe cells and underlying values',async()=>{
 const context=await preparePublication([before],[{...before,title:'=HYPERLINK("bad")'}],rules);
 const decisions=new Map([['A|CZ',decide(context,'A|CZ','approved','Schválený testovací text.','',now)]]);
 const report=publicationReport(context,decisions,now),csv=approvedCsv(report);
 assert.equal(report.approved.length,1);assert.ok(csv.includes("'=HYPERLINK"));assert.ok(csv.includes('before_title'));assert.ok(csv.includes(context.fingerprint));
 decisions.set('A|CZ',decide(context,'A|CZ','rejected','Návrh se nepoužije.','',now));assert.equal(publicationReport(context,decisions,now).approved.length,0);
});

test('removed changes never inherit unrelated current row findings',async()=>{
 const context=await preparePublication([before],[{...before,sku:'B',price:'-1'}],rules);
 const removed=context.changes.find(change=>change.type==='removed');
 assert.equal(decisionStatus(context,removed,null,now),'pending');
});

test('empty stock and nondecimal notation cannot cross the approval gate',async()=>{
 for(const change of [{stock:''},{stock:'0x10'},{stock:'1e2'},{stock:'9007199254740992'},{price:'0x100'},{price:'1e3'},{price:'1.001'}]){
  const context=await preparePublication([before],[{...before,...change}],rules);
  assert.equal(decisionStatus(context,context.changes[0],null,now),'blocked',JSON.stringify(change));
 }
});
