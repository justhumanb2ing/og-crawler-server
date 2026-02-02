# Dynamic Crawler (Playwright)

Dynamic 크롤링은 JS 기반/동적 렌더링 사이트 대응을 위해 Playwright + Chromium을 사용합니다.

핵심 흐름(`src/services/dynamicCrawler.js` 요약):

```js
const browser = await acquireBrowser(); // reuse 가능
const context = await browser.newContext(...);
const page = await context.newPage();

await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForLoadState('networkidle', { timeout: 1500 }); // optional

const html = await page.content();
return extractOgData(html, page.url());
```

현재 문제(지연 원인):

- 요청마다 브라우저 런치가 발생하면 비용이 큽니다.
- `networkidle` 대기가 길면 tail latency가 늘어납니다.
- OG API는 “화면이 다 로드”될 필요가 없고, 메타태그만 있으면 되는데 그 이상을 기다립니다.

## 시퀀스 다이어그램(Dynamic Crawl)

```text
crawlDynamic
  |
  |  acquireBrowser (reuse/launch)
  |  page.goto (domcontentloaded)
  |  waitForLoadState(networkidle) optional
  |  page.content()
  v
extractOgData -> return

## 런치/대기 정책 (환경 변수)

- `DYNAMIC_BROWSER_REUSE`: 브라우저 재사용 여부 (기본값: 서버리스=false, 그 외=true)
- `DYNAMIC_BROWSER_TTL_MS`: 재사용 브라우저 TTL (기본값: 120000)
- `DYNAMIC_BROWSER_MAX_USES`: 브라우저 최대 사용 횟수 (기본값: 50)
- `DYNAMIC_NETWORKIDLE_TIMEOUT_MS`: networkidle 대기 ms (0이면 대기 생략, 기본값: 1500, 서버리스 기본=0)
- `DYNAMIC_BLOCK_RESOURCE_TYPES`: 차단할 리소스 타입 (예: `image,media,font,stylesheet`)
```
