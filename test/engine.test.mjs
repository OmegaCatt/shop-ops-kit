import test from 'node:test';
import assert from 'node:assert/strict';
import { auditCatalog, compareCatalog, findingsCsv, parseDelimited, reconcileOrders } from '../engine.mjs';

test('findings CSV retains source and review state while neutralizing formulas', () => {
  const issue = { id: 'x', code: 'price', severity: 'high', title: '=HYPERLINK("bad")', detail: 'Cena; neplatná', refs: [12], action: 'Ověřit cenu' };
  const csv = findingsCsv([issue], new Set(['x']));
  assert.match(csv, /'\=HYPERLINK/);
  assert.match(csv, /"Cena; neplatná"/);
  assert.match(csv, /"12";"Ověřit cenu";"Prověřeno"/);
});

test('catalog comparison reports changes and never guesses through duplicate identities', () => {
  const oldRows = parseDelimited('sku;market;title;price;currency;stock;url\nA;CZ;Alpha;100;CZK;2;/cz/a\nB;CZ;Beta;50;CZK;1;/cz/b\nD;CZ;One;10;CZK;1;/cz/d\nD;CZ;Two;11;CZK;1;/cz/d2');
  const newRows = parseDelimited('sku;market;title;price;currency;stock;url\nA;CZ;Alpha;120;CZK;3;/cz/a\nC;CZ;Gamma;60;CZK;1;/cz/c\nD;CZ;Three;12;CZK;1;/cz/d');
  const result = compareCatalog(oldRows, newRows);
  assert.deepEqual([result.added, result.removed, result.changed, result.ambiguous.length], [1, 1, 1, 1]);
  assert.deepEqual(result.changes.find(x => x.key === 'A|CZ').fields, ['price', 'stock']);
  assert.deepEqual(result.changes.find(x => x.key === 'A|CZ').previousRow, 2);
  assert.equal(result.changes.some(x => x.key === 'D|CZ'), false);
});
import { sampleCatalog, sampleOrders, sampleShipments } from '../fixtures.mjs';

test('CSV import handles BOM, quoted delimiters and physical source rows', () => {
  const rows = parseDelimited('\uFEFFsku;market;title;price;currency;stock;url\r\nA;CZ;"Panel; velký";100;CZK;2;/cz/a\r\n');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, 'Panel; velký');
  assert.equal(rows[0]._row, 2);
});

test('CSV import rejects incomplete headers and malformed records', () => {
  assert.throws(() => parseDelimited('sku;market\nA;CZ'), /Chybějící sloupce/);
  assert.throws(() => parseDelimited('sku;market;title;price;currency;stock;url\nA;CZ;x;1;CZK;2'), /Nesprávný počet/);
  assert.throws(() => parseDelimited('sku;market;title;price;currency;stock;url\nA;CZ;"unfinished'), /Unclosed quote/);
});

test('catalog audit catches market, currency, title, stock and duplicate errors', () => {
  const result = auditCatalog(parseDelimited(sampleCatalog));
  const codes = new Set(result.issues.map(x => x.code));
  for (const code of ['title', 'stock-drift', 'currency', 'duplicate', 'missing-market-DE']) assert.ok(codes.has(code), code);
  assert.equal(result.productCount, 5);
  assert.equal(result.rowCount, 15);
  assert.ok(result.issues.every(x => x.refs.length > 0 && x.action));
});

test('order reconciliation counts duplicate events once and retains exceptions', () => {
  const result = reconcileOrders(sampleOrders, sampleShipments);
  const codes = new Set(result.issues.map(x => x.code));
  for (const code of ['event-duplicate', 'orphan', 'sku-mismatch', 'cancelled-shipped', 'pending']) assert.ok(codes.has(code), code);
  assert.equal(result.eventCount, 7);
  assert.equal(result.uniqueEventCount, 6);
  assert.ok(!codes.has('over-shipped'));
});

test('bad shipment quantity never changes reconciled count', () => {
  const result = reconcileOrders([{ id: 'O1', state: 'paid', sku: 'A', qty: 1 }], [{ eventId: 'E1', orderId: 'O1', sku: 'A', qty: -2 }]);
  assert.ok(result.issues.some(x => x.code === 'quantity'));
  assert.ok(result.issues.some(x => x.code === 'pending'));
  assert.equal(result.shippedCount, 0);
});
