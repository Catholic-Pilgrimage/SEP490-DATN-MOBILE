/**
 * useGuideProfile Hook
 * Custom hook for fetching and managing the Local Guide's profile information
 * Uses GET /api/auth/profile API
 */

import { useCallback, useEffect, useState } from "react";
import { authApi, guideSiteApi } from "../../../../services/api";
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

export interface UseGuideProfileResult {
  profile: GuideProfileData | null;
  site: LocalGuideSite | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch profile and site in parallel
      const [profileResponse, siteResponse] = await Promise.all([
        authApi.getProfile(),
        guideSiteApi.getAssignedSite().catch(() => null), // Don't fail if site not assigned
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
          verified_at: data.verified_at || (data.isVerified ? data.updated_at || data.updatedAt : null),
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

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const isVerified = profile?.verified_at !== null;

  return {
    profile,
    site,
    loading,
    error,
    refetch: fetchProfile,
    isVerified,
  };
};

export default useGuideProfile;
