import { chromium as playwrightChromium } from 'playwright-core';
import serverlessChromium from '@sparticuz/chromium';
import { extractOgData } from './ogExtractor.js';
import { HttpError } from '../utils/errors.js';

const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_NETWORKIDLE_TIMEOUT_MS = 1500;
const DEFAULT_BROWSER_TTL_MS = 2 * 60 * 1000;
const DEFAULT_BROWSER_MAX_USES = 50;
const isServerless = Boolean(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
);

const browserPool = {
  browser: null,
  createdAt: 0,
  uses: 0,
  inFlight: 0,
  retiring: false,
  launchPromise: null,
  lastLaunchMs: undefined
};

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

const getReuseEnabled = () => {
  const explicit = parseBoolean(process.env.DYNAMIC_BROWSER_REUSE);
  if (explicit !== undefined) {
    return explicit;
  }

  return !isServerless;
};

const getBrowserTtlMs = () => {
  const ttlMs = Number(process.env.DYNAMIC_BROWSER_TTL_MS);
  if (Number.isNaN(ttlMs) || ttlMs <= 0) {
    return DEFAULT_BROWSER_TTL_MS;
  }

  return ttlMs;
};

const getBrowserMaxUses = () => {
  const maxUses = Number(process.env.DYNAMIC_BROWSER_MAX_USES);
  if (Number.isNaN(maxUses) || maxUses <= 0) {
    return DEFAULT_BROWSER_MAX_USES;
  }

  return maxUses;
};

const getNetworkIdleTimeoutMs = () => {
  const timeoutMs = Number(process.env.DYNAMIC_NETWORKIDLE_TIMEOUT_MS);
  if (Number.isNaN(timeoutMs)) {
    return DEFAULT_NETWORKIDLE_TIMEOUT_MS;
  }

  return Math.max(timeoutMs, 0);
};

const getLaunchOptions = async () => {
  const executablePath = isServerless
    ? await serverlessChromium.executablePath()
    : process.env.PLAYWRIGHT_CHROMIUM_PATH;

  return {
    args: isServerless ? serverlessChromium.args : [],
    executablePath: executablePath || undefined,
    headless: isServerless ? serverlessChromium.headless : true
  };
};

const launchBrowser = async () => {
  const options = await getLaunchOptions();

  try {
    return await playwrightChromium.launch(options);
  } catch (error) {
    if (!options.executablePath && !isServerless) {
      throw new HttpError(
        500,
        'Playwright Chromium not found. Set PLAYWRIGHT_CHROMIUM_PATH for local runs.'
      );
    }

    throw error;
  }
};

const shouldRetireBrowser = (nowMs, ttlMs, maxUses) => {
  if (!browserPool.browser) {
    return false;
  }

  if (ttlMs > 0 && nowMs - browserPool.createdAt >= ttlMs) {
    return true;
  }

  if (maxUses > 0 && browserPool.uses >= maxUses) {
    return true;
  }

  return false;
};

const closePooledBrowser = async () => {
  const current = browserPool.browser;
  browserPool.browser = null;
  browserPool.createdAt = 0;
  browserPool.uses = 0;
  browserPool.inFlight = 0;
  browserPool.retiring = false;
  browserPool.lastLaunchMs = undefined;

  if (current) {
    await current.close();
  }
};

const launchNewBrowser = async () => {
  const launchStartedAt = Date.now();
  const browser = await launchBrowser();
  const launchMs = Date.now() - launchStartedAt;
  return { browser, launchMs };
};

const ensurePooledBrowser = async () => {
  if (!browserPool.launchPromise) {
    browserPool.launchPromise = launchNewBrowser()
      .then(({ browser, launchMs }) => {
        browserPool.browser = browser;
        browserPool.createdAt = Date.now();
        browserPool.uses = 0;
        browserPool.retiring = false;
        browserPool.lastLaunchMs = launchMs;
        return browser;
      })
      .catch((error) => {
        browserPool.lastLaunchMs = undefined;
        throw error;
      })
      .finally(() => {
        browserPool.launchPromise = null;
      });
  }

  return browserPool.launchPromise;
};

const acquireBrowser = async () => {
  if (!getReuseEnabled()) {
    const { browser, launchMs } = await launchNewBrowser();
    return {
      browser,
      reused: false,
      launchMs,
      browserAgeMs: 0,
      release: async () => {
        await browser.close();
      }
    };
  }

  const nowMs = Date.now();
  const ttlMs = getBrowserTtlMs();
  const maxUses = getBrowserMaxUses();

  if (shouldRetireBrowser(nowMs, ttlMs, maxUses)) {
    if (browserPool.inFlight === 0) {
      await closePooledBrowser();
    } else {
      browserPool.retiring = true;
    }
  }

  if (!browserPool.browser) {
    await ensurePooledBrowser();
  }

  const reused = browserPool.uses > 0;
  const browserAgeMs = browserPool.createdAt
    ? Date.now() - browserPool.createdAt
    : 0;
  const launchMs = reused ? undefined : browserPool.lastLaunchMs;

  browserPool.inFlight += 1;
  browserPool.uses += 1;

  const release = async () => {
    browserPool.inFlight = Math.max(browserPool.inFlight - 1, 0);
    if (browserPool.retiring && browserPool.inFlight === 0) {
      await closePooledBrowser();
    }
  };

  return {
    browser: browserPool.browser,
    reused,
    launchMs,
    browserAgeMs,
    release
  };
};

export const crawlDynamic = async (targetUrl, options = {}) => {
  const timings = {};
  const startedAt = Date.now();
  let browser;
  let context;
  let page;
  let release;
  const signal = options.signal;
  let aborted = false;

  if (signal?.aborted) {
    throw new HttpError(499, 'Dynamic crawl aborted');
  }

  const onAbort = () => {
    aborted = true;
    if (page) {
      page.close().catch(() => {});
    }
    if (context) {
      context.close().catch(() => {});
    }
  };
  signal?.addEventListener?.('abort', onAbort, { once: true });

  try {
    const acquired = await acquireBrowser();
    browser = acquired.browser;
    release = acquired.release;
    timings.meta = {
      launch_reused: acquired.reused,
      browser_age_ms: acquired.browserAgeMs
    };
    if (acquired.launchMs !== undefined) {
      timings.launchMs = acquired.launchMs;
    }

    if (aborted) {
      throw new HttpError(499, 'Dynamic crawl aborted');
    }

    context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (compatible; OgCrawler/1.0; +https://vercel.app)'
    });

    page = await context.newPage();
    page.setDefaultTimeout(DEFAULT_TIMEOUT_MS);

    const navigationStartedAt = Date.now();
    await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: DEFAULT_TIMEOUT_MS
    });

    const networkIdleTimeoutMs = getNetworkIdleTimeoutMs();
    if (networkIdleTimeoutMs > 0) {
      try {
        await page.waitForLoadState('networkidle', {
          timeout: networkIdleTimeoutMs
        });
      } catch {
        // Ignore network idle timeout and continue with current DOM.
      }
    }
    timings.navigationMs = Date.now() - navigationStartedAt;

    const extractStartedAt = Date.now();
    if (aborted) {
      throw new HttpError(499, 'Dynamic crawl aborted');
    }

    const html = await page.content();
    const finalUrl = page.url();
    const data = extractOgData(html, finalUrl || targetUrl);
    timings.extractMs = Date.now() - extractStartedAt;

    await context.close();
    context = null;
    timings.totalMs = Date.now() - startedAt;

    return { data, timings };
  } catch (error) {
    timings.totalMs = Date.now() - startedAt;

    if (error.name === 'TimeoutError') {
      const timeoutError = new HttpError(504, 'Dynamic crawl timed out');
      timeoutError.timings = timings;
      throw timeoutError;
    }

    error.timings = timings;
    throw error;
  } finally {
    signal?.removeEventListener?.('abort', onAbort);
    if (context) {
      await context.close().catch(() => {});
    }
    if (release) {
      await release();
    }
  }
};
