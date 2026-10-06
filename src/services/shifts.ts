import { getClient } from './devices.js';

/**
 * Hikvision Time & Attendance ISAPI wrappers.
 *
 * Standard endpoints (DS-K1A / DS-K1T / DS-K5 family):
 *   /ISAPI/AccessControl/TimePeriod         - shift time spans (on/off duty windows)
 *   /ISAPI/AccessControl/NormalShift        - day-shift templates referencing TimePeriods
 *   /ISAPI/AccessControl/ShiftSchedule      - weekly/cyclical schedule
 *   /ISAPI/AccessControl/UserShiftSchedule  - per-employee overrides
 *   /ISAPI/AccessControl/AttendanceRule     - late / early / overtime rules
 *   /ISAPI/AccessControl/Holiday            - holiday entries
 *   /ISAPI/AccessControl/HolidayGroup       - holiday grouping
 *
 * Not every firmware ships every module. Use `getCapabilities()` first to
 * discover what your specific device supports.
 */

export type TaModule =
  | 'TimePeriod'
  | 'NormalShift'
  | 'ShiftSchedule'
  | 'UserShiftSchedule'
  | 'AttendanceRule'
  | 'Holiday'
  | 'HolidayGroup';

const MODULES: TaModule[] = [
  'TimePeriod',
  'NormalShift',
  'ShiftSchedule',
  'UserShiftSchedule',
  'AttendanceRule',
  'Holiday',
  'HolidayGroup',
];

/**
 * Probe each T&A module's capabilities endpoint. Returns a map of
 * module -> { supported, capabilities | error }.
 */
export async function getCapabilities(deviceId: string) {
  const client = getClient(deviceId);
  const out: Record<string, any> = {};
  for (const mod of MODULES) {
    try {
      const data = await client.request({
        method: 'GET',
        path: `/ISAPI/AccessControl/${mod}/capabilities`,
      });
      out[mod] = { supported: true, capabilities: data };
    } catch (err: any) {
      out[mod] = {
        supported: false,
        status: err?.status ?? null,
        error: err?.message ?? String(err),
      };
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// TimePeriod  (on/off duty windows)
// ---------------------------------------------------------------------------

export interface TimePeriodInput {
  /** Numeric ID, 1..N (device-defined max). */
  id: number;
  name?: string;
  /** One on/off-duty pair, OR multiple if device supports multi-segment shifts. */
  attendances: Array<{
    onDutyTime: string; // "HH:mm" or "HH:mm:ss"
    offDutyTime: string;
    lateThresholdMin?: number;
    earlyLeaveThresholdMin?: number;
    /** Some firmwares use mustCheckIn / mustCheckOut booleans. */
    mustCheckIn?: boolean;
    mustCheckOut?: boolean;
  }>;
}

export async function listTimePeriods(deviceId: string) {
  const client = getClient(deviceId);
  return client.request({
    method: 'POST',
    path: '/ISAPI/AccessControl/TimePeriod/Search',
    json: {
      TimePeriodCond: {
        searchID: `tp-${Date.now()}`,
        searchResultPosition: 0,
        maxResults: 100,
      },
    },
  });
}

export async function getTimePeriod(deviceId: string, id: number) {
  const client = getClient(deviceId);
  return client.request({
    method: 'GET',
    path: `/ISAPI/AccessControl/TimePeriod/${id}`,
  });
}

export async function setTimePeriod(deviceId: string, input: TimePeriodInput) {
  const client = getClient(deviceId);
  return client.request({
    method: 'PUT',
    path: `/ISAPI/AccessControl/TimePeriod/${input.id}`,
    json: {
      TimePeriod: {
        id: input.id,
        name: input.name,
        attendance: input.attendances,
      },
    },
  });
}

export async function deleteTimePeriod(deviceId: string, id: number) {
  const client = getClient(deviceId);
  return client.request({
    method: 'DELETE',
    path: `/ISAPI/AccessControl/TimePeriod/${id}`,
  });
}

// ---------------------------------------------------------------------------
// NormalShift  (day-shift templates referencing TimePeriod IDs)
// ---------------------------------------------------------------------------

export interface NormalShiftInput {
  id: number;
  name?: string;
  /**
   * Order of TimePeriod IDs that compose this shift. For a single-period
   * day shift this is a one-element array.
   */
  timePeriodIDs: number[];
}

export async function listNormalShifts(deviceId: string) {
  const client = getClient(deviceId);
  return client.request({
    method: 'POST',
    path: '/ISAPI/AccessControl/NormalShift/Search',
    json: {
      NormalShiftCond: {
        searchID: `ns-${Date.now()}`,
        searchResultPosition: 0,
        maxResults: 100,
      },
    },
  });
}

export async function getNormalShift(deviceId: string, id: number) {
  const client = getClient(deviceId);
  return client.request({
    method: 'GET',
    path: `/ISAPI/AccessControl/NormalShift/${id}`,
  });
}

export async function setNormalShift(deviceId: string, input: NormalShiftInput) {
  const client = getClient(deviceId);
  return client.request({
    method: 'PUT',
    path: `/ISAPI/AccessControl/NormalShift/${input.id}`,
    json: {
      NormalShift: {
        id: input.id,
        name: input.name,
        timePeriodID: input.timePeriodIDs,
      },
    },
  });
}

export async function deleteNormalShift(deviceId: string, id: number) {
  const client = getClient(deviceId);
  return client.request({
    method: 'DELETE',
    path: `/ISAPI/AccessControl/NormalShift/${id}`,
  });
}

// ---------------------------------------------------------------------------
// ShiftSchedule  (weekly/cyclical assignment of NormalShifts to days)
// ---------------------------------------------------------------------------

export interface ShiftScheduleInput {
  id: number;
  name?: string;
  /** "week" (default) or "cycle". */
  scheduleType?: 'week' | 'cycle';
  /** For week schedules: 7 entries, Mon..Sun -> NormalShift ID (0 = rest day). */
  weekShiftIDs?: number[];
  /** For cycle schedules: ordered list of NormalShift IDs. */
  cycleShiftIDs?: number[];
  /** YYYY-MM-DD start of the cycle. */
  cycleStartDate?: string;
}

export async function listShiftSchedules(deviceId: string) {
  const client = getClient(deviceId);
  return client.request({
    method: 'POST',
    path: '/ISAPI/AccessControl/ShiftSchedule/Search',
    json: {
      ShiftScheduleCond: {
        searchID: `ss-${Date.now()}`,
        searchResultPosition: 0,
        maxResults: 100,
      },
    },
  });
}

export async function getShiftSchedule(deviceId: string, id: number) {
  const client = getClient(deviceId);
  return client.request({
    method: 'GET',
    path: `/ISAPI/AccessControl/ShiftSchedule/${id}`,
  });
}

export async function setShiftSchedule(
  deviceId: string,
  input: ShiftScheduleInput,
) {
  const client = getClient(deviceId);
  const body: any = {
    id: input.id,
    name: input.name,
    scheduleType: input.scheduleType ?? 'week',
  };
  if (input.weekShiftIDs) body.weekShiftID = input.weekShiftIDs;
  if (input.cycleShiftIDs) body.cycleShiftID = input.cycleShiftIDs;
  if (input.cycleStartDate) body.cycleStartDate = input.cycleStartDate;
  return client.request({
    method: 'PUT',
    path: `/ISAPI/AccessControl/ShiftSchedule/${input.id}`,
    json: { ShiftSchedule: body },
  });
}

export async function deleteShiftSchedule(deviceId: string, id: number) {
  const client = getClient(deviceId);
  return client.request({
    method: 'DELETE',
    path: `/ISAPI/AccessControl/ShiftSchedule/${id}`,
  });
}

// ---------------------------------------------------------------------------
// UserShiftSchedule  (link employee -> ShiftSchedule with effective range)
// ---------------------------------------------------------------------------

export interface UserShiftInput {
  employeeNo: string;
  shiftScheduleID: number;
  /** YYYY-MM-DD inclusive. */
  beginDate: string;
  /** YYYY-MM-DD inclusive. */
  endDate: string;
}

export async function searchUserShifts(
  deviceId: string,
  opts: { employeeNo?: string; offset?: number; limit?: number } = {},
) {
  const client = getClient(deviceId);
  const cond: any = {
    searchID: `us-${Date.now()}`,
    searchResultPosition: opts.offset ?? 0,
    maxResults: opts.limit ?? 50,
  };
  if (opts.employeeNo) cond.employeeNo = opts.employeeNo;
  return client.request({
    method: 'POST',
    path: '/ISAPI/AccessControl/UserShiftSchedule/Search',
    json: { UserShiftScheduleCond: cond },
  });
}

export async function setUserShift(deviceId: string, input: UserShiftInput) {
  const client = getClient(deviceId);
  return client.request({
    method: 'POST',
    path: '/ISAPI/AccessControl/UserShiftSchedule',
    json: {
      UserShiftSchedule: {
        employeeNo: input.employeeNo,
        shiftScheduleID: input.shiftScheduleID,
        beginDate: input.beginDate,
        endDate: input.endDate,
      },
    },
  });
}

export async function deleteUserShift(deviceId: string, employeeNo: string) {
  const client = getClient(deviceId);
  return client.request({
    method: 'PUT',
    path: '/ISAPI/AccessControl/UserShiftSchedule/Delete',
    json: {
      UserShiftScheduleDelete: {
        mode: 'byEmployeeNo',
        EmployeeNoList: [{ employeeNo }],
      },
    },
  });
}

// ---------------------------------------------------------------------------
// AttendanceRule  (late / early / overtime thresholds)
// ---------------------------------------------------------------------------

export async function getAttendanceRule(deviceId: string, id = 1) {
  const client = getClient(deviceId);
  return client.request({
    method: 'GET',
    path: `/ISAPI/AccessControl/AttendanceRule/${id}`,
  });
}

export async function setAttendanceRule(
  deviceId: string,
  id: number,
  rule: Record<string, unknown>,
) {
  const client = getClient(deviceId);
  return client.request({
    method: 'PUT',
    path: `/ISAPI/AccessControl/AttendanceRule/${id}`,
    json: { AttendanceRule: { id, ...rule } },
  });
}

// ---------------------------------------------------------------------------
// Holiday / HolidayGroup
// ---------------------------------------------------------------------------

export interface HolidayInput {
  id: number;
  name?: string;
  /** YYYY-MM-DD. */
  beginDate: string;
  endDate: string;
}

export async function listHolidays(deviceId: string) {
  const client = getClient(deviceId);
  return client.request({
    method: 'POST',
    path: '/ISAPI/AccessControl/Holiday/Search',
    json: {
      HolidayCond: {
        searchID: `hd-${Date.now()}`,
        searchResultPosition: 0,
        maxResults: 100,
      },
    },
  });
}

export async function setHoliday(deviceId: string, input: HolidayInput) {
  const client = getClient(deviceId);
  return client.request({
    method: 'PUT',
    path: `/ISAPI/AccessControl/Holiday/${input.id}`,
    json: {
      Holiday: {
        id: input.id,
        name: input.name,
        beginDate: input.beginDate,
        endDate: input.endDate,
      },
    },
  });
}

export async function deleteHoliday(deviceId: string, id: number) {
  const client = getClient(deviceId);
  return client.request({
    method: 'DELETE',
    path: `/ISAPI/AccessControl/Holiday/${id}`,
  });
}
