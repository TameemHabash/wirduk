/**
 * Saves Dorar pages posted from a dorar.net tab (localhost only).
 *
 *   node scripts/dorar/receiver.ts <out-dir> [port=8765]
 *
 * dorar.net blocks scripts (Cloudflare 403), so pages are read inside a real
 * Chrome tab by browser-helpers.js and posted here, saved exactly as sent.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';

const [outDir, port = '8765'] = process.argv.slice(2);
if (!outDir) throw new Error('Usage: node scripts/dorar/receiver.ts <out-dir> [port]');
mkdirSync(outDir, { recursive: true });

const CORS = {
  'Access-Control-Allow-Origin': 'https://dorar.net',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  // Chrome's Private Network Access preflight (public site → localhost).
  'Access-Control-Allow-Private-Network': 'true',
};

createServer((req, res) => {
  if (req.method === 'OPTIONS') return res.writeHead(204, CORS).end();
  if (req.method !== 'POST' || !req.url?.startsWith('/save/'))
    return res.writeHead(404, CORS).end();
  const name = req.url.slice('/save/'.length).replace(/[^\w.-]/g, '');
  const chunks: Buffer[] = [];
  req.on('data', (c: Buffer) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString('utf8');
    try {
      JSON.parse(body);
    } catch {
      return res.writeHead(400, CORS).end('not JSON');
    }
    writeFileSync(join(outDir, `${name}.json`), body);
    console.log(`saved ${name}.json (${body.length} chars)`);
    res.writeHead(200, CORS).end('ok');
  });
}).listen(Number(port), '127.0.0.1', () => {
  console.log(`receiver on 127.0.0.1:${port} -> ${outDir}`);
});
