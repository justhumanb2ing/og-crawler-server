import express from 'express';
import cors from 'cors';
import { corsOptions } from './config/cors.js';
import healthRouter from './routes/health.js';
import crawlRouter from './routes/crawl.js';
import { HttpError } from './utils/errors.js';

const app = express();

app.disable('x-powered-by');
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'OG crawler server is running',
    endpoints: {
      health: '/api/health',
      crawl: '/api/crawl?url=...&mode=auto'
    }
  });
});

app.use('/api/health', healthRouter);
app.use('/api/crawl', crawlRouter);

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: 'Not found'
  });
});

app.use((err, req, res, next) => {
  const status = err instanceof HttpError ? err.status : 500;

  res.status(status).json({
    ok: false,
    error: err.message || 'Internal Server Error'
  });
});

export default app;
