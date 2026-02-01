/**
 * Central Types Export
 * Re-export all type definitions from a single entry point
 *
 * Structure:
 * ├── api.types.ts     - API response/request types
 * ├── auth.types.ts    - Authentication types
 * ├── common.types.ts  - Shared utility types
 * ├── user.types.ts    - User profile types
 * ├── navigation.types.ts - React Navigation types
 * ├── guide/           - Local Guide specific types
 * └── pilgrim/         - Pilgrim specific types
 *
 * Usage:
 * import { User, ApiResponse, MediaItem } from '@/types';
 * import { LocalGuideSite, MediaItem } from '@/types/guide';
 * import { TripPlan, JournalEntry } from '@/types/pilgrim';
 */

// ============================================
// CORE TYPES
// ============================================
export * from "./api.types";
export * from "./auth.types";
export * from "./common.types";
export * from "./navigation.types";
export * from "./user.types";

// ============================================
// GUIDE TYPES (Organized by domain)
// ============================================
export * from "./guide";

// ============================================
// PILGRIM TYPES (Organized by domain)
// ============================================
export * from "./pilgrim";

