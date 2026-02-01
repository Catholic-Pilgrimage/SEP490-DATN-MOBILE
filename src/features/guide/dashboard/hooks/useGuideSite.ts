/**
 * useGuideSite Hook
 * Custom hook for fetching and managing the Local Guide's assigned site information
 */

import { useCallback, useEffect, useState } from "react";
import { guideSiteApi } from "../../../../services/api";
import { LocalGuideSite } from "../../../../types/guide";

export interface UseGuideSiteResult {
  site: LocalGuideSite | null;
  loading: boolean;
  error: string | null;
  errorCode: number | null;
  refetch: () => Promise<void>;
  isOpen: boolean;
}

/**
 * Check if site is currently open based on opening hours
 */
const isSiteCurrentlyOpen = (
  openingHours: LocalGuideSite["opening_hours"] | undefined,
): boolean => {
  if (!openingHours?.open || !openingHours?.close) return false;

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const [openHour, openMin] = openingHours.open.split(":").map(Number);
  const [closeHour, closeMin] = openingHours.close.split(":").map(Number);

  const openTime = openHour * 60 + openMin;
  const closeTime = closeHour * 60 + closeMin;

  return currentTime >= openTime && currentTime <= closeTime;
};

/**
 * Hook to fetch the assigned site information for the Local Guide
 *
 * @returns Object containing site data, loading state, error info, and refetch function
 *
 * Error codes:
 * - 401: Not logged in (Chưa đăng nhập)
 * - 403: Not a Local Guide (Không phải Local Guide)
 * - 404: Local Guide not assigned to any site (Local Guide chưa được gán site)
 */
export const useGuideSite = (): UseGuideSiteResult => {
  const [site, setSite] = useState<LocalGuideSite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);

  const fetchSite = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorCode(null);

      const response = await guideSiteApi.getAssignedSite();

      if (response.success && response.data) {
        setSite(response.data);
      } else {
        setError(response.message || "Không thể tải thông tin địa điểm");
      }
    } catch (err: any) {
      const status = err?.response?.status;
      setErrorCode(status || null);

      if (status === 401) {
        setError("Chưa đăng nhập");
      } else if (status === 403) {
        setError("Không phải Local Guide");
      } else if (status === 404) {
        setError("Local Guide chưa được gán site");
      } else {
        setError("Không thể tải thông tin địa điểm");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSite();
  }, [fetchSite]);

  const isOpen = isSiteCurrentlyOpen(site?.opening_hours);

  return {
    site,
    loading,
    error,
    errorCode,
    refetch: fetchSite,
    isOpen,
  };
};

export default useGuideSite;
