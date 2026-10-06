import { getClient } from './devices.js';

/**
 * Curated set of Hikvision ISAPI capability endpoints relevant to access /
 * attendance terminals like the DS-K1A8503MF-B. Each entry is probed and the
 * device-reported capability document is returned (or an error if the
 * endpoint is not implemented on this firmware).
 */
const CAPABILITY_PATHS: Array<{ key: string; path: string }> = [
  // System
  { key: 'system', path: '/ISAPI/System/capabilities' },
  { key: 'systemDeviceInfo', path: '/ISAPI/System/deviceInfo' },
  { key: 'network', path: '/ISAPI/System/Network/capabilities' },
  { key: 'time', path: '/ISAPI/System/time/capabilities' },

  // Access control - umbrella
  { key: 'accessControl', path: '/ISAPI/AccessControl/capabilities' },

  // User / employee
  { key: 'userInfo', path: '/ISAPI/AccessControl/UserInfo/capabilities' },
  { key: 'userInfoCount', path: '/ISAPI/AccessControl/UserInfo/Count' },

  // Credentials
  { key: 'fingerPrint', path: '/ISAPI/AccessControl/FingerPrint/capabilities' },
  { key: 'fingerPrintCfg', path: '/ISAPI/AccessControl/FingerPrintCfg/capabilities' },
  { key: 'captureFingerPrint', path: '/ISAPI/AccessControl/CaptureFingerPrint/capabilities' },
  { key: 'fingerPrintUpload', path: '/ISAPI/AccessControl/FingerPrintUpload/capabilities' },
  { key: 'fingerPrintDelete', path: '/ISAPI/AccessControl/FingerPrint/Delete/capabilities' },
  { key: 'cardInfo', path: '/ISAPI/AccessControl/CardInfo/capabilities' },
  { key: 'faceData', path: '/ISAPI/Intelligent/FDLib/capabilities' },

  // Events
  { key: 'acsEvent', path: '/ISAPI/AccessControl/AcsEvent/capabilities' },
  { key: 'acsEventTotal', path: '/ISAPI/AccessControl/AcsEventTotalNum' },

  // Time & attendance
  { key: 'timePeriod', path: '/ISAPI/AccessControl/TimePeriod/capabilities' },
  { key: 'normalShift', path: '/ISAPI/AccessControl/NormalShift/capabilities' },
  { key: 'shiftSchedule', path: '/ISAPI/AccessControl/ShiftSchedule/capabilities' },
  { key: 'userShiftSchedule', path: '/ISAPI/AccessControl/UserShiftSchedule/capabilities' },
  { key: 'attendanceRule', path: '/ISAPI/AccessControl/AttendanceRule/capabilities' },
  { key: 'holiday', path: '/ISAPI/AccessControl/Holiday/capabilities' },
  { key: 'holidayGroup', path: '/ISAPI/AccessControl/HolidayGroup/capabilities' },

  // Door / verify
  { key: 'door', path: '/ISAPI/AccessControl/Door/capabilities' },
  { key: 'verify', path: '/ISAPI/AccessControl/Verify/capabilities' },
  { key: 'remoteControl', path: '/ISAPI/AccessControl/RemoteControl/capabilities' },

  // Webhook / event subscription
  { key: 'eventNotification', path: '/ISAPI/Event/notification/httpHosts/capabilities' },
];

export interface ProbeResult {
  supported: boolean;
  status?: number | null;
  /** Device-reported capability document on success. */
  capabilities?: unknown;
  /** Error message on failure. */
  error?: string;
}

export interface CapabilityReport {
  deviceId: string;
  deviceInfo?: Record<string, unknown>;
  probedAt: string;
  results: Record<string, ProbeResult & { path: string }>;
  summary: {
    supported: string[];
    unsupported: string[];
  };
}

export async function discoverCapabilities(deviceId: string): Promise<CapabilityReport> {
  const client = getClient(deviceId);

  const results: CapabilityReport['results'] = {};
  const supported: string[] = [];
  const unsupported: string[] = [];

  // Probe in parallel — each request is independent and short.
  await Promise.all(
    CAPABILITY_PATHS.map(async ({ key, path }) => {
      try {
        const data = await client.request({ method: 'GET', path });
        results[key] = { path, supported: true, capabilities: data };
        supported.push(key);
      } catch (err: any) {
        results[key] = {
          path,
          supported: false,
          status: err?.status ?? null,
          error: err?.message ?? String(err),
        };
        unsupported.push(key);
      }
    }),
  );

  let deviceInfo: Record<string, unknown> | undefined;
  const di = results.systemDeviceInfo?.capabilities as any;
  if (di?.DeviceInfo) deviceInfo = di.DeviceInfo;

  return {
    deviceId,
    deviceInfo,
    probedAt: new Date().toISOString(),
    results,
    summary: {
      supported: supported.sort(),
      unsupported: unsupported.sort(),
    },
  };
}
