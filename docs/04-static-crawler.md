# Static Crawler

Static crawling is the fast path: it fetches HTML and parses OG tags from it.

## Implementation

From `src/services/staticCrawler.js`:

```js
import { fetchHtml } from '../utils/http.js';
import { extractOgData } from './ogExtractor.js';

export const crawlStatic = async (targetUrl) => {
  const { html, finalUrl } = await fetchHtml(targetUrl, { timeoutMs: 8000 });
  return extractOgData(html, finalUrl || targetUrl);
};
```

## HTTP fetching behavior

From `src/utils/http.js`:

```js
const DEFAULT_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (compatible; OgCrawler/1.0; +https://vercel.app)'
};

export const fetchHtml = async (targetUrl, options = {}) => {
  const timeoutMs = options.timeoutMs ?? 8000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(targetUrl, {
      headers: {
        ...DEFAULT_HEADERS,
        ...options.headers
      },
      redirect: 'follow',
      signal: controller.signal
    });

    if (!response.ok) {
      throw new HttpError(
        response.status,
        `Request failed with status ${response.status}`
      );
    }

    const html = await response.text();

    return {
      html,
      finalUrl: response.url || targetUrl,
      contentType: response.headers.get('content-type')
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new HttpError(504, 'Static crawl timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};
```

Current risks / problems:

- `response.text()` reads the **entire response body** into memory.
  - For OG extraction, the `<head>` section is usually sufficient.
  - For large HTML pages, this is unnecessary bandwidth + time.
- Timeout is 8 seconds. In `auto` mode, this cost can be paid before even attempting dynamic crawling.
- No caching: repeated requests for the same URL will re-fetch the same HTML.

## Sequence Diagram (Static Crawl)

```text
crawlStatic(targetUrl)
  |
  |  { html, finalUrl } = await fetchHtml(targetUrl, { timeoutMs: 8000 })
  v
fetchHtml(targetUrl)
  |
  |  fetch(targetUrl, { redirect: 'follow', headers, signal })
  |  await response.text()   <-- reads full body
  v
extractOgData(html, finalUrl)
  |
  v
return { title, description, image, ... }
```
