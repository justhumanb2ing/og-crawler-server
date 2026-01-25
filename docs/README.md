# OG Crawler Server - Current Flow & Bottlenecks (Pre-Optimization)

This `docs/` folder documents the current request flow and performance bottlenecks of this project **as-is** (before any optimization work).

The goal is to make the system easy to explain in interviews: where requests enter, how the crawler chooses static vs dynamic strategies, and why latency can be high.

## Contents

- `docs/01-architecture-overview.md`
- `docs/02-request-lifecycle.md`
- `docs/03-auto-mode-fallback.md`
- `docs/04-static-crawler.md`
- `docs/05-dynamic-crawler.md`
- `docs/06-og-extractor.md`
- `docs/07-bottlenecks-and-latency-drivers.md`
- `docs/08-observability-and-gaps.md`

## Korean Version

- `docs/ko/README.md`
- `docs/ko/01-architecture-overview.md`
- `docs/ko/02-request-lifecycle.md`
- `docs/ko/03-auto-mode-fallback.md`
- `docs/ko/04-static-crawler.md`
- `docs/ko/05-dynamic-crawler.md`
- `docs/ko/06-og-extractor.md`
- `docs/ko/07-bottlenecks-and-latency-drivers.md`
- `docs/ko/08-observability-and-gaps.md`

## Notes

- This documentation uses **annotated code snippets** only.
- No changes were made to production code to keep the implementation pristine.
