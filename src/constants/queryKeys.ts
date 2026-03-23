
export const USER_KEYS = {
    profile: ['user', 'profile'] as const,
};

export const GUIDE_KEYS = {
    all: ['guide'] as const,
    site: (id?: string) => [...GUIDE_KEYS.all, 'site', id ? id : 'current'] as const,
    events: (filters?: Record<string, any>) => [...GUIDE_KEYS.all, 'events', filters] as const,
    media: (filters?: Record<string, any>) => [...GUIDE_KEYS.all, 'media', filters] as const,
    /** Mô hình 3D đã duyệt (site-media) — màn xem full không qua list */
    siteModels3d: () => [...GUIDE_KEYS.all, 'siteModels3d'] as const,
    /** Danh sách giọng TTS (VBee) — GET /local-guide/media/voices */
    narrativeTtsVoices: (language?: string) =>
        [...GUIDE_KEYS.all, 'narrative', 'ttsVoices', language ?? 'all'] as const,
    schedules: (filters?: Record<string, any>) => [...GUIDE_KEYS.all, 'schedules', filters] as const,
    notifications: () => [...GUIDE_KEYS.all, 'notifications'] as const,
    dashboard: {
        all: () => [...GUIDE_KEYS.all, 'dashboard'] as const,
        siteInfo: () => [...GUIDE_KEYS.all, 'dashboard', 'siteInfo'] as const,
        activeShift: (weekStart: string) => [...GUIDE_KEYS.all, 'dashboard', 'activeShift', weekStart] as const,
        todayOverview: () => [...GUIDE_KEYS.all, 'dashboard', 'todayOverview'] as const,
        sosInfo: () => [...GUIDE_KEYS.all, 'dashboard', 'sosInfo'] as const,
        recentActivity: () => [...GUIDE_KEYS.all, 'dashboard', 'recentActivity'] as const,
        notifications: () => [...GUIDE_KEYS.all, 'dashboard', 'notifications'] as const,
        pendingCounts: () => [...GUIDE_KEYS.all, 'dashboard', 'pendingCounts'] as const,
    },
    sos: {
        all: () => [...GUIDE_KEYS.all, 'sos'] as const,
        list: (params?: any) => [...GUIDE_KEYS.all, 'sos', 'list', params] as const,
        detail: (id: string) => [...GUIDE_KEYS.all, 'sos', 'detail', id] as const,
    },
    shiftSubmissions: {
        all: ['guide', 'shift-submissions'] as const,
        list: (filters?: any) => [...['guide', 'shift-submissions'], 'list', filters] as const,
        detail: (id: string) => [...['guide', 'shift-submissions'], 'detail', id] as const,
    },
};

export const VERIFICATION_KEYS = {
    all: ['verification'] as const,
    myRequest: () => [...VERIFICATION_KEYS.all, 'myRequest'] as const,
};

export const FAVORITE_KEYS = {
    all: ['favorites'] as const,
    ids: () => [...FAVORITE_KEYS.all, 'ids'] as const,
    list: (params?: any) => [...FAVORITE_KEYS.all, 'list', params] as const,
};

export const SITE_KEYS = {
    all: ['sites'] as const,
    list: (params?: any) => [...SITE_KEYS.all, 'list', params] as const,
    detail: (id: string) => [...SITE_KEYS.all, 'detail', id] as const,
};
