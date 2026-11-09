import {performance} from 'node:perf_hooks';
import {preparePublication,publicationReport} from '../workflow.mjs';
const previous=Array.from({length:10000},(_,i)=>({sku:'SKU-'+i,market:'CZ',title:'Produkt '+i,price:'100',currency:'CZK',stock:'2',url:'/cz/'+i,_row:i+2}));
const current=previous.map(row=>({...row,title:'',price:'200'}));
const started=performance.now();const context=await preparePublication(previous,current,{sharedStock:true,expectedMarkets:['CZ'],threshold:20});
const prepared=performance.now();const report=publicationReport(context,new Map());
console.log(JSON.stringify({runtime:process.version,rows:current.length,findings:context.issues.length,prepareMs:+(prepared-started).toFixed(2),reportMs:+(performance.now()-prepared).toFixed(2),summary:report.summary}));
