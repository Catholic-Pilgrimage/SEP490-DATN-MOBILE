/**
 * Hook for downloading planner data for offline use
 */
import { useRef, useState } from "react";
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
  const progressRef = useRef<DownloadProgress | undefined>(undefined);

  const downloadPlanner = async (plannerId: string) => {
    try {
      setDownloading(true);
      setError(undefined);
      setSuccess(false);
      setProgress(undefined);
      progressRef.current = undefined;

      const result = await offlineSyncService.downloadPlannerData(
        plannerId,
        (prog) => {
          progressRef.current = prog;
          setProgress(prog);
        },
      );
      if (result.success) {
        const currentProgress = progressRef.current as DownloadProgress | undefined;

        if (
          currentProgress &&
          currentProgress.downloaded >= currentProgress.total
        ) {
          await new Promise((resolve) => setTimeout(resolve, 350));
        }
      }

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

  const clearAllOfflineData = async () => {
    try {
      await offlineSyncService.clearAllOfflineData();
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const reset = () => {
    setDownloading(false);
    setProgress(undefined);
    progressRef.current = undefined;
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
    clearAllOfflineData,
    reset,
  };
};
