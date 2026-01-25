import { HttpError } from './errors.js';

const DEFAULT_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (compatible; OgCrawler/1.0; +https://vercel.app)'
};
const DEFAULT_HEAD_MAX_BYTES = 128 * 1024;

const readStreamUntil = async (response, { maxBytes, stopToken }) => {
  if (!response.body || !response.body.getReader) {
    let html = await response.text();
    let tokenFound = false;

    if (stopToken) {
      const lowerHtml = html.toLowerCase();
      const tokenIndex = lowerHtml.indexOf(stopToken);
      if (tokenIndex >= 0) {
        html = html.slice(0, tokenIndex + stopToken.length);
        tokenFound = true;
      }
    }

    return {
      html,
      bytesRead: html.length,
      completed: true,
      truncated: false,
      tokenFound
    };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let html = '';
  let bytesRead = 0;
  let completed = false;
  let tokenFound = false;
  let truncated = false;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        completed = true;
        break;
      }

      if (value) {
        const remaining = maxBytes - bytesRead;
        if (remaining <= 0) {
          truncated = true;
          break;
        }

        const chunk =
          value.byteLength > remaining ? value.subarray(0, remaining) : value;
        bytesRead += chunk.byteLength;
        html += decoder.decode(chunk, { stream: true });

        if (stopToken && html.toLowerCase().includes(stopToken)) {
          const lowerHtml = html.toLowerCase();
          const tokenIndex = lowerHtml.indexOf(stopToken);
          html = html.slice(0, tokenIndex + stopToken.length);
          completed = true;
          tokenFound = true;
          break;
        }

        if (value.byteLength > remaining) {
          truncated = true;
          break;
        }
      }
    }
  } finally {
    await reader.cancel();
  }

  return { html, bytesRead, completed, truncated, tokenFound };
};

export const fetchHtml = async (targetUrl, options = {}) => {
  const timeoutMs = options.timeoutMs ?? 8000;
  const controller = new AbortController();
  const externalSignal = options.signal;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const abortHandler = () => controller.abort();

  try {
    if (externalSignal?.aborted) {
      throw new HttpError(499, 'Static crawl aborted');
    }

    externalSignal?.addEventListener?.('abort', abortHandler, { once: true });

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
      if (externalSignal?.aborted) {
        throw new HttpError(499, 'Static crawl aborted');
      }

      throw new HttpError(504, 'Static crawl timed out');
    }

    throw error;
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener?.('abort', abortHandler);
  }
};

export const fetchHeadHtml = async (targetUrl, options = {}) => {
  const timeoutMs = options.timeoutMs ?? 8000;
  const maxBytes = options.maxBytes ?? DEFAULT_HEAD_MAX_BYTES;
  const controller = new AbortController();
  const externalSignal = options.signal;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const abortHandler = () => controller.abort();

  try {
    if (externalSignal?.aborted) {
      throw new HttpError(499, 'Static crawl aborted');
    }

    externalSignal?.addEventListener?.('abort', abortHandler, { once: true });

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

    const { html, tokenFound, bytesRead, truncated } = await readStreamUntil(
      response,
      {
      maxBytes,
      stopToken: '</head>'
      }
    );

    return {
      html,
      finalUrl: response.url || targetUrl,
      contentType: response.headers.get('content-type'),
      headComplete: tokenFound,
      bytesRead,
      truncated
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      if (externalSignal?.aborted) {
        throw new HttpError(499, 'Static crawl aborted');
      }

      throw new HttpError(504, 'Static crawl timed out');
    }

    throw error;
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener?.('abort', abortHandler);
  }
};
