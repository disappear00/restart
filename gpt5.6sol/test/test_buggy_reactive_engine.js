'use strict';
const assert = require('assert');

let currentTracker = null;
class Signal {
  constructor(value) { this._value = value; }
  get value() { if (currentTracker) currentTracker.record(this); return this._value; }
  set value(value) { this._value = value; if (currentTracker) currentTracker.notify(this); }
}
class Tracker {
  constructor() { this.sources = new Set(); this.observers = new Map(); }
  record(source) { this.sources.add(source); }
  notify(source) { return this.observers.get(source) || new Set(); }
}
class FlawedEffect {
  constructor(fn) { this.fn = fn; this.observer = null; this.runs = 0; this.run(); }
  run() {
    const previous = currentTracker;
    currentTracker = this.observer;
    this.observer = new Tracker();
    this.runs++;
    this.fn();
    currentTracker = previous;
  }
}

const signal = new Signal(1);
const effect = new FlawedEffect(() => signal.value);
signal.value = 2;
assert.strictEqual(effect.runs, 1, 'effect never subscribes and does not rerun');

const shallow = { items: [] };
const history = [{ ...shallow }];
shallow.items.push('mutated');
assert.deepStrictEqual(history[0].items, ['mutated'], 'shallow snapshot changes retroactively');

let depth = 0;
function commit() { depth--; }
commit();
assert.strictEqual(depth, -1, 'commit without transaction corrupts transaction depth');

const pending = new Map([['a', { oldValue: 1 }]]);
function beginTransaction() { depth++; pending.clear(); }
beginTransaction();
assert.strictEqual(pending.size, 0, 'nested transaction discards outer rollback metadata');

console.log('reactive engine audit tests passed');
