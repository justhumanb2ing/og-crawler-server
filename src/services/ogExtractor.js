import * as cheerio from 'cheerio';
import { resolveUrl } from '../utils/urls.js';

const pickFirstContent = ($, selectors) => {
  for (const selector of selectors) {
    const value = $(selector).attr('content');
    if (value) {
      return value.trim();
    }
  }

  return null;
};

const pickFirstHref = ($, selectors) => {
  for (const selector of selectors) {
    const value = $(selector).attr('href');
    if (value) {
      return value.trim();
    }
  }

  return null;
};

export const extractOgData = (html, baseUrl) => {
  const $ = cheerio.load(html);
  const resolvedBaseUrl = baseUrl || null;

  const rawTitle =
    pickFirstContent($, [
      'meta[property="og:title"]',
      'meta[name="twitter:title"]'
    ]) || $('title').first().text().trim();

  const rawDescription = pickFirstContent($, [
    'meta[property="og:description"]',
    'meta[name="description"]',
    'meta[name="twitter:description"]'
  ]);

  const rawUrl = pickFirstContent($, ['meta[property="og:url"]']);
  const rawSiteName = pickFirstContent($, ['meta[property="og:site_name"]']);

  const rawImage = pickFirstContent($, [
    'meta[property="og:image"]',
    'meta[property="og:image:secure_url"]',
    'meta[name="twitter:image"]'
  ]);

  const faviconHref = pickFirstHref($, [
    'link[rel="apple-touch-icon"]',
    'link[rel="apple-touch-icon-precomposed"]',
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel~="icon"]'
  ]);

  const finalUrl = rawUrl ? resolveUrl(resolvedBaseUrl, rawUrl) : resolvedBaseUrl;
  const hostname = resolvedBaseUrl ? new URL(resolvedBaseUrl).hostname : null;

  return {
    title: rawTitle || null,
    description: rawDescription || null,
    url: finalUrl || null,
    site_name: rawSiteName || hostname || null,
    image: rawImage ? resolveUrl(resolvedBaseUrl, rawImage) : null,
    favicon: faviconHref
      ? resolveUrl(resolvedBaseUrl, faviconHref)
      : resolvedBaseUrl
        ? new URL('/favicon.ico', resolvedBaseUrl).toString()
        : null
  };
};
