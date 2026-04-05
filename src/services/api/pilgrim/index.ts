/**
 * Pilgrim API Index
 * Central export for all Pilgrim API services
 *
 * Usage:
 * import { pilgrimSiteApi, pilgrimJournalApi } from '@/services/api/pilgrim';
 *
 * // Or import specific functions
 * import { getSites, getNearbySites } from '@/services/api/pilgrim/siteApi';
 */

// Site/Explore API
export * from "./siteApi";
export { default as pilgrimSiteApi } from "./siteApi";

// Journal API
export * from "./journalApi";
export { default as pilgrimJournalApi } from "./journalApi";

// Planner API
export * from "./plannerApi";
export { default as pilgrimPlannerApi } from "./plannerApi";

// Community API
export * from "./communityApi";
export { default as pilgrimCommunityApi } from "./communityApi";

// Verification API
export * from "./verificationApi";
export { default as pilgrimVerificationApi } from "./verificationApi";

// Dashboard API
export * from "./dashboardApi";
export { default as pilgrimDashboardApi } from "./dashboardApi";

// Wallet API
export * from "./walletApi";
export { default as pilgrimWalletApi } from "./walletApi";

// Friendship API
export * from "./friendshipApi";
export { default as pilgrimFriendshipApi } from "./friendshipApi";

// Combined Pilgrim API
import pilgrimCommunityApi from "./communityApi";
import pilgrimDashboardApi from "./dashboardApi";
import pilgrimJournalApi from "./journalApi";
import pilgrimPlannerApi from "./plannerApi";
import pilgrimSiteApi from "./siteApi";
import pilgrimVerificationApi from "./verificationApi";
import pilgrimWalletApi from "./walletApi";
import pilgrimFriendshipApi from "./friendshipApi";

const pilgrimApis = {
  site: pilgrimSiteApi,
  journal: pilgrimJournalApi,
  planner: pilgrimPlannerApi,
  community: pilgrimCommunityApi,
  verification: pilgrimVerificationApi,
  dashboard: pilgrimDashboardApi,
  wallet: pilgrimWalletApi,
  friendship: pilgrimFriendshipApi,
};

export default pilgrimApis;
