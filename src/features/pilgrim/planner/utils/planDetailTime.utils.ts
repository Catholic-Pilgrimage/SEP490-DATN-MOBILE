export const buildDurationString = (totalMinutes: number): string => {
  const dh = Math.floor(totalMinutes / 60);
  const dm = totalMinutes % 60;
  if (dh > 0 && dm > 0) {
    return `${dh} ${dh === 1 ? "hour" : "hours"} ${dm} ${dm === 1 ? "minute" : "minutes"}`;
  }
  if (dh > 0) return `${dh} ${dh === 1 ? "hour" : "hours"}`;
  return `${totalMinutes} ${totalMinutes === 1 ? "minute" : "minutes"}`;
};

export const parseDurationToMinutesRaw = (
  durationStr: any,
  formatTimeValue: (v: any) => string,
): number => {
  if (!durationStr) return 0;
  const durStr = formatTimeValue(durationStr).toLowerCase();
  let minutes = 0;
  const hourMatch = durStr.match(/(\d+)\s*hour|(\d+)\s*gi[oờ]/);
  const minMatch = durStr.match(/(\d+)\s*minute|(\d+)\s*ph[uút]/);

  if (hourMatch) {
    minutes += parseInt(hourMatch[1] || hourMatch[2]) * 60;
  }
  if (minMatch) {
    minutes += parseInt(minMatch[1] || minMatch[2]);
  }
  if (!hourMatch && !minMatch) {
    const rawMatch = durStr.match(/(\d+)/);
    if (rawMatch) minutes = parseInt(rawMatch[1]);
  }
  return minutes;
};

export const calculateEndTimeRaw = (
  startTimeStr: any,
  durationStr: any,
  formatTimeValue: (v: any) => string,
): string => {
  if (!startTimeStr) return "";
  const startStr = formatTimeValue(startTimeStr);
  const durationMins = parseDurationToMinutesRaw(durationStr, formatTimeValue);
  if (!durationMins) return startStr;
  const [hours, minutes] = startStr.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) return startStr;
  const date = new Date();
  date.setHours(hours);
  date.setMinutes(minutes + durationMins);
  return `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
};

export const getDateForDayRaw = (startDateStr: string, dayNumber: number): string => {
  try {
    const date = new Date(startDateStr);
    date.setDate(date.getDate() + (dayNumber - 1));
    return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${date.getFullYear()}`;
  } catch {
    return "";
  }
};
