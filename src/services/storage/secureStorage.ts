// Secure storage for sensitive data
// Store tokens, credentials securely using expo-secure-store

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * SecureStorage - A wrapper around expo-secure-store with fallback to AsyncStorage for web
 * Uses native secure storage on iOS (Keychain) and Android (EncryptedSharedPreferences)
 */
class SecureStorage {
  private isWeb = Platform.OS === 'web';

  /**
   * Save a value securely
   * @param key - Storage key
   * @param value - Value to store
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (this.isWeb) {
        // Web fallback - use AsyncStorage (less secure but functional)
        await AsyncStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED,
        });
      }
    } catch (error) {
      console.error(`SecureStorage.setItem error for key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Get a value from secure storage
   * @param key - Storage key
   * @returns The stored value or null
   */
  async getItem(key: string): Promise<string | null> {
    try {
      if (this.isWeb) {
        return await AsyncStorage.getItem(key);
      }
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`SecureStorage.getItem error for key "${key}":`, error);
      return null;
    }
  }

  /**
   * Remove a value from secure storage
   * @param key - Storage key
   */
  async removeItem(key: string): Promise<void> {
    try {
      if (this.isWeb) {
        await AsyncStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (error) {
      console.error(`SecureStorage.removeItem error for key "${key}":`, error);
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
        console.error(`SecureStorage.getObject parse error for key "${key}":`, error);
        return null;
      }
    }
    return null;
  }

  /**
   * Clear multiple keys
   * @param keys - Array of keys to remove
   */
  async clearKeys(keys: string[]): Promise<void> {
    await Promise.all(keys.map(key => this.removeItem(key)));
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
}

export const secureStorage = new SecureStorage();
export default secureStorage;
