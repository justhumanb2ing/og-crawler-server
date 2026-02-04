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

const parseSizes = (sizes) => {
  if (!sizes) {
    return null;
  }

  const normalized = sizes.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized === 'any') {
    return { any: true, max: Number.POSITIVE_INFINITY };
  }

  let maxSize = 0;
  for (const token of normalized.split(/\s+/)) {
    const match = token.match(/^(\d{1,4})x(\d{1,4})$/);
    if (!match) {
      continue;
    }

    const width = Number(match[1]);
    const height = Number(match[2]);
    const candidate = Math.max(width, height);
    if (Number.isFinite(candidate)) {
      maxSize = Math.max(maxSize, candidate);
    }
  }

  return maxSize ? { any: false, max: maxSize } : null;
};

const inferSizeFromHref = (href) => {
  if (!href) {
    return 0;
  }

  let maxSize = 0;
  const sizePairs = href.matchAll(/(\d{2,4})x(\d{2,4})/gi);
  for (const match of sizePairs) {
    const width = Number(match[1]);
    const height = Number(match[2]);
    const candidate = Math.max(width, height);
    if (Number.isFinite(candidate)) {
      maxSize = Math.max(maxSize, candidate);
    }
  }

  if (maxSize) {
    return maxSize;
  }

  const sizeSingles = href.matchAll(/(\d{2,4})/g);
  for (const match of sizeSingles) {
    const candidate = Number(match[1]);
    if (Number.isFinite(candidate)) {
      maxSize = Math.max(maxSize, candidate);
    }
  }

  return maxSize;
};

const getRelPriority = (relTokens) => {
  if (relTokens.includes('apple-touch-icon')) {
    return 4;
  }
  if (relTokens.includes('apple-touch-icon-precomposed')) {
    return 3;
  }
  if (relTokens.includes('icon')) {
    return 2;
  }
  if (relTokens.includes('shortcut')) {
    return 1;
  }

  return 0;
};

const isIconRel = (relTokens) =>
  relTokens.includes('icon') ||
  relTokens.includes('apple-touch-icon') ||
  relTokens.includes('apple-touch-icon-precomposed') ||
  relTokens.includes('shortcut');

const pickBestIconHref = ($) => {
  const candidates = [];

  $('link[rel]').each((_, element) => {
    const relRaw = ($(element).attr('rel') || '').toLowerCase();
    const relTokens = relRaw.split(/\s+/).filter(Boolean);
    if (!isIconRel(relTokens)) {
      return;
    }

    const href = $(element).attr('href');
    if (!href) {
      return;
    }

    const sizesInfo = parseSizes($(element).attr('sizes'));
    const inferredSize = sizesInfo?.max || inferSizeFromHref(href);
    const type = ($(element).attr('type') || '').toLowerCase();
    const isSvg =
      type === 'image/svg+xml' || href.toLowerCase().endsWith('.svg');

    const sizeScore = sizesInfo?.any
      ? Number.POSITIVE_INFINITY
      : inferredSize;

    candidates.push({
      href: href.trim(),
      sizeScore,
      relPriority: getRelPriority(relTokens),
      isSvg
    });
  });

  if (!candidates.length) {
    return null;
  }

  candidates.sort((a, b) => {
    const svgScoreA = a.isSvg ? Number.POSITIVE_INFINITY : a.sizeScore;
    const svgScoreB = b.isSvg ? Number.POSITIVE_INFINITY : b.sizeScore;

    if (svgScoreA !== svgScoreB) {
      return svgScoreB - svgScoreA;
    }

    if (a.relPriority !== b.relPriority) {
      return b.relPriority - a.relPriority;
    }

    return 0;
  });

  return candidates[0].href;
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

  const faviconHref = pickBestIconHref($);

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
