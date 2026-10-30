export const sampleCatalog = `sku;market;title;price;currency;stock;url
LUMA-100;CZ;Světelný panel Luma 100;4990;CZK;21;/cz/luma-100
LUMA-100;SK;Svetelný panel Luma 100;199;EUR;21;/sk/luma-100
LUMA-100;DE;Luma 100 Lichtpanel;199;EUR;21;/de/luma-100
LUMA-200;CZ;Světelný panel Luma 200;8990;CZK;8;/cz/luma-200
LUMA-200;SK;Svetelný panel Luma 200;359;EUR;8;/sk/luma-200
LUMA-200;DE;;359;EUR;8;/de/luma-200
STAND-1;CZ;Stojan pro panel;1490;CZK;14;/cz/stand-1
STAND-1;SK;Stojan na panel;59;EUR;14;/sk/stand-1
STAND-1;DE;Ständer für Panel;59;EUR;11;/de/stand-1
CABLE-2;CZ;Napájecí kabel;390;CZK;50;/cz/cable-2
CABLE-2;SK;Napájací kábel;15;EUR;50;/sk/cable-2
CASE-1;CZ;Ochranné pouzdro;790;CZK;5;/cz/case-1
CASE-1;SK;Ochranné puzdro;31;EUR;5;/sk/case-1
CASE-1;DE;Schutzhülle;31;CZK;5;/de/case-1
CASE-1;DE;Schutzhülle;31;EUR;5;/de/case-1-copy
`; 

export const sampleOrders = [
  { id: 'O-2401', state: 'paid', sku: 'LUMA-100', qty: 1 },
  { id: 'O-2402', state: 'paid', sku: 'LUMA-200', qty: 2 },
  { id: 'O-2403', state: 'paid', sku: 'STAND-1', qty: 1 },
  { id: 'O-2404', state: 'cancelled', sku: 'CABLE-2', qty: 1 },
  { id: 'O-2405', state: 'paid', sku: 'CASE-1', qty: 1 },
  { id: 'O-2406', state: 'new', sku: 'LUMA-100', qty: 1 },
];

export const sampleShipments = [
  { eventId: 'EV-01', orderId: 'O-2401', sku: 'LUMA-100', qty: 1, carrier: 'PPL' },
  { eventId: 'EV-02', orderId: 'O-2402', sku: 'LUMA-200', qty: 1, carrier: 'DPD' },
  { eventId: 'EV-03', orderId: 'O-2402', sku: 'LUMA-200', qty: 1, carrier: 'DPD' },
  { eventId: 'EV-03', orderId: 'O-2402', sku: 'LUMA-200', qty: 1, carrier: 'DPD' },
  { eventId: 'EV-04', orderId: 'O-2404', sku: 'CABLE-2', qty: 1, carrier: 'PPL' },
  { eventId: 'EV-05', orderId: 'O-9999', sku: 'CASE-1', qty: 1, carrier: 'PPL' },
  { eventId: 'EV-06', orderId: 'O-2405', sku: 'STAND-1', qty: 1, carrier: 'DPD' },
];
