# 구조 한계 및 개선점 요약

본 문서는 `docs/ko/` 내 기존 문서 내용을 기반으로,
현재 구조의 한계와 개선 포인트를 간단히 정리합니다.

## 현재 구조 한계

1) Auto 모드 순차 실행
- static이 느리면 dynamic이 뒤로 밀려 전체 응답이 지연됩니다.

2) Static 전체 HTML 다운로드
- `response.text()`로 전체를 내려받아 큰 페이지에서 비용이 큽니다.

3) Dynamic 브라우저 재실행
- 요청마다 Chromium을 새로 띄워 런치 비용이 큽니다.

4) `networkidle` 대기
- 불필요한 대기가 최대 5초까지 추가될 수 있습니다.

5) 캐시 부재
- 동일 URL도 매번 동일 작업을 반복합니다.

6) 관측 지표 부족
- `durationMs`만 있어 병목 원인 분해가 어렵습니다.

## 개선 포인트

1) Auto 전략 개선
- static/dynamic을 병렬 또는 레이스로 구성해 대기 시간을 줄입니다.

2) Static 최소 다운로드
- head-only/early cutoff 파싱으로 다운로드를 최소화합니다.

3) Dynamic 브라우저 재사용
- 브라우저 풀링 또는 웜 인스턴스로 런치 비용을 줄입니다.

4) `networkidle` 정책 조정
- 제거하거나 짧은 타임아웃/명시적 조건으로 대기 시간을 줄입니다.

5) 캐시 도입
- URL 기반 TTL 캐시로 중복 작업을 줄입니다.

6) 단계별 타이밍 측정
- static fetch, browser launch, navigation, extraction 단위를 측정합니다.
