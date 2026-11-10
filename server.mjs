import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/red.css', ['red.css', 'text/css; charset=utf-8']],
  ['/app.mjs', ['app.mjs', 'text/javascript; charset=utf-8']],
  ['/engine.mjs', ['engine.mjs', 'text/javascript; charset=utf-8']],
  ['/workflow.mjs', ['workflow.mjs', 'text/javascript; charset=utf-8']],
  ...['catalog-input.mjs','drafts.mjs','draft-ui.mjs'].map(name=>['/'+name,[name,'text/javascript; charset=utf-8']]),
  ['/fixtures.mjs', ['fixtures.mjs', 'text/javascript; charset=utf-8']],
]);

export function createStaticServer(){
return createServer(async (req, res) => {
  const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
  const route = files.get(pathname);
  if (req.method !== 'GET' || !route) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }
  try {
    const data = await readFile(join(root, route[0]));
    res.writeHead(200, {
      'Content-Type': route[1],
      'Content-Length': data.length,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    });
    res.end(data);
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('File unavailable');
  }
});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const port=Number(process.env.PORT??4175);if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
 createStaticServer().listen(port,'127.0.0.1',()=>console.log(`Shop Ops Kit: http://127.0.0.1:${port}`));
}
