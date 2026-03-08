// useNotifications Hook
// Thin wrapper around NotificationContext - state is shared globally
// This ensures unreadCount badge stays in sync across all screens.

import { useNotificationContext } from "../contexts/NotificationContext";

export const useNotifications = () => {
  return useNotificationContext();
};

export default useNotifications;
