import * as ExpoCalendar from "expo-calendar";
import { Platform } from "react-native";

import { PlanCalendarSyncData, PlanCalendarSyncEvent } from "../../types/pilgrim";
import storageService from "../storage/asyncStorage";

const STORAGE_KEY = "@planner_calendar_sync_v1";
const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";
const DEFAULT_CALENDAR_COLOR = "#cfaa3a";

interface PlannerCalendarSyncRecord {
  plannerId: string;
  calendarId: string;
  calendarName: string;
  eventMap: Record<string, string>;
  syncedAt: string;
}

interface PlannerCalendarSyncStore {
  planners: Record<string, PlannerCalendarSyncRecord>;
}

interface ResolvedCalendar {
  id: string;
  title: string;
}

export interface PlannerCalendarSyncResult {
  calendarId: string;
  calendarName: string;
  created: number;
  updated: number;
  deleted: number;
  total: number;
}

const isWritableCalendar = (calendar: ExpoCalendar.Calendar) =>
  calendar.allowsModifications !== false;

const getRecommendedCalendarName = (payload: PlanCalendarSyncData) =>
  payload.sync_instructions?.recommended_calendar_name?.trim() ||
  `Pilgrimage - ${payload.planner.name}`;

const getSyncKey = (event: PlanCalendarSyncEvent) =>
  event.metadata?.planner_item_id || event.metadata?.site_id || event.id;

const parseEventDate = (value: string) => {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`Invalid calendar date: ${value}`);
  }
  return parsedDate;
};

const getAlarmList = (
  event: PlanCalendarSyncEvent,
  fallbackOffsets?: number[],
): ExpoCalendar.Alarm[] | undefined => {
  if (event.alarms?.length) {
    return event.alarms.map((alarm) => ({
      relativeOffset: alarm.relativeOffset,
      method: alarm.method as ExpoCalendar.AlarmMethod | undefined,
    }));
  }

  if (fallbackOffsets?.length) {
    return fallbackOffsets.map((offset) => ({
      relativeOffset: offset,
    }));
  }

  return undefined;
};

const buildEventDetails = (
  payload: PlanCalendarSyncData,
  event: PlanCalendarSyncEvent,
): Omit<Partial<ExpoCalendar.Event>, "id" | "organizer"> => {
  const timeZone =
    event.timeZone || payload.sync_instructions?.timezone || DEFAULT_TIMEZONE;
  const startDate = parseEventDate(event.startDate);
  let endDate = parseEventDate(event.endDate);

  if (endDate.getTime() <= startDate.getTime()) {
    endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  }

  const alarms = getAlarmList(event, payload.sync_instructions?.alarm_offsets);

  // Ensure notes is always a string
  let notes: string | undefined = undefined;
  if (event.notes) {
    if (typeof event.notes === 'string') {
      // Check if string contains [object Object] - this means backend didn't format properly
      if (event.notes.includes('[object Object]')) {
        // Try to clean it up - remove the [object Object] part
        notes = event.notes.replace(/\[object Object\]/g, '(xem chi tiết trong app)');
      } else {
        notes = event.notes;
      }
    } else if (typeof event.notes === 'object') {
      const notesObj = event.notes as any;
      
      // Handle different object formats
      if (notesObj.start && notesObj.end) {
        // Break time format: { start: "14:00", end: "15:00" }
        notes = `Thời gian nghỉ: ${notesObj.start} - ${notesObj.end}`;
      } else if (notesObj.hours !== undefined || notesObj.minutes !== undefined) {
        // Duration format: { hours: 2, minutes: 30 }
        const hours = notesObj.hours || 0;
        const minutes = notesObj.minutes || 0;
        if (hours > 0 && minutes > 0) {
          notes = `Thời gian dừng: ${hours} giờ ${minutes} phút`;
        } else if (hours > 0) {
          notes = `Thời gian dừng: ${hours} giờ`;
        } else if (minutes > 0) {
          notes = `Thời gian dừng: ${minutes} phút`;
        }
      } else if (notesObj.value !== undefined && notesObj.unit) {
        // Duration format: { value: 2, unit: "hours" }
        const unitMap: Record<string, string> = {
          hours: 'giờ',
          hour: 'giờ',
          minutes: 'phút',
          minute: 'phút',
          days: 'ngày',
          day: 'ngày',
        };
        const unit = unitMap[notesObj.unit] || notesObj.unit;
        notes = `Thời gian dừng: ${notesObj.value} ${unit}`;
      } else {
        // Fallback: convert to JSON
        try {
          notes = JSON.stringify(event.notes, null, 2);
        } catch {
          notes = String(event.notes);
        }
      }
    } else {
      notes = String(event.notes);
    }
  }

  return {
    title: event.title,
    startDate,
    endDate,
    timeZone,
    endTimeZone: timeZone,
    location: event.location || undefined,
    notes,
    alarms,
    allDay: false,
  };
};

const getStoredSyncState = async (): Promise<PlannerCalendarSyncStore> => {
  const storedState =
    await storageService.getObject<PlannerCalendarSyncStore>(STORAGE_KEY);
  return storedState || { planners: {} };
};

const saveSyncState = async (state: PlannerCalendarSyncStore) => {
  await storageService.setObject(STORAGE_KEY, state);
};

const ensureCalendarPermissions = async () => {
  if (Platform.OS === "web") {
    throw new Error("Calendar sync is only supported on iOS and Android.");
  }

  let permission = await ExpoCalendar.getCalendarPermissionsAsync();
  if (!permission.granted) {
    permission = await ExpoCalendar.requestCalendarPermissionsAsync();
  }

  if (!permission.granted) {
    throw new Error("Calendar permission was not granted.");
  }
};

const getWritableCalendars = async () => {
  const calendars = await ExpoCalendar.getCalendarsAsync(
    ExpoCalendar.EntityTypes.EVENT,
  );
  return calendars.filter(isWritableCalendar);
};

const createPlannerCalendar = async (
  calendarName: string,
): Promise<ResolvedCalendar> => {
  const calendarDetails: Partial<ExpoCalendar.Calendar> = {
    title: calendarName,
    color: DEFAULT_CALENDAR_COLOR,
    entityType: ExpoCalendar.EntityTypes.EVENT,
    name: calendarName,
    ownerAccount: calendarName,
    accessLevel: ExpoCalendar.CalendarAccessLevel.OWNER,
  };

  if (Platform.OS === "ios") {
    const defaultCalendar = await ExpoCalendar.getDefaultCalendarAsync();
    calendarDetails.source = defaultCalendar.source;
    calendarDetails.sourceId = defaultCalendar.source?.id;
  } else {
    calendarDetails.source = {
      isLocalAccount: true,
      name: calendarName,
      type: ExpoCalendar.SourceType.LOCAL,
    } as ExpoCalendar.Source;
    calendarDetails.isVisible = true;
    calendarDetails.isSynced = true;
  }

  const calendarId = await ExpoCalendar.createCalendarAsync(calendarDetails);
  return {
    id: calendarId,
    title: calendarName,
  };
};

const resolveCalendar = async (
  calendarName: string,
  existingCalendarId?: string,
): Promise<ResolvedCalendar> => {
  const calendars = await getWritableCalendars();

  if (existingCalendarId) {
    const existingCalendar = calendars.find(
      (calendar) => calendar.id === existingCalendarId,
    );
    if (existingCalendar) {
      if (existingCalendar.title !== calendarName) {
        try {
          await ExpoCalendar.updateCalendarAsync(existingCalendar.id, {
            title: calendarName,
            color: DEFAULT_CALENDAR_COLOR,
          });
        } catch (error) {
          console.warn("Update calendar title error:", error);
        }
      }

      return {
        id: existingCalendar.id,
        title: calendarName,
      };
    }
  }

  const matchedByName = calendars.find(
    (calendar) => calendar.title === calendarName,
  );
  if (matchedByName) {
    return {
      id: matchedByName.id,
      title: matchedByName.title,
    };
  }

  try {
    return await createPlannerCalendar(calendarName);
  } catch (error) {
    console.warn("Create planner calendar error:", error);
    const fallbackCalendar = calendars[0];
    if (!fallbackCalendar) {
      throw new Error("No writable calendar is available on this device.");
    }

    return {
      id: fallbackCalendar.id,
      title: fallbackCalendar.title,
    };
  }
};

class CalendarService {
  async syncPlannerCalendar(
    payload: PlanCalendarSyncData,
  ): Promise<PlannerCalendarSyncResult> {
    await ensureCalendarPermissions();

    const syncState = await getStoredSyncState();
    const existingRecord = syncState.planners[payload.planner.id];
    const requestedCalendarName = getRecommendedCalendarName(payload);

    let resolvedCalendar: ResolvedCalendar | null = existingRecord?.calendarId
      ? {
          id: existingRecord.calendarId,
          title: existingRecord.calendarName || requestedCalendarName,
        }
      : null;

    if (payload.events.length > 0) {
      resolvedCalendar = await resolveCalendar(
        requestedCalendarName,
        existingRecord?.calendarId,
      );
    }

    const nextEventMap: Record<string, string> = {};
    let created = 0;
    let updated = 0;

    for (const event of payload.events) {
      const syncKey = getSyncKey(event);
      const eventDetails = buildEventDetails(payload, event);
      const existingEventId = existingRecord?.eventMap?.[syncKey];

      if (existingEventId) {
        try {
          await ExpoCalendar.updateEventAsync(existingEventId, eventDetails);
          nextEventMap[syncKey] = existingEventId;
          updated += 1;
          continue;
        } catch (error) {
          console.warn(`Update calendar event error for ${syncKey}:`, error);
        }
      }

      if (!resolvedCalendar?.id) {
        throw new Error("No target calendar is available for sync.");
      }

      const createdEventId = await ExpoCalendar.createEventAsync(
        resolvedCalendar.id,
        eventDetails,
      );
      nextEventMap[syncKey] = createdEventId;
      created += 1;
    }

    let deleted = 0;
    for (const [syncKey, eventId] of Object.entries(
      existingRecord?.eventMap || {},
    )) {
      if (nextEventMap[syncKey]) {
        continue;
      }

      try {
        await ExpoCalendar.deleteEventAsync(eventId);
        deleted += 1;
      } catch (error) {
        console.warn(`Delete stale calendar event error for ${syncKey}:`, error);
      }
    }

    if (resolvedCalendar || existingRecord) {
      syncState.planners[payload.planner.id] = {
        plannerId: payload.planner.id,
        calendarId: resolvedCalendar?.id || existingRecord?.calendarId || "",
        calendarName:
          resolvedCalendar?.title ||
          existingRecord?.calendarName ||
          requestedCalendarName,
        eventMap: nextEventMap,
        syncedAt: new Date().toISOString(),
      };
      await saveSyncState(syncState);
    }

    return {
      calendarId: resolvedCalendar?.id || existingRecord?.calendarId || "",
      calendarName:
        resolvedCalendar?.title ||
        existingRecord?.calendarName ||
        requestedCalendarName,
      created,
      updated,
      deleted,
      total: payload.events.length,
    };
  }
}

export const calendarService = new CalendarService();
export default calendarService;