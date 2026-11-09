import test from 'node:test';import assert from 'node:assert/strict';import {auditCatalog,priceChangeChecks} from '../engine.mjs';
const row={sku:'A',market:'CZ',title:'A',price:'100',currency:'CZK',stock:'2',url:'/cz/a',_row:2};
test('stock and missing-market rules follow explicit business configuration',()=>{
 const rows=[row,{...row,market:'SK',currency:'EUR',url:'/sk/a',stock:'5',_row:3}];
 assert.ok(auditCatalog(rows).issues.some(i=>i.code==='stock-drift'));
 const configured=auditCatalog(rows,{sharedStock:false,expectedMarkets:['CZ','SK']});
 assert.ok(!configured.issues.some(i=>i.code==='stock-drift'||i.code==='missing-market-DE'));
});
test('price thresholds include decreases, exclude boundary and reject cross-currency comparisons',()=>{
 assert.equal(priceChangeChecks([row],[{...row,price:'120'}],20).length,0);
 assert.equal(priceChangeChecks([row],[{...row,price:'50'}],20).length,1);
 assert.equal(priceChangeChecks([row],[{...row,price:'500',currency:'EUR'}],20).length,0);
 assert.equal(priceChangeChecks([row,row],[{...row,price:'500'}],20).length,0);
 assert.throws(()=>priceChangeChecks([],[],-1));
});
