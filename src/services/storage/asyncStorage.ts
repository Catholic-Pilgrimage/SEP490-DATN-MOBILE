// AsyncStorage utilities
// Save/get non-sensitive data, user preferences, offline data, etc.

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * AsyncStorageService - Wrapper for AsyncStorage with type safety and error handling
 * Use for non-sensitive data like preferences, cache, offline data
 */
class AsyncStorageService {
  /**
   * Save a string value
   * @param key - Storage key
   * @param value - Value to store
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error(`AsyncStorage.setItem error for key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Get a string value
   * @param key - Storage key
   * @returns The stored value or null
   */
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`AsyncStorage.getItem error for key "${key}":`, error);
      return null;
    }
  }

  /**
   * Remove a value
   * @param key - Storage key
   */
  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`AsyncStorage.removeItem error for key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Save an object as JSON
   * @param key - Storage key
   * @param value - Object to store
   */
  async setObject<T>(key: string, value: T): Promise<void> {
    const jsonValue = JSON.stringify(value);
    await this.setItem(key, jsonValue);
  }

  /**
   * Get and parse a JSON object
   * @param key - Storage key
   * @returns The parsed object or null
   */
  async getObject<T>(key: string): Promise<T | null> {
    const jsonValue = await this.getItem(key);
    if (jsonValue) {
      try {
        return JSON.parse(jsonValue) as T;
      } catch (error) {
        console.error(`AsyncStorage.getObject parse error for key "${key}":`, error);
        return null;
      }
    }
    return null;
  }

  /**
   * Get multiple items
   * @param keys - Array of keys
   * @returns Object with key-value pairs
   */
  async multiGet(keys: string[]): Promise<Record<string, string | null>> {
    try {
      const pairs = await AsyncStorage.multiGet(keys);
      const result: Record<string, string | null> = {};
      pairs.forEach(([key, value]) => {
        result[key] = value;
      });
      return result;
    } catch (error) {
      console.error('AsyncStorage.multiGet error:', error);
      return {};
    }
  }

  /**
   * Set multiple items
   * @param items - Object with key-value pairs
   */
  async multiSet(items: Record<string, string>): Promise<void> {
    try {
      const pairs = Object.entries(items);
      await AsyncStorage.multiSet(pairs);
    } catch (error) {
      console.error('AsyncStorage.multiSet error:', error);
      throw error;
    }
  }

  /**
   * Remove multiple items
   * @param keys - Array of keys to remove
   */
  async multiRemove(keys: string[]): Promise<void> {
    try {
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('AsyncStorage.multiRemove error:', error);
      throw error;
    }
  }

  /**
   * Get all keys
   * @returns Array of all keys
   */
  async getAllKeys(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return [...keys];
    } catch (error) {
      console.error('AsyncStorage.getAllKeys error:', error);
      return [];
    }
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('AsyncStorage.clear error:', error);
      throw error;
    }
  }

  /**
   * Check if a key exists
   * @param key - Storage key
   * @returns True if key exists
   */
  async hasKey(key: string): Promise<boolean> {
    const value = await this.getItem(key);
    return value !== null;
  }

  /**
   * Merge an object with existing data
   * @param key - Storage key
   * @param value - Partial object to merge
   */
  async mergeItem<T extends object>(key: string, value: Partial<T>): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.mergeItem(key, jsonValue);
    } catch (error) {
      console.error(`AsyncStorage.mergeItem error for key "${key}":`, error);
      throw error;
    }
  }
}

export const asyncStorage = new AsyncStorageService();
export default asyncStorage;
