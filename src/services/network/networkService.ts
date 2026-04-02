/**
 * Network Service - online/offline detection and user-scoped offline queue lifecycle
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

import { ensureLegacyOfflineStorageCleanup } from "../offline/offlineLegacyCleanup";
import {
  getOfflineStorageScopeUserId,
  setOfflineStorageScopeUserId,
} from "../offline/offlineStorageScope";

const OFFLINE_QUEUE_KEY_PREFIX = "@offline_queue";

const getQueueStorageKey = (userId: string) =>
  `${OFFLINE_QUEUE_KEY_PREFIX}:${userId}`;

export interface OfflineAction {
  id: string;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  data?: any;
  timestamp: number;
}

type OnlineListener = (isOnline: boolean) => void;
type QueueListener = (count: number) => void;
type OfflineSyncHandler = () => Promise<boolean>;

class NetworkService {
  private isOnline = true;
  private readonly listeners: OnlineListener[] = [];
  private readonly queueListeners: QueueListener[] = [];
  private offlineQueue: OfflineAction[] = [];
  private readonly initPromise: Promise<void>;
  private syncHandler?: OfflineSyncHandler;
  private isSyncingQueue = false;
  private storageScopeUserId: string | null = null;

  constructor() {
    this.initPromise = this.init();
  }

  async ready() {
    await this.initPromise;
    await this.ensureCurrentScopeLoaded();
  }

  async setStorageScope(userId: string | null) {
    setOfflineStorageScopeUserId(userId);
    await this.applyStorageScope(userId);
  }

  /**
   * Initialize network monitoring
   */
  private async init() {
    await this.ensureCurrentScopeLoaded();

    const currentState = await NetInfo.fetch();
    this.updateOnlineState(currentState.isConnected ?? false);
    if (this.isOnline && this.offlineQueue.length > 0) {
      void this.processOfflineQueue();
    }

    NetInfo.addEventListener((state: NetInfoState) => {
      this.updateOnlineState(state.isConnected ?? false);
    });
  }

  private async ensureCurrentScopeLoaded() {
    await ensureLegacyOfflineStorageCleanup();
    const currentUserId = await getOfflineStorageScopeUserId();
    await this.applyStorageScope(currentUserId);
  }

  private async applyStorageScope(userId: string | null) {
    const normalizedUserId = userId?.trim() || null;

    if (this.storageScopeUserId === normalizedUserId) {
      return;
    }

    this.storageScopeUserId = normalizedUserId;
    await this.loadOfflineQueue();

    if (this.isOnline && this.offlineQueue.length > 0) {
      void this.processOfflineQueue();
    }
  }

  private getActiveQueueStorageKey() {
    if (!this.storageScopeUserId) {
      return null;
    }

    return getQueueStorageKey(this.storageScopeUserId);
  }

  /**
   * Register the bulk sync handler used when connectivity returns.
   */
  setSyncHandler(handler: OfflineSyncHandler) {
    this.syncHandler = handler;

    if (this.isOnline && this.offlineQueue.length > 0) {
      void this.processOfflineQueue();
    }
  }

  /**
   * Check if device is online
   */
  async checkConnection(): Promise<boolean> {
    await this.ready();
    const state = await NetInfo.fetch();
    this.updateOnlineState(state.isConnected ?? false);
    return this.isOnline;
  }

  /**
   * Get current online status
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Subscribe to network status changes
   */
  subscribe(listener: OnlineListener): () => void {
    this.listeners.push(listener);
    listener(this.isOnline);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to offline queue count changes.
   */
  subscribeToQueue(listener: QueueListener): () => void {
    this.queueListeners.push(listener);
    listener(this.offlineQueue.length);

    return () => {
      const index = this.queueListeners.indexOf(listener);
      if (index >= 0) {
        this.queueListeners.splice(index, 1);
      }
    };
  }

  /**
   * Add action to offline queue
   */
  async addToOfflineQueue(
    action: Omit<OfflineAction, "id" | "timestamp">,
  ): Promise<OfflineAction> {
    await this.ready();

    if (!this.storageScopeUserId) {
      throw new Error("Cannot queue offline action without an authenticated user.");
    }

    const offlineAction: OfflineAction = {
      ...action,
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      timestamp: Date.now(),
    };

    this.offlineQueue.push(offlineAction);
    await this.saveOfflineQueue();
    return offlineAction;
  }

  /**
   * Replace queue after a partial sync result.
   */
  async replaceOfflineQueue(queue: OfflineAction[]) {
    await this.ready();
    this.offlineQueue = [...queue];
    await this.saveOfflineQueue();
  }

  /**
   * Trigger a queue sync when online.
   */
  async processOfflineQueue() {
    await this.ready();

    if (
      this.isSyncingQueue ||
      !this.isOnline ||
      !this.syncHandler ||
      this.offlineQueue.length === 0
    ) {
      return false;
    }

    this.isSyncingQueue = true;

    try {
      return await this.syncHandler();
    } catch (error) {
      console.error("Failed to process offline queue:", error);
      return false;
    } finally {
      this.isSyncingQueue = false;
      this.notifyQueueListeners();
    }
  }

  /**
   * Load offline queue from storage
   */
  private async loadOfflineQueue() {
    try {
      const storageKey = this.getActiveQueueStorageKey();
      if (!storageKey) {
        this.offlineQueue = [];
        return;
      }

      const stored = await AsyncStorage.getItem(storageKey);
      this.offlineQueue = stored ? (JSON.parse(stored) as OfflineAction[]) : [];
    } catch (error) {
      console.error("Failed to load offline queue:", error);
      this.offlineQueue = [];
    } finally {
      this.notifyQueueListeners();
    }
  }

  /**
   * Save offline queue to storage
   */
  private async saveOfflineQueue() {
    try {
      const storageKey = this.getActiveQueueStorageKey();
      if (!storageKey) {
        this.offlineQueue = [];
        return;
      }

      await AsyncStorage.setItem(storageKey, JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.error("Failed to save offline queue:", error);
    } finally {
      this.notifyQueueListeners();
    }
  }

  /**
   * Clear offline queue
   */
  async clearOfflineQueue() {
    await this.ready();
    this.offlineQueue = [];

    const storageKey = this.getActiveQueueStorageKey();
    if (storageKey) {
      await AsyncStorage.removeItem(storageKey);
    }

    this.notifyQueueListeners();
  }

  /**
   * Get offline queue
   */
  getOfflineQueue(): OfflineAction[] {
    return [...this.offlineQueue];
  }

  private updateOnlineState(isOnline: boolean) {
    const wasOffline = !this.isOnline;
    this.isOnline = isOnline;

    this.listeners.forEach((listener) => listener(this.isOnline));

    if (wasOffline && this.isOnline) {
      void this.processOfflineQueue();
    }
  }

  private notifyQueueListeners() {
    const queueCount = this.offlineQueue.length;
    this.queueListeners.forEach((listener) => listener(queueCount));
  }
}

export const networkService = new NetworkService();
export default networkService;
