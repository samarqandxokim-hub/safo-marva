type ClockParts = { hour: number; minute: number };

export type PostingSchedule = {
  startTime: string;
  endTime: string;
  postsPerDay: number;
  timezone?: string;
};

export function clockToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (minute > 59 || hour > 24 || (hour === 24 && minute !== 0)) return null;
  return hour * 60 + minute;
}

function localDateParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function addDays(dateKey: string, amount: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, "0"), String(date.getUTCDate()).padStart(2, "0")].join("-");
}

function dateKeyFromParts(parts: { year: number; month: number; day: number }) {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function zonedLocalMinuteToUtc(dateKey: string, minuteOfDay: number, timezone: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const desiredLocal = new Date(Date.UTC(year, month - 1, day) + minuteOfDay * 60_000);
  const targetUtcLike = desiredLocal.getTime();
  let candidate = targetUtcLike;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const values = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(candidate));
    const parts = Object.fromEntries(values.map((part) => [part.type, part.value]));
    const localAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    const adjustment = targetUtcLike - localAsUtc;
    if (adjustment === 0) break;
    candidate += adjustment;
  }

  return new Date(candidate);
}

export function validateSchedule(schedule: PostingSchedule) {
  const start = clockToMinutes(schedule.startTime);
  const end = clockToMinutes(schedule.endTime);
  if (start === null || end === null) return "Vaqtni HH:MM formatida kiriting (masalan, 12:00 va 24:00).";
  if (!Number.isInteger(schedule.postsPerDay) || schedule.postsPerDay < 1 || schedule.postsPerDay > 30) {
    return "Kunlik e’lonlar soni 1 dan 30 tagacha bo‘lishi kerak.";
  }
  if (start === end && schedule.postsPerDay > 1) return "Bir kunda bir necha e’lon uchun vaqt oralig‘ini kengaytiring.";
  if (!schedule.timezone) return "Vaqt mintaqasini ko‘rsating.";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: schedule.timezone }).format(new Date());
  } catch {
    return "Vaqt mintaqasi noto‘g‘ri.";
  }
  return null;
}

export function getNextScheduledAt(schedule: PostingSchedule, after = new Date()) {
  const error = validateSchedule(schedule);
  if (error) throw new Error(error);

  const start = clockToMinutes(schedule.startTime) as number;
  let end = clockToMinutes(schedule.endTime) as number;
  if (end < start) end += 24 * 60;

  const timezone = schedule.timezone ?? "Asia/Tashkent";
  const nowParts = localDateParts(after, timezone);
  const firstDate = dateKeyFromParts(nowParts);

  for (let dayOffset = 0; dayOffset < 4; dayOffset += 1) {
    const dateKey = addDays(firstDate, dayOffset);
    for (let index = 0; index < schedule.postsPerDay; index += 1) {
      const fraction = schedule.postsPerDay === 1 ? 0 : index / (schedule.postsPerDay - 1);
      const minute = Math.round(start + (end - start) * fraction);
      const candidate = zonedLocalMinuteToUtc(dateKey, minute, timezone);
      if (candidate.getTime() > after.getTime()) return candidate;
    }
  }

  throw new Error("Jadval bo‘yicha keyingi vaqtni hisoblab bo‘lmadi.");
}

export function scheduleSlots(schedule: PostingSchedule) {
  const start = clockToMinutes(schedule.startTime) as number;
  let end = clockToMinutes(schedule.endTime) as number;
  if (end < start) end += 24 * 60;
  return Array.from({ length: schedule.postsPerDay }, (_, index) => {
    const fraction = schedule.postsPerDay === 1 ? 0 : index / (schedule.postsPerDay - 1);
    const minute = Math.round(start + (end - start) * fraction);
    const normalized = minute % (24 * 60);
    const parts: ClockParts = { hour: Math.floor(normalized / 60), minute: normalized % 60 };
    return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
  });
}
