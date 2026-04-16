/**
 * Navigation Reference
 * 
 * Provides a global navigation ref that can be used outside of React component tree.
 * This is essential for navigating from notification handlers, background tasks, etc.
 */

import { CommonActions, createNavigationContainerRef } from '@react-navigation/native';
import { runWithActionGuard } from '../utils/actionGuard';

export const navigationRef = createNavigationContainerRef<any>();

/**
 * Navigate to a screen from anywhere in the app
 */
export function navigate(name: string, params?: Record<string, any>) {
    const guardKey = `global-nav:${name}`;
    if (navigationRef.isReady()) {
        runWithActionGuard(guardKey, () => {
            navigationRef.navigate(name, params);
        });
    } else {
        // If navigation isn't ready yet (cold start), wait and retry
        setTimeout(() => {
            if (navigationRef.isReady()) {
                runWithActionGuard(guardKey, () => {
                    navigationRef.navigate(name, params);
                });
            }
        }, 1000);
    }
}

/**
 * Reset navigation stack and navigate
 */
export function resetAndNavigate(name: string, params?: Record<string, any>) {
    const guardKey = `global-reset-nav:${name}`;
    if (navigationRef.isReady()) {
        runWithActionGuard(guardKey, () => {
            navigationRef.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [{ name, params }],
                })
            );
        });
    }
}
