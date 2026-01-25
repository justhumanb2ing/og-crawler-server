# Observability & Gaps (Pre-Optimization)

The system returns a single `durationMs` value to the client, but it does not expose internal stage timings.

From `src/controllers/crawlController.js`:

```js
const startedAt = Date.now();
const result = await crawlOgData({ url: targetUrl, mode });

res.json({
  durationMs: Date.now() - startedAt,
  data: result.data
});
```

What is missing for performance work:

- Stage timings:
  - static fetch duration
  - extraction duration
  - dynamic browser launch duration
  - dynamic navigation duration
  - DOM serialization duration
- Outcome counters:
  - how often `auto` falls back to dynamic
  - most common error types (timeouts vs 4xx/5xx)

Why it matters:

- Without stage timings, it is hard to prove which change improved performance.
- Without fallback frequency, it's hard to evaluate whether the static heuristic is too strict.

Current debugging approach (implied):

- Users can infer only the total wall-clock time.
- Operators must add temporary logging or reproduce issues locally to see where time is spent.

## Sequence Diagram (What We Can Measure Today)

```text
startedAt = Date.now()
result = await crawlOgData(...)
durationMs = Date.now() - startedAt

We only know:
- total durationMs

We do NOT know:
- static fetch duration
- dynamic browser launch duration
- navigation duration
- extraction duration
```
