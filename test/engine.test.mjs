import test from 'node:test';
import assert from 'node:assert/strict';
import { auditCatalog, parseDelimited, reconcileOrders } from '../engine.mjs';
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
