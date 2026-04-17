/**
 * Site Hooks - for Guest & Pilgrim
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { pilgrimSiteApi } from "../services/api/pilgrim";
import {
  GetSiteEventsParams,
  GetSiteMassSchedulesParams,
  GetSiteMediaParams,
  GetSiteNearbyPlacesParams,
  GetSiteReviewsParams,
  SearchSitesParams,
  Site,
  SiteEvent,
  SiteMassSchedule,
  SiteMedia,
  SiteNearbyPlace,
  SiteReview,
  SiteReviewPagination,
  SiteReviewSummary,
  SiteSummary,
} from "../types/pilgrim";

// Helper: Map snake_case API response to camelCase SiteSummary
const mapSiteResponse = (site: any): SiteSummary => ({
  id: site.id,
  name: site.name,
  address: site.address,
  coverImage: site.cover_image || site.coverImage || "",
  rating: site.rating || 0,
  reviewCount: site.review_count || site.reviewCount || 0,
  distance: site.distance,
  isFavorite: site.is_favorite || site.isFavorite || false,
  type: site.type,
  region: site.region,
  latitude: site.latitude || 0,
  longitude: site.longitude || 0,
  patronSaint: site.patron_saint || site.patronSaint || undefined,
  openingHours: site.opening_hours || site.openingHours || undefined,
  hasEvents:
    site.has_events === true ||
    site.has_events === "true" ||
    site.hasEvents === true ||
    site.hasEvents === "true" ||
    Number(site.event_count || site.eventCount || site.events_count || 0) > 0,
  eventCount: Number(
    site.event_count || site.eventCount || site.events_count || 0,
  ),
});

// ===== useSites =====

interface UseSitesOptions {
  filters?: SearchSitesParams;
  autoFetch?: boolean;
  onSuccess?: (sites: SiteSummary[]) => void;
  onError?: (error: string) => void;
}

const normalizeSearchParams = (
  params: SearchSitesParams,
): SearchSitesParams => ({
  ...params,
  search:
    typeof (params.search ?? params.query) === "string"
      ? (params.search ?? params.query)?.trim() || undefined
      : undefined,
  query:
    typeof (params.search ?? params.query) === "string"
      ? (params.search ?? params.query)?.trim() || undefined
      : undefined,
});

export function useSites(options: UseSitesOptions = {}) {
  const { filters, autoFetch = false, onSuccess, onError } = options;

  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const currentFilters = useRef<SearchSitesParams>(filters || {});
  const isMounted = useRef(true);

  const fetchSites = useCallback(
    async (params?: SearchSitesParams) => {
      setIsLoading(true);
      setError(null);
      const shouldResetSearchParams = Boolean(
        params && ("query" in params || "search" in params),
      );
      const baseFilters = shouldResetSearchParams
        ? {
            ...currentFilters.current,
            query: undefined,
            search: undefined,
          }
        : currentFilters.current;
      const newFilters = normalizeSearchParams({
        ...baseFilters,
        ...params,
        page: 1,
      });
      currentFilters.current = newFilters;

      try {
        const response = await pilgrimSiteApi.getSites(newFilters);
        if (isMounted.current && response.success && response.data) {
          const rawData =
            (response.data as any).data || response.data.items || [];
          const pagination = (response.data as any).pagination;
          const siteData = rawData.map(mapSiteResponse);

          setSites(siteData);
          if (pagination) {
            setPage(pagination.page);
            setHasMore(pagination.page < pagination.totalPages);
          }
          onSuccess?.(siteData);
        }
      } catch (err: any) {
        if (isMounted.current) {
          const msg = err.message || "Lỗi tải danh sách";
          setError(msg);
          onError?.(msg);
        }
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    },
    [onSuccess, onError],
  );

  const fetchMore = useCallback(async () => {
    if (!hasMore || isFetchingMore) return;
    setIsFetchingMore(true);

    try {
      const nextFilters = normalizeSearchParams({
        ...currentFilters.current,
        page: page + 1,
      });
      const response = await pilgrimSiteApi.getSites(nextFilters);
      if (isMounted.current && response.success && response.data) {
        const rawData =
          (response.data as any).data || response.data.items || [];
        const pagination = (response.data as any).pagination;
        const siteData = rawData.map(mapSiteResponse);

        setSites((prev) => [...prev, ...siteData]);
        if (pagination) {
          setPage(pagination.page);
          setHasMore(pagination.page < pagination.totalPages);
        }
      }
    } catch (err: any) {
      if (isMounted.current) setError(err.message);
    } finally {
      if (isMounted.current) setIsFetchingMore(false);
    }
  }, [hasMore, isFetchingMore, page]);

  const refetch = useCallback(
    () => fetchSites(currentFilters.current),
    [fetchSites],
  );
  const reset = useCallback(() => {
    setSites([]);
    setError(null);
    setHasMore(true);
    setPage(1);
  }, []);

  useEffect(() => {
    if (autoFetch) fetchSites(filters);
  }, [autoFetch]); // eslint-disable-line
  useEffect(
    () => () => {
      isMounted.current = false;
    },
    [],
  );

  const toggleFavorite = useCallback(
    async (siteId: string, isCurrentFavorite: boolean) => {
      // Optimistic update
      setSites((prev) =>
        prev.map((site) =>
          site.id === siteId
            ? { ...site, isFavorite: !isCurrentFavorite }
            : site,
        ),
      );

      try {
        if (isCurrentFavorite) {
          await pilgrimSiteApi.removeFavorite(siteId);
        } else {
          await pilgrimSiteApi.addFavorite(siteId);
        }
      } catch (err: any) {
        // Revert on error
        setSites((prev) =>
          prev.map((site) =>
            site.id === siteId
              ? { ...site, isFavorite: isCurrentFavorite }
              : site,
          ),
        );
        if (isMounted.current) {
          const msg = err.message || "Lỗi cập nhật yêu thích";
          onError?.(msg);
        }
      }
    },
    [onError],
  );

  return {
    sites,
    isLoading,
    isFetchingMore,
    error,
    hasMore,
    fetchSites,
    fetchMore,
    refetch,
    reset,
    toggleFavorite,
  };
}

// ===== useSiteDetail =====

interface UseSiteDetailOptions {
  autoFetch?: boolean;
  onSuccess?: (site: Site) => void;
  onError?: (error: string) => void;
}

export function useSiteDetail(
  siteId?: string,
  options: UseSiteDetailOptions = {},
) {
  const { autoFetch = false, onSuccess, onError } = options;

  const [site, setSite] = useState<Site | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentId = useRef(siteId);
  const isMounted = useRef(true);

  const fetchDetail = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setError(null);
      currentId.current = id;

      try {
        const response = await pilgrimSiteApi.getSiteDetail(id);
        if (isMounted.current && response.success && response.data) {
          const rawData = response.data as any;
          // Map snake_case to camelCase
          const mappedSite: Site = {
            ...rawData,
            patronSaint: rawData.patron_saint || rawData.patronSaint,
            coverImage: rawData.cover_image || rawData.coverImage,
            openingHours: rawData.opening_hours || rawData.openingHours,
            contactInfo: rawData.contact_info || rawData.contactInfo,
            isFavorite: rawData.is_favorite || rawData.isFavorite || false,
            reviewCount: rawData.review_count || rawData.reviewCount || 0,
            // Ensure other fields are passed through
          };
          setSite(mappedSite);
          onSuccess?.(mappedSite);
        }
      } catch (err: any) {
        if (isMounted.current) {
          const msg = err.message || "Lỗi tải chi tiết";
          setError(msg);
          onError?.(msg);
        }
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    },
    [onSuccess, onError],
  );

  const refetch = useCallback(() => {
    if (currentId.current) fetchDetail(currentId.current);
  }, [fetchDetail]);
  const reset = useCallback(() => {
    setSite(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (autoFetch && siteId) fetchDetail(siteId);
  }, [autoFetch, siteId]); // eslint-disable-line
  useEffect(
    () => () => {
      isMounted.current = false;
    },
    [],
  );

  const toggleFavorite = useCallback(async () => {
    if (!site) return;

    const isCurrentFavorite = site.isFavorite;

    // Optimistic update
    setSite((prev) =>
      prev ? { ...prev, isFavorite: !isCurrentFavorite } : null,
    );

    try {
      if (isCurrentFavorite) {
        await pilgrimSiteApi.removeFavorite(site.id);
      } else {
        await pilgrimSiteApi.addFavorite(site.id);
      }
    } catch (err: any) {
      // Revert on error
      setSite((prev) =>
        prev ? { ...prev, isFavorite: isCurrentFavorite } : null,
      );
      if (isMounted.current) {
        const msg = err.message || "Lỗi cập nhật yêu thích";
        onError?.(msg);
      }
    }
  }, [site, onError]);

  return {
    site,
    isLoading,
    error,
    fetchDetail,
    refetch,
    reset,
    toggleFavorite,
  };
}

// ===== useSiteMedia =====

interface UseSiteMediaOptions {
  params?: GetSiteMediaParams;
  autoFetch?: boolean;
  onSuccess?: (media: SiteMedia[]) => void;
  onError?: (error: string) => void;
}

export function useSiteMedia(
  siteId?: string,
  options: UseSiteMediaOptions = {},
) {
  const { params, autoFetch = false, onSuccess, onError } = options;

  const [media, setMedia] = useState<SiteMedia[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentSiteId = useRef(siteId);
  const currentParams = useRef(params);
  const isMounted = useRef(true);

  const fetchMedia = useCallback(
    async (id: string, fetchParams?: GetSiteMediaParams) => {
      setIsLoading(true);
      setError(null);
      currentSiteId.current = id;
      currentParams.current = fetchParams;

      try {
        const response = await pilgrimSiteApi.getSiteMedia(id, fetchParams);
        if (
          isMounted.current &&
          (response.success || Array.isArray(response.data))
        ) {
          // Handle different response structures:
          // 1. { success: true, data: { data: [...] } } (Nested)
          // 2. { success: true, data: [...] } (Direct Array)
          let mediaItems: SiteMedia[] = [];

          if (
            response.data &&
            "data" in response.data &&
            Array.isArray((response.data as any).data)
          ) {
            mediaItems = (response.data as any).data;
          } else if (Array.isArray(response.data)) {
            mediaItems = response.data;
          }

          setMedia(mediaItems);
          onSuccess?.(mediaItems);
        }
      } catch (err: any) {
        if (isMounted.current) {
          const msg = err.message || "Lỗi tải media";
          setError(msg);
          onError?.(msg);
        }
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    },
    [onSuccess, onError],
  );

  const refetch = useCallback(() => {
    if (currentSiteId.current)
      fetchMedia(currentSiteId.current, currentParams.current);
  }, [fetchMedia]);
  const reset = useCallback(() => {
    setMedia([]);
    setError(null);
  }, []);

  useEffect(() => {
    if (autoFetch && siteId) fetchMedia(siteId, params);
  }, [autoFetch, siteId]); // eslint-disable-line
  useEffect(
    () => () => {
      isMounted.current = false;
    },
    [],
  );

  return { media, isLoading, error, fetchMedia, refetch, reset };
}

// ===== useSiteMassSchedules =====

interface UseSiteMassSchedulesOptions {
  params?: GetSiteMassSchedulesParams;
  autoFetch?: boolean;
  onSuccess?: (schedules: SiteMassSchedule[]) => void;
  onError?: (error: string) => void;
}

export function useSiteMassSchedules(
  siteId?: string,
  options: UseSiteMassSchedulesOptions = {},
) {
  const { params, autoFetch = false, onSuccess, onError } = options;

  const [schedules, setSchedules] = useState<SiteMassSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentSiteId = useRef(siteId);
  const currentParams = useRef(params);
  const isMounted = useRef(true);

  const fetchSchedules = useCallback(
    async (id: string, fetchParams?: GetSiteMassSchedulesParams) => {
      setIsLoading(true);
      setError(null);
      currentSiteId.current = id;
      currentParams.current = fetchParams;

      try {
        const response = await pilgrimSiteApi.getSiteMassSchedules(
          id,
          fetchParams,
        );
        if (
          isMounted.current &&
          (response.success || Array.isArray(response.data))
        ) {
          let scheduleItems: SiteMassSchedule[] = [];
          // Handle different response structures:
          // 1. { success: true, data: { data: [...] } } (Nested)
          // 2. { success: true, data: [...] } (Direct Array)
          if (
            response.data &&
            "data" in response.data &&
            Array.isArray((response.data as any).data)
          ) {
            scheduleItems = (response.data as any).data;
          } else if (Array.isArray(response.data)) {
            scheduleItems = response.data as any;
          }

          setSchedules(scheduleItems);
          onSuccess?.(scheduleItems);
        }
      } catch (err: any) {
        if (isMounted.current) {
          const msg = err.message || "Lỗi tải lịch lễ";
          setError(msg);
          onError?.(msg);
        }
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    },
    [onSuccess, onError],
  );

  const refetch = useCallback(() => {
    if (currentSiteId.current)
      fetchSchedules(currentSiteId.current, currentParams.current);
  }, [fetchSchedules]);
  const reset = useCallback(() => {
    setSchedules([]);
    setError(null);
  }, []);

  useEffect(() => {
    if (autoFetch && siteId) fetchSchedules(siteId, params);
  }, [autoFetch, siteId]); // eslint-disable-line
  useEffect(
    () => () => {
      isMounted.current = false;
    },
    [],
  );

  return { schedules, isLoading, error, fetchSchedules, refetch, reset };
}

// ===== useSiteEvents =====

interface UseSiteEventsOptions {
  params?: GetSiteEventsParams;
  autoFetch?: boolean;
  onSuccess?: (events: SiteEvent[]) => void;
  onError?: (error: string) => void;
}

export function useSiteEvents(
  siteId?: string,
  options: UseSiteEventsOptions = {},
) {
  const { params, autoFetch = false, onSuccess, onError } = options;

  const [events, setEvents] = useState<SiteEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentSiteId = useRef(siteId);
  const currentParams = useRef(params);
  const isMounted = useRef(true);

  const fetchEvents = useCallback(
    async (id: string, fetchParams?: GetSiteEventsParams) => {
      setIsLoading(true);
      setError(null);
      currentSiteId.current = id;
      currentParams.current = fetchParams;

      try {
        const response = await pilgrimSiteApi.getSiteEvents(id, fetchParams);
        if (
          isMounted.current &&
          (response.success || Array.isArray(response.data))
        ) {
          let eventItems: SiteEvent[] = [];
          // Handle different response structures:
          // 1. { success: true, data: { data: [...] } } (Nested)
          // 2. { success: true, data: [...] } (Direct Array)
          if (
            response.data &&
            "data" in response.data &&
            Array.isArray((response.data as any).data)
          ) {
            eventItems = (response.data as any).data;
          } else if (Array.isArray(response.data)) {
            eventItems = response.data as any;
          }

          setEvents(eventItems);
          onSuccess?.(eventItems);
        }
      } catch (err: any) {
        if (isMounted.current) {
          const msg = err.message || "Lỗi tải sự kiện";
          setError(msg);
          onError?.(msg);
        }
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    },
    [onSuccess, onError],
  );

  const refetch = useCallback(() => {
    if (currentSiteId.current)
      fetchEvents(currentSiteId.current, currentParams.current);
  }, [fetchEvents]);
  const reset = useCallback(() => {
    setEvents([]);
    setError(null);
  }, []);

  useEffect(() => {
    if (autoFetch && siteId) fetchEvents(siteId, params);
  }, [autoFetch, siteId]); // eslint-disable-line
  useEffect(
    () => () => {
      isMounted.current = false;
    },
    [],
  );

  return { events, isLoading, error, fetchEvents, refetch, reset };
}

// ===== useSiteReviews =====

interface UseSiteReviewsOptions {
  params?: GetSiteReviewsParams;
  autoFetch?: boolean;
  onSuccess?: (reviews: SiteReview[], summary?: SiteReviewSummary) => void;
  onError?: (error: string) => void;
}

export function useSiteReviews(
  siteId?: string,
  options: UseSiteReviewsOptions = {},
) {
  const { params, autoFetch = false, onSuccess, onError } = options;

  const [reviews, setReviews] = useState<SiteReview[]>([]);
  const [summary, setSummary] = useState<SiteReviewSummary | null>(null);
  const [pagination, setPagination] = useState<SiteReviewPagination | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentSiteId = useRef(siteId);
  const currentParams = useRef(params);
  const isMounted = useRef(true);

  const fetchReviews = useCallback(
    async (id: string, fetchParams?: GetSiteReviewsParams) => {
      setIsLoading(true);
      setError(null);
      currentSiteId.current = id;
      currentParams.current = fetchParams;

      try {
        const response = await pilgrimSiteApi.getSiteReviews(id, fetchParams);

        if (isMounted.current && response.success && response.data) {
          const reviewItems = response.data.reviews || [];
          setReviews(reviewItems);
          setSummary(response.data.summary || null);
          setPagination(response.data.pagination || null);
          onSuccess?.(reviewItems, response.data.summary);
        }
      } catch (err: any) {
        if (isMounted.current) {
          const msg = err.message || "Lỗi tải đánh giá";
          setError(msg);
          onError?.(msg);
        }
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    },
    [onSuccess, onError],
  );

  const refetch = useCallback(() => {
    if (currentSiteId.current) {
      fetchReviews(currentSiteId.current, currentParams.current);
    }
  }, [fetchReviews]);

  const reset = useCallback(() => {
    setReviews([]);
    setSummary(null);
    setPagination(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (autoFetch && siteId) fetchReviews(siteId, params);
  }, [autoFetch, siteId]); // eslint-disable-line

  useEffect(
    () => () => {
      isMounted.current = false;
    },
    [],
  );

  return {
    reviews,
    summary,
    pagination,
    isLoading,
    error,
    fetchReviews,
    refetch,
    reset,
  };
}

// ===== useSiteNearbyPlaces =====

interface UseSiteNearbyPlacesOptions {
  params?: GetSiteNearbyPlacesParams;
  autoFetch?: boolean;
  onSuccess?: (places: SiteNearbyPlace[]) => void;
  onError?: (error: string) => void;
}

export function useSiteNearbyPlaces(
  siteId?: string,
  options: UseSiteNearbyPlacesOptions = {},
) {
  const { params, autoFetch = false, onSuccess, onError } = options;

  const [places, setPlaces] = useState<SiteNearbyPlace[]>([]);
  const [siteInfo, setSiteInfo] = useState<{
    id: string;
    code: string;
    name: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentSiteId = useRef(siteId);
  const currentParams = useRef(params);
  const isMounted = useRef(true);

  const fetchNearbyPlaces = useCallback(
    async (id: string, fetchParams?: GetSiteNearbyPlacesParams) => {
      setIsLoading(true);
      setError(null);
      currentSiteId.current = id;
      currentParams.current = fetchParams;

      try {
        const response = await pilgrimSiteApi.getSiteNearbyPlaces(
          id,
          fetchParams,
        );
        if (isMounted.current && response.success) {
          setPlaces(response.data.data);
          setSiteInfo(response.data.site);
          onSuccess?.(response.data.data);
        }
      } catch (err: any) {
        if (isMounted.current) {
          const msg = err.message || "Lỗi tải địa điểm lân cận";
          setError(msg);
          onError?.(msg);
        }
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    },
    [onSuccess, onError],
  );

  const refetch = useCallback(() => {
    if (currentSiteId.current)
      fetchNearbyPlaces(currentSiteId.current, currentParams.current);
  }, [fetchNearbyPlaces]);
  const reset = useCallback(() => {
    setPlaces([]);
    setSiteInfo(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (autoFetch && siteId) fetchNearbyPlaces(siteId, params);
  }, [autoFetch, siteId]); // eslint-disable-line
  useEffect(
    () => () => {
      isMounted.current = false;
    },
    [],
  );

  return {
    places,
    siteInfo,
    isLoading,
    error,
    fetchNearbyPlaces,
    refetch,
    reset,
  };
}

export default {
  useSites,
  useSiteDetail,
  useSiteMedia,
  useSiteMassSchedules,
  useSiteEvents,
  useSiteReviews,
  useSiteNearbyPlaces,
};
