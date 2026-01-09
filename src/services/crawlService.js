import { crawlStatic } from './staticCrawler.js';
import { crawlDynamic } from './dynamicCrawler.js';

const scoreOgData = (data) => {
  const scoreKeys = ['title', 'description', 'image'];
  return scoreKeys.reduce((score, key) => (data?.[key] ? score + 1 : score), 0);
};

export const crawlOgData = async ({ url, mode }) => {
  if (mode === 'static') {
    return { data: await crawlStatic(url), modeUsed: 'static', fallback: false };
  }

  if (mode === 'dynamic') {
    return { data: await crawlDynamic(url), modeUsed: 'dynamic', fallback: false };
  }

  let staticResult = null;
  let staticError = null;

  try {
    staticResult = await crawlStatic(url);
    if (scoreOgData(staticResult) >= 2) {
      return { data: staticResult, modeUsed: 'static', fallback: false };
    }
  } catch (error) {
    staticError = error;
  }

  const dynamicResult = await crawlDynamic(url);

  return {
    data: dynamicResult,
    modeUsed: 'dynamic',
    fallback: true,
    staticError
  };
};
