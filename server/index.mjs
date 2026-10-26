import { createServer } from 'node:http';

const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
};

createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/api/ai/status') {
    return json(res, 200, { configured: Boolean(process.env.OPENAI_API_KEY), label: process.env.OPENAI_API_KEY ? 'AI configured' : 'AI not configured' });
  }
  if (req.method === 'POST' && req.url === '/api/ai/extract') {
    if (!process.env.OPENAI_API_KEY) return json(res, 503, { error: 'AI not configured. Add OPENAI_API_KEY only to the server environment.' });
    return json(res, 501, { error: 'AI extraction is reserved for a reviewed server integration. No placeholder result is returned.' });
  }
  return json(res, 404, { error: 'Not found' });
}).listen(process.env.PORT || 8787, () => console.log('QualityAtlas server listening on http://localhost:8787'));
