/**
 * Guide Types - Index
 * Central export for all Local Guide type definitions
 *
 * Usage:
 * import { MediaItem, LocalGuideSite, ScheduleItem, EventItem } from '@/types/guide';
 */

// Dashboard types
export * from "./dashboard.types";

// Dashboard Home types (Active Shift, SOS, Recent Activity, etc.)
export * from "./dashboard-home.types";

// Mass Schedule types (Lịch lễ)
export * from "./mass-schedule.types";

// Site types
export * from "./site.types";

// Media types
export * from "./media.types";

// Model 3D narrative (TTS / audio) — API layer: `services/api/guide/narrativeApi.ts`
export * from "./narrative.types";

// Event types
export * from "./event.types";

// Schedule types
export * from "./schedule.types";

// Interaction types (messages, reviews)
export * from "./interaction.types";

// Review tracking types (reviewed_by, reviewed_at, reviewer)
export * from "./review-tracking.types";

// News types
export * from "./news.types";

// SOS types
export * from "./sos.types";

// Common types (re-export for convenience)
export { DayOfWeek } from "../common.types";
