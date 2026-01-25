import {
  parseCrawlMode,
  parseIncludeTimings,
  parseTargetUrl
} from '../utils/validators.js';
import { crawlOgData } from '../services/crawlService.js';
import { logTimingSample } from '../utils/timingLogger.js';

export const crawlController = async (req, res) => {
  const startedAt = Date.now();
  const targetUrl = parseTargetUrl(req.query.url);
  const mode = parseCrawlMode(req.query.mode);
  const includeTimings = parseIncludeTimings(req.query.timings);

  let result;
  try {
    result = await crawlOgData({ url: targetUrl, mode });
  } catch (error) {
    const durationMs = Date.now() - startedAt;

    let timingPayload = error.timings;

    if (
      timingPayload &&
      !timingPayload.static &&
      !timingPayload.dynamic
    ) {
      timingPayload =
        mode === 'static'
          ? { static: timingPayload }
          : { dynamic: timingPayload };
    }

    if (timingPayload?.meta) {
      timingPayload = { static: timingPayload };
    }

    if (timingPayload) {
      logTimingSample({
        url: targetUrl,
        mode,
        fallback: false,
        durationMs,
        timings: timingPayload,
        status: 'error',
        error: error.message
      });
    }

    throw error;
  }

  const durationMs = Date.now() - startedAt;

  if (result.timings || result.cache) {
    logTimingSample({
      url: targetUrl,
      mode: result.modeUsed,
      fallback: result.fallback,
      durationMs,
      timings: result.timings,
      status: 'ok',
      cache: result.cache
    });
  }

  const response = {
    ok: true,
    mode: result.modeUsed,
    fallback: result.fallback,
    durationMs,
    data: result.data
  };

  if (includeTimings && result.timings) {
    response.timings = result.timings;
    if (result.timings.static?.meta) {
      response.meta = { static: result.timings.static.meta };
    }
  }

  if (includeTimings && result.cache) {
    response.cache = result.cache;
  }

  res.json(response);
};
