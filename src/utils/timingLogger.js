const DEFAULT_SAMPLE_RATE = 1;

const getSampleRate = () => {
  const rawRate = process.env.TIMING_LOG_SAMPLE_RATE;
  if (!rawRate) {
    return DEFAULT_SAMPLE_RATE;
  }

  const rate = Number(rawRate);
  if (Number.isNaN(rate)) {
    return DEFAULT_SAMPLE_RATE;
  }

  return Math.min(Math.max(rate, 0), 1);
};

const appendTiming = (payload, prefix, timings) => {
  if (!timings) {
    return;
  }

  if (timings.fetchMs !== undefined) {
    payload[`${prefix}_fetch_ms`] = timings.fetchMs;
  }
  if (timings.launchMs !== undefined) {
    payload[`${prefix}_launch_ms`] = timings.launchMs;
  }
  if (timings.navigationMs !== undefined) {
    payload[`${prefix}_navigation_ms`] = timings.navigationMs;
  }
  if (timings.extractMs !== undefined) {
    payload[`${prefix}_extract_ms`] = timings.extractMs;
  }
  if (timings.totalMs !== undefined) {
    payload[`${prefix}_total_ms`] = timings.totalMs;
  }
};

export const logTimingSample = ({
  url,
  mode,
  fallback,
  durationMs,
  timings,
  status,
  error,
  cache
}) => {
  const sampleRate = getSampleRate();
  if (sampleRate <= 0) {
    return;
  }

  if (sampleRate < 1 && Math.random() >= sampleRate) {
    return;
  }

  const payload = {
    event: 'crawl_timing',
    url,
    mode,
    fallback,
    duration_ms: durationMs
  };

  appendTiming(payload, 'static', timings?.static);
  appendTiming(payload, 'dynamic', timings?.dynamic);

  if (timings?.static?.meta) {
    payload.static_head_only = timings.static.meta.head_only;
    payload.static_head_complete = timings.static.meta.head_complete;
    payload.static_head_bytes = timings.static.meta.head_bytes;
    payload.static_head_truncated = timings.static.meta.head_truncated;
    payload.static_head_fallback = timings.static.meta.head_fallback;
  }

  if (timings?.dynamic?.meta) {
    payload.dynamic_launch_reused = timings.dynamic.meta.launch_reused;
    payload.dynamic_browser_age_ms = timings.dynamic.meta.browser_age_ms;
  }

  if (status) {
    payload.status = status;
  }

  if (error) {
    payload.error = error;
  }

  if (cache) {
    payload.cache_hit = cache.hit;
    if (cache.ageMs !== undefined) {
      payload.cache_age_ms = cache.ageMs;
    }
    if (cache.ttlMs !== undefined) {
      payload.cache_ttl_ms = cache.ttlMs;
    }
  }

  console.info(JSON.stringify(payload));
};
