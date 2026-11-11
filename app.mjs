import {parseCatalog,catalogJson} from './catalog-input.mjs';
import {mountDrafts} from './draft-ui.mjs';
import {preparePublication,decide,decisionStatus,publicationReport,approvedCsv} from './workflow.mjs';
import { auditCatalog, compareCatalog, findingsCsv, parseDelimited, reconcileOrders, priceChangeChecks } from './engine.mjs';
import { sampleCatalog, sampleOrders, sampleShipments, publicationDemo } from './fixtures.mjs';

const $ = selector => document.querySelector(selector);
const state = { view: 'catalog', market: 'ALL', severity: 'all', page: 1, findingPage: 1, rows: parseDelimited(sampleCatalog), previousRows: null, reviewed: new Set(), isDemo: true, demoScenario:false, publication:null, decisions:new Map(), publicationGeneration:0, publicationPage:1, inputEpoch:0, catalogRead:0, previousRead:0 };
const rules={sharedStock:true,expectedMarkets:['CZ','SK','DE'],threshold:20};
const draftUI=mountDrafts($('#draft-panel'),()=>state.rows);
const catalogIsDemo=()=>state.isDemo&&(state.previousRows===null||state.demoScenario);
const catalog = () => {const result=auditCatalog(state.rows,rules);if(state.previousRows)result.issues.push(...priceChangeChecks(state.previousRows,state.rows,rules.threshold));return result;};
const orders = () => reconcileOrders(sampleOrders, sampleShipments);
const el = (tag, className, value) => { const node = document.createElement(tag); if (className) node.className = className; if (value !== undefined) node.textContent = value; return node; };

function toast(message) {
  const node = $('#toast'); node.textContent = message; node.classList.remove('hidden');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.add('hidden'), 4000);
}

function renderMetrics(result) {
  const data = state.view === 'catalog' ? [
    ['PRODUKTŮ', result.productCount, 'unikátních SKU'],
    ['ŘÁDKŮ EXPORTU', result.rowCount, 'CZ · SK · DE'],
    ['ZJIŠTĚNÍ', result.issues.length, 'vyžadují kontrolu', true],
    ['KRITICKÝCH', result.issues.filter(x => x.severity === 'high').length, 'priorita před publikací', true],
  ] : [
    ['OBJEDNÁVEK', result.orderCount, 'v objednávkovém systému'],
    ['UDÁLOSTÍ', result.eventCount, 'včetně opakovaného webhooku'],
    ['UNIKÁTNÍCH', result.uniqueEventCount, 'idempotentně započítaných'],
    ['ZJIŠTĚNÍ', result.issues.length, 'vyžadují kontrolu', true],
  ];
  $('#metrics').replaceChildren(...data.map(([label, number, sub, alert]) => {
    const card = el('div', `metric${alert ? ' alert' : ''}`);
    card.append(el('div', 'label', label), el('div', 'number', String(number)), el('div', 'sub', sub));
    return card;
  }));
}

function renderCatalog(result) {
  const diff = state.previousRows ? compareCatalog(state.previousRows, state.rows) : null;
  const diffPanel = $('#catalog-diff'); diffPanel.replaceChildren();
  if (diff) {
    diffPanel.append(el('strong', '', `Změny proti předchozímu exportu: ${diff.added} přidáno · ${diff.removed} odebráno · ${diff.changed} změněno`));
    if (diff.ambiguous.length) diffPanel.append(el('p', '', `${diff.ambiguous.length} položek s duplicitním SKU/trhem nelze bezpečně porovnat.`));
    const list = el('ul');
    for (const item of diff.changes.slice(0, 30)) list.append(el('li', '', `${item.key}: ${item.type === 'added' ? 'přidáno' : item.type === 'removed' ? 'odebráno' : 'změna ' + item.fields.join(', ')} (ř. ${item.previousRow ?? '—'} → ${item.currentRow ?? '—'})`));
    if (diff.changes.length > 30) diffPanel.append(el('p', '', `Zobrazeno prvních 30 z ${diff.changes.length} změn. Úplný přehled je v reportu.`));
    diffPanel.append(list);
  } else diffPanel.append(el('span', '', 'Pro porovnání změn načtěte předchozí katalogový export.'));
  const visible = state.rows.filter(row => state.market === 'ALL' || row.market.toUpperCase() === state.market);
  const perPage = 100, pages = Math.max(1, Math.ceil(visible.length / perPage));
  state.page = Math.min(state.page, pages);
  const start = (state.page - 1) * perPage;
  $('#catalog-count').textContent = `${visible.length} z ${state.rows.length} řádků`;
  $('#catalog-page').textContent = `${state.page} / ${pages}`;
  $('#catalog-prev').disabled = state.page === 1;
  $('#catalog-next').disabled = state.page === pages;
  const flagged = new Set(result.issues.flatMap(issue => issue.refs.map(String)));
  $('#catalog-table').replaceChildren(...visible.slice(start, start + perPage).map(row => {
    const tr = el('tr');
    const id = el('td', '', String(row._location||row._row));
    const product = el('td'); product.append(el('span', 'sku', row.sku || '—'), el('span', 'title-sub', row.title || 'Název chybí'));
    const market = el('td'); market.append(el('span', `market-pill ${row.market.toLowerCase()}`, row.market || '—'));
    const price = el('td', '', `${row.price || '—'} ${row.currency || ''}`);
    const stock = el('td', 'stock', row.stock || '—');
    if (flagged.has(String(row._row))) stock.append(el('span', 'flag', '●'));
    tr.append(id, product, market, price, stock);
    return tr;
  }));
}

function shippedByOrder() {
  const seen = new Set(), shipped = new Map(), orderMap = new Map(sampleOrders.map(o => [o.id, o]));
  for (const event of sampleShipments) {
    if (seen.has(event.eventId)) continue;
    seen.add(event.eventId);
    const order = orderMap.get(event.orderId);
    if (!order || order.sku !== event.sku || !Number.isInteger(event.qty) || event.qty <= 0) continue;
    shipped.set(order.id, (shipped.get(order.id) ?? 0) + event.qty);
  }
  return shipped;
}

function renderOrders() {
  const shipped = shippedByOrder();
  $('#orders-table').replaceChildren(...sampleOrders.map(order => {
    const tr = el('tr');
    for (const value of [order.id, order.state, order.sku, String(order.qty), String(shipped.get(order.id) ?? 0)]) tr.append(el('td', '', value));
    return tr;
  }));
}

function renderFindings(result) {
  $('#finding-count').textContent = `/ ${result.issues.length}`;
  const visible = result.issues.filter(issue => state.severity === 'all' || issue.severity === state.severity);
  const perPage = 50, pages = Math.max(1, Math.ceil(visible.length / perPage));
  state.findingPage = Math.min(state.findingPage, pages);
  $('#finding-page').textContent = `${state.findingPage} / ${pages}`;
  $('#finding-prev').disabled = state.findingPage === 1;
  $('#finding-next').disabled = state.findingPage === pages;
  if (!visible.length) { $('#findings').replaceChildren(el('div', 'empty-state', 'V tomto filtru nejsou žádná zjištění.')); return; }
  $('#findings').replaceChildren(...visible.slice((state.findingPage - 1) * perPage, state.findingPage * perPage).map(issue => {
    const card = el('article', `finding${state.reviewed.has(issue.id) ? ' reviewed' : ''}`);
    const top = el('div', 'finding-top');
    top.append(el('span', `severity ${issue.severity}`, issue.severity === 'high' ? 'DŮLEŽITÉ' : 'K OVĚŘENÍ'), el('span', 'ref', state.view==='catalog'?issue.refs.map(ref=>state.rows.find(row=>String(row._row)===String(ref))?._location||('ř. '+ref)).join(', '):'ID '+issue.refs.join(', ')));
    const button = el('button', 'review-button', state.reviewed.has(issue.id) ? '✓ Zkontrolováno' : 'Označit jako zkontrolované');
    button.type = 'button'; button.setAttribute('aria-pressed', state.reviewed.has(issue.id) ? 'true' : 'false');
    button.addEventListener('click', () => { state.reviewed.has(issue.id) ? state.reviewed.delete(issue.id) : state.reviewed.add(issue.id); renderFindings(result); });
    card.append(top, el('h3', '', issue.title), el('p', '', issue.detail), el('div', 'action', `Další krok: ${issue.action}`), button);
    return card;
  }));
}

function render() {
  const isCatalog = state.view === 'catalog';
  const isDemo=!isCatalog||catalogIsDemo();
  $('.notice p').textContent=isDemo?'Fiktivní ukázka. Produkty, objednávky i zásilky jsou připravená testovací data. Žádné spojení s e-shopem.':'Pracujete s importovanými podklady. Soubory se zpracovávají pouze v tomto prohlížeči a nikam se neposílají. Rozhodnutí jsou místní a po zavření stránky se ztratí; uložte si report.';
  const result = isCatalog ? catalog() : orders();
  $('#view-title').textContent = isCatalog ? 'Katalog pod kontrolou.' : 'Objednávky bez překvapení.';
  $('#view-description').textContent = isCatalog ? 'Najděte nesrovnalosti v produktovém exportu dřív, než se dostanou na další trh.' : 'Porovnejte objednávky se zásilkami a odhalte opakované nebo chybně propojené události.';
  $('.eyebrow').textContent = isCatalog ? 'KONTROLA DAT · 01 / 02' : 'KONTROLA TOKU · 02 / 02';
  $('#catalog-panel').classList.toggle('hidden', !isCatalog);
  $('#orders-panel').classList.toggle('hidden', isCatalog);
  $('#publication-panel').classList.toggle('hidden', !isCatalog);
  $('#draft-panel').classList.toggle('hidden',!isCatalog);draftUI.refresh();
  if(isCatalog)renderPublication();
  for (const button of document.querySelectorAll('.nav-item')) {
    const active = button.dataset.view === state.view;
    button.classList.toggle('selected', active);
    active ? button.setAttribute('aria-current', 'page') : button.removeAttribute('aria-current');
  }
  renderMetrics(result); renderFindings(result);
  if (isCatalog) renderCatalog(result); else renderOrders();
}

document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => { state.view = button.dataset.view; state.severity = 'all'; state.findingPage = 1; document.querySelectorAll('[data-severity]').forEach(x => x.classList.toggle('active', x.dataset.severity === 'all')); render(); }));
document.querySelectorAll('[data-market]').forEach(button => button.addEventListener('click', () => { state.market = button.dataset.market; state.page = 1; document.querySelectorAll('[data-market]').forEach(x => x.classList.toggle('active', x === button)); render(); }));
$('#catalog-prev').addEventListener('click', () => { state.page--; render(); });
$('#catalog-next').addEventListener('click', () => { state.page++; render(); });
document.querySelectorAll('[data-severity]').forEach(button => button.addEventListener('click', () => { state.severity = button.dataset.severity; state.findingPage = 1; document.querySelectorAll('[data-severity]').forEach(x => x.classList.toggle('active', x === button)); render(); }));
$('#finding-prev').addEventListener('click', () => { state.findingPage--; render(); });
$('#finding-next').addEventListener('click', () => { state.findingPage++; render(); });
$('#reset-button').addEventListener('click', () => { state.inputEpoch++; state.rows = parseDelimited(sampleCatalog); state.previousRows = null; state.isDemo = true; state.demoScenario=false; state.reviewed.clear(); state.market = 'ALL'; state.page = 1; state.findingPage = 1; document.querySelectorAll('[data-market]').forEach(x => x.classList.toggle('active', x.dataset.market === 'ALL')); refreshPublication();render(); toast('Fiktivní ukázka obnovena.'); });
async function readCatalogFile(file) {
  if (file.size > 2_000_000) throw new Error('Soubor je příliš velký (limit 2 MB).');
  const rows = parseCatalog(await file.text(),file.name);
  if (rows.length > 10_000) throw new Error('Maximálně 10 000 řádků.');
  return rows;
}
$('#previous-button').addEventListener('click', () => $('#previous-file').click());
$('#catalog-button').addEventListener('click', () => $('#catalog-file').click());
$('#previous-file').addEventListener('change', async event => {
  const file = event.target.files?.[0]; if (!file) return;
  const epoch=state.inputEpoch,sequence=++state.previousRead;
  try { const rows=await readCatalogFile(file);if(epoch!==state.inputEpoch||sequence!==state.previousRead)return;state.previousRows=rows;state.demoScenario=false;state.reviewed.clear();refreshPublication();render(); toast(`Předchozí export: ${state.previousRows.length} řádků. Data zůstávají v prohlížeči.`); }
  catch (error) { toast(`Import se nepodařil: ${error.message}`); }
  event.target.value = '';
});
$('#catalog-file').addEventListener('change', async event => {
  const file = event.target.files?.[0]; if (!file) return;
  const epoch=state.inputEpoch,sequence=++state.catalogRead;
  try {
    const rows = await readCatalogFile(file);if(epoch!==state.inputEpoch||sequence!==state.catalogRead)return;
    state.rows = rows; state.isDemo = false; state.demoScenario=false; state.reviewed.clear(); state.market = 'ALL'; state.page = 1; state.findingPage = 1;
    document.querySelectorAll('[data-market]').forEach(x => x.classList.toggle('active', x.dataset.market === 'ALL'));
    state.view = 'catalog';refreshPublication(); render(); toast(`Načteno ${rows.length} řádků. Data zůstávají v tomto prohlížeči.`);
  } catch (error) { toast(`Import se nepodařil: ${error.message}`); }
  event.target.value = '';
});
$('#export-button').addEventListener('click', () => {
  const result = state.view === 'catalog' ? catalog() : orders();
  const { issues, ...summary } = result;
  const data = { tool: 'Shop Ops Kit', demo: state.view === 'orders' || catalogIsDemo(), view: state.view, generatedAt: new Date().toISOString(), summary, rules:state.view==='catalog'?structuredClone(rules):null, publication:state.view==='catalog'&&state.publication?publicationReport(state.publication,state.decisions):null, issues: issues.map(issue => ({ ...issue, reviewed: state.reviewed.has(issue.id) })), catalogComparison: state.view === 'catalog' && state.previousRows ? compareCatalog(state.previousRows, state.rows) : null };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `shop-ops-${state.view}-report.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('#export-findings').addEventListener('click', () => {
  const result = state.view === 'catalog' ? catalog() : orders();
  const visible = result.issues.filter(issue => state.severity === 'all' || issue.severity === state.severity);
  const url = URL.createObjectURL(new Blob([findingsCsv(visible, state.reviewed)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `shop-ops-${state.view}-zjisteni.csv`; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 3000);
  toast(`Staženo ${visible.length} zjištění podle aktuálního filtru.`);
});
const publicationLabels={approved:'Schváleno',pending:'Čeká na rozhodnutí',blocked:'Blokováno nálezem',rejected:'Zamítnuto',expired:'Výjimka vypršela'};
const fieldLabels={title:'Název',price:'Cena',currency:'Měna',stock:'Sklad',url:'Cesta produktu'};
function renderPublication(){
  const root=$('#publication-list');root.replaceChildren();
  const context=state.publication;
  $('#approved-csv').disabled=!context;
  $('#publication-json').disabled=!context;
  if(!context){$('#publication-summary').textContent=state.previousRows?'Připravuji kontrolu vstupů…':'Načtěte předchozí a aktuální export. Schvalování je oddělené od prověření nálezů.';return;}
  const report=publicationReport(context,state.decisions),counts=report.summary;state.expiredCount=counts.expired;
  $('#publication-summary').textContent=`${context.changes.length} změn · ${counts.approved} schváleno · ${counts.blocked} blokováno · ${counts.pending} čeká · ${counts.rejected} zamítnuto · ${counts.expired} vypršelo · ${context.ambiguous.length} nejednoznačných identit`;
  const pages=Math.max(1,Math.ceil(context.changes.length/30));state.publicationPage=Math.min(state.publicationPage,pages);
  $('#publication-page').textContent=state.publicationPage+' / '+pages;
  $('#publication-prev').disabled=state.publicationPage===1;$('#publication-next').disabled=state.publicationPage===pages;
  if(!context.changes.length)root.append(el('p','','Žádné jednoznačné změny. Duplicitní identity nelze schválit.'));
  for(const item of report.items.slice((state.publicationPage-1)*30,state.publicationPage*30)){
    const {change,status,decision,issues}=item,card=el('article','publication-change');card.dataset.key=change.key;
    card.append(el('strong','',change.key+' · '+({added:'Přidání',removed:'Odebrání',changed:'Změna'}[change.type])),el('p','publication-status',publicationLabels[status]));
    for(const field of change.type==='changed'?change.fields:['title','price','currency','stock'])card.append(el('p','change-field',(fieldLabels[field]||field)+': '+(change.before?.[field]??'—')+' → '+(change.after?.[field]??'—')));
    if(issues.length)card.append(el('p','',issues.map(issue=>issue.title).join(' · ')));
    const reason=el('input');reason.type='text';reason.maxLength=1000;reason.placeholder='Důvod rozhodnutí (alespoň 8 znaků)';reason.setAttribute('aria-label','Důvod '+change.key);reason.value=decision?.reason||'';
    const expiry=el('input');expiry.type='date';expiry.setAttribute('aria-label','Konec výjimky '+change.key);if(decision?.exceptionUntil)expiry.value=new Date(decision.exceptionUntil).toISOString().slice(0,10);
    const dateLabel=el('label','','Konec výjimky, UTC (max. 30 dnů) ');dateLabel.append(expiry);dateLabel.hidden=!issues.length||status==='blocked';
    const actions=el('div','publication-actions');
    for(const [action,label] of [['approved','Schválit'],['rejected','Zamítnout']]){
      const button=el('button','button outline',label);button.type='button';button.disabled=action==='approved'&&status==='blocked';
      button.onclick=()=>{try{state.decisions.set(change.key,decide(context,change.key,action,reason.value,expiry.value));renderPublication();toast('Rozhodnutí uloženo pro aktuální vstupy.')}catch(error){toast(error.message)}};actions.append(button);
    }
    if(decision){const clear=el('button','button outline','Zrušit rozhodnutí');clear.type='button';clear.onclick=()=>{state.decisions.delete(change.key);renderPublication()};actions.append(clear);}
    card.append(reason,dateLabel,actions);root.append(card);
  }
}
async function refreshPublication(){
  draftUI.invalidate();
  const generation=++state.publicationGeneration;state.publication=null;state.decisions.clear();state.publicationPage=1;renderPublication();
  if(!state.previousRows)return;
  try{const context=await preparePublication(state.previousRows,state.rows,rules);if(generation!==state.publicationGeneration)return;state.publication=context;renderPublication();}
  catch(error){if(generation===state.publicationGeneration)toast('Kontrola změn selhala: '+error.message);}
}
function downloadPublication(name,text,mime){const url=URL.createObjectURL(new Blob([text],{type:mime})),link=el('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);}
$('#approved-csv').onclick=()=>{if(!state.publication)return;const report=publicationReport(state.publication,state.decisions);if(!report.approved.length){toast('Žádná změna nemá platné schválení.');renderPublication();return}downloadPublication('shop-ops-schvalene-zmeny.csv',approvedCsv(report),'text/csv;charset=utf-8');renderPublication();};
$('#publication-json').onclick=()=>{if(state.publication)downloadPublication('shop-ops-rozhodnuti.json',JSON.stringify(publicationReport(state.publication,state.decisions),null,2),'application/json');};
$('#publication-prev').onclick=()=>{state.publicationPage--;renderPublication()};$('#publication-next').onclick=()=>{state.publicationPage++;renderPublication()};
setInterval(()=>{if(state.view==='catalog'&&state.publication){const expired=publicationReport(state.publication,state.decisions).summary.expired;if(expired!==state.expiredCount)renderPublication();}},60000);
const settings=el('details','tech-details');settings.append(el('summary','','Pravidla kontroly katalogu'));
const shared=el('input');shared.type='checkbox';shared.checked=true;
const label=el('label','','Trhy používají společný sklad ');label.append(shared);settings.append(label);
const threshold=el('input');threshold.type='number';threshold.min='0';threshold.max='10000';threshold.value='20';
const priceLabel=el('label','',' Limit změny ceny (%) ');priceLabel.append(threshold);settings.append(priceLabel);
const marketInputs=new Map();for(const key of ['CZ','SK','DE']){const checkbox=el('input');checkbox.type='checkbox';checkbox.checked=true;checkbox.setAttribute('aria-label','Očekávaný trh '+key);marketInputs.set(key,checkbox);const label=el('label','','Trh '+key+' ');label.append(checkbox);settings.append(label);}
const saveRules=el('button','','Použít pravidla');saveRules.type='button';saveRules.addEventListener('click',()=>{const value=Number(threshold.value);if(!threshold.value||!Number.isFinite(value)||value<0||value>10000){toast('Zadejte limit od 0 do 10 000 %.');return}const markets=[...marketInputs].filter(([,input])=>input.checked).map(([key])=>key);if(!markets.length){toast('Vyberte alespoň jeden očekávaný trh.');return}rules.sharedStock=shared.checked;rules.threshold=value;rules.expectedMarkets=markets;state.reviewed.clear();refreshPublication();render();toast('Pravidla změněna; dřívější prověření byla zrušena.');});settings.append(saveRules);
document.querySelector('main').prepend(settings);
render();

$('#catalog-json').onclick=()=>downloadPublication('shop-ops-katalog.json',catalogJson(state.rows),'application/json');

$('#demo-publication').onclick=()=>{
 if((!catalogIsDemo()||state.decisions.size||state.reviewed.size||draftUI.hasWork())&&!confirm('Načtení ukázky nahradí aktuální katalog, předchozí export, prověření, rozhodnutí a textové návrhy. Chcete pokračovat? Předtím si můžete stáhnout report.'))return;
 const sample=publicationDemo();state.inputEpoch++;state.rows=parseDelimited(sample.current);state.previousRows=parseDelimited(sample.previous);state.isDemo=true;state.demoScenario=true;state.reviewed.clear();state.view='catalog';state.market='ALL';state.page=1;state.findingPage=1;state.severity='all';
 Object.assign(rules,sample.rules);shared.checked=true;threshold.value=String(rules.threshold);for(const [key,input] of marketInputs)input.checked=rules.expectedMarkets.includes(key);
 document.querySelectorAll('[data-market]').forEach(button=>button.classList.toggle('active',button.dataset.market==='ALL'));document.querySelectorAll('[data-severity]').forEach(button=>button.classList.toggle('active',button.dataset.severity==='all'));
 refreshPublication();render();$('#publication-panel').scrollIntoView({block:'start'});toast('Načteny dva fiktivní exporty. Tři změny čekají na vaše rozhodnutí.');
};
