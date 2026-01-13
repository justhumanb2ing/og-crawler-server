# OG Crawler Server

An Express server that collects Open Graph (OG) metadata using both static and dynamic crawling.
Designed primarily for deployment on Vercel.

## Features
- Static crawling (fetch + cheerio)
- Dynamic crawling (Playwright + serverless Chromium)
- Automatic fallback (switches to dynamic crawling if static results are insufficient)
- OG data extraction: `title, description, url, site_name, image, favicon`
- CORS enabled: http://localhost:5173, https://untitled-rho.vercel.app

## API
- GET `/api/health`
- GET `/api/crawl?url=<target>&mode=auto|static|dynamic`

## Response Example
```
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
## Local Development
```
npm install
npm run dev
```

## Playwright Setup (Local)
In the Vercel environment, the server uses the @sparticuz/chromium binary.
To enable dynamic crawling locally, choose one of the following options:

1) Specify a Chromium executable path
`export PLAYWRIGHT_CHROMIUM_PATH="/path/to/chrome-or-chromium"`

2) Install Playwright locally (optional)
```
npm i -D playwright
npx playwright install chromium
```

## Deployment on Vercel
The vercel.json file rewrites Express endpoints to `/api/*`
