/**
 * Site Schedule Helper
 * Parses opening hours, mass schedules, site events, and suggests optimal arrival times.
 * Supports all backend opening_hours formats (JSONB per-day, simple, or legacy string).
 */

import type { SiteEvent } from "../../../../types/pilgrim";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Parsed open/close time for a specific day */
export interface DaySchedule {
  open: string; // "HH:MM"
  close: string; // "HH:MM"
}

export interface SuggestedArrival {
  time: string; // "HH:MM"
  reason: string;
  priority: "event" | "mass" | "opening" | "default";
}

/** Matched event for a specific day */
export interface DayEvent {
  id: string;
  name: string;
  startTime?: string; // "HH:MM"
  endTime?: string; // "HH:MM"
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

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;
const DEFAULT_START_TIME = "08:00";
const PRE_EVENT_BUFFER_MINUTES = 30;
const POST_OPEN_BUFFER_MINUTES = 15;

// ─── Time Helpers ─────────────────────────────────────────────────────────────

/** Parse "HH:MM" to total minutes from midnight */
export const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Format total minutes back to "HH:MM" */
export const minutesToTime = (minutes: number): string => {
  const safeMinutes = ((minutes % 1440) + 1440) % 1440; // handle negative/overflow
  const h = Math.floor(safeMinutes / 60);
  const m = safeMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/** Subtract minutes from a "HH:MM" time string */
export const subtractMinutes = (time: string, mins: number): string =>
  minutesToTime(timeToMinutes(time) - mins);

/** Add minutes to a "HH:MM" time string */
export const addMinutes = (time: string, mins: number): string =>
  minutesToTime(timeToMinutes(time) + mins);

interface TimeWindowContext {
  selectedMin: number;
  selectedComparableMin: number;
  openMin?: number;
  closeMin?: number;
  closeComparableMin?: number;
  isOvernight: boolean;
}

const buildTimeWindowContext = (
  selectedTime: string,
  openTime?: string,
  closeTime?: string,
): TimeWindowContext => {
  const selectedMin = timeToMinutes(selectedTime);

  if (!closeTime) {
    return {
      selectedMin,
      selectedComparableMin: selectedMin,
      isOvernight: false,
    };
  }

  const closeMin = timeToMinutes(closeTime);

  if (!openTime) {
    return {
      selectedMin,
      selectedComparableMin: selectedMin,
      closeMin,
      closeComparableMin: closeMin,
      isOvernight: false,
    };
  }

  const openMin = timeToMinutes(openTime);
  const isOvernight = closeMin < openMin;

  if (!isOvernight) {
    return {
      selectedMin,
      selectedComparableMin: selectedMin,
      openMin,
      closeMin,
      closeComparableMin: closeMin,
      isOvernight: false,
    };
  }

  // Overnight example: open 18:00, close 02:00 (next day).
  const selectedComparableMin =
    selectedMin < openMin ? selectedMin + 1440 : selectedMin;

  return {
    selectedMin,
    selectedComparableMin,
    openMin,
    closeMin,
    closeComparableMin: closeMin + 1440,
    isOvernight: true,
  };
};

/** Format minutes to localized duration text */
export const formatDurationLocalized = (
  min: number,
  t: (key: string, options?: any) => string,
): string => {
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
  if (typeof openingHours === "string") {
    return parseTimeRange(openingHours);
  }

  if (typeof openingHours !== "object") return null;
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
      if (typeof dayHours === "string") {
        if (dayHours.toLowerCase() === "closed") return null;
        return parseTimeRange(dayHours);
      }
    }
  }

  // Fallback: Try all day keys and return the first one found
  for (const day of DAY_NAMES) {
    if (
      obj[day] &&
      typeof obj[day] === "string" &&
      obj[day].toLowerCase() !== "closed"
    ) {
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
  const [h, m] = time.split(":");
  return `${h.padStart(2, "0")}:${(m || "00").padStart(2, "0")}`;
};

// ─── Date for Day ─────────────────────────────────────────────────────────────

/** Get the Date object for a given planner day number (1-based) */
export const getDateForLeg = (
  planStartDate: string | undefined,
  legNumber: number,
): Date | undefined => {
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
    .filter((s) => s.days_of_week?.includes(dayOfWeek) && s.time)
    .map((s) => s.time!.substring(0, 5))
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
  const targetDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  return events
    .filter((ev) => {
      if (!ev.start_date) return false;
      const evStart = ev.start_date.substring(0, 10); // YYYY-MM-DD
      const evEnd = ev.end_date ? ev.end_date.substring(0, 10) : evStart;
      return targetDateStr >= evStart && targetDateStr <= evEnd;
    })
    .map((ev) => ({
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
  const {
    eventStartTime,
    eventName,
    massTimesForDay,
    openTime,
    closeTime,
    fastestArrival,
    t,
  } = params;
  const minArrival = fastestArrival ? timeToMinutes(fastestArrival) : 0;

  const normalizeByConstraints = (candidateMin: number): number | null => {
    let normalized = Math.max(candidateMin, minArrival);

    // Event day: ignore opening-hours window, only keep travel feasibility.
    if (eventStartTime) {
      return normalized;
    }

    if (!openTime || !closeTime) {
      return normalized;
    }

    const openMin = timeToMinutes(openTime);
    const closeMin = timeToMinutes(closeTime);

    if (closeMin >= openMin) {
      if (normalized < openMin) normalized = openMin;
      if (normalized > closeMin) return null;
      return normalized;
    }

    // Overnight opening window (e.g. 18:00 -> 02:00)
    if (normalized >= openMin || normalized <= closeMin) {
      return normalized;
    }

    return normalized < openMin ? openMin : null;
  };

  // Priority 1: Event / Sự kiện
  if (eventStartTime) {
    const suggestedMin =
      timeToMinutes(eventStartTime) - PRE_EVENT_BUFFER_MINUTES;
    const finalMin = normalizeByConstraints(suggestedMin);
    if (finalMin !== null) {
      return {
        time: minutesToTime(finalMin),
        reason: t("planner.suggested.event", {
          name: eventName || t("planner.term.event"),
          time: eventStartTime,
          buffer: PRE_EVENT_BUFFER_MINUTES,
        }),
        priority: "event",
      };
    }
  }

  // Priority 2: Giờ Lễ đầu tiên trong ngày (sau giờ có thể đến)
  if (massTimesForDay.length > 0) {
    const attendableMass = massTimesForDay.find(
      (t) => timeToMinutes(t) - PRE_EVENT_BUFFER_MINUTES >= minArrival,
    );

    if (attendableMass) {
      const suggestedMin =
        timeToMinutes(attendableMass) - PRE_EVENT_BUFFER_MINUTES;
      const finalMin = normalizeByConstraints(suggestedMin);
      if (finalMin !== null) {
        return {
          time: minutesToTime(finalMin),
          reason: t("planner.suggested.mass", {
            buffer: PRE_EVENT_BUFFER_MINUTES,
            time: attendableMass,
          }),
          priority: "mass",
        };
      }
    }
  }

  // Priority 3: Opening hours
  if (openTime) {
    const suggestedMin = timeToMinutes(openTime) + POST_OPEN_BUFFER_MINUTES;
    const finalMin = normalizeByConstraints(suggestedMin);
    if (finalMin !== null) {
      return {
        time: minutesToTime(finalMin),
        reason: t("planner.suggested.opening", {
          time: openTime,
          buffer: POST_OPEN_BUFFER_MINUTES,
        }),
        priority: "opening",
      };
    }
  }

  // Priority 4: Default
  const defaultMin = Math.max(timeToMinutes(DEFAULT_START_TIME), minArrival);
  const normalizedDefaultMin = normalizeByConstraints(defaultMin) ?? defaultMin;
  return {
    time: minutesToTime(normalizedDefaultMin),
    reason: t("planner.suggested.default"),
    priority: "default",
  };
};

// ─── Event window (for confirmation modal & insight) ───────────────────────

/**
 * Khi đến **trong** khung [start, end) nhưng đã trôi hơn **một nửa** thời lượng từ start,
 * trả về số phút còn lại trước khi sự kiện kết thúc (để cảnh báo người dùng).
 * Khác ngày / end <= start: trả về null.
 */
export function getEventPastHalfWindowWarning(
  estimatedTime: string,
  eventStartTime: string,
  eventEndTime: string,
): { remainingMinutes: number } | null {
  const a = timeToMinutes(estimatedTime);
  const s = timeToMinutes(eventStartTime);
  const e = timeToMinutes(eventEndTime);
  if (e <= s) return null;
  if (a < s || a >= e) return null;
  const span = e - s;
  const passed = a - s;
  if (passed / span <= 0.5) return null;
  return { remainingMinutes: e - a };
}

/**
 * Gợi ý **mặc định** thời gian nghỉ tại điểm (phút) khi mới mở form / gắn sự kiện.
 * Không dùng làm trần: người dùng có thể tăng tùy ý, kể cả qua nhiều ngày (lưu trú, ăn uống, y tế…).
 * Sự kiện / giờ đóng / hết ngày chỉ hỗ trợ tính gợi ý hợp lý **trong** ngày, không chặn giá trị sau khi chọn.
 */
export function suggestRestDurationForPlannedStop(input: {
  estimatedTime: string;
  eventEndTime?: string;
  siteCloseTime?: string;
}): { defaultMinutes: number } {
  const a = timeToMinutes(input.estimatedTime);
  let windowM = Math.max(0, 1440 - a);
  const c = input.siteCloseTime ? timeToMinutes(input.siteCloseTime) : null;
  const e = input.eventEndTime ? timeToMinutes(input.eventEndTime) : null;
  if (c != null && c > a) {
    windowM = Math.min(windowM, c - a);
  }
  if (e != null && e > a) {
    windowM = Math.min(windowM, e - a);
  }
  windowM = Math.max(0, Math.floor(windowM));

  const TYPICAL_DEFAULT = 120;
  const CHIP_MAX = 180;

  if (windowM <= 0) {
    return { defaultMinutes: TYPICAL_DEFAULT };
  }

  const minM = windowM < 15 ? 0 : Math.min(60, windowM);
  let def: number;
  if (windowM < TYPICAL_DEFAULT) {
    def = windowM;
  } else {
    def = Math.min(CHIP_MAX, TYPICAL_DEFAULT, windowM);
  }
  def = Math.max(minM, Math.min(def, windowM));
  return { defaultMinutes: def };
}

// ─── Insight Generator ────────────────────────────────────────────────────────

export type InsightType =
  | "error" // Physically impossible (not enough travel time)
  | "error_closed" // Site is closed at selected time
  | "event_late" // Arrives after event/mass start
  | "event_ok" // Arrives with buffer before event
  | "event_within" // Before event, but under the preferred buffer
  | "event_unreachable" // Even earliest arrival is after the event (from travel)
  | "early" // Arrives before opening
  | "late" // Arrives after closing
  | "buffer" // Good travel buffer
  | "first_stop" // First stop of day (info only)
  | "ideal"; // Perfect timing

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
  eventEndTime?: string;
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
    eventEndTime,
    eventName,
    openTime,
    closeTime,
    massTimesForDay,
    restDuration,
    t,
  } = params;

  const selectedMin = timeToMinutes(estimatedTime);
  const timeWindow = buildTimeWindowContext(estimatedTime, openTime, closeTime);

  // ── P1: Physical impossibility — not enough travel time ──
  // isBlocking = true → user cannot add with this time
  if (hasTravelInfo && fastestArrival) {
    const fastestMin = timeToMinutes(fastestArrival);
    if (selectedMin < fastestMin) {
      const shortage = fastestMin - selectedMin;
      return {
        type: "error",
        title: t("planner.insight.notEnoughTravelTime.title"),
        message: t("planner.insight.notEnoughTravelTime.message", {
          duration: formatDurationLocalized(travelMinutes || 0, t),
          fastest: fastestArrival,
          shortage: formatDurationLocalized(shortage, t),
        }),
        color: "#DC2626",
        bgColor: "#FEF2F2",
        iconName: "car-sport",
        isBlocking: true,
      };
    }
  }

  // ── P1b: "Unreachable" chỉ khi nhanh nhất cũng không tới nổi **trước lúc sự kiện kết thúc**
  // (trễ giờ bắt đầu nhưng còn trong [start, end) vẫn thêm được — xử lý ở P3 / modal 50%)
  if (eventStartTime && eventEndTime && hasTravelInfo && fastestArrival) {
    const fastestMin = timeToMinutes(fastestArrival);
    const eventStartMin = timeToMinutes(eventStartTime);
    const eventEndMin = timeToMinutes(eventEndTime);
    if (eventEndMin > eventStartMin && fastestMin >= eventEndMin) {
      const name = eventName || t("planner.term.event");
      return {
        type: "event_unreachable",
        title: t("planner.insight.eventUnreachable.title", {
          name,
          time: eventStartTime,
        }),
        message: t("planner.insight.eventUnreachable.messageWithEnd", {
          duration: formatDurationLocalized(travelMinutes || 0, t),
          fastest: fastestArrival,
          end: eventEndTime,
        }),
        color: "#B91C1C",
        bgColor: "#FEF2F2",
        iconName: "close-circle",
        isBlocking: true,
      };
    }
  }

  // ── P2: Hard guard by opening hours (apply for all cases, including event-linked items) ──
  if (
    !eventStartTime &&
    timeWindow.closeComparableMin !== undefined &&
    timeWindow.selectedComparableMin > timeWindow.closeComparableMin
  ) {
    const overMin =
      timeWindow.selectedComparableMin - timeWindow.closeComparableMin;
    return {
      type: "error_closed",
      title: t("planner.insight.siteClosed.title", { time: closeTime }),
      message: t("planner.insight.siteClosed.message", {
        selected: estimatedTime,
        diff: formatDurationLocalized(overMin, t),
      }),
      color: "#BE123C",
      bgColor: "#FFE4E6",
      iconName: "warning",
      isBlocking: true,
    };
  }

  const shouldWarnEarlyByOvernightGap =
    !eventStartTime &&
    timeWindow.isOvernight &&
    timeWindow.openMin !== undefined &&
    timeWindow.closeMin !== undefined &&
    selectedMin > timeWindow.closeMin &&
    selectedMin < timeWindow.openMin;

  if (
    !eventStartTime &&
    openTime &&
    (selectedMin < timeToMinutes(openTime) || shouldWarnEarlyByOvernightGap)
  ) {
    return {
      type: "early",
      title: t("planner.insight.arriveOutsideOperatingHoursTitle", {
        defaultValue: "Chưa trong giờ hoạt động (mở cửa lúc {{time}})",
        time: openTime,
      }),
      message: t("planner.insight.arriveOutsideOperatingHoursMessage", {
        defaultValue:
          "Không thể thêm vào lịch trình vì thời gian dự kiến đến ({{arrival}}) nằm ngoài khung giờ hoạt động của địa điểm. Vui lòng chọn giờ từ {{open}} trở đi.",
        arrival: estimatedTime,
        open: openTime,
      }),
      color: "#DC2626",
      bgColor: "#FEF2F2",
      iconName: "alert-circle-outline",
      isBlocking: true,
    };
  }

  // ── P3: Event timing insight ──
  if (eventStartTime) {
    const eventMin = timeToMinutes(eventStartTime);
    const diffMin = eventMin - selectedMin;
    if (diffMin < 0) {
      const lateByMin = Math.abs(diffMin);
      if (eventEndTime) {
        const eventEndMin = timeToMinutes(eventEndTime);
        if (eventEndMin > eventMin && selectedMin >= eventEndMin) {
          return {
            type: "event_late",
            title: t("planner.insight.eventAfterEnd.title", {
              defaultValue: "Đến sau khi sự kiện đã kết thúc",
            }),
            message: t("planner.insight.eventAfterEnd.message", {
              defaultValue:
                "Giờ bạn chọn ({{arrival}}) sau {{end}} — không còn trong thời gian diễn ra. Hãy điều chỉnh giờ dự kiến hoặc bỏ liên kết sự kiện.",
              arrival: estimatedTime,
              end: eventEndTime,
            }),
            color: "#B91C1C",
            bgColor: "#FEF2F2",
            iconName: "alert-circle",
            isBlocking: true,
          };
        }
        if (eventEndMin > eventMin && selectedMin < eventEndMin) {
          const remain = eventEndMin - selectedMin;
          return {
            type: "event_late",
            title: t("planner.insight.eventLateInWindow.title", {
              defaultValue: "Đến sau lúc bắt đầu, vẫn còn trong sự kiện",
            }),
            message: t("planner.insight.eventLateInWindow.message", {
              defaultValue:
                "Bạn tới trễ {{late}} so với lúc bắt đầu, nhưng vẫn còn {{remain}} nữa trước khi kết thúc ({{end}}). Bạn vẫn có thể thêm vào lịch nếu phù hợp.",
              late: formatDurationLocalized(lateByMin, t),
              remain: formatDurationLocalized(remain, t),
              end: eventEndTime,
            }),
            color: "#C2410C",
            bgColor: "rgba(194, 65, 12, 0.08)",
            iconName: "time-outline",
            isBlocking: false,
            visitingWindowMinutes: remain,
          };
        }
      }
      return {
        type: "event_late",
        title: t("planner.insight.eventLate.title", {
          name: eventName || t("planner.term.event"),
          time: eventStartTime,
        }),
        message: t("planner.insight.eventLate.message", {
          selected: estimatedTime,
          diff: formatDurationLocalized(lateByMin, t),
        }),
        color: "#BE123C",
        bgColor: "#FFE4E6",
        iconName: "alert-circle",
        isBlocking: false,
      };
    }

    const eventLabel = eventName || t("planner.term.event");
    const typeLabel = eventLabel
      .toLowerCase()
      .includes(t("planner.term.event").toLowerCase())
      ? t("planner.term.event")
      : t("planner.term.mass");

    const eventInsightType: "event_ok" | "event_within" =
      diffMin >= PRE_EVENT_BUFFER_MINUTES ? "event_ok" : "event_within";

    return {
      type: eventInsightType,
      title: t("planner.insight.eventOk.title", {
        name: eventLabel,
        time: eventStartTime,
      }),
      message:
        diffMin >= PRE_EVENT_BUFFER_MINUTES
          ? t("planner.insight.eventOk.message", {
              type: typeLabel,
              window: formatDurationLocalized(diffMin, t),
            })
          : t("planner.insight.eventOk.messageShort", {
              type: typeLabel,
              window: formatDurationLocalized(diffMin, t),
            }),
      color: diffMin >= PRE_EVENT_BUFFER_MINUTES ? "#1D4ED8" : "#D97706",
      bgColor:
        diffMin >= PRE_EVENT_BUFFER_MINUTES
          ? "rgba(29, 78, 216, 0.08)"
          : "rgba(217, 119, 6, 0.08)",
      iconName: "calendar",
      isBlocking: false,
      visitingWindowMinutes: diffMin,
    };
  }

  // ── P4: Mass schedule — warn if arriving after mass starts ──
  if (massTimesForDay.length > 0) {
    const nextMass = massTimesForDay.find(
      (t) => timeToMinutes(t) > selectedMin,
    );
    const currentMass = massTimesForDay.find(
      (t) =>
        timeToMinutes(t) <= selectedMin && selectedMin - timeToMinutes(t) < 60,
    );

    if (currentMass) {
      const late = selectedMin - timeToMinutes(currentMass);
      return {
        type: "event_late",
        title: t("planner.insight.massStarted.title", { time: currentMass }),
        message: t("planner.insight.massStarted.message", {
          late: formatDurationLocalized(late, t),
          target: subtractMinutes(currentMass, PRE_EVENT_BUFFER_MINUTES),
        }),
        color: "#D97706",
        bgColor: "rgba(217, 119, 6, 0.08)",
        iconName: "time-outline",
        isBlocking: false,
      };
    }

    if (nextMass) {
      const buffer = timeToMinutes(nextMass) - selectedMin;
      if (buffer <= 120 && buffer > 0) {
        return {
          type: "event_ok",
          title: t("planner.insight.eventOk.title", {
            name: t("planner.term.mass"),
            time: nextMass,
          }),
          message: t("planner.insight.eventOk.message", {
            type: t("planner.term.mass"),
            window: formatDurationLocalized(buffer, t),
          }),
          color: "#1D4ED8",
          bgColor: "rgba(29, 78, 216, 0.08)",
          iconName: "calendar",
          isBlocking: false,
          visitingWindowMinutes: buffer,
        };
      }
    }
  }

  // ── P5: Check if rest_duration goes past closing ──
  if (
    !eventStartTime &&
    timeWindow.closeComparableMin !== undefined &&
    restDuration
  ) {
    const leaveComparableMin = timeWindow.selectedComparableMin + restDuration;
    if (leaveComparableMin > timeWindow.closeComparableMin) {
      const overMin = leaveComparableMin - timeWindow.closeComparableMin;
      const visitWindow =
        timeWindow.closeComparableMin - timeWindow.selectedComparableMin;
      return {
        type: "late",
        title: t("planner.insight.stayPastClosing.title"),
        message: t("planner.insight.stayPastClosing.message", {
          selected: estimatedTime,
          duration: formatDurationLocalized(restDuration, t),
          leave: minutesToTime(leaveComparableMin),
          close: closeTime,
          over: formatDurationLocalized(overMin, t),
          window: formatDurationLocalized(visitWindow, t),
        }),
        color: "#D97706",
        bgColor: "rgba(217, 119, 6, 0.08)",
        iconName: "time-outline",
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
      const upcomingMass = massTimesForDay.find(
        (t) => timeToMinutes(t) > selectedMin,
      );
      const massCountdown = upcomingMass
        ? timeToMinutes(upcomingMass) - selectedMin
        : undefined;

      const visitWindow =
        timeWindow.closeComparableMin !== undefined
          ? timeWindow.closeComparableMin - timeWindow.selectedComparableMin
          : undefined;

      // If there's mass coming up, prioritize showing that
      if (upcomingMass && massCountdown && massCountdown > 0) {
        return {
          type: "event_ok",
          title: t("planner.insight.eventOk.title", {
            name: t("planner.term.mass"),
            time: upcomingMass,
          }),
          message: t("planner.insight.eventOk.message", {
            type: t("planner.term.mass"),
            window: formatDurationLocalized(massCountdown, t),
          }),
          color: "#1D4ED8",
          bgColor: "rgba(29, 78, 216, 0.08)",
          iconName: "calendar",
          isBlocking: false,
          visitingWindowMinutes: massCountdown,
        };
      }

      return {
        type: "buffer",
        title: t("planner.insight.goodBuffer.title"),
        message:
          visitWindow && visitWindow > 0
            ? t("planner.insight.goodBuffer.message", {
                buffer: formatDurationLocalized(bufferMin, t),
                window: formatDurationLocalized(visitWindow, t),
              })
            : t("planner.insight.goodBuffer.messageOnly", {
                buffer: formatDurationLocalized(bufferMin, t),
              }),
        color: "#059669",
        bgColor: "rgba(5, 150, 105, 0.08)",
        iconName: "shield-checkmark-outline",
        isBlocking: false,
        visitingWindowMinutes: visitWindow,
      };
    }
  }

  // ── P7: First stop — info card ──
  // If there's a mass/event coming up, show it prominently like the event_ok style
  if (!hasTravelInfo) {
    // Check for upcoming mass on this day
    const upcomingMass = massTimesForDay.find(
      (t) => timeToMinutes(t) > selectedMin,
    );
    const massCountdown = upcomingMass
      ? timeToMinutes(upcomingMass) - selectedMin
      : undefined;

    // If there's an upcoming mass, show mass-focused insight
    if (upcomingMass && massCountdown && massCountdown > 0) {
      const scheduleParts: string[] = [];
      if (openTime)
        scheduleParts.push(`${t("planner.openingHours")}: ${openTime}`);
      if (closeTime)
        scheduleParts.push(`${t("planner.closingHours")}: ${closeTime}`);

      return {
        type: "first_stop",
        title: t("planner.insight.eventOk.title", {
          name: t("planner.term.mass"),
          time: upcomingMass,
        }),
        message: t("planner.insight.firstStop.message", {
          schedule: scheduleParts.length > 0 ? scheduleParts.join(" • ") : "",
          window: formatDurationLocalized(massCountdown, t),
        }),
        color: "#1D4ED8",
        bgColor: "rgba(29, 78, 216, 0.08)",
        iconName: "calendar",
        isBlocking: false,
        visitingWindowMinutes: massCountdown,
      };
    }

    // No mass — show opening hours info
    const parts: string[] = [];
    if (openTime) parts.push(`${t("planner.openingHours")}: ${openTime}`);
    if (closeTime) parts.push(`${t("planner.closingHours")}: ${closeTime}`);
    if (massTimesForDay.length > 0)
      parts.push(`${t("planner.term.mass")}: ${massTimesForDay.join(", ")}`);

    const visitWindow =
      timeWindow.closeComparableMin !== undefined
        ? timeWindow.closeComparableMin - timeWindow.selectedComparableMin
        : undefined;

    let msg = parts.length > 0 ? `${parts.join(" • ")}. ` : "";
    msg += t("planner.insight.firstStop.messageNoMass");
    if (visitWindow && visitWindow > 0 && closeTime) {
      msg += `\n${t("planner.stayUntilClosing")}: ~${formatDurationLocalized(visitWindow, t)}.`;
    }

    return {
      type: "first_stop",
      title: t("planner.insight.firstStop.title"),
      message: msg,
      color: "#059669",
      bgColor: "rgba(5, 150, 105, 0.08)",
      iconName: "checkmark-circle-outline",
      isBlocking: false,
      visitingWindowMinutes: visitWindow,
    };
  }

  // ── Default: ideal ──
  const visitWindow =
    timeWindow.closeComparableMin !== undefined
      ? timeWindow.closeComparableMin - timeWindow.selectedComparableMin
      : undefined;

  return {
    type: "ideal",
    title: t("planner.insight.ideal.title"),
    message:
      visitWindow && visitWindow > 0
        ? t("planner.insight.ideal.message", {
            window: formatDurationLocalized(visitWindow, t),
          })
        : t("planner.insight.ideal.messageNoWindow"),
    color: "#059669",
    bgColor: "rgba(5, 150, 105, 0.08)",
    iconName: "checkmark-circle-outline",
    isBlocking: false,
    visitingWindowMinutes: visitWindow,
  };
};
