# Auto Mode Fallback Logic

The service supports `mode=auto|static|dynamic`.

In `auto` mode, it tries the static crawler first. If the result looks insufficient, it falls back to the dynamic crawler.

## Validators

From `src/utils/validators.js`:

```js
export const parseCrawlMode = (value) => {
  if (!value) {
    return 'auto';
  }

  const mode = String(value).toLowerCase();
  const allowed = new Set(['auto', 'static', 'dynamic']);

  if (!allowed.has(mode)) {
    throw badRequest('Invalid mode parameter');
  }

  return mode;
};
```

## Strategy selection & fallback

From `src/services/crawlService.js`:

```js
import { crawlStatic } from './staticCrawler.js';
import { crawlDynamic } from './dynamicCrawler.js';

const scoreOgData = (data) => {
  const scoreKeys = ['title', 'description', 'image'];
  return scoreKeys.reduce((score, key) => (data?.[key] ? score + 1 : score), 0);
};

export const crawlOgData = async ({ url, mode }) => {
  if (mode === 'static') {
    return { data: await crawlStatic(url), modeUsed: 'static', fallback: false };
  }

  if (mode === 'dynamic') {
    return { data: await crawlDynamic(url), modeUsed: 'dynamic', fallback: false };
  }

  // auto mode
  let staticResult = null;
  let staticError = null;

  try {
    staticResult = await crawlStatic(url);
    if (scoreOgData(staticResult) >= 2) {
      return { data: staticResult, modeUsed: 'static', fallback: false };
    }
  } catch (error) {
    staticError = error;
  }

  const dynamicResult = await crawlDynamic(url);

  return {
    data: dynamicResult,
    modeUsed: 'dynamic',
    fallback: true,
    staticError
  };
};
```

Key observations (latency-relevant):

- `auto` mode is **sequential**: it waits for `crawlStatic()` to complete before starting `crawlDynamic()`.
- If `crawlStatic()` is slow or times out, the request can only get slower.
- The fallback heuristic is simplistic: it uses only `title`, `description`, `image` and requires score >= 2.
  - This is reasonable for correctness, but can trigger dynamic fallback frequently depending on sites.

Current risk / problem:

- If the "static" path often scores < 2, the service pays the cost of static crawling and still pays the cost of dynamic crawling.

## Sequence Diagram (Auto Fallback)

This diagram emphasizes the current sequential behavior.

```text
Client
  |
  |  mode=auto
  v
crawlOgData({ url, mode: 'auto' })
  |
  |  try
  |  staticResult = await crawlStatic(url)
  |  if score >= 2: return static
  |  catch: remember staticError
  v
dynamicResult = await crawlDynamic(url)
  |
  v
return { modeUsed: 'dynamic', fallback: true, staticError }

Note:
- Because static happens first, slow static paths directly add to end-to-end latency.
```
