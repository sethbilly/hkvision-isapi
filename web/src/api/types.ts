export interface Device {
  id: string;
  name: string;
  host: string;
  port: number;
  https: 0 | 1 | boolean;
  serial: string | null;
  model: string | null;
  firmware: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceEnrollInput {
  name: string;
  host: string;
  port?: number;
  https?: boolean;
  username: string;
  password: string;
  registerWebhook?: boolean;
}

export interface DeviceUser {
  employeeNo: string;
  name: string;
  userType?: 'normal' | 'visitor' | 'blackList';
  gender?: 'male' | 'female' | 'unknown';
  beginTime?: string;
  endTime?: string;
  doorNo?: number;
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

export interface AttendanceResponse {
  employeeNo?: string;
  startDate: string;
  endDate: string;
  count: number;
  records: AttendanceRecord[];
}

export interface CaptureResult {
  fingerNo: number;
  fingerData: string;
  fingerPrintQuality?: string;
}

export interface EnrollResult {
  capture: CaptureResult;
  save: unknown;
}
