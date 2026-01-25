# 아키텍처 개요

이 서비스는 주어진 URL의 Open Graph 메타데이터를 수집해 반환하는 Express 서버입니다.
Vercel 배포를 전제로 구성되어 있습니다.

## 구성 요소

- HTTP 레이어: Express app + routes + controller
- 크롤링 오케스트레이션: `static`, `dynamic`, `auto` 전략 선택
- Static 크롤링: `fetch()` + HTML 파싱(Cheerio)
- Dynamic 크롤링: Playwright + Chromium(서버리스 환경 대응)
- Extractor: HTML에서 OG/Twitter/기본 메타 정보를 추출

## Vercel 어댑터

`vercel.json`에서 `/api/*` 요청을 `api/index.js`로 rewrite 합니다.

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

`api/index.js`는 Express app을 그대로 export 합니다.

```js
import app from '../src/app.js';

// Vercel entry: Express app export
export default app;
```

## 로컬 실행 엔트리

로컬에서는 `src/server.js`가 listen을 담당합니다.

```js
import 'dotenv/config';
import app from './app.js';

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`OG crawler server listening on http://localhost:${port}`);
});
```

## 시퀀스 다이어그램(High-Level)

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
