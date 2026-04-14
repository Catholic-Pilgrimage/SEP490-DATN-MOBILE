/**
 * Site Schedule Helper
 * Parses opening hours, mass schedules, site events, and suggests optimal arrival times.
 * Supports all backend opening_hours formats (JSONB per-day, simple, or legacy string).
 */

import type { SiteEvent } from '../../../../types/pilgrim';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Parsed open/close time for a specific day */
export interface DaySchedule {
  open: string;  // "HH:MM"
  close: string; // "HH:MM"
}

export interface SuggestedArrival {
  time: string;  // "HH:MM"
  reason: string;
  priority: 'event' | 'mass' | 'opening' | 'default';
}

/** Matched event for a specific day */
export interface DayEvent {
  id: string;
  name: string;
  startTime?: string; // "HH:MM"
  endTime?: string;   // "HH:MM"
  description?: string;
}

export interface SiteScheduleInfo {
  openTime?: string;
  closeTime?: string;
  isClosed?: boolean;
  massTimesForDay: string[];
  eventsForDay: DayEvent[];
  eventStartTime?: string;
  eventName?: string;
  suggestedArrival: SuggestedArrival;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const DEFAULT_START_TIME = '08:00';
const PRE_EVENT_BUFFER_MINUTES = 30;
const POST_OPEN_BUFFER_MINUTES = 15;

// ─── Time Helpers ─────────────────────────────────────────────────────────────

/** Parse "HH:MM" to total minutes from midnight */
export const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Format total minutes back to "HH:MM" */
export const minutesToTime = (minutes: number): string => {
  const safeMinutes = ((minutes % 1440) + 1440) % 1440; // handle negative/overflow
  const h = Math.floor(safeMinutes / 60);
  const m = safeMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/** Subtract minutes from a "HH:MM" time string */
export const subtractMinutes = (time: string, mins: number): string =>
  minutesToTime(timeToMinutes(time) - mins);

/** Add minutes to a "HH:MM" time string */
export const addMinutes = (time: string, mins: number): string =>
  minutesToTime(timeToMinutes(time) + mins);

/** Format minutes to localized duration text */
export const formatDurationLocalized = (min: number, t: (key: string, options?: any) => string): string => {
  if (min <= 0) return t("planner.term.durationMinutes", { m: 0 });
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0 && m > 0) return t("planner.term.durationHoursMinutes", { h, m });
  if (h > 0) return t("planner.term.durationHours", { h });
  return t("planner.term.durationMinutes", { m });
};

// ─── Opening Hours Parser ─────────────────────────────────────────────────────

/**
 * Parse backend `opening_hours` field (multiple formats) for a specific date.
 *
 * Supported formats:
 * 1. JSONB per-day: { "monday": "05:00-18:00", "sunday": "06:00-20:00" }
 * 2. JSONB simple:  { "open": "06:00", "close": "18:00" }
 * 3. Legacy string: "05:00-18:00"
 */
export const parseOpeningHours = (
  openingHours: unknown,
  date?: Date,
): DaySchedule | null => {
  if (!openingHours) return null;

  // Format 3: Legacy string "HH:MM - HH:MM"
  if (typeof openingHours === 'string') {
    return parseTimeRange(openingHours);
  }

  if (typeof openingHours !== 'object') return null;
  const obj = openingHours as Record<string, string>;

  // Format 2: Simple { open, close }
  if (obj.open && obj.close) {
    return { open: normalizeTime(obj.open), close: normalizeTime(obj.close) };
  }

  // Format 1: Per-day { monday: "05:00-18:00", ... }
  if (date) {
    const dayName = DAY_NAMES[date.getDay()];
    const dayHours = obj[dayName];
    if (dayHours) {
      if (typeof dayHours === 'string') {
        if (dayHours.toLowerCase() === 'closed') return null;
        return parseTimeRange(dayHours);
      }
    }
  }

  // Fallback: Try all day keys and return the first one found
  for (const day of DAY_NAMES) {
    if (obj[day] && typeof obj[day] === 'string' && obj[day].toLowerCase() !== 'closed') {
      return parseTimeRange(obj[day]);
    }
  }

  return null;
};

/** Parse a time range string like "05:00-18:00" or "05:00 - 18:00" */
const parseTimeRange = (str: string): DaySchedule | null => {
  const match = str.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (!match) return null;
  return { open: normalizeTime(match[1]), close: normalizeTime(match[2]) };
};

/** Ensure time is in "HH:MM" format (pad single digit hours) */
const normalizeTime = (time: string): string => {
  const [h, m] = time.split(':');
  return `${h.padStart(2, '0')}:${(m || '00').padStart(2, '0')}`;
};

// ─── Date for Day ─────────────────────────────────────────────────────────────

/** Get the Date object for a given planner day number (1-based) */
export const getDateForLeg = (planStartDate: string | undefined, legNumber: number): Date | undefined => {
  if (!planStartDate) return undefined;
  const d = new Date(planStartDate);
  if (isNaN(d.getTime())) return undefined;
  d.setDate(d.getDate() + (legNumber - 1));
  return d;
};

// ─── Mass Schedule Helper ─────────────────────────────────────────────────────

interface MassScheduleRaw {
  time?: string;
  days_of_week?: number[];
  note?: string;
}

/**
 * Filter mass schedules for a specific date's day of week.
 * Returns sorted time strings "HH:MM".
 */
export const getMassTimesForDate = (
  schedules: MassScheduleRaw[] | undefined,
  date: Date | undefined,
): string[] => {
  if (!schedules?.length || !date) return [];
  const dayOfWeek = date.getDay(); // 0=Sunday
  return schedules
    .filter(s => s.days_of_week?.includes(dayOfWeek) && s.time)
    .map(s => s.time!.substring(0, 5))
    .sort();
};

// ─── Event Schedule Helper ────────────────────────────────────────────────────

/**
 * Filter site events that are active on a specific date.
 * Returns DayEvent[] with time normalised to "HH:MM".
 */
export const getEventsForDate = (
  events: SiteEvent[] | undefined,
  date: Date | undefined,
): DayEvent[] => {
  if (!events?.length || !date) return [];

  // Normalise target date to YYYY-MM-DD for comparison
  const targetDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  return events
    .filter(ev => {
      if (!ev.start_date) return false;
      const evStart = ev.start_date.substring(0, 10); // YYYY-MM-DD
      const evEnd = ev.end_date ? ev.end_date.substring(0, 10) : evStart;
      return targetDateStr >= evStart && targetDateStr <= evEnd;
    })
    .map(ev => ({
      id: String(ev.id),
      name: ev.name,
      startTime: ev.start_time ? ev.start_time.substring(0, 5) : undefined,
      endTime: ev.end_time ? ev.end_time.substring(0, 5) : undefined,
      description: ev.description || undefined,
    }))
    .sort((a, b) => {
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      return a.startTime.localeCompare(b.startTime);
    });
};

// ─── Smart Suggestion ─────────────────────────────────────────────────────────

/**
 * Suggest the best arrival time based on all available schedule info.
 * Priority: event > mass > opening hours > default
 */
export const suggestArrivalTime = (params: {
  eventStartTime?: string;
  eventName?: string;
  massTimesForDay: string[];
  openTime?: string;
  closeTime?: string;
  fastestArrival?: string; // earliest possible given travel constraints
  t: (key: string, options?: any) => string;
}): SuggestedArrival => {
  const { eventStartTime, eventName, massTimesForDay, openTime, fastestArrival, t } = params;
  const minArrival = fastestArrival ? timeToMinutes(fastestArrival) : 0;

  // Priority 1: Event / Sự kiện
  if (eventStartTime) {
    const suggestedMin = timeToMinutes(eventStartTime) - PRE_EVENT_BUFFER_MINUTES;
    const finalMin = Math.max(suggestedMin, minArrival);
    return {
      time: minutesToTime(finalMin),
      reason: t("planner.suggested.event", { 
        name: eventName || t("planner.term.event"), 
        time: eventStartTime, 
        buffer: PRE_EVENT_BUFFER_MINUTES 
      }),
      priority: 'event',
    };
  }

  // Priority 2: Giờ Lễ đầu tiên trong ngày (sau giờ có thể đến)
  if (massTimesForDay.length > 0) {
    const attendableMass = massTimesForDay.find(
      t => timeToMinutes(t) - PRE_EVENT_BUFFER_MINUTES >= minArrival,
    );

    if (attendableMass) {
      const suggestedMin = timeToMinutes(attendableMass) - PRE_EVENT_BUFFER_MINUTES;
      return {
        time: minutesToTime(suggestedMin),
        reason: t("planner.suggested.mass", { 
          buffer: PRE_EVENT_BUFFER_MINUTES, 
          time: attendableMass 
        }),
        priority: 'mass',
      };
    }
  }

  // Priority 3: Opening hours
  if (openTime) {
    const suggestedMin = timeToMinutes(openTime) + POST_OPEN_BUFFER_MINUTES;
    const finalMin = Math.max(suggestedMin, minArrival);
    return {
      time: minutesToTime(finalMin),
      reason: t("planner.suggested.opening", { 
        time: openTime, 
        buffer: POST_OPEN_BUFFER_MINUTES 
      }),
      priority: 'opening',
    };
  }

  // Priority 4: Default
  const defaultMin = Math.max(timeToMinutes(DEFAULT_START_TIME), minArrival);
  return {
    time: minutesToTime(defaultMin),
    reason: t("planner.suggested.default"),
    priority: 'default',
  };
};

// ─── Insight Generator ────────────────────────────────────────────────────────

export type InsightType =
  | 'error'        // Physically impossible (not enough travel time)
  | 'error_closed' // Site is closed at selected time
  | 'event_late'   // Arrives after event/mass start
  | 'event_ok'     // Arrives with buffer before event
  | 'early'        // Arrives before opening
  | 'late'         // Arrives after closing
  | 'buffer'       // Good travel buffer
  | 'first_stop'   // First stop of day (info only)
  | 'ideal';       // Perfect timing

export interface ScheduleInsight {
  type: InsightType;
  title: string;
  message: string;
  color: string;
  bgColor: string;
  iconName: string;
  /** When true, the "Add" button should be disabled – user MUST pick another time */
  isBlocking: boolean;
  /** Optional: how long user can spend at this site before closing (minutes) */
  visitingWindowMinutes?: number;
}

/**
 * Generate a context-aware schedule insight based on the selected arrival time
 * and all available constraints.
 *
 * @param restDuration - How long the user plans to stay at this site (minutes).
 *   Used to determine if they'd overstay past closing.
 */
export const generateInsight = (params: {
  estimatedTime: string;
  hasTravelInfo: boolean;
  fastestArrival?: string;
  travelMinutes?: number;
  eventStartTime?: string;
  eventName?: string;
  openTime?: string;
  closeTime?: string;
  massTimesForDay: string[];
  restDuration?: number;
  t: (key: string, options?: any) => string;
}): ScheduleInsight => {
  const {
    estimatedTime,
    hasTravelInfo,
    fastestArrival,
    travelMinutes,
    eventStartTime,
    eventName,
    openTime,
    closeTime,
    massTimesForDay,
    restDuration,
    t,
  } = params;

  const selectedMin = timeToMinutes(estimatedTime);

  // ── P1: Physical impossibility — not enough travel time ──
  // isBlocking = true → user cannot add with this time
  if (hasTravelInfo && fastestArrival) {
    const fastestMin = timeToMinutes(fastestArrival);
    if (selectedMin < fastestMin) {
      const shortage = fastestMin - selectedMin;
      return {
        type: 'error',
        title: t("planner.insight.notEnoughTravelTime.title"),
        message: t("planner.insight.notEnoughTravelTime.message", {
          duration: formatDurationLocalized(travelMinutes || 0, t),
          fastest: fastestArrival,
          shortage: formatDurationLocalized(shortage, t)
        }),
        color: '#DC2626',
        bgColor: '#FEF2F2',
        iconName: 'car-sport',
        isBlocking: true,
      };
    }
  }

  // ── P2: Event timing (takes priority over opening hours — backend skips opening hours when event exists) ──
  if (eventStartTime) {
    const eventMin = timeToMinutes(eventStartTime);
    const diffMin = eventMin - selectedMin;
    if (diffMin < 0) {
      return {
        type: 'event_late',
        title: t("planner.insight.eventLate.title", {
          name: eventName || t("planner.term.event"),
          time: eventStartTime
        }),
        message: t("planner.insight.eventLate.message", {
          selected: estimatedTime,
          diff: formatDurationLocalized(Math.abs(diffMin), t)
        }),
        color: '#BE123C',
        bgColor: '#FFE4E6',
        iconName: 'alert-circle',
        isBlocking: false,
      };
    }

    const eventLabel = eventName || t("planner.term.event");
    const typeLabel = eventLabel.toLowerCase().includes(t("planner.term.event").toLowerCase()) ? t("planner.term.event") : t("planner.term.mass");

    return {
      type: 'event_ok',
      title: t("planner.insight.eventOk.title", { name: eventLabel, time: eventStartTime }),
      message: diffMin >= PRE_EVENT_BUFFER_MINUTES
        ? t("planner.insight.eventOk.message", { type: typeLabel, window: formatDurationLocalized(diffMin, t) })
        : t("planner.insight.eventOk.messageShort", { type: typeLabel, window: formatDurationLocalized(diffMin, t) }),
      color: diffMin >= PRE_EVENT_BUFFER_MINUTES ? '#1D4ED8' : '#D97706',
      bgColor: diffMin >= PRE_EVENT_BUFFER_MINUTES ? 'rgba(29, 78, 216, 0.08)' : 'rgba(217, 119, 6, 0.08)',
      iconName: 'calendar',
      isBlocking: false,
      visitingWindowMinutes: diffMin,
    };
  }

  // ── P3: Arriving after closing — isBlocking (skip when event exists) ──
  if (!eventStartTime && closeTime && selectedMin > timeToMinutes(closeTime)) {
    return {
      type: 'error_closed',
      title: t("planner.insight.siteClosed.title", { time: closeTime }),
      message: t("planner.insight.siteClosed.message", {
        selected: estimatedTime,
        diff: formatDurationLocalized(selectedMin - timeToMinutes(closeTime), t)
      }),
      color: '#BE123C',
      bgColor: '#FFE4E6',
      iconName: 'warning',
      isBlocking: true,
    };
  }

  // ── P3b: Mass schedule — warn if arriving after mass starts ──
  if (massTimesForDay.length > 0) {
    const nextMass = massTimesForDay.find(t => timeToMinutes(t) > selectedMin);
    const currentMass = massTimesForDay.find(
      t => timeToMinutes(t) <= selectedMin && selectedMin - timeToMinutes(t) < 60,
    );

    if (currentMass) {
      const late = selectedMin - timeToMinutes(currentMass);
      return {
        type: 'event_late',
        title: t("planner.insight.massStarted.title", { time: currentMass }),
        message: t("planner.insight.massStarted.message", {
          late: formatDurationLocalized(late, t),
          target: subtractMinutes(currentMass, PRE_EVENT_BUFFER_MINUTES)
        }),
        color: '#D97706',
        bgColor: 'rgba(217, 119, 6, 0.08)',
        iconName: 'time-outline',
        isBlocking: false,
      };
    }

    if (nextMass) {
      const buffer = timeToMinutes(nextMass) - selectedMin;
      if (buffer <= 120 && buffer > 0) {
        return {
          type: 'event_ok',
          title: t("planner.insight.eventOk.title", { name: t("planner.term.mass"), time: nextMass }),
          message: t("planner.insight.eventOk.message", { type: t("planner.term.mass"), window: formatDurationLocalized(buffer, t) }),
          color: '#1D4ED8',
          bgColor: 'rgba(29, 78, 216, 0.08)',
          iconName: 'calendar',
          isBlocking: false,
          visitingWindowMinutes: buffer,
        };
      }
    }
  }

  // ── P4: Arriving before opening (skip when event exists) ──
  if (!eventStartTime && openTime && selectedMin < timeToMinutes(openTime)) {
    const waitMin = timeToMinutes(openTime) - selectedMin;
    return {
      type: 'early',
      title: t("planner.insight.arriveEarly.title", { time: openTime }),
      message: t("planner.insight.arriveEarly.message", { wait: formatDurationLocalized(waitMin, t) }),
      color: '#D97706',
      bgColor: 'rgba(217, 119, 6, 0.08)',
      iconName: 'time-outline',
      isBlocking: false,
    };
  }

  // ── P5: Check if rest_duration goes past closing (skip when event exists) ──
  if (!eventStartTime && closeTime && restDuration) {
    const leaveMin = selectedMin + restDuration;
    const closeMin = timeToMinutes(closeTime);
    if (leaveMin > closeMin) {
      const overMin = leaveMin - closeMin;
      const visitWindow = closeMin - selectedMin;
      return {
        type: 'late',
        title: t("planner.insight.stayPastClosing.title"),
        message: t("planner.insight.stayPastClosing.message", {
          selected: estimatedTime,
          duration: formatDurationLocalized(restDuration, t),
          leave: minutesToTime(leaveMin),
          close: closeTime,
          over: formatDurationLocalized(overMin, t),
          window: formatDurationLocalized(visitWindow, t)
        }),
        color: '#D97706',
        bgColor: 'rgba(217, 119, 6, 0.08)',
        iconName: 'time-outline',
        isBlocking: false, // warning only, backend allows it
        visitingWindowMinutes: visitWindow,
      };
    }
  }

  // ── P6: Good buffer time from travel — show visiting/event window ──
  if (hasTravelInfo && fastestArrival) {
    const bufferMin = selectedMin - timeToMinutes(fastestArrival);
    if (bufferMin > 0) {
      // Check if there's an upcoming mass to show countdown to
      const upcomingMass = massTimesForDay.find(t => timeToMinutes(t) > selectedMin);
      const massCountdown = upcomingMass
        ? timeToMinutes(upcomingMass) - selectedMin
        : undefined;

      const visitWindow = closeTime
        ? timeToMinutes(closeTime) - selectedMin
        : undefined;

      // If there's mass coming up, prioritize showing that
      if (upcomingMass && massCountdown && massCountdown > 0) {
        return {
          type: 'event_ok',
          title: t("planner.insight.eventOk.title", { name: t("planner.term.mass"), time: upcomingMass }),
          message: t("planner.insight.eventOk.message", { type: t("planner.term.mass"), window: formatDurationLocalized(massCountdown, t) }),
          color: '#1D4ED8',
          bgColor: 'rgba(29, 78, 216, 0.08)',
          iconName: 'calendar',
          isBlocking: false,
          visitingWindowMinutes: massCountdown,
        };
      }

      return {
        type: 'buffer',
        title: t("planner.insight.goodBuffer.title"),
        message: visitWindow && visitWindow > 0 
          ? t("planner.insight.goodBuffer.message", { buffer: formatDurationLocalized(bufferMin, t), window: formatDurationLocalized(visitWindow, t) })
          : t("planner.insight.goodBuffer.messageOnly", { buffer: formatDurationLocalized(bufferMin, t) }),
        color: '#059669',
        bgColor: 'rgba(5, 150, 105, 0.08)',
        iconName: 'shield-checkmark-outline',
        isBlocking: false,
        visitingWindowMinutes: visitWindow,
      };
    }
  }

  // ── P7: First stop — info card ──
  // If there's a mass/event coming up, show it prominently like the event_ok style
  if (!hasTravelInfo) {
    // Check for upcoming mass on this day
    const upcomingMass = massTimesForDay.find(t => timeToMinutes(t) > selectedMin);
    const massCountdown = upcomingMass
      ? timeToMinutes(upcomingMass) - selectedMin
      : undefined;

    // If there's an upcoming mass, show mass-focused insight
    if (upcomingMass && massCountdown && massCountdown > 0) {
      const scheduleParts: string[] = [];
      if (openTime) scheduleParts.push(`${t("planner.openingHours")}: ${openTime}`);
      if (closeTime) scheduleParts.push(`${t("planner.closingHours")}: ${closeTime}`);

      return {
        type: 'first_stop',
        title: t("planner.insight.eventOk.title", { name: t("planner.term.mass"), time: upcomingMass }),
        message: t("planner.insight.firstStop.message", {
          schedule: scheduleParts.length > 0 ? scheduleParts.join(' • ') : '',
          window: formatDurationLocalized(massCountdown, t)
        }),
        color: '#1D4ED8',
        bgColor: 'rgba(29, 78, 216, 0.08)',
        iconName: 'calendar',
        isBlocking: false,
        visitingWindowMinutes: massCountdown,
      };
    }

    // No mass — show opening hours info
    const parts: string[] = [];
    if (openTime) parts.push(`${t("planner.openingHours")}: ${openTime}`);
    if (closeTime) parts.push(`${t("planner.closingHours")}: ${closeTime}`);
    if (massTimesForDay.length > 0) parts.push(`${t("planner.term.mass")}: ${massTimesForDay.join(', ')}`);

    const visitWindow = closeTime
      ? timeToMinutes(closeTime) - selectedMin
      : undefined;

    let msg = parts.length > 0
      ? `${parts.join(' • ')}. `
      : '';
    msg += t("planner.insight.firstStop.messageNoMass");
    if (visitWindow && visitWindow > 0 && closeTime) {
      msg += `\n${t("planner.stayUntilClosing")}: ~${formatDurationLocalized(visitWindow, t)}.`;
    }

    return {
      type: 'first_stop',
      title: t("planner.insight.firstStop.title"),
      message: msg,
      color: '#059669',
      bgColor: 'rgba(5, 150, 105, 0.08)',
      iconName: 'checkmark-circle-outline',
      isBlocking: false,
      visitingWindowMinutes: visitWindow,
    };
  }

  // ── Default: ideal ──
  const visitWindow = closeTime
    ? timeToMinutes(closeTime) - selectedMin
    : undefined;

  return {
    type: 'ideal',
    title: t("planner.insight.ideal.title"),
    message: visitWindow && visitWindow > 0
      ? t("planner.insight.ideal.message", { window: formatDurationLocalized(visitWindow, t) })
      : t("planner.insight.ideal.messageNoWindow"),
    color: '#059669',
    bgColor: 'rgba(5, 150, 105, 0.08)',
    iconName: 'checkmark-circle-outline',
    isBlocking: false,
    visitingWindowMinutes: visitWindow,
  };
};
