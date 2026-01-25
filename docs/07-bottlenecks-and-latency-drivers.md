# Bottlenecks & Latency Drivers

This document explains why a single OG request can take ~3 seconds (or more) in the current implementation.

## 1) Sequential fallback in `auto` mode

From `src/services/crawlService.js`:

```js
staticResult = await crawlStatic(url);
// ... decide if good enough
const dynamicResult = await crawlDynamic(url);
```

Why it matters:

- If `crawlStatic()` is slow (slow origin, big HTML, TLS handshake), the request blocks before even considering dynamic crawling.

## 2) Static fetch downloads full HTML

From `src/utils/http.js`:

```js
const html = await response.text();
```

Why it matters:

- Many OG tags are in `<head>`; reading the whole body is wasted for large pages.
- This increases tail latency when the server has to download megabytes before parsing.

## 3) Browser launch per dynamic request

From `src/services/dynamicCrawler.js`:

```js
const browser = await launchBrowser();
// ...
await browser.close();
```

Why it matters:

- Chromium startup is expensive and can dominate the latency budget.
- Serverless deployments magnify this due to cold starts.

## 4) Additional fixed waiting (`networkidle`)

From `src/services/dynamicCrawler.js`:

```js
await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

try {
  await page.waitForLoadState('networkidle', { timeout: 5000 });
} catch {
  // Ignore
}
```

Why it matters:

- `networkidle` often waits for background analytics/ads/long-poll requests.
- The code ignores failure, but it still waits *up to 5 seconds* before giving up.

## 5) No caching

Observation:

- There is no memoization layer around `crawlOgData()`.
- Repeated requests for the same URL repeat the entire crawling work.

Impact:

- High cost and high latency under repeated usage.
- Serverless costs increase and concurrency pressure rises.

## Sequence Diagram (Worst-Case Auto)

This is the typical "feels slow" path.

```text
Client
  |
  |  mode=auto
  v
crawlOgData
  |
  |  await crawlStatic (up to 8000ms)
  |  score < 2 or error
  v
await crawlDynamic
  |
  |  launch browser (cold start possible)
  |  page.goto (up to 20000ms)
  |  optional networkidle wait (up to +5000ms)
  v
Extractor -> Response

Why this matters:
- Even when dynamic is the true answer, static cost is paid first.
```
