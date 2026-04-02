// Navigation helper functions
// Centralized navigation logic to avoid duplication

import { CommonActions, NavigationContainerRef } from '@react-navigation/native';
import { UserRole } from '../types/common.types';
import { navigationRef } from './navigationRef';

/**
 * Determine navigation destination based on auth state and user role
 * 
 * @param isAuthenticated - Whether user is authenticated
 * @param isGuest - Whether user is in guest mode
 * @param userRole - User role ('local_guide' or 'pilgrim')
 * @returns Navigation destination route name
 */
export function getNavigationDestination(
  isAuthenticated: boolean,
  isGuest: boolean,
  userRole?: UserRole
): 'Auth' | 'Main' | 'GuideMain' {
  if (isAuthenticated && userRole) {
    // Authenticated user → Navigate based on role
    return userRole === 'local_guide' ? 'GuideMain' : 'Main';
  }

  if (isGuest) {
    // Guest user → Pilgrim app with limited access
    return 'Main';
  }

  // Not authenticated and not guest → Auth screen
  return 'Auth';
}

/**
 * Navigate to appropriate screen based on auth state and user role
 * 
 * @param navigation - Navigation ref or navigation prop
 * @param isAuthenticated - Whether user is authenticated
 * @param isGuest - Whether user is in guest mode
 * @param userRole - User role ('local_guide' or 'pilgrim')
 */
export function navigateToAppropriateScreen(
  navigation: NavigationContainerRef<any> | any,
  isAuthenticated: boolean,
  isGuest: boolean,
  userRole?: UserRole
): void {
  const destination = getNavigationDestination(isAuthenticated, isGuest, userRole);

  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: destination }],
    })
  );
}

/**
 * Navigate to Auth screen (Login/Register)
 */
export function navigateToAuth(navigation: NavigationContainerRef<any> | any): void {
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: 'Auth' }],
    })
  );
}

/**
 * Navigate to Main screen (Pilgrim app)
 */
export function navigateToMain(navigation: NavigationContainerRef<any> | any): void {
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    })
  );
}

/**
 * Navigate to GuideMain screen (Local Guide app)
 */
export function navigateToGuideMain(navigation: NavigationContainerRef<any> | any): void {
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: 'GuideMain' }],
    })
  );
}

/**
 * Reset root stack to Main → Lịch trình → PlanDetail (invite flow).
 * Dùng navigationRef để gọi từ Auth / sau login khi cần mở thẳng kế hoạch.
 */
export function resetToPlanDetailWithInvite(planId: string, inviteToken: string): void {
  const run = () => {
    if (!navigationRef.isReady()) return false;
    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'Main',
            state: {
              routes: [
                {
                  name: 'MainTabs',
                  state: {
                    routes: [
                      { name: 'Hanh huong' },
                      { name: 'Nhat ky' },
                      {
                        name: 'Lich trinh',
                        state: {
                          routes: [
                            { name: 'PlannerMain' },
                            {
                              name: 'PlanDetailScreen',
                              params: { planId, inviteToken },
                            },
                          ],
                          index: 1,
                        },
                      },
                      { name: 'Cong dong' },
                      { name: 'Ho so' },
                    ],
                    index: 2,
                  },
                },
              ],
            },
          },
        ],
      }),
    );
    return true;
  };
  if (!run()) {
    setTimeout(() => run(), 320);
  }
}

/**
 * Reset root stack to Main → Lịch trình → PlannerMain (tab Được mời).
 * Dùng cho deep link invite: lưu token rồi đưa user vào danh sách lời mời.
 */
export function resetToPlannerInvitesTab(): void {
  const run = () => {
    if (!navigationRef.isReady()) return false;
    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: "Main",
            state: {
              routes: [
                {
                  name: "MainTabs",
                  state: {
                    routes: [
                      { name: "Hanh huong" },
                      { name: "Nhat ky" },
                      {
                        name: "Lich trinh",
                        state: {
                          routes: [
                            {
                              name: "PlannerMain",
                              params: { initialTab: "invited" },
                            },
                          ],
                          index: 0,
                        },
                      },
                      { name: "Cong dong" },
                      { name: "Ho so" },
                    ],
                    index: 2,
                  },
                },
              ],
            },
          },
        ],
      }),
    );
    return true;
  };
  if (!run()) {
    setTimeout(() => run(), 320);
  }
}
