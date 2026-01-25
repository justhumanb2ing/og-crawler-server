# OG Crawler Server - 현재 플로우 및 병목 (개선 전)

이 `docs/ko/` 폴더는 본 프로젝트의 **개선 전(as-is)** 상태를 기준으로,
요청이 들어와서 OG 파싱 결과가 응답되기까지의 흐름과 병목 지점을 문서로 남깁니다.

목표는 “면접에서 설명 가능한 수준”으로 구조/흐름/지연 원인을 명확히 하는 것입니다.

## 문서 목록

- `docs/ko/01-architecture-overview.md`
- `docs/ko/02-request-lifecycle.md`
- `docs/ko/03-auto-mode-fallback.md`
- `docs/ko/04-static-crawler.md`
- `docs/ko/05-dynamic-crawler.md`
- `docs/ko/06-og-extractor.md`
- `docs/ko/07-bottlenecks-and-latency-drivers.md`
- `docs/ko/08-observability-and-gaps.md`
- `docs/ko/09-structure-limitations-and-improvements.md`
- `docs/ko/10-improvement-roadmap.md`
- `docs/ko/11-improvement-todos.md`

## 작성 원칙

- 소스 코드 변경 없이, 문서 내에 **주석이 달린 코드 스니펫(annotated snippet)** 형태로만 포함합니다.
- 다이어그램은 렌더링 의존성을 줄이기 위해 ASCII로 작성합니다.
