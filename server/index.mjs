import express from 'express';

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/api/ai/status', (_req, res) => res.json({ configured: Boolean(process.env.OPENAI_API_KEY), label: process.env.OPENAI_API_KEY ? 'AI configured' : 'AI not configured' }));

app.post('/api/ai/extract', async (_req, res) => {
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'AI not configured. Add OPENAI_API_KEY only to the server environment.' });
  return res.status(501).json({ error: 'AI extraction is reserved for a reviewed server integration. No placeholder result is returned.' });
});

app.listen(process.env.PORT || 8787, () => console.log('QualityAtlas server listening on http://localhost:8787'));
