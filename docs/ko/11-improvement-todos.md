# 개선 작업 TODO

본 문서는 성능/비용 중심 로드맵을 실제 작업 항목으로 쪼갠 체크리스트입니다.

## 1단계: 관측 지표 확보

- 단계별 타이머 유틸 추가 (static, dynamic, extract)
- 결과 객체에 `timings` 포함 옵션 추가
- 로그 포맷 표준화 (키 이름, 단위 ms)
- 성공/실패 모두 로그가 남도록 처리
- p50/p95 산출용 로그 샘플링 기준 정의 (예: `TIMING_LOG_SAMPLE_RATE`)

## 2단계: Static 비용 절감

- HTTP 응답 스트리밍 기반 head-only 파싱 도입
- head 파싱 실패 시 full body fallback 구현
- HTML 최대 다운로드 바이트 제한 설정
- head-only 성공/실패 메타 로그 추가
- 최대 바이트/타임아웃 환경 변수 분리
- 성능 비교 샘플링 계획 수립 (p50 기준)

## 3단계: Auto 모드 전략 개선

- 레이스 정책 결정 (지연 임계치 후 dynamic 시작)
- AbortController로 느린 경로 취소 처리
- 지연 임계치 환경 변수 분리 (예: `AUTO_DYNAMIC_DELAY_MS`)
- score threshold 재검토 및 문서화
- p95 개선 확인을 위한 비교 지표 정의

## 4단계: Dynamic 비용 절감

- 브라우저 재사용 정책 수립 (TTL/요청 수 기준, `DYNAMIC_BROWSER_TTL_MS`, `DYNAMIC_BROWSER_MAX_USES`)
- 풀링 불가 환경 fallback 경로 확정 (`DYNAMIC_BROWSER_REUSE`)
- `networkidle` 제거/축소 정책 결정 (`DYNAMIC_NETWORKIDLE_TIMEOUT_MS`)
- 브라우저 런치 수 측정 지표 추가 (`dynamic_launch_reused`)

## 5단계: 캐시 도입

- 캐시 키 정규화 규칙 정의 (redirect, utm 등)
- TTL/최대 크기 정책 수립 (`CACHE_TTL_MS`, `CACHE_MAX_SIZE`)
- 캐시 on/off 정책 (`CACHE_ENABLED`)
- 캐시 히트/미스 지표 기록 (`cache_hit`)
- 히트율 30% 목표 검증 계획 수립
