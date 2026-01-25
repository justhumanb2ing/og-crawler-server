# Auto 모드의 Fallback 로직

`mode=auto`는 “빠른 static 시도 → 지연 시 dynamic 병행 → 결과 점수 기준 선택” 전략입니다.

`src/services/crawlService.js`의 핵심 흐름(annotated):

```js
staticPromise = crawlStatic(url);
delay(dynamicStartMs);

if (static finished before delay) {
  if (score >= 2) return static;
  dynamicResult = await crawlDynamic(url);
  return dynamicResult;
}

startDynamic();
race(staticPromise, dynamicPromise);
if (static wins and score >= 2) {
  abort dynamic;
  return static;
}
abort static;
return dynamic;
```

핵심 포인트:

- `auto`는 **지연 병행(delay race)** 입니다.
- `AUTO_DYNAMIC_DELAY_MS` 이후 dynamic이 시작됩니다.
- 한쪽이 충분한 결과를 내면 다른 경로는 중단됩니다.

## 시퀀스 다이어그램(Auto Fallback)

```text
mode=auto
  |
  |  start crawlStatic(url)
  |  wait AUTO_DYNAMIC_DELAY_MS
  |  start crawlDynamic(url)
  |  race: static vs dynamic
  |  score >= 2 ? abort dynamic : return dynamic
```
