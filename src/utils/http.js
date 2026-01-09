import { HttpError } from './errors.js';

const DEFAULT_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (compatible; OgCrawler/1.0; +https://vercel.app)'
};

export const fetchHtml = async (targetUrl, options = {}) => {
  const timeoutMs = options.timeoutMs ?? 8000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(targetUrl, {
      headers: {
        ...DEFAULT_HEADERS,
        ...options.headers
      },
      redirect: 'follow',
      signal: controller.signal
    });

    if (!response.ok) {
      throw new HttpError(
        response.status,
        `Request failed with status ${response.status}`
      );
    }

    const html = await response.text();

    return {
      html,
      finalUrl: response.url || targetUrl,
      contentType: response.headers.get('content-type')
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new HttpError(504, 'Static crawl timed out');
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};
