/**
 * useGuideProfile Hook
 * Custom hook for fetching and managing the Local Guide's profile information
 * Uses GET /api/auth/profile API
 */
import { UpdateProfileRequest } from "../../../../types/user.types";

import { useCallback, useEffect, useState } from "react";
import { authApi } from "../../../../services/api";
import {
  dashboardHomeApi,
  guideReviewApi,
  guideSiteApi,
} from "../../../../services/api/guide";
import { LocalGuideSite } from "../../../../types/guide";

// ============================================
// TYPES
// ============================================

/**
 * Profile data from API response
 * GET /api/auth/profile
 */
export interface GuideProfileData {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  date_of_birth: string;
  role: "pilgrim" | "local_guide";
  status: "active" | "inactive" | "pending";
  site_id: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  avatar_url: string | null;
  language: string;
}

/**
 * Stats data for profile display
 */
export interface GuideProfileStats {
  eventsCount: number;
  mediaCount: number;
  reviewsCount: number;
  sosPendingCount: number;
}

export interface UseGuideProfileResult {
  profile: GuideProfileData | null;
  site: LocalGuideSite | null;
  stats: GuideProfileStats;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateProfile: (data: UpdateProfileRequest) => Promise<string | undefined>;
  isVerified: boolean;
}

// ============================================
// HOOK
// ============================================

/**
 * Hook to fetch the profile information for the Local Guide
 *
 * @returns Object containing profile data, site data, loading state, error info, and refetch function
 */
export const useGuideProfile = (): UseGuideProfileResult => {
  const [profile, setProfile] = useState<GuideProfileData | null>(null);
  const [site, setSite] = useState<LocalGuideSite | null>(null);
  const [stats, setStats] = useState<GuideProfileStats>({
    eventsCount: 0,
    mediaCount: 0,
    reviewsCount: 0,
    sosPendingCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch profile, site, and stats in parallel
      const [
        profileResponse,
        siteResponse,
        overviewResponse,
        reviewsResponse,
      ] = await Promise.all([
        authApi.getProfile(),
        guideSiteApi.getAssignedSite().catch(() => null), // Don't fail if site not assigned
        dashboardHomeApi.getOverview().catch(() => null),
        guideReviewApi.getReviews({ limit: 1 }).catch(() => null),
      ]);

      if (profileResponse?.success && profileResponse?.data) {
        // Map API response to our interface
        // Handle both snake_case (from API) and camelCase (from User type)
        const data = profileResponse.data as any;
        const profileData: GuideProfileData = {
          id: data.id,
          email: data.email,
          full_name: data.full_name || data.fullName || "",
          phone: data.phone || "",
          date_of_birth: data.date_of_birth || data.dateOfBirth || "",
          role: data.role,
          status: data.status || (data.isActive ? "active" : "inactive"),
          site_id: data.site_id || data.siteId || null,
          verified_at:
            data.verified_at ||
            (data.isVerified ? data.updated_at || data.updatedAt : null),
          created_at: data.created_at || data.createdAt || "",
          updated_at: data.updated_at || data.updatedAt || "",
          avatar_url: data.avatar_url || data.avatar || null,
          language: data.language || "vi",
        };
        setProfile(profileData);
      } else {
        setError(profileResponse?.message || "Không thể tải thông tin profile");
      }

      // Handle site data
      if (siteResponse?.success && siteResponse?.data) {
        setSite(siteResponse.data);
      }

      const overviewData =
        overviewResponse?.success && overviewResponse?.data
          ? overviewResponse.data
          : null;

      const eventsTotal = overviewData?.my_contributions?.events?.total || 0;
      const mediaTotal = overviewData?.my_contributions?.media?.total || 0;
      const sosPending = overviewData?.site_overview?.pending_sos || 0;
      const reviewsTotal =
        reviewsResponse?.data?.pagination?.totalItems ||
        reviewsResponse?.data?.data?.length ||
        0;

      setStats({
        eventsCount: eventsTotal,
        mediaCount: mediaTotal,
        reviewsCount: reviewsTotal,
        sosPendingCount: sosPending,
      });
    } catch (err: any) {
      const status = err?.response?.status;

      if (status === 401) {
        setError("Chưa đăng nhập");
      } else if (status === 403) {
        setError("Không có quyền truy cập");
      } else {
        setError("Không thể tải thông tin profile");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(
    async (data: UpdateProfileRequest): Promise<string | undefined> => {
      try {
        setLoading(true);
        const response = await authApi.updateProfile(data);
        if (response.success) {
          await fetchProfile(); // Reload data after update
          return response.message;
        } else {
          throw new Error(response.message || "Failed to update profile");
        }
      } catch (err: any) {
        setError(err.message || "Failed to update profile");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchProfile],
  );

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const isVerified = profile?.verified_at !== null;

  return {
    profile,
    site,
    stats,
    loading,
    error,
    refetch: fetchProfile,
    updateProfile,
    isVerified,
  };
};

export default useGuideProfile;
