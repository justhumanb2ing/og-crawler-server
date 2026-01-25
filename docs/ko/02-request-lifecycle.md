# 요청 라이프사이클

클라이언트 요청이 들어와 응답(JSON)이 나가기까지의 흐름입니다.

## 1) Express app wiring

`src/app.js`에서 라우팅과 미들웨어를 연결합니다.

```js
app.use('/api/crawl', crawlRouter);
```

## 2) Route → Controller

`src/routes/crawl.js`에서 `GET /api/crawl`을 controller로 연결합니다.

```js
router.get('/', asyncHandler(crawlController));
```

## 3) Controller: 입력 검증 + 전체 시간 측정

`src/controllers/crawlController.js`는

- query(`url`, `mode`) 검증
- 전체 처리 시간 측정(`durationMs`)
- 서비스 호출 및 응답 포맷팅

```js
const startedAt = Date.now();
const targetUrl = parseTargetUrl(req.query.url);
const mode = parseCrawlMode(req.query.mode);
const result = await crawlOgData({ url: targetUrl, mode });

res.json({
  ok: true,
  mode: result.modeUsed,
  fallback: result.fallback,
  durationMs: Date.now() - startedAt,
  data: result.data
});
```

## 시퀀스 다이어그램(Request Lifecycle)

```text
Client
  |
  |  GET /api/crawl?url=<target>&mode=<auto|static|dynamic>
  v
src/app.js
  |
  v
src/routes/crawl.js
  |
  v
src/controllers/crawlController.js
  |
  |  validate + crawlOgData
  v
src/services/crawlService.js
  |
  v
Crawler + Extractor
  |
  v
JSON response
```

현재 한계:

- `durationMs`는 전체 시간만 제공하며 단계별(Static/Dynamic/Extract) 분해가 없습니다.
