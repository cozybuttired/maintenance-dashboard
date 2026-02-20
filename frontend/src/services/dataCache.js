/**
 * Data persistence service using localStorage
 * Provides fallback data when network fails
 */

class DataCacheService {
  constructor() {
    this.prefix = 'md_cache_';
  }

  /**
   * Save data to localStorage
   */
  saveToDisk(key, data, metadata = {}) {
    try {
      const item = {
        data,
        timestamp: Date.now(),
        metadata
      };
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.error('[DataCache] Failed to save:', error);
    }
  }

  /**
   * Retrieve data if still fresh (default 30 mins)
   */
  getFromDisk(key, maxAgeMs = 30 * 60 * 1000) {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const item = JSON.parse(stored);
      const age = Date.now() - item.timestamp;

      if (age > maxAgeMs) {
        localStorage.removeItem(key);
        return null;
      }

      return item.data;
    } catch (error) {
      console.error('[DataCache] Failed to retrieve:', error);
      return null;
    }
  }

  /**
   * Clear all cache
   */
  clearAll() {
    try {
      const keysToDelete = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('[DataCache] Failed to clear:', error);
    }
  }
}

export default new DataCacheService();
