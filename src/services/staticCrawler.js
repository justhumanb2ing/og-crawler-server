import { fetchHtml } from '../utils/http.js';
import { extractOgData } from './ogExtractor.js';

export const crawlStatic = async (targetUrl) => {
  const { html, finalUrl } = await fetchHtml(targetUrl, { timeoutMs: 8000 });
  return extractOgData(html, finalUrl || targetUrl);
};
