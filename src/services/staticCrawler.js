import { fetchHeadHtml, fetchHtml } from '../utils/http.js';
import { extractOgData } from './ogExtractor.js';

export const crawlStatic = async (targetUrl, options = {}) => {
  const timings = {};
  const startedAt = Date.now();
  const timeoutMs = Number(process.env.STATIC_TIMEOUT_MS) || 8000;
  const headMaxBytes = Number(process.env.STATIC_HEAD_MAX_BYTES) || 128 * 1024;
  const signal = options.signal;

  try {
    const fetchStartedAt = Date.now();
    const headResult = await fetchHeadHtml(targetUrl, {
      timeoutMs,
      maxBytes: headMaxBytes,
      signal
    });
    let html = headResult.html;
    let finalUrl = headResult.finalUrl;
    let headFallback = false;

    if (!headResult.headComplete) {
      headFallback = true;
      const fallbackResult = await fetchHtml(targetUrl, { timeoutMs, signal });
      html = fallbackResult.html;
      finalUrl = fallbackResult.finalUrl || finalUrl;
    }

    timings.fetchMs = Date.now() - fetchStartedAt;
    timings.meta = {
      head_only: true,
      head_complete: headResult.headComplete,
      head_bytes: headResult.bytesRead,
      head_truncated: headResult.truncated,
      head_fallback: headFallback
    };

    const extractStartedAt = Date.now();
    const data = extractOgData(html, finalUrl || targetUrl);
    timings.extractMs = Date.now() - extractStartedAt;
    timings.totalMs = Date.now() - startedAt;

    return { data, timings };
  } catch (error) {
    timings.totalMs = Date.now() - startedAt;
    error.timings = timings;
    throw error;
  }
};
