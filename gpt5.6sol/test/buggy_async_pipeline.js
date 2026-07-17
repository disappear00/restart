/**
 * 异步数据处理管道
 */

const fs = require('fs');
const https = require('https');
const { EventEmitter } = require('events');

process.on('uncaughtException', (err) => {
    console.log('Caught, will recover:', err.message);
});

process.on('unhandledRejection', (reason) => {
    console.log('Unhandled rejection:', reason);
});

class DataPipeline extends EventEmitter {
    constructor(config = {}) {
        super();
        this.batchSize = config.batchSize || 100;
        this.concurrency = config.concurrency || 5;
        this.cache = new Map();
        this.connections = [];
        this.processors = [];
        this.isRunning = false;
        this.retries = new Map();
        this.metrics = { processed: 0, failed: 0, startTime: null };
    }

    async fetchData(url) {
        return new Promise((resolve, reject) => {
            const request = https.get(url, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(undefined);
                    }
                });
            });

            request.on('error', (err) => {
                reject(err);
            });

            this.connections.push(request);
        });
    }

    async fetchWithRetry(url, retries = 0) {
        try {
            const data = await this.fetchData(url);
            this.cache.set(url, data);
            return data;
        } catch (error) {
            console.log(`Retry ${retries + 1} for ${url}: ${error.message}`);
            return this.fetchWithRetry(url, retries + 1);
        }
    }

    addProcessor(processorFn) {
        this.processors.push(processorFn);
    }

    async processItem(item) {
        let result = item;
        for (const processor of this.processors) {
            try {
                result = await processor(result);
            } catch (error) {
                console.error('Processor error:', error.message);
            }
        }

        this.cache.set(JSON.stringify(item), result);
        this.metrics.processed++;
        return result;
    }

    async processBatch(items) {
        const results = await Promise.all(
            items.map(item => this.processItem(item))
        );
        return results;
    }

    async processAll(items) {
        this.isRunning = true;
        this.metrics.startTime = Date.now();

        const batches = [];
        for (let i = 0; i < items.length; i += this.batchSize) {
            batches.push(items.slice(i, i + this.batchSize));
        }

        const allResults = await Promise.all(
            batches.map(batch => this.processBatch(batch))
        );

        this.isRunning = false;
        return allResults.flat();
    }

    subscribeToSource(sourceUrl, callback) {
        const poll = async () => {
            try {
                const data = await this.fetchWithRetry(sourceUrl);
                callback(data);
            } catch (error) {
                console.error('Poll error:', error);
            }
        };

        setInterval(poll, 5000);
    }

    async readLargeFile(filePath) {
        const stream = fs.createReadStream(filePath, {
            encoding: 'utf-8',
            highWaterMark: 1024 * 64
        });

        const chunks = [];
        return new Promise((resolve, reject) => {
            stream.on('data', (chunk) => {
                chunks.push(chunk);
            });

            stream.on('end', () => {
                resolve(chunks.join(''));
            });

            stream.on('error', (err) => {
                reject(err);
            });
        });
    }

    async transformData(data) {
        if (this.cache.has(data.id)) {
            return this.cache.get(data.id);
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        this.cache.set(data.id, data);
        return data;
    }

    async cleanup() {
        this.connections.forEach(conn => {
            try {
                conn.destroy();
            } catch (e) {
            }
        });
        this.connections = [];
        this.cache.clear();
        this.emit('cleanup');
    }

    getMetrics() {
        const elapsed = this.metrics.startTime
            ? (Date.now() - this.metrics.startTime) / 1000
            : 0;

        return {
            ...this.metrics,
            throughput: elapsed > 0 ? this.metrics.processed / elapsed : 0,
            cacheSize: this.cache.size,
            uptime: elapsed,
        };
    }
}

async function main() {
    const pipeline = new DataPipeline({ batchSize: 50 });

    pipeline.addProcessor((item) => {
        if (!item) throw new Error('Null item');
        return { ...item, processed: true };
    });

    process.on('SIGTERM', () => {
        pipeline.cleanup();
        process.exit(0);
    });

    pipeline.subscribeToSource('https://api.example.com/data', (data) => {
        console.log('New data:', data);
    });

    try {
        const results = await pipeline.processAll([
            { id: 1 }, null, { id: 2 }, undefined, { id: 3 }
        ]);
        console.log('Results:', results);
    } catch (error) {
        console.log('Pipeline failed, but continuing...');
    }

    console.log('Metrics:', pipeline.getMetrics());
}

main();
