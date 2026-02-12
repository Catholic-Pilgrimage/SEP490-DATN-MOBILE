
// Query Keys
export const DASHBOARD_KEYS = {
    all: ['dashboard'] as const,
    siteInfo: () => [...DASHBOARD_KEYS.all, 'siteInfo'] as const,
    activeShift: (weekStart: string) => [...DASHBOARD_KEYS.all, 'activeShift', weekStart] as const,
    todayOverview: () => [...DASHBOARD_KEYS.all, 'todayOverview'] as const,
    sosInfo: () => [...DASHBOARD_KEYS.all, 'sosInfo'] as const,
    recentActivity: () => [...DASHBOARD_KEYS.all, 'recentActivity'] as const,
    notifications: () => [...DASHBOARD_KEYS.all, 'notifications'] as const,
    pendingCounts: () => [...DASHBOARD_KEYS.all, 'pendingCounts'] as const,
};
