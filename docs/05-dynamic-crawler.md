# Dynamic Crawler (Playwright)

Dynamic crawling is the correctness fallback for JavaScript-heavy sites.

It renders the page using Playwright + Chromium, then parses the resulting DOM.

## Implementation

From `src/services/dynamicCrawler.js` (simplified excerpt):

```js
import { chromium as playwrightChromium } from 'playwright-core';
import serverlessChromium from '@sparticuz/chromium';
import { extractOgData } from './ogExtractor.js';

const DEFAULT_TIMEOUT_MS = 20000;
const isServerless = Boolean(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
);

const getLaunchOptions = async () => {
  const executablePath = isServerless
    ? await serverlessChromium.executablePath()
    : process.env.PLAYWRIGHT_CHROMIUM_PATH;

  return {
    args: isServerless ? serverlessChromium.args : [],
    executablePath: executablePath || undefined,
    headless: isServerless ? serverlessChromium.headless : true
  };
};

const launchBrowser = async () => {
  const options = await getLaunchOptions();
  return await playwrightChromium.launch(options);
};

export const crawlDynamic = async (targetUrl) => {
  const browser = await launchBrowser();

  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (compatible; OgCrawler/1.0; +https://vercel.app)'
    });

    const page = await context.newPage();
    page.setDefaultTimeout(DEFAULT_TIMEOUT_MS);

    await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: DEFAULT_TIMEOUT_MS
    });

    try {
      await page.waitForLoadState('networkidle', { timeout: 5000 });
    } catch {
      // Ignore network idle timeout and continue with current DOM.
    }

    const html = await page.content();
    const finalUrl = page.url();

    await context.close();
    return extractOgData(html, finalUrl || targetUrl);
  } finally {
    await browser.close();
  }
};
```

Latency drivers / problems:

- **Browser launch per request** (`launchBrowser()` inside `crawlDynamic()`):
  - This is often 0.5s~2s+ overhead even before navigation.
  - In serverless environments, cold start can make it worse.
- **Extra waiting after DOMContentLoaded**:
  - `waitForLoadState('networkidle', { timeout: 5000 })` can add up to ~5 seconds.
  - OG meta tags are frequently present in the initial HTML or are available soon after `domcontentloaded`.
- `page.content()` serializes the entire page DOM to HTML, which can be expensive for large pages.

Correctness vs speed tradeoff:

- This crawler optimizes for correctness by giving the browser time to settle.
- However, for an OG API, the page does not need to be visually "ready"; it only needs metadata tags.

## Sequence Diagram (Dynamic Crawl)

```text
crawlDynamic(targetUrl)
  |
  |  browser = await launchBrowser()   <-- expensive per request
  |  context = await browser.newContext(...)
  |  page = await context.newPage()
  |  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 })
  |  try await page.waitForLoadState('networkidle', { timeout: 5000 })  <-- up to +5s
  |  html = await page.content()
  |  finalUrl = page.url()
  |  await context.close()
  |  data = extractOgData(html, finalUrl)
  |  await browser.close()
  v
return data
```
