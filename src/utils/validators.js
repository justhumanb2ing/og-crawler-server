import { badRequest } from './errors.js';

export const parseTargetUrl = (value) => {
  if (!value || typeof value !== 'string') {
    throw badRequest('Missing url parameter');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(value);
  } catch {
    throw badRequest('Invalid url parameter');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw badRequest('Only http and https urls are allowed');
  }

  return parsedUrl.toString();
};

export const parseCrawlMode = (value) => {
  if (!value) {
    return 'auto';
  }

  const mode = String(value).toLowerCase();
  const allowed = new Set(['auto', 'static', 'dynamic']);

  if (!allowed.has(mode)) {
    throw badRequest('Invalid mode parameter');
  }

  return mode;
};
