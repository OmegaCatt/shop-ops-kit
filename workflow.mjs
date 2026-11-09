import {auditCatalog,compareCatalog,priceChangeChecks} from './engine.mjs';

const fields=['sku','market','title','price','currency','stock','url'];

function canonical(value){
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';
  return JSON.stringify(value);
}

export async function preparePublication(previous,current,rules){
  if(!Array.isArray(previous)||!Array.isArray(current))throw Error('Publikace vyžaduje předchozí a aktuální export.');
  const context=structuredClone({previous,current,rules});
  const audit=auditCatalog(context.current,context.rules);
  const diff=compareCatalog(context.previous,context.current);
  const issues=[...audit.issues,...priceChangeChecks(context.previous,context.current,context.rules.threshold)];
  const issuesByRow=new Map();
  for(const issue of issues)for(const ref of new Set(issue.refs.map(String))){
    if(!issuesByRow.has(ref))issuesByRow.set(ref,[]);
    issuesByRow.get(ref).push(issue);
  }
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(context)));
  const fingerprint=Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('');
  return {fingerprint,changes:diff.changes,ambiguous:diff.ambiguous,issues,issuesByRow,rules:context.rules};
}

export function changeIssues(context,change){
  // Findings point at rows in the current catalog. An old row number is not a current row.
  return change.currentRow===null?[]:(context.issuesByRow.get(String(change.currentRow))||[]);
}

function validateTime(value){
  if(!Number.isFinite(value))throw Error('Neplatný čas.');
}

export function decide(context,key,action,reason,exceptionDate='',now=Date.now()){
  validateTime(now);
  const change=context.changes.find(item=>item.key===key);
  if(!change||!['approved','rejected'].includes(action))throw Error('Neplatná změna nebo rozhodnutí.');
  if(typeof reason!=='string'||reason.trim().length<8||reason.length>1000||/[\u0000-\u001f]/.test(reason))throw Error('Uveďte důvod o 8–1000 znacích bez řídicích znaků.');
  const issues=changeIssues(context,change);
  if(action==='approved'&&issues.some(issue=>issue.severity==='high'))throw Error('Důležitý nález blokuje schválení. Opravte vstup nebo pravidla.');
  let exceptionUntil=null;
  if(action==='approved'&&issues.length){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(exceptionDate))throw Error('Upozornění vyžaduje datum konce výjimky.');
    exceptionUntil=Date.parse(exceptionDate+'T23:59:59.999Z');
    if(!Number.isFinite(exceptionUntil)||new Date(exceptionUntil).toISOString().slice(0,10)!==exceptionDate||exceptionUntil<=now||exceptionUntil>now+30*86400000)throw Error('Výjimka musí skončit v budoucnosti, nejpozději do 30 dnů (UTC).');
  }
  return {key,action,reason:reason.trim(),fingerprint:context.fingerprint,decidedAt:new Date(now).toISOString(),exceptionUntil,reviewer:'Místní demonstrační rozhodnutí'};
}

export function decisionStatus(context,change,decision,now=Date.now()){
  validateTime(now);
  const issues=changeIssues(context,change);
  if(issues.some(issue=>issue.severity==='high'))return 'blocked';
  if(!decision||decision.key!==change.key||decision.fingerprint!==context.fingerprint)return 'pending';
  if(decision.action==='rejected')return 'rejected';
  if(decision.action!=='approved'||typeof decision.reason!=='string'||decision.reason.length<8)return 'pending';
  if(issues.length&&(!Number.isFinite(decision.exceptionUntil)||decision.exceptionUntil<=now))return 'expired';
  return 'approved';
}

export function publicationReport(context,decisions,now=Date.now()){
  const items=context.changes.map(change=>({change,status:decisionStatus(context,change,decisions.get(change.key),now),decision:decisions.get(change.key)||null,issues:changeIssues(context,change)}));
  return {version:1,generatedAt:new Date(now).toISOString(),fingerprint:context.fingerprint,rules:context.rules,
    note:'Pouze místní návrh, bez přihlášení a bez zápisu do e-shopu. Nejednoznačné identity nejsou schválenými změnami.',
    summary:Object.fromEntries(['approved','pending','blocked','rejected','expired'].map(status=>[status,items.filter(item=>item.status===status).length])),
    ambiguous:context.ambiguous,approved:items.filter(item=>item.status==='approved'),items};
}

export function approvedCsv(report){
  const safe=value=>{
    let text=String(value??'');if(/^[\s\u0000-\u001f]*[=+\-@]/.test(text))text="'"+text;
    return '"'+text.replaceAll('"','""')+'"';
  };
  const header=['fingerprint','action','key',...fields.map(field=>'before_'+field),...fields.map(field=>'after_'+field),'reason','decided_at','exception_until_utc'];
  const rows=report.approved.map(({change,decision})=>[report.fingerprint,change.type,change.key,...fields.map(field=>change.before?.[field]??''),...fields.map(field=>change.after?.[field]??''),decision.reason,decision.decidedAt,decision.exceptionUntil?new Date(decision.exceptionUntil).toISOString():'']);
  return '\ufeff'+[header,...rows].map(row=>row.map(safe).join(';')).join('\r\n')+'\r\n';
}
