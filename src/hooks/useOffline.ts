/**
 * Hook for offline mode detection and queue state
 */
import { useEffect, useState } from "react";

import networkService from "../services/network/networkService";

export const useOffline = () => {
  const [isOnline, setIsOnline] = useState(networkService.getIsOnline());
  const [offlineQueueCount, setOfflineQueueCount] = useState(
    networkService.getOfflineQueue().length,
  );

  useEffect(() => {
    let isMounted = true;

    const unsubscribeStatus = networkService.subscribe((online) => {
      if (isMounted) {
        setIsOnline(online);
      }
    });

    const unsubscribeQueue = networkService.subscribeToQueue((count) => {
      if (isMounted) {
        setOfflineQueueCount(count);
      }
    });

    void (async () => {
      await networkService.ready();
      const online = await networkService.checkConnection();

      if (isMounted) {
        setIsOnline(online);
        setOfflineQueueCount(networkService.getOfflineQueue().length);
      }
    })();

    return () => {
      isMounted = false;
      unsubscribeStatus();
      unsubscribeQueue();
    };
  }, []);

  const addToOfflineQueue = async (
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    data?: any,
  ) => {
    await networkService.addToOfflineQueue({ endpoint, method, data });
  };

  return {
    isOnline,
    isOffline: !isOnline,
    offlineQueueCount,
    addToOfflineQueue,
  };
};
