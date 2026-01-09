import { chromium as playwrightChromium } from 'playwright-core';
import serverlessChromium from '@sparticuz/chromium';
import { extractOgData } from './ogExtractor.js';
import { HttpError } from '../utils/errors.js';

const DEFAULT_TIMEOUT_MS = 20000;
const isServerless = Boolean(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
);

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

export const crawlDynamic = async (targetUrl) => {
  const browser = await launchBrowser();

  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (compatible; OgCrawler/1.0; +https://vercel.app)'
    });

    const page = await context.newPage();
    page.setDefaultTimeout(DEFAULT_TIMEOUT_MS);

    await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: DEFAULT_TIMEOUT_MS
    });

    try {
      await page.waitForLoadState('networkidle', { timeout: 5000 });
    } catch {
      // Ignore network idle timeout and continue with current DOM.
    }

    const html = await page.content();
    const finalUrl = page.url();

    await context.close();

    return extractOgData(html, finalUrl || targetUrl);
  } catch (error) {
    if (error.name === 'TimeoutError') {
      throw new HttpError(504, 'Dynamic crawl timed out');
    }

    throw error;
  } finally {
    await browser.close();
  }
};
