# Static Crawler

Static 크롤링은 가장 빠른 경로를 목표로 합니다.

`src/services/staticCrawler.js`:

```js
const { html, finalUrl } = await fetchHtml(targetUrl, { timeoutMs: 8000 });
return extractOgData(html, finalUrl || targetUrl);
```

`src/utils/http.js`에서 실제 네트워크 요청을 수행합니다.

```js
const response = await fetch(targetUrl, { redirect: 'follow', signal });
const html = await response.text();
```

현재 문제(지연 원인):

- `response.text()`는 **HTML 전체를 끝까지 다운로드**합니다.
- OG 메타데이터는 보통 `<head>`에 있으므로, 큰 페이지에서는 과한 작업이 됩니다.
- 캐시가 없어 같은 URL 재요청에도 매번 네트워크 비용을 냅니다.

## 시퀀스 다이어그램(Static Crawl)

```text
crawlStatic
  |
  v
fetchHtml (timeout=8000ms)
  |
  |  await response.text()  <-- full body
  v
extractOgData
  |
  v
return data
```
