const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_CACHE_MAX_SIZE = 1000;

const TRACKING_PARAMS = new Set([
  'fbclid',
  'gclid',
  'igshid',
  'mc_cid',
  'mc_eid',
  'ref',
  'ref_src',
  'yclid'
]);

const cacheStore = new Map();

const parseBoolean = (value) => {
  if (value === undefined) {
    return undefined;
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }

  return undefined;
};

const isCacheEnabled = () => {
  const explicit = parseBoolean(process.env.CACHE_ENABLED);
  if (explicit !== undefined) {
    return explicit;
  }

  return true;
};

const getCacheTtlMs = () => {
  const ttlMs = Number(process.env.CACHE_TTL_MS);
  if (Number.isNaN(ttlMs) || ttlMs <= 0) {
    return DEFAULT_CACHE_TTL_MS;
  }

  return ttlMs;
};

const getCacheMaxSize = () => {
  const maxSize = Number(process.env.CACHE_MAX_SIZE);
  if (Number.isNaN(maxSize) || maxSize <= 0) {
    return DEFAULT_CACHE_MAX_SIZE;
  }

  return maxSize;
};

const normalizePathname = (pathname) => {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }

  return pathname;
};

export const normalizeCacheKey = (rawUrl) => {
  if (!rawUrl) {
    return null;
  }

  try {
    const parsed = new URL(rawUrl);
    parsed.hash = '';
    parsed.hostname = parsed.hostname.toLowerCase();

    if (
      (parsed.protocol === 'http:' && parsed.port === '80') ||
      (parsed.protocol === 'https:' && parsed.port === '443')
    ) {
      parsed.port = '';
    }

    const params = new URLSearchParams(parsed.search);
    for (const key of Array.from(params.keys())) {
      if (key.startsWith('utm_') || TRACKING_PARAMS.has(key)) {
        params.delete(key);
      }
    }

    const sortedParams = new URLSearchParams(
      Array.from(params.entries()).sort((a, b) => {
        if (a[0] === b[0]) {
          return a[1].localeCompare(b[1]);
        }
        return a[0].localeCompare(b[0]);
      })
    );

    parsed.search = sortedParams.toString();
    parsed.pathname = normalizePathname(parsed.pathname);

    return parsed.toString();
  } catch {
    return rawUrl;
  }
};

const pruneCache = () => {
  const maxSize = getCacheMaxSize();
  if (cacheStore.size <= maxSize) {
    return;
  }

  while (cacheStore.size > maxSize) {
    const oldestKey = cacheStore.keys().next().value;
    if (!oldestKey) {
      break;
    }
    cacheStore.delete(oldestKey);
  }
};

export const getCacheEntry = (rawUrl) => {
  if (!isCacheEnabled()) {
    return null;
  }

  const key = normalizeCacheKey(rawUrl);
  if (!key) {
    return null;
  }

  const entry = cacheStore.get(key);
  if (!entry) {
    return {
      hit: false,
      key,
      ttlMs: getCacheTtlMs()
    };
  }

  if (entry.expiresAt <= Date.now()) {
    cacheStore.delete(key);
    return {
      hit: false,
      key,
      ttlMs: getCacheTtlMs()
    };
  }

  cacheStore.delete(key);
  cacheStore.set(key, entry);

  return {
    hit: true,
    key,
    ttlMs: entry.ttlMs,
    ageMs: Date.now() - entry.storedAt,
    value: entry.value
  };
};

export const setCacheEntry = (rawUrls, value) => {
  if (!isCacheEnabled()) {
    return null;
  }

  const ttlMs = getCacheTtlMs();
  const storedAt = Date.now();
  const entry = {
    value,
    storedAt,
    ttlMs,
    expiresAt: storedAt + ttlMs
  };

  const keys = new Set();
  for (const rawUrl of rawUrls) {
    const key = normalizeCacheKey(rawUrl);
    if (key) {
      keys.add(key);
    }
  }

  for (const key of keys) {
    cacheStore.set(key, entry);
  }

  pruneCache();
  return { ttlMs };
};
