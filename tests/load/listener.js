import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';

const journeyFailures = new Rate('journey_failures');
const target = __ENV.STAGING_URL;
const playback = __ENV.STAGING_PLAYBACK_URL;
const stream = __ENV.STAGING_STREAM_URL;
if (__ENV.ALLOW_STAGING_LOAD !== 'true' || !target || !playback || !stream) {
  throw new Error('Explicit staging opt-in and all three staging URLs are required.');
}
for (const url of [target, playback, stream]) {
  if (!/^https:\/\//.test(url)) throw new Error('Use HTTPS staging URLs.');
}

export const options = {
  scenarios: {
    listener: { executor: 'ramping-vus', startVUs: 0, stages: [
      { duration: '30s', target: 5 },
      { duration: '2m', target: 5 },
      { duration: '30s', target: 0 },
    ], gracefulRampDown: '10s' },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
    journey_failures: ['rate<0.01'],
    'http_req_duration{step:home}': ['p(95)<1500'],
    'http_req_duration{step:playback}': ['p(95)<1500'],
    'http_req_duration{step:stream}': ['p(95)<2000'],
  },
};

export default function () {
  let healthy = true;
  group('listener: home to playback to stream', () => {
    for (const [step, url] of [['home', target], ['playback', playback], ['stream', stream]]) {
      const response = http.get(url, {
        tags: { step, name: step }, timeout: '10s', redirects: 5,
        headers: step === 'stream' ? { Range: 'bytes=0-1023' } : {},
        responseType: 'text',
      });
      const passed = check(response, {
        [`${step}: successful response`]: (r) => r.status >= 200 && r.status < 300,
        [`${step}: nonempty expected content`]: (r) => Boolean(r.body?.length) &&
          (step !== 'stream' || /audio\/|video\/|application\/(vnd.apple.mpegurl|x-mpegurl|octet-stream)/i.test(String(r.headers['Content-Type']))),
      });
      healthy = healthy && passed;
      sleep(1);
    }
  });
  journeyFailures.add(!healthy);
  sleep(2);
}

export function handleSummary(data) {
  return { 'load-summary.json': JSON.stringify(data, null, 2) };
}
