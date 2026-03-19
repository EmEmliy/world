import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

dotenv.config();

const app = express();
const port = Number(process.env.CHAT_BACKEND_PORT || 8787);
const allowedOrigin = process.env.CHAT_ALLOWED_ORIGIN || '*';

app.use(cors({
  origin: allowedOrigin === '*' ? true : allowedOrigin,
}));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
  });
});

app.post('/chat', async (req, res) => {
  try {
    const { messages, systemPrompt } = req.body ?? {};

    if (!Array.isArray(messages)) {
      res.status(400).json({ error: 'messages must be an array' });
      return;
    }

    const apiKey = process.env.MINIMAX_API_KEY;
    const model = process.env.MINIMAX_MODEL || 'MiniMax-M2.5-highspeed';
    const baseUrl = process.env.MINIMAX_BASE_URL || 'https://api.minimaxi.com/v1';

    if (!apiKey) {
      res.status(500).json({ error: 'MINIMAX_API_KEY is not configured' });
      return;
    }

    const allMessages = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;

    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: allMessages,
        stream: true,
      }),
    });

    if (!upstream.ok) {
      const errorText = await upstream.text();
      res.status(upstream.status).json({
        error: `MiniMax API error: ${errorText}`,
      });
      return;
    }

    if (!upstream.body) {
      res.status(502).json({ error: 'MiniMax response body is empty' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    const reader = upstream.body.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    } catch (streamError) {
      console.error('MiniMax stream proxy error:', streamError);
      if (!res.headersSent) {
        res.status(502).json({ error: 'stream proxy failed' });
        return;
      }
      res.end();
    }
  } catch (error) {
    console.error('Chat backend error:', error);
    res.status(500).json({ error: 'internal server error' });
  }
});

app.listen(port, () => {
  console.log(`world chat backend listening on http://localhost:${port}`);
});
