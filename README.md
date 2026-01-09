# OG Crawler Server

동적 + 정적 크롤링으로 OG 메타데이터를 수집하는 Express 서버입니다. Vercel 배포를 기본으로 설계했습니다.

## Features
- 정적 크롤링 (fetch + cheerio)
- 동적 크롤링 (Playwright + serverless Chromium)
- 자동 폴백 (정적 결과가 빈약하면 동적 크롤링으로 전환)
- OG 데이터: title, description, url, site_name, image, favicon
- CORS 허용: `http://localhost:5173`, `https://untitled-rho.vercel.app`

## API
- `GET /api/health`
- `GET /api/crawl?url=<target>&mode=auto|static|dynamic`

응답 예시:
```json
{
  "ok": true,
  "mode": "dynamic",
  "fallback": true,
  "durationMs": 1234,
  "data": {
    "title": "Example",
    "description": "...",
    "url": "https://example.com",
    "site_name": "example.com",
    "image": "https://example.com/og.png",
    "favicon": "https://example.com/favicon.ico"
  }
}
```

## Local Run
```bash
npm install
npm run dev
```

### Playwright Local 설정
Vercel 환경에서는 `@sparticuz/chromium` 바이너리를 사용합니다. 로컬에서 동적 크롤링을 쓰려면 아래 중 하나를 설정하세요.

1) Playwright Chromium 경로 지정
```bash
export PLAYWRIGHT_CHROMIUM_PATH="/path/to/chrome-or-chromium"
```

2) 로컬에 Playwright 설치 후 브라우저 설치 (선택)
```bash
npm i -D playwright
npx playwright install chromium
```

## Vercel 배포
`vercel.json`이 Express 엔드포인트를 `/api/*`로 리라이트합니다.

