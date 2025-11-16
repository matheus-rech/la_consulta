/**
 * LRU Cache implementation for PDF text caching
 * 
 * Implements Least Recently Used eviction policy to optimize memory usage
 * while maintaining fast access to frequently used PDF pages.
 */

export interface CacheEntry<T> {
    value: T;
    timestamp: number;
}

export class LRUCache<K, V> {
    private cache: Map<K, CacheEntry<V>>;
    private maxSize: number;
    private accessOrder: K[];

    constructor(maxSize: number = 50) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.accessOrder = [];
    }

    get(key: K): V | undefined {
        const entry = this.cache.get(key);
        
        if (!entry) {
            return undefined;
        }

        this.updateAccessOrder(key);
        
        return entry.value;
    }

    set(key: K, value: V): void {
        if (this.cache.has(key)) {
            this.cache.set(key, {
                value,
                timestamp: Date.now(),
            });
            this.updateAccessOrder(key);
        } else {
            if (this.cache.size >= this.maxSize) {
                this.evictLRU();
            }

            this.cache.set(key, {
                value,
                timestamp: Date.now(),
            });
            this.accessOrder.push(key);
        }
    }

    has(key: K): boolean {
        return this.cache.has(key);
    }

    delete(key: K): boolean {
        const deleted = this.cache.delete(key);
        
        if (deleted) {
            const index = this.accessOrder.indexOf(key);
            if (index > -1) {
                this.accessOrder.splice(index, 1);
            }
        }
        
        return deleted;
    }

    clear(): void {
        this.cache.clear();
        this.accessOrder = [];
    }

    size(): number {
        return this.cache.size;
    }

    private updateAccessOrder(key: K): void {
        const index = this.accessOrder.indexOf(key);
        
        if (index > -1) {
            this.accessOrder.splice(index, 1);
        }
        
        this.accessOrder.push(key);
    }

    private evictLRU(): void {
        if (this.accessOrder.length === 0) {
            return;
        }

        const lruKey = this.accessOrder.shift();
        
        if (lruKey !== undefined) {
            this.cache.delete(lruKey);
            console.log(`LRU Cache: Evicted page ${lruKey}`);
        }
    }

    getStats(): {
        size: number;
        maxSize: number;
        utilizationPercent: number;
        oldestEntry: number | null;
        newestEntry: number | null;
    } {
        let oldestTimestamp: number | null = null;
        let newestTimestamp: number | null = null;

        this.cache.forEach(entry => {
            if (oldestTimestamp === null || entry.timestamp < oldestTimestamp) {
                oldestTimestamp = entry.timestamp;
            }
            if (newestTimestamp === null || entry.timestamp > newestTimestamp) {
                newestTimestamp = entry.timestamp;
            }
        });

        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            utilizationPercent: (this.cache.size / this.maxSize) * 100,
            oldestEntry: oldestTimestamp,
            newestEntry: newestTimestamp,
        };
    }
}

export default LRUCache;
