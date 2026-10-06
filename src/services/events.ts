import { db } from '../db.js';
import { getClient } from './devices.js';
import { logger } from '../logger.js';

export interface AcsEventQuery {
  startTime: string;
  endTime: string;
  employeeNo?: string;
  major?: number;
  minor?: number;
  offset?: number;
  limit?: number;
}

export async function searchAcsEvents(deviceId: string, q: AcsEventQuery) {
  const client = getClient(deviceId);
  const cond: any = {
    searchID: `evt-${Date.now()}`,
    searchResultPosition: q.offset ?? 0,
    maxResults: q.limit ?? 30,
    major: q.major ?? 0,
    minor: q.minor ?? 0,
    startTime: q.startTime,
    endTime: q.endTime,
  };
  if (q.employeeNo) cond.employeeNoString = q.employeeNo;
  return client.request({
    method: 'POST',
    path: '/ISAPI/AccessControl/AcsEvent',
    json: { AcsEventCond: cond },
  });
}

/**
 * Hikvision AcsEvent minor codes that represent a successful access /
 * attendance punch on this firmware family. Source: ISAPI v2 docs.
 */
export const ATTENDANCE_GRANTED_MINORS = new Set<number>([
  1, // Genuine card pass
  38, // Fingerprint pass
  75, // Face pass
  76, // Face + fingerprint pass
  77, // Card + fingerprint pass
  78, // Card + face pass
  79, // Card + fingerprint + face pass
  113, // QR code pass
  117, // Face + ID card pass
]);

export interface AttendanceQuery {
  /** Optional. If omitted, returns events for all employees in the range. */
  employeeNo?: string;
  /** Inclusive start date, `YYYY-MM-DD`. */
  startDate: string;
  /** Inclusive end date, `YYYY-MM-DD`. */
  endDate: string;
  /** Hikvision-style timezone offset, e.g. `+00:00`, `+01:00`. Defaults to UTC. */
  tzOffset?: string;
  /**
   * If false, returns every major=5 event for the user (including denials).
   * Default true: only "access granted" minors.
   */
  grantedOnly?: boolean;
}

export interface AttendanceRecord {
  time: string;
  employeeNo: string;
  name?: string;
  doorNo?: number;
  cardReaderNo?: number;
  verifyMode?: string;
  major: number;
  minor: number;
  granted: boolean;
}

/**
 * Search attendance events for a single employee over an inclusive date range.
 * Returns a clean, flat list of records sorted by time ascending.
 */
export async function getAttendance(
  deviceId: string,
  q: AttendanceQuery,
): Promise<AttendanceRecord[]> {
  const tz = q.tzOffset ?? '+00:00';
  const startTime = `${q.startDate}T00:00:00${tz}`;
  const endTime = `${q.endDate}T23:59:59${tz}`;
  const grantedOnly = q.grantedOnly !== false;

  const out: AttendanceRecord[] = [];
  const iterQ: any = { startTime, endTime, major: 5 };
  if (q.employeeNo) iterQ.employeeNo = q.employeeNo;
  for await (const ev of iterateAcsEvents(deviceId, iterQ)) {
    const minor = Number(ev.minor);
    const granted = ATTENDANCE_GRANTED_MINORS.has(minor);
    if (grantedOnly && !granted) continue;
    out.push({
      time: ev.time,
      employeeNo: String(ev.employeeNoString ?? ev.employeeNo ?? ''),
      name: ev.name,
      doorNo: ev.doorNo,
      cardReaderNo: ev.cardReaderNo,
      verifyMode: ev.currentVerifyMode,
      major: Number(ev.major),
      minor,
      granted,
    });
  }
  out.sort((a, b) => a.time.localeCompare(b.time));
  return out;
}

export async function* iterateAcsEvents(
  deviceId: string,
  q: Omit<AcsEventQuery, 'offset' | 'limit'>,
  pageSize = 100,
) {
  let offset = 0;
  while (true) {
    const page = (await searchAcsEvents(deviceId, {
      ...q,
      offset,
      limit: pageSize,
    })) as any;
    const info = page.AcsEvent ?? page;
    const list: any[] = info.InfoList ?? [];
    for (const ev of list) yield ev;
    const total = Number(info.totalMatches ?? 0);
    offset += list.length;
    if (list.length === 0 || offset >= total) break;
  }
}

export function recordWebhookEvent(deviceId: string, payload: any) {
  const acs = payload?.AccessControllerEvent ?? payload?.AcsEvent ?? payload ?? {};
  const eventTime: string =
    payload?.dateTime ?? acs?.time ?? new Date().toISOString();

  db.prepare(
    `INSERT INTO events (device_id, event_time, employee_no, name, major, minor, verify_mode, door_no, raw)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    deviceId,
    eventTime,
    acs.employeeNoString ?? acs.employeeNo ?? null,
    acs.name ?? null,
    payload?.eventType ? null : acs.major ?? null,
    acs.minor ?? null,
    acs.currentVerifyMode ?? null,
    acs.doorNo ?? null,
    JSON.stringify(payload),
  );

  logger.info(
    {
      deviceId,
      employee: acs.employeeNoString,
      minor: acs.minor,
      time: eventTime,
    },
    'Access event recorded',
  );
}

export function listStoredEvents(opts: {
  deviceId?: string;
  employeeNo?: string;
  since?: string;
  until?: string;
  limit?: number;
  offset?: number;
}) {
  const where: string[] = [];
  const params: any[] = [];
  if (opts.deviceId) {
    where.push('device_id = ?');
    params.push(opts.deviceId);
  }
  if (opts.employeeNo) {
    where.push('employee_no = ?');
    params.push(opts.employeeNo);
  }
  if (opts.since) {
    where.push('event_time >= ?');
    params.push(opts.since);
  }
  if (opts.until) {
    where.push('event_time <= ?');
    params.push(opts.until);
  }
  const sql =
    'SELECT * FROM events' +
    (where.length ? ' WHERE ' + where.join(' AND ') : '') +
    ' ORDER BY event_time DESC LIMIT ? OFFSET ?';
  params.push(opts.limit ?? 100, opts.offset ?? 0);
  return db.prepare(sql).all(...params);
}
