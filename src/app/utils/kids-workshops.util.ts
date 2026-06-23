export const KIDS_AREA_SESSION_CAPACITY = 25;

export interface KidsActivitySlot {
  id: number;
  activityId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  groupLabel?: string;
  groupLabelAr?: string;
  capacity?: number | null;
  isAllDay?: boolean;
  isActive: boolean;
}

export interface KidsActivity {
  id: number;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  price?: number;
  activityType?: number;
  isActive: boolean;
  slots: KidsActivitySlot[];
}

export interface BookableSession {
  sessionKey: string;
  activityId: number;
  activityNameEn: string;
  activityNameAr: string;
  date: string;
  slotId: number;
  startTime: string;
  endTime: string;
  groupLabel?: string;
  groupLabelAr?: string;
  bookedCount: number;
  capacity: number | null;
  spotsLeft: number | null;
  hasCapacityLimit: boolean;
  isFull: boolean;
  isAllDay?: boolean;
  isAvailable?: boolean;
  timeStatus?: string;
}

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

export function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function normalizeTime(value: unknown): string {
  const raw = pickString(value);
  if (!raw) return '';

  if (/^\d{1,2}:\d{2}$/.test(raw)) {
    const [h, m] = raw.split(':');
    return `${pad2(Number(h))}:${m}`;
  }

  if (/^\d{1,2}:\d{2}:\d{2}/.test(raw)) {
    const [h, m] = raw.split(':');
    return `${pad2(Number(h))}:${m}`;
  }

  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    return `${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`;
  }

  return raw;
}

function normalizeDayOfWeek(value: unknown): number {
  const day = toNumber(value, -1);
  return day >= 0 && day <= 6 ? day : -1;
}

function unwrapList(response: any): any[] {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.activities)) return response.activities;
  if (Array.isArray(response?.result)) return response.result;
  return [];
}

function hasCapacityLimit(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

function resolveCapacity(value: unknown): number | null {
  if (!hasCapacityLimit(value)) return null;
  return Number(value);
}

function resolveRemainingCapacity(
  slot: any,
  capacity: number | null,
  bookedCount: number
): number | null {
  if (capacity === null) return null;

  const rawRemaining = slot?.remainingCapacity ?? slot?.RemainingCapacity;
  if (rawRemaining !== null && rawRemaining !== undefined) {
    return Math.max(0, toNumber(rawRemaining, 0));
  }

  return Math.max(0, capacity - bookedCount);
}

function isSlotClosed(slot: any): boolean {
  if (slot?.isCurrentlyOpen === false) return true;
  const status = pickString(slot?.timeStatus, slot?.TimeStatus).toLowerCase();
  return status === 'closed';
}

function resolveSlotBookability(slot: any): {
  isFull: boolean;
  hasCapacityLimit: boolean;
  capacity: number | null;
  spotsLeft: number | null;
  isAvailable: boolean;
} {
  const capacity = resolveCapacity(slot?.capacity ?? slot?.Capacity);
  const hasLimit = capacity !== null;
  const bookedCount = toNumber(slot?.bookedCount ?? slot?.BookedCount, 0);
  const remainingCapacity = resolveRemainingCapacity(slot, capacity, bookedCount);
  const closed = isSlotClosed(slot);

  if (!hasLimit) {
    return {
      isFull: closed,
      hasCapacityLimit: false,
      capacity: null,
      spotsLeft: null,
      isAvailable: !closed,
    };
  }

  const isFull =
    closed || (remainingCapacity ?? 0) <= 0 || slot?.isAvailable === false;

  return {
    isFull,
    hasCapacityLimit: true,
    capacity,
    spotsLeft: remainingCapacity,
    isAvailable: !isFull,
  };
}

function normalizeSlot(raw: any, activityId: number): KidsActivitySlot | null {
  const id = toNumber(raw?.id ?? raw?.slotId ?? raw?.SlotId, 0);
  const dayOfWeek = normalizeDayOfWeek(
    raw?.dayOfWeek ?? raw?.DayOfWeek ?? raw?.day ?? raw?.Day
  );
  const startTime = normalizeTime(raw?.startTime ?? raw?.StartTime);
  const endTime = normalizeTime(raw?.endTime ?? raw?.EndTime);

  if (!id || !startTime || !endTime) return null;

  const isActive = raw?.isActive ?? raw?.IsActive;
  if (isActive === false) return null;

  return {
    id,
    activityId: toNumber(raw?.activityId ?? raw?.ActivityId, activityId),
    dayOfWeek: dayOfWeek >= 0 ? dayOfWeek : 0,
    startTime,
    endTime,
    groupLabel: pickString(raw?.groupLabel, raw?.GroupLabel),
    groupLabelAr: pickString(raw?.groupLabelAr, raw?.GroupLabelAr),
    capacity: resolveCapacity(raw?.capacity ?? raw?.Capacity),
    isAllDay: Boolean(raw?.isAllDay ?? raw?.IsAllDay),
    isActive: true,
  };
}

export function normalizeActivitiesResponse(response: any): KidsActivity[] {
  const activities: KidsActivity[] = [];

  for (const raw of unwrapList(response)) {
    const id = toNumber(raw?.id ?? raw?.activityId ?? raw?.ActivityId, 0);
    if (!id) continue;

    const isActive = raw?.isActive ?? raw?.IsActive;
    if (isActive === false) continue;

    const nameEn = pickString(
      raw?.name,
      raw?.nameEn,
      raw?.Name,
      raw?.NameEn,
      raw?.title,
      raw?.Title
    );
    const nameAr = pickString(
      raw?.nameAr,
      raw?.NameAr,
      raw?.titleAr,
      raw?.TitleAr,
      nameEn
    );

    const nestedSlots = unwrapList(raw?.slots ?? raw?.Slots ?? raw?.timeSlots);
    const slots = nestedSlots
      .map((slot) => normalizeSlot(slot, id))
      .filter((slot): slot is KidsActivitySlot => Boolean(slot));

    if (!nameEn && !nameAr) continue;

    const priceValue = toNumber(
      raw?.price ?? raw?.Price ?? raw?.finalPrice ?? raw?.FinalPrice,
      0
    );

    activities.push({
      id,
      nameEn: nameEn || nameAr,
      nameAr: nameAr || nameEn,
      descriptionEn: pickString(
        raw?.description,
        raw?.descriptionEn,
        raw?.Description,
        raw?.DescriptionEn
      ),
      descriptionAr: pickString(
        raw?.descriptionAr,
        raw?.DescriptionAr,
        raw?.description,
        raw?.descriptionEn
      ),
      price: priceValue > 0 ? priceValue : undefined,
      activityType: toNumber(raw?.activityType ?? raw?.ActivityType, 0) || undefined,
      isActive: true,
      slots,
    });
  }

  return activities;
}

export function buildSessionKey(
  activityId: number,
  date: string,
  slotId: number
): string {
  return `${activityId}|${date}|${slotId}`;
}

export function parseAvailabilitySessions(
  date: string,
  response: any,
  activities: KidsActivity[] = []
): BookableSession[] {
  const activityMap = new Map(activities.map((activity) => [activity.id, activity]));
  const sessions: BookableSession[] = [];

  for (const row of unwrapList(response)) {
    const activityId = toNumber(row?.activityId ?? row?.id ?? row?.ActivityId, 0);
    if (!activityId) continue;

    const activity = activityMap.get(activityId);
    const activityNameEn = pickString(row?.name, activity?.nameEn);
    const activityNameAr = pickString(row?.nameAr, activity?.nameAr, activityNameEn);
    const slots = unwrapList(row?.slots ?? row?.Slots);

    for (const slot of slots) {
      const slotId = toNumber(slot?.slotId ?? slot?.id ?? slot?.SlotId, 0);
      const startTime = normalizeTime(slot?.startTime ?? slot?.StartTime);
      const endTime = normalizeTime(slot?.endTime ?? slot?.EndTime);

      if (!slotId || !startTime || !endTime) continue;

      const bookability = resolveSlotBookability(slot);
      const bookedCount = toNumber(slot?.bookedCount ?? slot?.BookedCount, 0);

      sessions.push({
        sessionKey: buildSessionKey(activityId, date, slotId),
        activityId,
        activityNameEn: activityNameEn || activityNameAr,
        activityNameAr: activityNameAr || activityNameEn,
        date,
        slotId,
        startTime,
        endTime,
        groupLabel: pickString(slot?.groupLabel, slot?.GroupLabel),
        groupLabelAr: pickString(slot?.groupLabelAr, slot?.GroupLabelAr),
        bookedCount,
        capacity: bookability.capacity,
        spotsLeft: bookability.spotsLeft,
        hasCapacityLimit: bookability.hasCapacityLimit,
        isFull: bookability.isFull,
        isAllDay: Boolean(slot?.isAllDay ?? slot?.IsAllDay),
        isAvailable: bookability.isAvailable,
        timeStatus: pickString(slot?.timeStatus, slot?.TimeStatus),
      });
    }
  }

  return sessions.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function getSessionsForActivity(
  sessions: BookableSession[],
  activityId: number
): BookableSession[] {
  return sessions.filter((session) => session.activityId === activityId);
}

export function compareSessions(a: BookableSession, b: BookableSession): number {
  const dateCompare = a.date.localeCompare(b.date);
  if (dateCompare !== 0) return dateCompare;
  return a.startTime.localeCompare(b.startTime);
}

export function resolveBookingSession(
  preferred: BookableSession,
  allSessions: BookableSession[]
): { session: BookableSession | null; wasReassigned: boolean } {
  if (!preferred.isFull) {
    return { session: preferred, wasReassigned: false };
  }

  const sameActivity = allSessions
    .filter((session) => session.activityId === preferred.activityId)
    .sort(compareSessions);

  for (const candidate of sameActivity) {
    if (candidate.sessionKey === preferred.sessionKey) continue;
    if (!candidate.isFull) {
      return { session: candidate, wasReassigned: true };
    }
  }

  return { session: null, wasReassigned: false };
}

export function toBookingDateIso(date: string, startTime: string): string {
  const [hours, minutes] = startTime.split(':').map((part) => Number(part) || 0);
  const bookingDate = new Date(`${date}T00:00:00`);
  bookingDate.setHours(hours, minutes, 0, 0);
  return bookingDate.toISOString();
}

export function resolveBookingDateIso(session: BookableSession): string {
  if (session.isAllDay) {
    return new Date().toISOString();
  }
  return toBookingDateIso(session.date, session.startTime);
}

export function formatApiDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (isNaN(parsed.getTime())) return date;
  return `${parsed.getFullYear()}-${parsed.getMonth() + 1}-${parsed.getDate()}`;
}

export function getActivityIcon(name: string): string {
  const value = name.toLowerCase();
  if (/fun|مرح/.test(value)) return '🎈';
  if (/slime|سلايم/.test(value)) return '🫧';
  if (/plaster|جبس|مجسم/.test(value)) return '🎨';
  if (/face|وجه|جليتر|glitter|paint|رسم/.test(value)) return '✨';
  return '🎈';
}

export function getSessionTimeLabel(
  session: BookableSession,
  isArabic = false
): string {
  if (session.isAllDay) {
    const label = isArabic ? session.groupLabelAr : session.groupLabel;
    if (label) return label;
  }

  return `${session.startTime} – ${session.endTime}`;
}
