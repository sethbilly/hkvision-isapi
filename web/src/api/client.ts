import axios, { AxiosError } from 'axios';
import type {
  AttendanceResponse,
  CaptureResult,
  Device,
  DeviceEnrollInput,
  DeviceUser,
  EnrollResult,
} from './types';

export const http = axios.create({
  baseURL: '/api',
  timeout: 60_000,
});

http.interceptors.response.use(
  (r) => r,
  (err: AxiosError<any>) => {
    const data = err.response?.data;
    const message =
      (data && (data.error || data.message)) ||
      err.message ||
      'Request failed';
    return Promise.reject(new Error(message));
  },
);

export const api = {
  // Devices
  listDevices: () => http.get<Device[]>('/devices').then((r) => r.data),
  getDevice: (id: string) => http.get<Device>(`/devices/${id}`).then((r) => r.data),
  enrollDevice: (input: DeviceEnrollInput) =>
    http.post<Device>('/devices', input).then((r) => r.data),
  deleteDevice: (id: string) => http.delete(`/devices/${id}`).then((r) => r.data),
  getDeviceInfo: (id: string) =>
    http.get<unknown>(`/devices/${id}/info`).then((r) => r.data),
  syncTime: (id: string, body: { tzOffset?: string } = {}) =>
    http.post(`/devices/${id}/time`, body).then((r) => r.data),

  // Users
  listUsers: (deviceId: string, params?: { offset?: number; limit?: number; employeeNo?: string }) =>
    http
      .get<unknown>(`/devices/${deviceId}/users`, { params })
      .then((r) => r.data),
  countUsers: (deviceId: string) =>
    http.get<unknown>(`/devices/${deviceId}/users/count`).then((r) => r.data),
  addUser: (deviceId: string, user: DeviceUser) =>
    http.post(`/devices/${deviceId}/users`, user).then((r) => r.data),
  updateUser: (deviceId: string, employeeNo: string, patch: Partial<DeviceUser>) =>
    http
      .patch(`/devices/${deviceId}/users/${employeeNo}`, patch)
      .then((r) => r.data),
  deleteUser: (deviceId: string, employeeNo: string) =>
    http.delete(`/devices/${deviceId}/users/${employeeNo}`).then((r) => r.data),

  // Fingerprints
  captureFingerprint: (deviceId: string, fingerNo: number) =>
    http
      .post<CaptureResult>(`/devices/${deviceId}/fingerprints/capture`, {
        fingerNo,
      })
      .then((r) => r.data),
  enrollFingerprint: (
    deviceId: string,
    body: { employeeNo: string; fingerNo: number },
  ) =>
    http
      .post<EnrollResult>(`/devices/${deviceId}/fingerprints/enroll`, body)
      .then((r) => r.data),
  listFingerprints: (
    deviceId: string,
    params: { employeeNo: string; cardReaderNo?: number },
  ) =>
    http
      .get<unknown>(`/devices/${deviceId}/fingerprints`, { params })
      .then((r) => r.data),
  deleteFingerprints: (
    deviceId: string,
    body: { employeeNo: string; fingerNo?: number },
  ) =>
    http
      .delete(`/devices/${deviceId}/fingerprints`, { data: body })
      .then((r) => r.data),

  // Attendance
  getAttendance: (
    deviceId: string,
    params: {
      employeeNo?: string;
      startDate: string;
      endDate: string;
      grantedOnly?: boolean;
      tzOffset?: string;
    },
  ) =>
    http
      .get<AttendanceResponse>(`/devices/${deviceId}/events/attendance`, {
        params,
      })
      .then((r) => r.data),
};
