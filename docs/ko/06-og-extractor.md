# OG Extractor

Extractor는 HTML에서 OG/Twitter/기본 메타 정보를 Cheerio로 파싱합니다.

주요 동작(`src/services/ogExtractor.js`):

- `og:title`, `twitter:title`, `<title>` 순으로 title 결정
- `og:description`, `description`, `twitter:description` 순으로 description 결정
- `og:image` 계열 및 twitter image 처리
- favicon link rel 탐색 후 없으면 `/favicon.ico` fallback

## 시퀀스 다이어그램(Extraction)

```text
cheerio.load(html)
  |
  |  pickFirstContent(og:title, twitter:title, title)
  |  pickFirstContent(og:description, description, twitter:description)
  |  pickFirstContent(og:image*, twitter:image)
  |  pickFirstHref(favicon rel variants)
  v
resolveUrl(baseUrl, candidate) -> normalized result
```

참고:

- 여기 자체는 일반적으로 네트워크/브라우저보다 훨씬 저렴해서, 성능 병목일 확률이 낮습니다.
