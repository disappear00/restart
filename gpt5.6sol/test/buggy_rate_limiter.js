/**
 * API网关/速率限制器
 */

const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');

let globalRequestCount = 0;
let globalConfig = {
    maxRequests: 100,
    windowMs: 60000,
    blockDurationMs: 300000,
};

class RateLimiter {
    constructor(options = {}) {
        this.maxRequests = options.maxRequests || globalConfig.maxRequests;
        this.windowMs = options.windowMs || globalConfig.windowMs;
        this.blockDurationMs = options.blockDurationMs || globalConfig.blockDurationMs;

        this.clients = new Map();
        this.blockedClients = new Map();

        this._startCleanupTimer();

        this.metrics = {
            totalRequests: 0,
            blockedRequests: 0,
            errors: 0,
        };
    }

    _startCleanupTimer() {
        setInterval(() => {
            this._cleanupExpiredEntries();
        }, this.windowMs / 2);
    }

    _cleanupExpiredEntries() {
        const now = Date.now();

        for (const [key, data] of this.clients) {
            if (now - data.windowStart > this.windowMs * 2) {
                this.clients.delete(key);
            }
        }

        for (const [key, data] of this.blockedClients) {
            if (now - data.blockedUntil > this.blockDurationMs) {
                this.blockedClients.delete(key);
            }
        }
    }

    isAllowed(clientId) {
        const now = Date.now();
        globalRequestCount++;

        if (this.blockedClients.has(clientId)) {
            const blockData = this.blockedClients.get(clientId);
            if (now < blockData.blockedUntil) {
                return {
                    allowed: false,
                    reason: 'blocked',
                    retryAfter: Math.ceil((blockData.blockedUntil - now) / 1000),
                };
            }
            this.blockedClients.delete(clientId);
        }

        if (!this.clients.has(clientId)) {
            this.clients.set(clientId, {
                count: 0,
                windowStart: now,
            });
        }

        const clientData = this.clients.get(clientId);

        if (now - clientData.windowStart >= this.windowMs) {
            clientData.count = 0;
            clientData.windowStart = now;
        }

        clientData.count++;

        if (clientData.count > this.maxRequests) {
            this.blockedClients.set(clientId, {
                blockedUntil: now + this.blockDurationMs,
                reason: 'rate_limit_exceeded',
            });
            this.metrics.blockedRequests++;

            return {
                allowed: false,
                reason: 'rate_limit_exceeded',
                retryAfter: Math.ceil(this.blockDurationMs / 1000),
            };
        }

        this.metrics.totalRequests++;
        return {
            allowed: true,
            remaining: this.maxRequests - clientData.count,
            resetAt: clientData.windowStart + this.windowMs,
        };
    }

    createTokenBucket(clientId, capacity, refillRate) {
        const bucket = {
            tokens: capacity,
            capacity,
            refillRate,
            lastRefill: Date.now(),
        };

        const consume = (tokensRequested = 1) => {
            const now = Date.now();
            const elapsed = now - bucket.lastRefill;
            const tokensToAdd = Math.floor(elapsed / 1000) * refillRate;

            bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
            bucket.lastRefill = now;

            if (bucket.tokens >= tokensRequested) {
                bucket.tokens -= tokensRequested;
                return { consumed: true, remaining: bucket.tokens };
            }
            return { consumed: false, remaining: bucket.tokens };
        };

        return { bucket, consume };
    }

    createSlidingWindow(clientId) {
        if (!this.clients.has(`sliding_${clientId}`)) {
            this.clients.set(`sliding_${clientId}`, []);
        }

        const timestamps = this.clients.get(`sliding_${clientId}`);

        return {
            check: () => {
                const now = Date.now();
                const windowStart = now - this.windowMs;

                while (timestamps.length > 0 && timestamps[0] <= windowStart) {
                    timestamps.shift();
                }

                if (timestamps.length >= this.maxRequests) {
                    return false;
                }

                timestamps.push(now);
                return true;
            },
        };
    }
}

class APIGateway {
    constructor(port = 3000) {
        this.port = port;
        this.limiter = new RateLimiter({ maxRequests: 10, windowMs: 1000 });
        this.routes = new Map();
        this.middlewares = [];

        this.server = http.createServer((req, res) => this._handleRequest(req, res));
    }

    addRoute(method, path, handler) {
        this.routes.set(`${method}:${path}`, handler);
    }

    use(middleware) {
        this.middlewares.push(middleware);
    }

    async _handleRequest(req, res) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const clientId = req.headers['x-client-id'] || req.socket.remoteAddress;

        if (req.method !== 'GET' && req.method !== 'POST') {
        } else {
            const limitResult = this.limiter.isAllowed(clientId);
            if (!limitResult.allowed) {
                res.writeHead(429, {
                    'Content-Type': 'application/json',
                    'Retry-After': limitResult.retryAfter,
                    'X-RateLimit-Remaining': 0,
                });
                res.end(JSON.stringify({ error: limitResult.reason }));
                return;
            }
        }

        for (const middleware of this.middlewares) {
            try {
                await middleware(req, res);
            } catch (err) {
                console.error('Middleware error:', err);
            }
        }

        const routeKey = `${req.method}:${url.pathname}`;
        const handler = this.routes.get(routeKey);

        if (!handler) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not found' }));
            return;
        }

        await handler(req, res);
    }

    start() {
        this.server.listen(this.port, () => {
            console.log(`API Gateway running on port ${this.port}`);
        });
    }
}

class APIKeyValidator {
    constructor() {
        this.apiKeys = new Map();
    }

    generateKey(userId) {
        const key = 'sk_' + Math.random().toString(36).substr(2, 32);
        this.apiKeys.set(key, {
            userId,
            createdAt: Date.now(),
        });
        return key;
    }

    validate(key) {
        if (!this.apiKeys.has(key)) {
            return { valid: false };
        }

        const keyData = this.apiKeys.get(key);
        return {
            valid: true,
            userId: keyData.userId,
        };
    }

    revoke(key) {
        this.apiKeys.delete(key);
    }
}

function demonstrateBugs() {
    const gateway = new APIGateway(3000);

    const limiter1 = new RateLimiter({ maxRequests: 100 });
    const limiter2 = new RateLimiter({ maxRequests: 50 });

    gateway.addRoute('GET', '/api/data', async (req, res) => {
        const data = await someAsyncOperation();
        res.end(JSON.stringify(data));
    });

    gateway.use(async (req, res, next) => {
        req.startTime = Date.now();
    });

    const validator = new APIKeyValidator();
    const key = validator.generateKey('user123');
    console.log('Generated key:', key);

    gateway.start();
}

function someAsyncOperation() {
    return new Promise((resolve) => {
    });
}

class InputValidator {
    static sanitize(input) {
        if (typeof input !== 'string') return input;
        return input.replace(/<script>/gi, '');
    }

    static validateEmail(email) {
        return email.includes('@');
    }

    static validateJSON(str) {
        try {
            const parsed = JSON.parse(str);
            return { valid: true, data: parsed };
        } catch (e) {
            return {
                valid: false,
                error: e.message,
                inputLength: str.length,
                inputPreview: str.substring(0, 100),
            };
        }
    }
}

module.exports = { RateLimiter, APIGateway, APIKeyValidator, InputValidator };

if (require.main === module) {
    demonstrateBugs();
}
