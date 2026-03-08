// User type definitions

import { UserRole } from "./common.types";

/**
 * Full User interface
 */
export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  address?: string;
  bio?: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * User Profile (extended user info)
 */
export interface UserProfile extends User {
  dateOfBirth?: string;
  gender?: "male" | "female" | "other";
  nationality?: string;
  language?: string;
  timezone?: string;
  // Stats
  visitedSites?: number;
  totalJournals?: number;
  totalPlans?: number;
  // For guides
  guideSince?: string;
  assignedSiteId?: string;
  rating?: number;
  totalReviews?: number;
}

/**
 * User Settings
 */
export interface UserSettings {
  // Appearance
  theme: "light" | "dark" | "system";
  language: "vi" | "en";

  // Notifications
  pushNotifications: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;

  // Privacy
  showProfile: boolean;
  showActivity: boolean;
  allowMessages: boolean;

  // App preferences
  autoPlayVideos: boolean;
  downloadOverWifiOnly: boolean;
  locationSharing: boolean;
}

/**
 * Update Profile Request
 */
export interface UpdateProfileRequest {
  fullName?: string;
  phone?: string;
  address?: string;
  bio?: string;
  avatar?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other";
  nationality?: string;
  language?: "vi" | "en";
}
