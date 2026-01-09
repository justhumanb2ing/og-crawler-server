import { parseCrawlMode, parseTargetUrl } from '../utils/validators.js';
import { crawlOgData } from '../services/crawlService.js';

export const crawlController = async (req, res) => {
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
};
