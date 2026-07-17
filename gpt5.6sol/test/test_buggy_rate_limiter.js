'use strict';
const assert = require('assert');

function flawedOptions(options, defaults) {
  return { maxRequests: options.maxRequests || defaults.maxRequests };
}

function consume(bucket, tokensRequested = 1, now = Date.now()) {
  const elapsed = now - bucket.lastRefill;
  const tokensToAdd = Math.floor(elapsed / 1000) * bucket.refillRate;
  bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
  bucket.lastRefill = now;
  if (bucket.tokens >= tokensRequested) {
    bucket.tokens -= tokensRequested;
    return true;
  }
  return false;
}

const defaults = { maxRequests: 100 };
assert.strictEqual(flawedOptions({ maxRequests: 0 }, defaults).maxRequests, 100, 'zero is silently replaced');

const bucket = { tokens: 0, capacity: 10, refillRate: 1, lastRefill: 0 };
consume(bucket, 1, 900);
consume(bucket, 1, 1800);
assert.strictEqual(bucket.tokens, 0, 'frequent checks discard fractional refill time');

const negative = { tokens: 1, capacity: 10, refillRate: 0, lastRefill: 0 };
assert.strictEqual(consume(negative, -5, 0), true);
assert.strictEqual(negative.tokens, 6, 'negative request mints tokens');

function sanitize(input) { return input.replace(/<script>/gi, ''); }
assert.ok(sanitize('<script src=x>alert(1)</script>').includes('script'), 'sanitizer leaves executable markup');

function clientId(headers, remoteAddress) { return headers['x-client-id'] || remoteAddress; }
assert.notStrictEqual(clientId({ 'x-client-id': 'a' }, '10.0.0.1'), clientId({ 'x-client-id': 'b' }, '10.0.0.1'),
  'same remote client can rotate an untrusted identity header');

console.log('rate limiter audit tests passed');
