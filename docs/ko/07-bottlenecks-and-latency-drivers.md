# 병목 지점 및 지연 원인

"요청당 3초"의 대부분은 파싱이 아니라 **가져오기(fetch / browser render)** 비용에서 발생합니다.

## 1) Auto 모드의 순차 fallback

- static이 끝나야 dynamic이 시작됩니다.
- static이 느린 URL에서는 전체 응답이 느려집니다.

## 2) Static은 전체 HTML 다운로드

- `<head>`만으로 충분한 경우가 많은데도 `response.text()`로 전부 다운로드합니다.

## 3) Dynamic은 브라우저를 매번 띄움

- Chromium launch 비용이 요청마다 발생합니다.

## 4) `networkidle` 대기

- 광고/분석/롱폴링 등으로 네트워크가 idle이 되지 않으면 최대 +5초 대기합니다.

## 5) 캐시 부재

- 동일 URL 재요청에도 매번 동일 작업을 반복합니다.

## 시퀀스 다이어그램(Worst-Case Auto)

```text
mode=auto
  |
  |  await crawlStatic (slow)
  |  score < 2
  v
await crawlDynamic
  |
  |  launch browser
  |  goto
  |  + optional networkidle wait
  v
extract -> response
```
