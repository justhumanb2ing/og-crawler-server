# 관측(Observability) 현황 및 공백

현재는 단계별 타이밍과 head-only 메타를 수집할 수 있습니다.

- 응답에 `timings` 옵션을 켜면 단계별 ms가 포함됩니다.
- 로그에는 표준 키(JSON)로 static/dynamic 타이밍이 남습니다.

## 측정 가능한 지표

- `duration_ms`: 전체 응답 시간
- `static_fetch_ms`, `static_extract_ms`, `static_total_ms`
- `dynamic_launch_ms`, `dynamic_navigation_ms`, `dynamic_extract_ms`, `dynamic_total_ms`
- `dynamic_launch_reused`, `dynamic_browser_age_ms`
- `static_head_complete`, `static_head_truncated`, `static_head_fallback`, `static_head_bytes`
- `cache_hit`, `cache_age_ms`, `cache_ttl_ms`

## head-only 성능 비교 가이드

1) 로그 샘플링 비율을 정합니다.
- 예: `TIMING_LOG_SAMPLE_RATE=0.2`

2) head-only 성공/실패를 분리합니다.
- `static_head_complete=true` AND `static_head_fallback=false` → head-only 성공
- `static_head_fallback=true` → full body fallback 발생

3) 두 그룹의 `duration_ms` 또는 `static_total_ms` 평균/분위수 비교합니다.

4) OG 누락률은 별도 샘플링으로 확인합니다.
- head-only 성공 케이스에서 OG 필드 누락률 추적
