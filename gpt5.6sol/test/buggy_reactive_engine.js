/**
 * 响应式状态引擎
 *
 * 一个基于推送的响应式状态管理系统，支持细粒度依赖追踪、
 * 批量更新调度、计算属性、副作用订阅、时间旅行和调试快照。
 */

'use strict';

const { EventEmitter } = require('events');

// ─── 依赖追踪器 ────────────────────────────────────────────────

class DependencyTracker {
  constructor() {
    this._activeSources = null;
    this._observerToSources = new Map();
    this._sourceToObservers = new Map();
    this._sourceVersions = new Map();
    this._versionCounter = 0;
  }

  track(fn, observer) {
    const prev = this._activeSources;
    this._activeSources = new Set();
    try {
      const result = fn();
      return result;
    } finally {
      if (observer) {
        this._observerToSources.set(observer, this._activeSources);
        for (const source of this._activeSources) {
          if (!this._sourceToObservers.has(source)) {
            this._sourceToObservers.set(source, new Set());
          }
          this._sourceToObservers.get(source).add(observer);
        }
      }
      this._activeSources = prev;
    }
  }

  record(source) {
    if (this._activeSources) {
      this._activeSources.add(source);
    }
  }

  notify(source) {
    this._versionCounter++;
    this._sourceVersions.set(source, this._versionCounter);
    const observers = this._sourceToObservers.get(source);
    if (!observers) return new Set();
    return new Set(observers);
  }

  getLatestVersion(source) {
    return this._sourceVersions.get(source) || 0;
  }

  getObserverSources(observer) {
    return this._observerToSources.get(observer) || new Set();
  }

  disposeObserver(observer) {
    const sources = this._observerToSources.get(observer);
    if (sources) {
      for (const source of sources) {
        const observers = this._sourceToObservers.get(source);
        if (observers) observers.delete(observer);
      }
    }
    this._observerToSources.delete(observer);
  }

  reset() {
    this._observerToSources.clear();
    this._sourceToObservers.clear();
    this._sourceVersions.clear();
    this._versionCounter = 0;
  }
}

// ─── 批量更新调度器 ──────────────────────────────────────────────

class BatchScheduler {
  constructor() {
    this._queue = new Set();
    this._isScheduled = false;
    this._isFlushing = false;
    this._flushDepth = 0;
    this._onFlushCallbacks = [];
    this._afterFlushCallbacks = [];
  }

  schedule(task) {
    this._queue.add(task);
    if (!this._isScheduled && !this._isFlushing) {
      this._isScheduled = true;
      queueMicrotask(() => this.flush());
    }
  }

  scheduleImmediate(task) {
    if (this._isFlushing) {
      this._queue.add(task);
    } else {
      task();
    }
  }

  flush() {
    if (this._queue.size === 0) {
      this._isScheduled = false;
      return;
    }

    this._isFlushing = true;
    this._flushDepth++;

    for (const cb of this._onFlushCallbacks) {
      try { cb(); } catch (e) { /* ignore */ }
    }

    let maxIterations = 1000;
    while (this._queue.size > 0 && maxIterations > 0) {
      const batch = [...this._queue];
      this._queue.clear();
      for (const task of batch) {
        try {
          task();
        } catch (e) {
          // swallow per-task errors to not block others
        }
      }
      maxIterations--;
    }

    this._isFlushing = false;
    this._flushDepth--;

    if (this._flushDepth === 0) {
      for (const cb of this._afterFlushCallbacks) {
        try { cb(); } catch (e) { /* ignore */ }
      }
    }

    this._isScheduled = false;
  }

  onFlush(cb) { this._onFlushCallbacks.push(cb); }
  afterFlush(cb) { this._afterFlushCallbacks.push(cb); }

  get isFlushing() { return this._isFlushing; }
  get pendingCount() { return this._queue.size; }

  drain() {
    let safety = 100;
    while (this._queue.size > 0 && safety-- > 0) {
      this.flush();
    }
  }
}

// ─── 响应式信号 ────────────────────────────────────────────────

let currentTracker = null;
let currentBatch = null;

class Signal {
  constructor(initialValue, options = {}) {
    this._value = initialValue;
    this._id = Symbol(options.name || 'signal');
    this._name = options.name || 'anonymous';
    this._equalFn = options.equalFn || Object.is;
    this._version = 0;
  }

  get value() {
    if (currentTracker) {
      currentTracker.record(this);
    }
    return this._value;
  }

  set value(newValue) {
    if (this._equalFn(this._value, newValue)) return;
    const oldValue = this._value;
    this._value = newValue;
    this._version++;
    this._notify(oldValue, newValue);
  }

  get id() { return this._id; }
  get name() { return this._name; }
  get version() { return this._version; }

  peek() {
    return this._value;
  }

  _notify(oldValue, newValue) {
    if (currentBatch) {
      currentBatch.add(this);
      return;
    }
    if (currentTracker) {
      const observers = currentTracker.notify(this);
      for (const obs of observers) {
        if (typeof obs === 'function') {
          obs();
        } else if (obs && typeof obs.run === 'function') {
          obs.run();
        }
      }
    }
  }
}

// ─── 计算属性 ────────────────────────────────────────────────

class Computed {
  constructor(computeFn, options = {}) {
    this._computeFn = computeFn;
    this._id = Symbol(options.name || 'computed');
    this._name = options.name || 'computed';
    this._value = undefined;
    this._version = 0;
    this._dirty = true;
    this._observer = null;
    this._error = null;
  }

  get value() {
    if (currentTracker) {
      currentTracker.record(this);
    }

    if (this._dirty) {
      this.recompute();
    }
    return this._value;
  }

  get id() { return this._id; }
  get name() { return this._name; }
  get version() { return this._version; }

  peek() {
    return this._value;
  }

  recompute() {
    const prev = currentTracker;
    currentTracker = this._observer;
    this._observer = new DependencyTracker();

    try {
      const newValue = this._computeFn();
      if (!Object.is(this._value, newValue)) {
        this._value = newValue;
        this._version++;
      }
      this._error = null;
    } catch (e) {
      this._error = e;
    } finally {
      this._dirty = false;
      currentTracker = prev;
    }
  }

  markDirty() {
    this._dirty = true;
  }

  get error() { return this._error; }
}

// ─── 副作用 ────────────────────────────────────────────────

class Effect {
  constructor(effectFn, options = {}) {
    this._effectFn = effectFn;
    this._id = Symbol(options.name || 'effect');
    this._name = options.name || 'effect';
    this._cleanupFn = null;
    this._observer = null;
    this._disposed = false;
    this._scheduler = options.scheduler || null;
    this._run();
  }

  _run() {
    if (this._disposed) return;

    if (this._cleanupFn) {
      try { this._cleanupFn(); } catch (e) { /* ignore */ }
      this._cleanupFn = null;
    }

    const prev = currentTracker;
    currentTracker = this._observer;
    this._observer = new DependencyTracker();

    try {
      const cleanup = this._effectFn();
      if (typeof cleanup === 'function') {
        this._cleanupFn = cleanup;
      }
    } catch (e) {
      // effect errors should not break the system
    } finally {
      currentTracker = prev;
    }
  }

  run() {
    if (this._disposed) return;
    if (this._scheduler) {
      this._scheduler(() => this._run());
    } else {
      this._run();
    }
  }

  dispose() {
    this._disposed = true;
    if (this._cleanupFn) {
      try { this._cleanupFn(); } catch (e) { /* ignore */ }
      this._cleanupFn = null;
    }
    if (this._observer) {
      this._observer.reset();
    }
  }

  get id() { return this._id; }
  get name() { return this._name; }
  get isDisposed() { return this._disposed; }
}

// ─── 存储（带时间旅行） ──────────────────────────────────────────

class Store {
  constructor(initialState, options = {}) {
    this._state = new Map();
    this._emitter = new EventEmitter();
    this._maxHistory = options.maxHistory || 50;
    this._history = [];
    this._transactionDepth = 0;
    this._pendingChanges = new Map();
    this._middleware = [];

    for (const [key, value] of Object.entries(initialState)) {
      this._state.set(key, new Signal(value, { name: key }));
    }

    this._snapshot();
  }

  _snapshot() {
    const snap = {};
    for (const [key, signal] of this._state) {
      snap[key] = signal.peek();
    }
    this._history.push(snap);
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }
  }

  get(key) {
    const signal = this._state.get(key);
    if (!signal) return undefined;
    return signal.value;
  }

  set(key, value) {
    let finalValue = value;
    for (const mw of this._middleware) {
      finalValue = mw(key, finalValue, this.get(key));
    }

    const signal = this._state.get(key);
    if (signal) {
      const oldValue = signal.peek();
      signal.value = finalValue;

      if (this._transactionDepth === 0) {
        this._snapshot();
      } else {
        this._pendingChanges.set(key, { oldValue, newValue: finalValue });
      }

      this._emitter.emit('change', { key, oldValue, newValue: finalValue });
    }
  }

  update(updater) {
    this.beginTransaction();
    try {
      const changes = updater(this);
      this.commit();
      return changes;
    } catch (e) {
      this.rollback();
      throw e;
    }
  }

  beginTransaction() {
    this._transactionDepth++;
    this._pendingChanges.clear();
  }

  commit() {
    this._transactionDepth--;
    if (this._transactionDepth === 0) {
      if (this._pendingChanges.size > 0) {
        this._snapshot();
        this._emitter.emit('batchChange', [...this._pendingChanges.keys()]);
      }
      this._pendingChanges.clear();
    }
  }

  rollback() {
    if (this._transactionDepth === 0) return;
    this._transactionDepth--;
    for (const [key, { oldValue }] of this._pendingChanges) {
      const signal = this._state.get(key);
      if (signal) signal.value = oldValue;
    }
    this._pendingChanges.clear();
  }

  use(middleware) {
    this._middleware.push(middleware);
    return this;
  }

  onChange(callback) {
    this._emitter.on('change', callback);
    return () => this._emitter.off('change', callback);
  }

  onBatchChange(callback) {
    this._emitter.on('batchChange', callback);
    return () => this._emitter.off('batchChange', callback);
  }

  travelTo(version) {
    if (version < 0 || version >= this._history.length) return false;
    const snapshot = this._history[version];
    for (const [key, value] of Object.entries(snapshot)) {
      const signal = this._state.get(key);
      if (signal) signal.value = value;
    }
    return true;
  }

  getState() {
    const state = {};
    for (const [key, signal] of this._state) {
      state[key] = signal.value;
    }
    return state;
  }

  getHistory() {
    return this._history.map((snap, i) => ({ version: i, ...snap }));
  }

  select(...keys) {
    const result = {};
    for (const key of keys) {
      result[key] = this.get(key);
    }
    return result;
  }

  derive(key, computeFn) {
    const computed = new Computed(computeFn, { name: `derived_${key}` });
    const derivedSignal = new Signal(computed.value, { name: key });

    new Effect(() => {
      derivedSignal.value = computed.value;
    });

    this._state.set(key, derivedSignal);
    return derivedSignal;
  }

  dispose() {
    this._emitter.removeAllListeners();
    this._state.clear();
    this._history = [];
  }

  get size() { return this._state.size; }
  get historyLength() { return this._history.length; }
}

// ─── 全局响应式上下文 ──────────────────────────────────────────

class ReactiveContext {
  constructor() {
    this._tracker = new DependencyTracker();
    this._batch = new BatchScheduler();
    this._effects = new Map();
    this._effectIdCounter = 0;
  }

  createSignal(value, options) {
    return new Signal(value, options);
  }

  createComputed(fn, options) {
    return new Computed(fn, options);
  }

  createEffect(fn, options = {}) {
    const id = `effect_${++this._effectIdCounter}`;
    const effect = new Effect(fn, {
      ...options,
      name: options.name || id,
      scheduler: (fn) => this._batch.schedule(fn),
    });
    this._effects.set(id, effect);
    return effect;
  }

  createStore(initialState, options) {
    return new Store(initialState, options);
  }

  batch(fn) {
    const prev = currentBatch;
    currentBatch = new Set();
    try {
      const result = fn();
      const dirtyEffects = new Set();
      for (const signal of currentBatch) {
        const observers = this._tracker.notify(signal);
        for (const obs of observers) {
          dirtyEffects.add(obs);
        }
      }
      for (const effect of dirtyEffects) {
        if (effect && typeof effect.run === 'function') {
          this._batch.schedule(() => effect.run());
        }
      }
      return result;
    } finally {
      currentBatch = prev;
      this._batch.flush();
    }
  }

  dispose() {
    for (const effect of this._effects.values()) {
      effect.dispose();
    }
    this._effects.clear();
    this._tracker.reset();
  }

  get scheduler() { return this._batch; }
}

// ─── 工具函数 ────────────────────────────────────────────────

function selectFrom(store, ...keys) {
  const computed = new Computed(() => store.select(...keys), {
    name: `select(${keys.join(',')})`,
  });
  return computed;
}

function combine(...computedSignals) {
  return new Computed(
    () => computedSignals.map((c) => c.value),
    { name: 'combine' },
  );
}

function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function throttle(fn, limit) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      return fn.apply(this, args);
    }
  };
}

// ─── 演示 ────────────────────────────────────────────────

async function demo() {
  const ctx = new ReactiveContext();

  const count = ctx.createSignal(0, { name: 'count' });
  const text = ctx.createSignal('hello', { name: 'text' });

  const doubled = ctx.createComputed(() => count.value * 2, { name: 'doubled' });
  const combined = ctx.createComputed(
    () => `${text.value} (${count.value})`,
    { name: 'combined' },
  );

  const log = [];
  ctx.createEffect(() => {
    const val = combined.value;
    log.push(val);
  }, { name: 'logger' });

  console.log('Initial doubled:', doubled.value);
  console.log('Initial combined:', combined.value);

  count.value = 1;
  count.value = 2;
  text.value = 'world';

  ctx.batch(() => {
    count.value = 10;
    text.value = 'batched';
  });

  console.log('\nEffect log:', log);
  console.log('Final doubled:', doubled.value);
  console.log('Final combined:', combined.value);

  const store = ctx.createStore({
    todos: [],
    filter: 'all',
    nextId: 1,
  });

  store.use((key, newValue, oldValue) => {
    if (key === 'todos' && !Array.isArray(newValue)) {
      return oldValue;
    }
    return newValue;
  });

  const unsubscribe = store.onChange(({ key, newValue }) => {
    console.log(`Store[${key}] changed`);
  });

  store.update((s) => {
    s.set('todos', [{ id: 1, text: 'Learn reactive', done: false }]);
    s.set('nextId', 2);
  });

  console.log('\nStore state:', store.getState());
  console.log('History length:', store.historyLength);

  store.set('todos', [
    ...store.get('todos'),
    { id: 2, text: 'Build engine', done: false },
  ]);

  store.travelTo(1);
  console.log('After travel to v1:', store.getState());

  store.travelTo(store.historyLength - 1);
  console.log('After travel to latest:', store.getState());

  unsubscribe();
  store.dispose();
  ctx.dispose();

  console.log('\n--- Demo complete ---');
}

if (require.main === module) {
  demo().catch(console.error);
}

module.exports = {
  Signal,
  Computed,
  Effect,
  Store,
  DependencyTracker,
  BatchScheduler,
  ReactiveContext,
  selectFrom,
  combine,
  debounce,
  throttle,
};
