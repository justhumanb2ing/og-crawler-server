import { crawlStatic } from './staticCrawler.js';
import { crawlDynamic } from './dynamicCrawler.js';
import { HttpError } from '../utils/errors.js';
import { getCacheEntry, setCacheEntry } from '../utils/cache.js';

const scoreOgData = (data) => {
  const scoreKeys = ['title', 'description', 'image'];
  return scoreKeys.reduce((score, key) => (data?.[key] ? score + 1 : score), 0);
};

const isAbortError = (error) => error instanceof HttpError && error.status === 499;

export const crawlOgData = async ({ url, mode }) => {
  const cacheEntry = getCacheEntry(url);
  const cacheMeta = cacheEntry
    ? {
        hit: cacheEntry.hit,
        ttlMs: cacheEntry.ttlMs,
        ageMs: cacheEntry.ageMs
      }
    : null;

  if (cacheEntry?.hit) {
    return {
      data: cacheEntry.value.data,
      timings: null,
      modeUsed: cacheEntry.value.modeUsed || mode,
      fallback: cacheEntry.value.fallback ?? false,
      cache: cacheMeta
    };
  }

  const storeCache = (result) => {
    if (!result?.data) {
      return;
    }

    const cacheUrls = [url, result.data?.url].filter(Boolean);
    setCacheEntry(cacheUrls, {
      data: result.data,
      modeUsed: result.modeUsed,
      fallback: result.fallback
    });
  };

  if (mode === 'static') {
    const staticResult = await crawlStatic(url);
    const result = {
      data: staticResult.data,
      timings: { static: staticResult.timings },
      modeUsed: 'static',
      fallback: false,
      cache: cacheMeta
    };
    storeCache(result);
    return result;
  }

  if (mode === 'dynamic') {
    const dynamicResult = await crawlDynamic(url);
    const result = {
      data: dynamicResult.data,
      timings: { dynamic: dynamicResult.timings },
      modeUsed: 'dynamic',
      fallback: false,
      cache: cacheMeta
    };
    storeCache(result);
    return result;
  }

  const dynamicDelayMs = Number(process.env.AUTO_DYNAMIC_DELAY_MS) || 400;
  const staticController = new AbortController();
  const dynamicController = new AbortController();
  let staticResult = null;
  let staticError = null;
  let staticTimings = null;
  let dynamicPromise = null;
  let dynamicStarted = false;

  const startDynamic = () => {
    if (dynamicStarted) {
      return dynamicPromise;
    }
    dynamicStarted = true;
    dynamicPromise = crawlDynamic(url, { signal: dynamicController.signal });
    return dynamicPromise;
  };

  try {
    const staticPromise = crawlStatic(url, { signal: staticController.signal });
    const delayPromise = new Promise((resolve) =>
      setTimeout(() => resolve('delay'), dynamicDelayMs)
    );

    const first = await Promise.race([
      staticPromise.then((value) => ({ type: 'static', value })),
      delayPromise
    ]);

    if (first !== 'delay') {
      staticResult = first.value;
      staticTimings = staticResult.timings;
      if (scoreOgData(staticResult.data) >= 2) {
        dynamicController.abort();
        dynamicPromise?.catch(() => {});
        const result = {
          data: staticResult.data,
          timings: { static: staticTimings },
          modeUsed: 'static',
          fallback: false,
          cache: cacheMeta
        };
        storeCache(result);
        return result;
      }

      startDynamic();
      const dynamicResult = await dynamicPromise;
      staticController.abort();
      staticPromise.catch(() => {});

      const result = {
        data: dynamicResult.data,
        timings: { static: staticTimings, dynamic: dynamicResult.timings },
        modeUsed: 'dynamic',
        fallback: true,
        cache: cacheMeta
      };
      storeCache(result);
      return result;
    }

    startDynamic();

    const raceResult = await Promise.race([
      staticPromise.then((value) => ({ type: 'static', value })),
      dynamicPromise.then((value) => ({ type: 'dynamic', value }))
    ]);

    if (raceResult.type === 'static') {
      staticResult = raceResult.value;
      staticTimings = staticResult.timings;

      if (scoreOgData(staticResult.data) >= 2) {
        dynamicController.abort();
        dynamicPromise?.catch(() => {});
        const result = {
          data: staticResult.data,
          timings: { static: staticTimings },
          modeUsed: 'static',
          fallback: false,
          cache: cacheMeta
        };
        storeCache(result);
        return result;
      }

      const dynamicResult = await dynamicPromise;
      const result = {
        data: dynamicResult.data,
        timings: { static: staticTimings, dynamic: dynamicResult.timings },
        modeUsed: 'dynamic',
        fallback: true,
        cache: cacheMeta
      };
      storeCache(result);
      return result;
    }

    staticController.abort();
    staticPromise.catch(() => {});
    const result = {
      data: raceResult.value.data,
      timings: { dynamic: raceResult.value.timings },
      modeUsed: 'dynamic',
      fallback: true,
      cache: cacheMeta
    };
    storeCache(result);
    return result;
  } catch (error) {
    staticError = error;
    staticTimings = error.timings || null;
    if (!isAbortError(error)) {
      startDynamic();
    }
  }

  let dynamicResult;
  try {
    dynamicResult = await (dynamicPromise || startDynamic());
  } catch (error) {
    if (!isAbortError(error)) {
      throw error;
    }
  }

  const result = {
    data: dynamicResult?.data,
    timings: {
      static: staticTimings,
      dynamic: dynamicResult?.timings
    },
    modeUsed: 'dynamic',
    fallback: true,
    staticError,
    cache: cacheMeta
  };
  storeCache(result);
  return result;
};
