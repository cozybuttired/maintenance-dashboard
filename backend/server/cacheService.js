/**
 * Simple in-memory cache with TTL (Time-To-Live)
 * For production, consider Redis
 */

class CacheService {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Generate a cache key from filters
   */
  generateKey(prefix, filters = {}) {
    const sortedFilters = Object.keys(filters)
      .sort()
      .map(key => `${key}=${filters[key]}`)
      .join('&');
    return `${prefix}:${sortedFilters}`;
  }

  /**
   * Get value from cache (returns null if expired)
   */
  get(key) {
    const item = this.cache.get(key);

    if (!item) return null;

    // Check if expired
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Set value in cache with TTL
   */
  set(key, value, ttlSeconds = 300) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttlSeconds * 1000),
      createdAt: new Date().toISOString()
    });
  }

  /**
   * Clear cache for a specific pattern
   */
  clearPattern(pattern) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
    return keysToDelete.length;
  }

  /**
   * Clear all cache
   */
  clearAll() {
    const size = this.cache.size;
    this.cache.clear();
    return size;
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      totalItems: this.cache.size,
      items: Array.from(this.cache.entries()).map(([key, item]) => ({
        key,
        size: JSON.stringify(item.value).length,
        expiresAt: item.expiresAt,
        expiresIn: Math.max(0, item.expiresAt - Date.now()) / 1000,
        createdAt: item.createdAt
      }))
    };
  }
}

module.exports = new CacheService();
