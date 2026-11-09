import { auditCatalog, compareCatalog, findingsCsv, parseDelimited, reconcileOrders, priceChangeChecks } from './engine.mjs';
import { sampleCatalog, sampleOrders, sampleShipments } from './fixtures.mjs';

const $ = selector => document.querySelector(selector);
const state = { view: 'catalog', market: 'ALL', severity: 'all', page: 1, findingPage: 1, rows: parseDelimited(sampleCatalog), previousRows: null, reviewed: new Set(), isDemo: true };
const rules={sharedStock:true,expectedMarkets:['CZ','SK','DE'],threshold:20};
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
    const id = el('td', '', String(row._row));
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
    top.append(el('span', `severity ${issue.severity}`, issue.severity === 'high' ? 'DŮLEŽITÉ' : 'K OVĚŘENÍ'), el('span', 'ref', `${state.view === 'catalog' ? 'ř.' : 'ID'} ${issue.refs.join(', ')}`));
    const button = el('button', 'review-button', state.reviewed.has(issue.id) ? '✓ Zkontrolováno' : 'Označit jako zkontrolované');
    button.type = 'button'; button.setAttribute('aria-pressed', state.reviewed.has(issue.id) ? 'true' : 'false');
    button.addEventListener('click', () => { state.reviewed.has(issue.id) ? state.reviewed.delete(issue.id) : state.reviewed.add(issue.id); renderFindings(result); });
    card.append(top, el('h3', '', issue.title), el('p', '', issue.detail), el('div', 'action', `Další krok: ${issue.action}`), button);
    return card;
  }));
}

function render() {
  const isCatalog = state.view === 'catalog';
  const result = isCatalog ? catalog() : orders();
  $('#view-title').textContent = isCatalog ? 'Katalog pod kontrolou.' : 'Objednávky bez překvapení.';
  $('#view-description').textContent = isCatalog ? 'Najděte nesrovnalosti v produktovém exportu dřív, než se dostanou na další trh.' : 'Porovnejte objednávky se zásilkami a odhalte opakované nebo chybně propojené události.';
  $('.eyebrow').textContent = isCatalog ? 'KONTROLA DAT · 01 / 02' : 'KONTROLA TOKU · 02 / 02';
  $('#catalog-panel').classList.toggle('hidden', !isCatalog);
  $('#orders-panel').classList.toggle('hidden', isCatalog);
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
$('#reset-button').addEventListener('click', () => { state.rows = parseDelimited(sampleCatalog); state.previousRows = null; state.isDemo = true; state.reviewed.clear(); state.market = 'ALL'; state.page = 1; state.findingPage = 1; document.querySelectorAll('[data-market]').forEach(x => x.classList.toggle('active', x.dataset.market === 'ALL')); render(); toast('Fiktivní ukázka obnovena.'); });
async function readCatalogFile(file) {
  if (file.size > 2_000_000) throw new Error('Soubor je příliš velký (limit 2 MB).');
  const rows = parseDelimited(await file.text());
  if (rows.length > 10_000) throw new Error('Maximálně 10 000 řádků.');
  return rows;
}
$('#previous-button').addEventListener('click', () => $('#previous-file').click());
$('#catalog-button').addEventListener('click', () => $('#catalog-file').click());
$('#previous-file').addEventListener('change', async event => {
  const file = event.target.files?.[0]; if (!file) return;
  try { state.previousRows = await readCatalogFile(file); render(); toast(`Předchozí export: ${state.previousRows.length} řádků. Data zůstávají v prohlížeči.`); }
  catch (error) { toast(`Import se nepodařil: ${error.message}`); }
  event.target.value = '';
});
$('#catalog-file').addEventListener('change', async event => {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    const rows = await readCatalogFile(file);
    state.rows = rows; state.isDemo = false; state.reviewed.clear(); state.market = 'ALL'; state.page = 1; state.findingPage = 1;
    document.querySelectorAll('[data-market]').forEach(x => x.classList.toggle('active', x.dataset.market === 'ALL'));
    state.view = 'catalog'; render(); toast(`Načteno ${rows.length} řádků. Data zůstávají v tomto prohlížeči.`);
  } catch (error) { toast(`Import se nepodařil: ${error.message}`); }
  event.target.value = '';
});
$('#export-button').addEventListener('click', () => {
  const result = state.view === 'catalog' ? catalog() : orders();
  const { issues, ...summary } = result;
  const data = { tool: 'Shop Ops Kit', demo: state.view === 'orders' || state.isDemo, view: state.view, generatedAt: new Date().toISOString(), summary, issues: issues.map(issue => ({ ...issue, reviewed: state.reviewed.has(issue.id) })), catalogComparison: state.view === 'catalog' && state.previousRows ? compareCatalog(state.previousRows, state.rows) : null };
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
const settings=el('details','tech-details');settings.append(el('summary','','Pravidla kontroly katalogu'));
const shared=el('input');shared.type='checkbox';shared.checked=true;
const label=el('label','','Trhy používají společný sklad ');label.append(shared);settings.append(label);
const threshold=el('input');threshold.type='number';threshold.min='0';threshold.max='10000';threshold.value='20';
const priceLabel=el('label','',' Limit změny ceny (%) ');priceLabel.append(threshold);settings.append(priceLabel);
const saveRules=el('button','','Použít pravidla');saveRules.type='button';saveRules.addEventListener('click',()=>{const value=Number(threshold.value);if(!threshold.value||!Number.isFinite(value)||value<0||value>10000){toast('Zadejte limit od 0 do 10 000 %.');return}rules.sharedStock=shared.checked;rules.threshold=value;state.reviewed.clear();render();toast('Pravidla změněna; dřívější prověření byla zrušena.');});settings.append(saveRules);
document.querySelector('main').prepend(settings);
render();
