
export const GUIDE_KEYS = {
    all: ['guide'] as const,
    site: (id?: string) => [...GUIDE_KEYS.all, 'site', id ? id : 'current'] as const,
    events: (filters?: Record<string, any>) => [...GUIDE_KEYS.all, 'events', filters] as const,
    media: (filters?: Record<string, any>) => [...GUIDE_KEYS.all, 'media', filters] as const,
    schedules: (filters?: Record<string, any>) => [...GUIDE_KEYS.all, 'schedules', filters] as const,
    notifications: () => [...GUIDE_KEYS.all, 'notifications'] as const,
    dashboard: () => [...GUIDE_KEYS.all, 'dashboard'] as const,
};
