import test from 'node:test';
import assert from 'node:assert/strict';
import {publicationDemo} from '../fixtures.mjs';
import {parseDelimited} from '../engine.mjs';
import {preparePublication,decide,publicationReport,approvedCsv} from '../workflow.mjs';

test('walkthrough requires a real decision and separates clean, blocked and incomplete changes',async()=>{
 const sample=publicationDemo();
 const context=await preparePublication(parseDelimited(sample.previous),parseDelimited(sample.current),sample.rules);
 assert.equal(context.changes.length,3);
 const decisions=new Map();
 assert.deepEqual(publicationReport(context,decisions).summary,{approved:0,pending:2,blocked:1,rejected:0,expired:0});
 assert.throws(()=>decide(context,'MON-27|CZ','approved',''),/důvod/);
 decisions.set('MON-27|CZ',decide(context,'MON-27|CZ','approved','Ověřeno podle ceníku.'));
 assert.throws(()=>decide(context,'DOCK-1|CZ','approved','Ověřeno podle ceníku.'),/blokuje/);
 assert.throws(()=>decide(context,'KEY-1|CZ','approved','Ověřeno podle ceníku.'),/datum/);
 const report=publicationReport(context,decisions),csv=approvedCsv(report);
 assert.equal(report.summary.approved,1);
 assert.equal(report.approved[0].change.key,'MON-27|CZ');
 assert.match(csv,/MON-27/);assert.doesNotMatch(csv,/DOCK-1|KEY-1/);
});
