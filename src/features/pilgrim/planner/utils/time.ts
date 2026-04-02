export const buildDurationString = (totalMinutes: number): string => {
  const safeMinutes = Math.max(0, Math.floor(totalMinutes || 0));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  if (hours > 0 && minutes > 0) {
    return `${hours} ${hours === 1 ? "hour" : "hours"} ${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  }
  if (hours > 0) {
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }
  return `${safeMinutes} ${safeMinutes === 1 ? "minute" : "minutes"}`;
};

export const formatTimeValue = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") {
    if (/^\d{2}:\d{2}:\d{2}$/.test(value)) return value.substring(0, 5);
    return value;
  }
  if (typeof value === "object" && value !== null) {
    const maybe = value as { hours?: number; minutes?: number };
    const hours = Number(maybe.hours || 0);
    const minutes = Number(maybe.minutes || 0);
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
  }
  return String(value);
};

export const parseDurationToMinutes = (duration: unknown): number => {
  if (!duration) return 0;
  const source = formatTimeValue(duration).toLowerCase();
  let result = 0;
  const hourMatch = source.match(/(\d+)\s*(hour|hours|h|gi[oờ])/);
  const minuteMatch = source.match(/(\d+)\s*(minute|minutes|min|m|ph[uú]t)/);
  if (hourMatch) result += Number(hourMatch[1]) * 60;
  if (minuteMatch) result += Number(minuteMatch[1]);
  if (!hourMatch && !minuteMatch) {
    const raw = source.match(/(\d+)/);
    if (raw) result = Number(raw[1]);
  }
  return result;
};

export const calculateEndTime = (
  startTime: unknown,
  duration: unknown,
): string => {
  const start = formatTimeValue(startTime);
  if (!start) return "";
  const durationMinutes = parseDurationToMinutes(duration);
  if (!durationMinutes) return start;
  const [h, m] = start.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return start;
  const d = new Date();
  d.setHours(h);
  d.setMinutes(m + durationMinutes);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
