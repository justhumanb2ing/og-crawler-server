# OG Extractor (Cheerio)

The extractor parses HTML and pulls Open Graph (and fallback) metadata.

## Core behavior

From `src/services/ogExtractor.js`:

```js
import * as cheerio from 'cheerio';
import { resolveUrl } from '../utils/urls.js';

export const extractOgData = (html, baseUrl) => {
  const $ = cheerio.load(html);
  const resolvedBaseUrl = baseUrl || null;

  const rawTitle =
    pickFirstContent($, [
      'meta[property="og:title"]',
      'meta[name="twitter:title"]'
    ]) || $('title').first().text().trim();

  const rawDescription = pickFirstContent($, [
    'meta[property="og:description"]',
    'meta[name="description"]',
    'meta[name="twitter:description"]'
  ]);

  const rawUrl = pickFirstContent($, ['meta[property="og:url"]']);
  const rawSiteName = pickFirstContent($, ['meta[property="og:site_name"]']);

  const rawImage = pickFirstContent($, [
    'meta[property="og:image"]',
    'meta[property="og:image:secure_url"]',
    'meta[name="twitter:image"]'
  ]);

  const faviconHref = pickFirstHref($, [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]',
    'link[rel="apple-touch-icon-precomposed"]',
    'link[rel~="icon"]'
  ]);

  const finalUrl = rawUrl ? resolveUrl(resolvedBaseUrl, rawUrl) : resolvedBaseUrl;
  const hostname = resolvedBaseUrl ? new URL(resolvedBaseUrl).hostname : null;

  return {
    title: rawTitle || null,
    description: rawDescription || null,
    url: finalUrl || null,
    site_name: rawSiteName || hostname || null,
    image: rawImage ? resolveUrl(resolvedBaseUrl, rawImage) : null,
    favicon: faviconHref
      ? resolveUrl(resolvedBaseUrl, faviconHref)
      : resolvedBaseUrl
        ? new URL('/favicon.ico', resolvedBaseUrl).toString()
        : null
  };
};
```

Notes:

- The extractor itself is typically not the latency bottleneck.
  - Parsing a single HTML document and selecting a few tags is usually cheap compared to fetching or browser rendering.
- It does provide sensible fallbacks:
  - `twitter:*` tags
  - `<title>`
  - default favicon at `/favicon.ico`

Potential correctness risks (not necessarily performance):

- Some websites use dynamic OG injection or non-standard tags.
- Some sites block or serve different HTML based on user-agent.

## Sequence Diagram (Extraction)

```text
extractOgData(html, baseUrl)
  |
  |  $ = cheerio.load(html)
  |  pickFirstContent for og:title / twitter:title / <title>
  |  pickFirstContent for og:description / description / twitter:description
  |  pickFirstContent for og:image / og:image:secure_url / twitter:image
  |  pickFirstHref for various favicon rel values
  |  resolveUrl(baseUrl, relativeCandidate)
  v
return normalized OG payload
```
