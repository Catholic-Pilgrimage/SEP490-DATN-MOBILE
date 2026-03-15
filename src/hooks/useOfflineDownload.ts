/**
 * Hook for downloading planner data for offline use
 */
import { useState } from "react";
import offlineSyncService from "../services/offline/offlineSyncService";

interface DownloadProgress {
  total: number;
  downloaded: number;
  currentStep: string;
}

export const useOfflineDownload = () => {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState(false);

  const downloadPlanner = async (plannerId: string) => {
    try {
      setDownloading(true);
      setError(undefined);
      setSuccess(false);
      setProgress(undefined);

      const result = await offlineSyncService.downloadPlannerData(
        plannerId,
        (prog) => {
          setProgress(prog);
        },
      );

      if (result.success) {
        setSuccess(true);
        setError(undefined);
      } else {
        setSuccess(false);
        setError(result.message);
      }

      return result;
    } catch (err: any) {
      const errorMsg = err.message || "Tải dữ liệu thất bại";
      setError(errorMsg);
      setSuccess(false);
      return { success: false, message: errorMsg };
    } finally {
      setDownloading(false);
    }
  };

  const checkAvailability = async (plannerId: string) => {
    return offlineSyncService.isPlannerAvailableOffline(plannerId);
  };

  const deleteOfflineData = async (plannerId: string) => {
    try {
      await offlineSyncService.deleteOfflineData(plannerId);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const reset = () => {
    setDownloading(false);
    setProgress(undefined);
    setError(undefined);
    setSuccess(false);
  };

  return {
    downloading,
    progress,
    error,
    success,
    downloadPlanner,
    checkAvailability,
    deleteOfflineData,
    reset,
  };
};
