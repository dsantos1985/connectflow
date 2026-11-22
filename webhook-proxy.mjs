import http from 'node:http';

// Público somente quando um túnel HTTPS encaminhar para 127.0.0.1:3444.
// O backend valida hub.verify_token no GET e X-Hub-Signature-256 no POST.
const PORT = 3444;
const TARGET_HOST = '127.0.0.1';
const TARGET_PORT = 3333;
const ROUTE = '/api/meta/webhook';
const MAX_BODY = 1_000_000;

const server = http.createServer((req, res) => {
  let url;
  try { url = new URL(req.url || '/', 'http://localhost'); }
  catch { res.writeHead(400); res.end('Bad Request'); return; }

  if (url.pathname !== ROUTE || !['GET', 'POST'].includes(req.method)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }

  const headers = {};
  if (req.method === 'POST') {
    if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'];
    if (req.headers['x-hub-signature-256']) headers['x-hub-signature-256'] = req.headers['x-hub-signature-256'];
  }

  let size = 0;
  const body = [];
  req.on('data', chunk => {
    size += chunk.length;
    if (size > MAX_BODY) {
      req.destroy();
      return;
    }
    body.push(chunk);
  });
  req.on('error', () => {
    if (!res.headersSent) res.writeHead(400);
    res.end();
  });
  req.on('end', () => {
    if (size > MAX_BODY) { res.writeHead(413); res.end('Payload Too Large'); return; }
    const upstream = http.request({
      hostname: TARGET_HOST,
      port: TARGET_PORT,
      path: ROUTE + url.search,
      method: req.method,
      headers,
      timeout: 10000,
    }, upstreamRes => {
      res.writeHead(upstreamRes.statusCode || 502, {
        'Content-Type': upstreamRes.headers['content-type'] || 'text/plain',
        'Cache-Control': 'no-store',
      });
      upstreamRes.pipe(res);
    });
    upstream.on('error', () => {
      if (!res.headersSent) res.writeHead(502);
      res.end('Backend unavailable');
    });
    upstream.on('timeout', () => upstream.destroy());
    upstream.end(Buffer.concat(body));
  });
});
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Webhook proxy local: http://127.0.0.1:${PORT}${ROUTE}`);
});
