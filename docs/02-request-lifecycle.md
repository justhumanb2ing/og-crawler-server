# Request Lifecycle

This document shows how a client request flows through the server until it returns OG data.

## 1) Express app wiring

`src/app.js` wires routes and middleware.

```js
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

app.use('/api/health', healthRouter);
app.use('/api/crawl', crawlRouter);

// ... 404 handler and error handler
export default app;
```

Key observation:

- The service is an HTTP API: most latency is expected to come from outbound fetching / crawling.

## 2) Route → controller

`src/routes/crawl.js` binds `GET /api/crawl` to the controller.

```js
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { crawlController } from '../controllers/crawlController.js';

const router = Router();

router.get('/', asyncHandler(crawlController));

export default router;
```

## 3) Controller: validate input, measure total duration

`src/controllers/crawlController.js` validates query params and measures end-to-end duration.

```js
import { parseCrawlMode, parseTargetUrl } from '../utils/validators.js';
import { crawlOgData } from '../services/crawlService.js';

export const crawlController = async (req, res) => {
  const startedAt = Date.now();
  const targetUrl = parseTargetUrl(req.query.url);
  const mode = parseCrawlMode(req.query.mode);

  const result = await crawlOgData({ url: targetUrl, mode });

  res.json({
    ok: true,
    mode: result.modeUsed,
    fallback: result.fallback,
    durationMs: Date.now() - startedAt,
    data: result.data
  });
};
```

What this implies:

- `durationMs` is the full wall-clock time including outbound network I/O and/or Playwright.
- There is no breakdown by stage (e.g., static fetch time vs dynamic crawl time).

## Sequence Diagram (Request Lifecycle)

```text
Client
  |
  |  GET /api/crawl?url=<target>&mode=<auto|static|dynamic>
  v
src/app.js
  |
  |  app.use('/api/crawl', crawlRouter)
  v
src/routes/crawl.js
  |
  |  router.get('/', asyncHandler(crawlController))
  v
src/controllers/crawlController.js
  |
  |  parseTargetUrl(req.query.url)
  |  parseCrawlMode(req.query.mode)
  |  crawlOgData({ url, mode })
  v
src/services/crawlService.js
  |
  |  choose static/dynamic/auto
  v
Crawler + Extractor
  |
  v
JSON response { ok, mode, fallback, durationMs, data }
```
