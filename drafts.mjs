import {auditCatalog} from './engine.mjs';
const fields=['sku','market','title','price','currency','stock','url'];
const normalize=row=>String(row.sku).trim().toUpperCase()+'|'+String(row.market).trim().toUpperCase();
export async function prepareDraft(rows,key,variant='full'){
 if(!['short','full'].includes(variant))throw Error('Neznámá šablona.');
 const matches=rows.filter(row=>normalize(row)===key);if(matches.length!==1)throw Error('SKU/trh musí být jednoznačné.');
 const row=matches[0];const audit=auditCatalog(rows,{sharedStock:false,expectedMarkets:['CZ']});
 if(audit.issues.some(issue=>issue.severity==='high'&&issue.refs.map(String).includes(String(row._row))))throw Error('Nejprve opravte důležité nálezy zdrojové položky.');
 if(typeof row.title!=='string'||!row.title.trim()||/[\u0000-\u001f]/.test(row.title))throw Error('Chybí platný zdrojový název.');
 const facts=Object.fromEntries(fields.map(field=>[field,String(row[field]??'')]));
 const text=variant==='short'?facts.title+' · '+facts.sku:facts.title+'\nSKU: '+facts.sku+'\nCena: '+facts.price+' '+facts.currency+'\nSklad: '+facts.stock+' ks';
 // No generated benefits, health claims, translation, discounts or invented specifications.
 const payload={version:1,key,variant,facts,text,sourceLocation:row._location||'Řádek '+row._row};
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(payload)));
 return {...payload,fingerprint:Array.from(new Uint8Array(digest),value=>value.toString(16).padStart(2,'0')).join('')};
}
export function approveDraft(draft,reason,reviewed,now=new Date().toISOString()){
 if(!reviewed||typeof reason!=='string'||reason.trim().length<8||reason.length>500||/[\u0000-\u001f]/.test(reason))throw Error('Potvrďte kontrolu proti zdroji a důvod alespoň 8 znaků.');
 return {...draft,status:'reviewed',reason:reason.trim(),reviewedAt:now};
}
export async function validDrafts(rows,drafts){
 const approved=[];
 for(const draft of drafts){if(draft.status!=='reviewed')continue;try{const current=await prepareDraft(rows,draft.key,draft.variant);if(current.fingerprint===draft.fingerprint&&current.text===draft.text&&typeof draft.reason==='string'&&draft.reason.length>=8)approved.push(draft)}catch{/* changed or ambiguous input invalidates the suggestion */}}
 return {version:1,note:'Prověřené místní návrhy textů, bez ověřené identity a bez publikace. Zdrojové produktové tvrzení se nesmí považovat za nezávisle ověřené.',drafts:approved};
}
