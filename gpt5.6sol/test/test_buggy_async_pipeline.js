'use strict';
const assert = require('assert');

async function processItem(item, processors, metrics) {
  let result = item;
  for (const processor of processors) {
    try { result = await processor(result); } catch (_) { /* swallowed */ }
  }
  metrics.processed++;
  return result;
}

async function processAll(items, batchSize, processBatch, state) {
  state.isRunning = true;
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) batches.push(items.slice(i, i + batchSize));
  const values = await Promise.all(batches.map(processBatch));
  state.isRunning = false;
  return values.flat();
}

async function run() {
  const metrics = { processed: 0, failed: 0 };
  const output = await processItem(1, [() => { throw new Error('bad'); }, x => x + 1], metrics);
  assert.strictEqual(output, 2, 'pipeline continues after processor failure');
  assert.deepStrictEqual(metrics, { processed: 1, failed: 0 }, 'failure metric is never updated');

  const state = { isRunning: false };
  await assert.rejects(() => processAll([1], 1, async () => { throw new Error('bad'); }, state));
  assert.strictEqual(state.isRunning, true, 'rejection leaves running state stuck');

  let active = 0;
  let peak = 0;
  const batch = async () => {
    active++;
    peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 5));
    active--;
    return [];
  };
  await processAll([1, 2, 3, 4], 1, batch, { isRunning: false });
  assert.strictEqual(peak, 4, 'configured concurrency is not applied');

  const cache = new Map();
  cache.set(JSON.stringify(undefined), 'first');
  cache.set(JSON.stringify(() => {}), 'second');
  assert.strictEqual(cache.size, 1, 'non-JSON inputs collide on undefined cache key');
}

run().then(() => console.log('async pipeline audit tests passed')).catch(err => { console.error(err); process.exitCode = 1; });
