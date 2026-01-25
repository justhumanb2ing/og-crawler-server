# Architecture Overview

This service is an Express server (designed to run on Vercel) that returns Open Graph metadata for a given URL.

## High-level components

- HTTP layer: Express app + routes + controller
- Crawl orchestration: selects crawling strategy (`static`, `dynamic`, `auto`)
- Static crawling: `fetch()` + HTML parsing (Cheerio)
- Dynamic crawling: Playwright + Chromium (serverless-friendly binary)
- Extraction: pulls OG/Twitter/HTML metadata from the HTML

## Deployment adapter (Vercel)

Vercel routes requests into `api/index.js` and rewrites `/api/*` to a single function entry.

Annotated snippet from `vercel.json`:

```json
{
  "version": 2,
  "functions": {
    "api/index.js": {
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/index.js"
    }
  ]
}
```

Annotated snippet from `api/index.js`:

```js
import app from '../src/app.js';

// Vercel entry: exports the Express app.
export default app;
```

## Runtime entry for local dev

The local server entrypoint is `src/server.js`.

```js
import 'dotenv/config';
import app from './app.js';

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`OG crawler server listening on http://localhost:${port}`);
});
```

## Key files

- `src/app.js`: Express app wiring
- `src/routes/crawl.js`: crawl route
- `src/controllers/crawlController.js`: request validation and response shaping
- `src/services/crawlService.js`: strategy selection + fallback
- `src/services/staticCrawler.js`: static crawl implementation
- `src/services/dynamicCrawler.js`: dynamic crawl implementation
- `src/services/ogExtractor.js`: OG metadata extraction
- `src/utils/http.js`: network fetch + timeout

## Sequence Diagram (High-Level)

This diagram shows the primary path from request entry to OG extraction.

```text
Client
  |
  |  GET /api/crawl?url=...&mode=auto
  v
Vercel Function (api/index.js)
  |
  v
Express App (src/app.js)
  |
  v
Route (src/routes/crawl.js)
  |
  v
Controller (src/controllers/crawlController.js)
  |
  v
Orchestrator (src/services/crawlService.js)
  |
  +--> Static Crawler (src/services/staticCrawler.js)
  |       |
  |       +--> HTTP fetch (src/utils/http.js)
  |       |
  |       +--> Extractor (src/services/ogExtractor.js)
  |
  +--> Dynamic Crawler (src/services/dynamicCrawler.js)
          |
          +--> Chromium + Playwright
          |
          +--> Extractor (src/services/ogExtractor.js)
```
