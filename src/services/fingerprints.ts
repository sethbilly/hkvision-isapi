import { getClient } from './devices.js';

export type FingerType = 'normalFP' | 'duressFP' | 'patrolFP' | 'superFP';

export interface CaptureResult {
  fingerNo: number;
  fingerData: string;
  fingerPrintQuality?: string;
}

export async function captureFingerprint(
  deviceId: string,
  opts: { fingerNo: number } = { fingerNo: 1 },
): Promise<CaptureResult> {
  const client = getClient(deviceId);
  // Per device capabilities: request body takes only CaptureFingerPrintCond.fingerNo;
  // endpoint accepts/returns XML on this firmware.
  const res = await client.request<any>({
    method: 'POST',
    path: '/ISAPI/AccessControl/CaptureFingerPrint',
    xml: { CaptureFingerPrintCond: { fingerNo: opts.fingerNo } },
    timeoutMs: 30_000,
  });
  const cap = res.CaptureFingerPrint ?? res;
  return {
    fingerNo: Number(cap.fingerNo),
    fingerData: cap.fingerData,
    fingerPrintQuality: cap.fingerPrintQuality,
  };
}

export async function saveFingerprint(
  deviceId: string,
  opts: {
    employeeNo: string;
    fingerNo: number;
    fingerData: string;
    fingerType?: FingerType;
    cardReaderNos?: number[];
    fingerPrintID?: number;
  },
) {
  const client = getClient(deviceId);
  return client.request({
    method: 'POST',
    path: '/ISAPI/AccessControl/FingerPrint/SetUp',
    json: {
      FingerPrintCfg: {
        employeeNo: opts.employeeNo,
        enableCardReader: opts.cardReaderNos ?? [1],
        fingerPrintID: opts.fingerPrintID ?? opts.fingerNo,
        fingerType: opts.fingerType ?? 'normalFP',
        fingerNo: opts.fingerNo,
        fingerData: opts.fingerData,
      },
    },
  });
}

export async function enrollFingerprint(
  deviceId: string,
  opts: {
    employeeNo: string;
    fingerNo: number;
    fingerType?: FingerType;
    cardReaderNos?: number[];
  },
) {
  const cap = await captureFingerprint(deviceId, { fingerNo: opts.fingerNo });
  if (!cap.fingerData) {
    throw new Error('Fingerprint capture returned no template (timeout or bad read)');
  }
  const saved = await saveFingerprint(deviceId, {
    employeeNo: opts.employeeNo,
    fingerNo: opts.fingerNo,
    fingerData: cap.fingerData,
    fingerType: opts.fingerType,
    cardReaderNos: opts.cardReaderNos,
  });
  return { capture: cap, save: saved };
}

export async function listFingerprints(
  deviceId: string,
  opts: { employeeNo: string; cardReaderNo?: number; fingerPrintID?: number },
) {
  const client = getClient(deviceId);
  const cond: any = {
    searchID: `fp-${Date.now()}`,
    searchResultPosition: 0,
    maxResults: 30,
    cardReaderNo: opts.cardReaderNo ?? 1,
    employeeNo: opts.employeeNo,
  };
  if (opts.fingerPrintID && opts.fingerPrintID >= 1 && opts.fingerPrintID <= 10) {
    cond.fingerPrintID = opts.fingerPrintID;
  }
  return client.request({
    method: 'POST',
    path: '/ISAPI/AccessControl/FingerPrintUpload?format=json',
    json: { FingerPrintCond: cond },
  });
}

export async function deleteFingerprints(
  deviceId: string,
  opts: { employeeNo: string; fingerNo?: number },
) {
  const client = getClient(deviceId);
  const detail: any = { employeeNo: opts.employeeNo };
  if (opts.fingerNo) detail.fingerNo = opts.fingerNo;
  return client.request({
    method: 'PUT',
    path: '/ISAPI/AccessControl/FingerPrint/Delete',
    json: {
      FingerPrintDelete: { mode: 'byEmployeeNo', EmployeeNoDetail: detail },
    },
  });
}
