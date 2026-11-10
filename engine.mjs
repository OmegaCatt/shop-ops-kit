export const MARKETS = Object.freeze({ CZ: 'CZK', SK: 'EUR', DE: 'EUR' });

export function parseDelimited(input) {
  if (typeof input !== 'string') throw new TypeError('Expected text');
  const source = input.replace(/^\uFEFF/, '');
  const firstLine = source.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = (firstLine.match(/;/g) ?? []).length >= (firstLine.match(/,/g) ?? []).length ? ';' : ',';
  const records = [];
  let cells = [], cell = '', quoted = false, row = 1, recordStart = 1;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"') {
      if (quoted && source[i + 1] === '"') { cell += '"'; i++; }
      else if (!quoted && cell !== '') throw new Error(`Unexpected quote on line ${row}`);
      else quoted = !quoted;
    } else if (ch === delimiter && !quoted) {
      cells.push(cell); cell = '';
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      cells.push(cell); cell = '';
      if (cells.some(value => value.trim() !== '')) records.push({ cells, row: recordStart });
      cells = [];
      if (ch === '\r' && source[i + 1] === '\n') i++;
      row++;
      recordStart = row;
    } else {
      cell += ch;
      if (ch === '\n') row++;
    }
  }
  if (quoted) throw new Error(`Unclosed quote starting on line ${recordStart}`);
  cells.push(cell);
  if (cells.some(value => value.trim() !== '')) records.push({ cells, row: recordStart });
  if (!records.length) throw new Error('Soubor je prázdný.');
  const headers = records.shift().cells.map(value => value.trim().toLowerCase());
  const reserved = new Set(['_row','_location','_format','__proto__','constructor','prototype']);
  if (headers.some(name => reserved.has(name))) throw new Error('Rezervovaný název sloupce: interní metadata zdroje nelze importovat.');
  const required = ['sku', 'market', 'title', 'price', 'currency', 'stock', 'url'];
  const missing = required.filter(name => !headers.includes(name));
  if (missing.length) throw new Error(`Chybějící sloupce: ${missing.join(', ')}`);
  if (new Set(headers).size !== headers.length) throw new Error('Duplicitní názvy sloupců.');
  return records.map(({ cells: values, row: sourceRow }) => {
    if (values.length !== headers.length) throw new Error(`Nesprávný počet sloupců na řádku ${sourceRow}`);
    const record = { _row: sourceRow };
    headers.forEach((name, index) => { record[name] = values[index].trim(); });
    return record;
  });
}

function finding(code, severity, title, detail, refs, action) {
  return { id: `${code}:${refs.join('-')}`, code, severity, title, detail, refs, action };
}

export function findingsCsv(issues, reviewed = new Set()) {
  const safe = value => {
    let text = String(value ?? '');
    if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  const rows = [
    ['Priorita', 'Pravidlo', 'Zjištění', 'Detail', 'Zdrojové řádky nebo ID', 'Další krok', 'Stav'],
    ...issues.map(issue => [issue.severity === 'high' ? 'Důležitá' : 'K ověření', issue.code, issue.title, issue.detail, issue.refs.join(' | '), issue.action, reviewed.has(issue.id) ? 'Prověřeno' : 'Otevřeno'])
  ];
  return '\ufeff' + rows.map(row => row.map(safe).join(';')).join('\r\n') + '\r\n';
}

export function auditCatalog(rows, {sharedStock=true, expectedMarkets=Object.keys(MARKETS)}={}) {
  if(!Array.isArray(expectedMarkets)||!expectedMarkets.length||expectedMarkets.some(m=>!Object.hasOwn(MARKETS,m))||new Set(expectedMarkets).size!==expectedMarkets.length)throw new Error('Neplatný seznam trhů.');
  const issues = [];
  const byKey = new Map(), bySku = new Map(), byUrl = new Map();
  for (const row of rows) {
    const sku = String(row.sku ?? '').trim().toUpperCase();
    const market = String(row.market ?? '').trim().toUpperCase();
    const ref = row._row ?? '?';
    if (!sku || !MARKETS[market]) {
      issues.push(finding('identity', 'high', 'Neplatná identita položky', `SKU „${sku || 'prázdné'}“, trh „${market || 'prázdný'}“.`, [ref], 'Opravit SKU nebo kód trhu ve zdroji.'));
      continue;
    }
    const key = `${sku}|${market}`;
    if (byKey.has(key)) issues.push(finding('duplicate', 'high', 'Duplicitní SKU na trhu', `${sku} se pro ${market} vyskytuje vícekrát.`, [byKey.get(key)._row, ref], 'Ověřit, který záznam je platný; neslučovat automaticky.'));
    else byKey.set(key, row);
    if (!bySku.has(sku)) bySku.set(sku, new Map());
    if (!bySku.get(sku).has(market)) bySku.get(sku).set(market, row);
    if (!row.title) issues.push(finding('title', 'medium', 'Chybí název produktu', `${sku} na trhu ${market} nemá název.`, [ref], 'Doplnit překlad a nechat jej schválit.'));
    const price = Number(String(row.price).replace(',', '.'));
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(String(row.price).trim()) || !Number.isFinite(price) || price <= 0) issues.push(finding('price', 'high', 'Neplatná cena', `${sku} na trhu ${market} má cenu „${row.price}“.`, [ref], 'Opravit cenu podle schváleného ceníku.'));
    if (row.currency !== MARKETS[market]) issues.push(finding('currency', 'high', 'Nesprávná měna', `${market} očekává ${MARKETS[market]}, v exportu je ${row.currency || 'prázdno'}.`, [ref], 'Ověřit měnu a cenu ve zdrojovém systému.'));
    const stock = Number(row.stock);
    if (!/^\d+$/.test(String(row.stock).trim()) || !Number.isSafeInteger(stock) || stock < 0) issues.push(finding('stock', 'high', 'Neplatný sklad', `${sku} na trhu ${market} má množství „${row.stock}“.`, [ref], 'Opravit podle skladového systému.'));
    const url = String(row.url ?? '').trim();
    if (!url.startsWith(`/${market.toLowerCase()}/`)) issues.push(finding('url', 'medium', 'Podezřelá cesta produktu', `${sku}: URL „${url}“ neodpovídá trhu ${market}.`, [ref], 'Prověřit adresu a jazykovou mutaci.'));
    if (url && byUrl.has(url)) issues.push(finding('url-duplicate', 'medium', 'Duplicitní URL', `Adresu ${url} používá více záznamů.`, [byUrl.get(url), ref], 'Ověřit cílové stránky.'));
    else if (url) byUrl.set(url, ref);
  }
  for (const [sku, markets] of bySku) {
    if (!markets.has('CZ')) continue;
    const sourceRow = markets.get('CZ')._row;
    for (const market of expectedMarkets) {
      if (!markets.has(market)) issues.push(finding(`missing-market-${market}`, 'medium', 'Chybí jazyková mutace', `${sku} chybí na trhu ${market}.`, [sourceRow], 'Ověřit, zda se má produkt na trhu prodávat; případně připravit překlad.'));
    }
    const validStocks = [...markets.values()].map(r => ({ stock: Number(r.stock), row: r._row })).filter(x => Number.isInteger(x.stock) && x.stock >= 0);
    if (sharedStock && new Set(validStocks.map(x => x.stock)).size > 1) issues.push(finding('stock-drift', 'high', 'Nesoulad skladu mezi trhy', `${sku}: ${[...markets].map(([m, r]) => `${m} ${r.stock}`).join(' · ')}.`, validStocks.map(x => x.row), 'Porovnat s jediným autoritativním skladem; nevyrovnávat naslepo.'));
  }
  return {
    issues: issues.sort((a, b) => (a.severity === 'high' ? 0 : 1) - (b.severity === 'high' ? 0 : 1) || Number(a.refs[0]) - Number(b.refs[0])),
    productCount: bySku.size,
    rowCount: rows.length,
    marketCount: Object.fromEntries(Object.keys(MARKETS).map(m => [m, rows.filter(r => String(r.market).toUpperCase() === m).length])),
  };
}

// Compare only unambiguous SKU/market identities. Conflicting rows stay unresolved.
export function compareCatalog(previous, current) {
  const index = rows => {
    const grouped = new Map();
    for (const row of rows) {
      const sku = String(row.sku ?? '').trim().toUpperCase();
      const market = String(row.market ?? '').trim().toUpperCase();
      if (!sku || !MARKETS[market]) continue;
      const key = `${sku}|${market}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(row);
    }
    return grouped;
  };
  const before = index(previous), after = index(current), changes = [], ambiguous = [];
  for (const key of new Set([...before.keys(), ...after.keys()])) {
    const oldRows = before.get(key) ?? [], newRows = after.get(key) ?? [];
    if (oldRows.length > 1 || newRows.length > 1) {
      ambiguous.push({ key, previousRows: oldRows.map(row => row._row), currentRows: newRows.map(row => row._row) });
      continue;
    }
    const oldRow = oldRows[0], newRow = newRows[0];
    const fields = oldRow && newRow ? ['title', 'price', 'currency', 'stock', 'url'].filter(field => String(oldRow[field] ?? '').trim() !== String(newRow[field] ?? '').trim()) : [];
    if (!oldRow || !newRow || fields.length) changes.push({ key, type: !oldRow ? 'added' : !newRow ? 'removed' : 'changed', fields, previousRow: oldRow?._row ?? null, currentRow: newRow?._row ?? null, before: oldRow ?? null, after: newRow ?? null });
  }
  return { changes, ambiguous, added: changes.filter(x => x.type === 'added').length, removed: changes.filter(x => x.type === 'removed').length, changed: changes.filter(x => x.type === 'changed').length };
}

export function priceChangeChecks(previous,current,threshold=20){
  if(!Number.isFinite(threshold)||threshold<0||threshold>10000)throw new Error('Neplatný procentní limit.');
  return compareCatalog(previous,current).changes.flatMap(change=>{
    if(change.type!=='changed'||change.before.currency!==change.after.currency)return [];
    const before=Number(String(change.before.price).replace(',','.')),after=Number(String(change.after.price).replace(',','.'));
    if(!Number.isFinite(before)||!Number.isFinite(after)||before<=0||after<=0)return [];
    const percent=(after-before)/before*100;
    return Math.abs(percent)>threshold?[finding('price-change','high','Změna ceny nad limitem',`${change.key}: ${before} → ${after} ${change.after.currency} (${percent.toFixed(2)} %, limit ${threshold} %).`,[change.currentRow],'Ověřit změnu proti schválenému ceníku.')]:[];
  });
}

export function reconcileOrders(orders, shipments) {
  const issues = [];
  const orderMap = new Map(orders.map(order => [order.id, order]));
  const seen = new Map(), shipped = new Map();
  for (const event of shipments) {
    const ref = event.eventId;
    if (seen.has(ref)) {
      issues.push(finding('event-duplicate', 'medium', 'Opakovaná událost', `${ref} už bylo přijato; druhé doručení se nezapočítá.`, [ref], 'Zkontrolovat opakování webhooku; ponechat idempotentní zpracování.'));
      continue;
    }
    seen.set(ref, true);
    const order = orderMap.get(event.orderId);
    if (!order) {
      issues.push(finding('orphan', 'high', 'Zásilka bez objednávky', `${ref} odkazuje na neznámou objednávku ${event.orderId}.`, [ref], 'Prověřit mapování ID mezi systémy.'));
      continue;
    }
    if (!Number.isInteger(event.qty) || event.qty <= 0) {
      issues.push(finding('quantity', 'high', 'Neplatné množství v události', `${ref} má množství ${event.qty}.`, [ref], 'Opravit zdrojovou událost.'));
      continue;
    }
    if (order.sku !== event.sku) {
      issues.push(finding('sku-mismatch', 'high', 'Nesouhlasí SKU', `${ref}: objednávka ${order.sku}, zásilka ${event.sku}.`, [ref], 'Ověřit obsah balíku a mapování SKU.'));
      continue;
    }
    if (order.state === 'cancelled') issues.push(finding('cancelled-shipped', 'high', 'Odeslaná zrušená objednávka', `${order.id} byla zrušena, přesto má zásilku.`, [ref], 'Neprodleně ověřit expedici.'));
    const total = (shipped.get(order.id) ?? 0) + event.qty;
    shipped.set(order.id, total);
    if (total > order.qty) issues.push(finding('over-shipped', 'high', 'Odesláno více kusů', `${order.id}: objednáno ${order.qty}, odesláno ${total}.`, [ref], 'Prověřit duplicitní expedici.'));
  }
  for (const order of orders) {
    if (order.state === 'paid' && (shipped.get(order.id) ?? 0) < order.qty) issues.push(finding('pending', 'medium', 'Zaplacená objednávka čeká', `${order.id}: odesláno ${shipped.get(order.id) ?? 0} z ${order.qty} kusů.`, [order.id], 'Prověřit sklad a stav expedice.'));
    if (order.state === 'new' && shipped.has(order.id)) issues.push(finding('unpaid-shipped', 'high', 'Odesláno bez platby', `${order.id} je stále ve stavu „new“.`, [order.id], 'Ověřit stav platby.'));
  }
  return { issues, orderCount: orders.length, eventCount: shipments.length, uniqueEventCount: seen.size, shippedCount: shipped.size };
}
