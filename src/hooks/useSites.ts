/**
 * Site Hooks - for Guest & Pilgrim
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { pilgrimSiteApi } from '../services/api/pilgrim';
import {
    GetSiteEventsParams,
    GetSiteMassSchedulesParams,
    GetSiteMediaParams,
    GetSiteNearbyPlacesParams,
    SearchSitesParams,
    Site,
    SiteEvent,
    SiteMassSchedule,
    SiteMedia,
    SiteNearbyPlace,
    SiteSummary,
} from '../types/pilgrim';

// ===== useSites =====

interface UseSitesOptions {
    filters?: SearchSitesParams;
    autoFetch?: boolean;
    onSuccess?: (sites: SiteSummary[]) => void;
    onError?: (error: string) => void;
}

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

    const fetchSites = useCallback(async (params?: SearchSitesParams) => {
        setIsLoading(true);
        setError(null);
        const newFilters = { ...currentFilters.current, ...params, page: 1 };
        currentFilters.current = newFilters;

        try {
            const response = await pilgrimSiteApi.getSites(newFilters);
            if (isMounted.current && response.success && response.data) {
                let siteData = (response.data as any).data || response.data.items || [];
                const pagination = (response.data as any).pagination;

                // Map snake_case API fields to camelCase
                siteData = siteData.map((site: any) => ({
                    id: site.id,
                    name: site.name,
                    address: site.address,
                    coverImage: site.cover_image || site.coverImage || '',
                    rating: site.rating || 0,
                    reviewCount: site.review_count || site.reviewCount || 0,
                    distance: site.distance,
                    isFavorite: site.is_favorite || site.isFavorite || false,
                    type: site.type,
                    region: site.region,
                }));

                console.log('[useSites] Mapped first site:', siteData[0]);
                setSites(siteData);
                if (pagination) {
                    setPage(pagination.page);
                    setHasMore(pagination.page < pagination.totalPages);
                }
                onSuccess?.(siteData);
            }
        } catch (err: any) {
            if (isMounted.current) {
                const msg = err.message || 'Lỗi tải danh sách';
                setError(msg);
                onError?.(msg);
            }
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    }, [onSuccess, onError]);

    const fetchMore = useCallback(async () => {
        if (!hasMore || isFetchingMore) return;
        setIsFetchingMore(true);

        try {
            const response = await pilgrimSiteApi.getSites({ ...currentFilters.current, page: page + 1 });
            if (isMounted.current && response.success && response.data) {
                let siteData = (response.data as any).data || response.data.items || [];
                const pagination = (response.data as any).pagination;

                // Map snake_case API fields to camelCase
                siteData = siteData.map((site: any) => ({
                    id: site.id,
                    name: site.name,
                    address: site.address,
                    coverImage: site.cover_image || site.coverImage || '',
                    rating: site.rating || 0,
                    reviewCount: site.review_count || site.reviewCount || 0,
                    distance: site.distance,
                    isFavorite: site.is_favorite || site.isFavorite || false,
                    type: site.type,
                    region: site.region,
                }));

                setSites(prev => [...prev, ...siteData]);
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

    const refetch = useCallback(() => fetchSites(currentFilters.current), [fetchSites]);
    const reset = useCallback(() => { setSites([]); setError(null); setHasMore(true); setPage(1); }, []);

    useEffect(() => { if (autoFetch) fetchSites(filters); }, [autoFetch]); // eslint-disable-line
    useEffect(() => () => { isMounted.current = false; }, []);

    return { sites, isLoading, isFetchingMore, error, hasMore, fetchSites, fetchMore, refetch, reset };
}

// ===== useSiteDetail =====

interface UseSiteDetailOptions {
    autoFetch?: boolean;
    onSuccess?: (site: Site) => void;
    onError?: (error: string) => void;
}

export function useSiteDetail(siteId?: string, options: UseSiteDetailOptions = {}) {
    const { autoFetch = false, onSuccess, onError } = options;

    const [site, setSite] = useState<Site | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const currentId = useRef(siteId);
    const isMounted = useRef(true);

    const fetchDetail = useCallback(async (id: string) => {
        setIsLoading(true);
        setError(null);
        currentId.current = id;

        try {
            const response = await pilgrimSiteApi.getSiteDetail(id);
            if (isMounted.current && response.success && response.data) {
                setSite(response.data);
                onSuccess?.(response.data);
            }
        } catch (err: any) {
            if (isMounted.current) {
                const msg = err.message || 'Lỗi tải chi tiết';
                setError(msg);
                onError?.(msg);
            }
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    }, [onSuccess, onError]);

    const refetch = useCallback(() => { if (currentId.current) fetchDetail(currentId.current); }, [fetchDetail]);
    const reset = useCallback(() => { setSite(null); setError(null); }, []);

    useEffect(() => { if (autoFetch && siteId) fetchDetail(siteId); }, [autoFetch, siteId]); // eslint-disable-line
    useEffect(() => () => { isMounted.current = false; }, []);

    return { site, isLoading, error, fetchDetail, refetch, reset };
}

// ===== useSiteMedia =====

interface UseSiteMediaOptions {
    params?: GetSiteMediaParams;
    autoFetch?: boolean;
    onSuccess?: (media: SiteMedia[]) => void;
    onError?: (error: string) => void;
}

export function useSiteMedia(siteId?: string, options: UseSiteMediaOptions = {}) {
    const { params, autoFetch = false, onSuccess, onError } = options;

    const [media, setMedia] = useState<SiteMedia[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const currentSiteId = useRef(siteId);
    const currentParams = useRef(params);
    const isMounted = useRef(true);

    const fetchMedia = useCallback(async (id: string, fetchParams?: GetSiteMediaParams) => {
        setIsLoading(true);
        setError(null);
        currentSiteId.current = id;
        currentParams.current = fetchParams;

        try {
            const response = await pilgrimSiteApi.getSiteMedia(id, fetchParams);
            if (isMounted.current && response.success) {
                setMedia(response.data);
                onSuccess?.(response.data);
            }
        } catch (err: any) {
            if (isMounted.current) {
                const msg = err.message || 'Lỗi tải media';
                setError(msg);
                onError?.(msg);
            }
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    }, [onSuccess, onError]);

    const refetch = useCallback(() => { if (currentSiteId.current) fetchMedia(currentSiteId.current, currentParams.current); }, [fetchMedia]);
    const reset = useCallback(() => { setMedia([]); setError(null); }, []);

    useEffect(() => { if (autoFetch && siteId) fetchMedia(siteId, params); }, [autoFetch, siteId]); // eslint-disable-line
    useEffect(() => () => { isMounted.current = false; }, []);

    return { media, isLoading, error, fetchMedia, refetch, reset };
}

// ===== useSiteMassSchedules =====

interface UseSiteMassSchedulesOptions {
    params?: GetSiteMassSchedulesParams;
    autoFetch?: boolean;
    onSuccess?: (schedules: SiteMassSchedule[]) => void;
    onError?: (error: string) => void;
}

export function useSiteMassSchedules(siteId?: string, options: UseSiteMassSchedulesOptions = {}) {
    const { params, autoFetch = false, onSuccess, onError } = options;

    const [schedules, setSchedules] = useState<SiteMassSchedule[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const currentSiteId = useRef(siteId);
    const currentParams = useRef(params);
    const isMounted = useRef(true);

    const fetchSchedules = useCallback(async (id: string, fetchParams?: GetSiteMassSchedulesParams) => {
        setIsLoading(true);
        setError(null);
        currentSiteId.current = id;
        currentParams.current = fetchParams;

        try {
            const response = await pilgrimSiteApi.getSiteMassSchedules(id, fetchParams);
            if (isMounted.current && response.success) {
                setSchedules(response.data);
                onSuccess?.(response.data);
            }
        } catch (err: any) {
            if (isMounted.current) {
                const msg = err.message || 'Lỗi tải lịch lễ';
                setError(msg);
                onError?.(msg);
            }
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    }, [onSuccess, onError]);

    const refetch = useCallback(() => { if (currentSiteId.current) fetchSchedules(currentSiteId.current, currentParams.current); }, [fetchSchedules]);
    const reset = useCallback(() => { setSchedules([]); setError(null); }, []);

    useEffect(() => { if (autoFetch && siteId) fetchSchedules(siteId, params); }, [autoFetch, siteId]); // eslint-disable-line
    useEffect(() => () => { isMounted.current = false; }, []);

    return { schedules, isLoading, error, fetchSchedules, refetch, reset };
}

// ===== useSiteEvents =====

interface UseSiteEventsOptions {
    params?: GetSiteEventsParams;
    autoFetch?: boolean;
    onSuccess?: (events: SiteEvent[]) => void;
    onError?: (error: string) => void;
}

export function useSiteEvents(siteId?: string, options: UseSiteEventsOptions = {}) {
    const { params, autoFetch = false, onSuccess, onError } = options;

    const [events, setEvents] = useState<SiteEvent[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const currentSiteId = useRef(siteId);
    const currentParams = useRef(params);
    const isMounted = useRef(true);

    const fetchEvents = useCallback(async (id: string, fetchParams?: GetSiteEventsParams) => {
        setIsLoading(true);
        setError(null);
        currentSiteId.current = id;
        currentParams.current = fetchParams;

        try {
            const response = await pilgrimSiteApi.getSiteEvents(id, fetchParams);
            if (isMounted.current && response.success) {
                setEvents(response.data);
                onSuccess?.(response.data);
            }
        } catch (err: any) {
            if (isMounted.current) {
                const msg = err.message || 'Lỗi tải sự kiện';
                setError(msg);
                onError?.(msg);
            }
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    }, [onSuccess, onError]);

    const refetch = useCallback(() => { if (currentSiteId.current) fetchEvents(currentSiteId.current, currentParams.current); }, [fetchEvents]);
    const reset = useCallback(() => { setEvents([]); setError(null); }, []);

    useEffect(() => { if (autoFetch && siteId) fetchEvents(siteId, params); }, [autoFetch, siteId]); // eslint-disable-line
    useEffect(() => () => { isMounted.current = false; }, []);

    return { events, isLoading, error, fetchEvents, refetch, reset };
}

// ===== useSiteNearbyPlaces =====

interface UseSiteNearbyPlacesOptions {
    params?: GetSiteNearbyPlacesParams;
    autoFetch?: boolean;
    onSuccess?: (places: SiteNearbyPlace[]) => void;
    onError?: (error: string) => void;
}

export function useSiteNearbyPlaces(siteId?: string, options: UseSiteNearbyPlacesOptions = {}) {
    const { params, autoFetch = false, onSuccess, onError } = options;

    const [places, setPlaces] = useState<SiteNearbyPlace[]>([]);
    const [siteInfo, setSiteInfo] = useState<{ id: string; code: string; name: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const currentSiteId = useRef(siteId);
    const currentParams = useRef(params);
    const isMounted = useRef(true);

    const fetchNearbyPlaces = useCallback(async (id: string, fetchParams?: GetSiteNearbyPlacesParams) => {
        setIsLoading(true);
        setError(null);
        currentSiteId.current = id;
        currentParams.current = fetchParams;

        try {
            const response = await pilgrimSiteApi.getSiteNearbyPlaces(id, fetchParams);
            if (isMounted.current && response.success) {
                setPlaces(response.data.data);
                setSiteInfo(response.data.site);
                onSuccess?.(response.data.data);
            }
        } catch (err: any) {
            if (isMounted.current) {
                const msg = err.message || 'Lỗi tải địa điểm lân cận';
                setError(msg);
                onError?.(msg);
            }
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    }, [onSuccess, onError]);

    const refetch = useCallback(() => { if (currentSiteId.current) fetchNearbyPlaces(currentSiteId.current, currentParams.current); }, [fetchNearbyPlaces]);
    const reset = useCallback(() => { setPlaces([]); setSiteInfo(null); setError(null); }, []);

    useEffect(() => { if (autoFetch && siteId) fetchNearbyPlaces(siteId, params); }, [autoFetch, siteId]); // eslint-disable-line
    useEffect(() => () => { isMounted.current = false; }, []);

    return { places, siteInfo, isLoading, error, fetchNearbyPlaces, refetch, reset };
}

export default {
    useSites,
    useSiteDetail,
    useSiteMedia,
    useSiteMassSchedules,
    useSiteEvents,
    useSiteNearbyPlaces,
};
