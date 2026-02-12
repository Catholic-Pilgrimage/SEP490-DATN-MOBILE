// Navigation helper functions
// Centralized navigation logic to avoid duplication

import { CommonActions, NavigationContainerRef } from '@react-navigation/native';
import { UserRole } from '../types/common.types';

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
