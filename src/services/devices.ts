import { randomUUID } from 'node:crypto';
import { db, type DeviceRow } from '../db.js';
import { HikvisionClient, type DeviceCredentials } from '../client/HikvisionClient.js';
import { logger } from '../logger.js';
import { config } from '../config.js';

export interface EnrollDeviceInput {
  name: string;
  host: string;
  port?: number;
  https?: boolean;
  username: string;
  password: string;
  registerWebhook?: boolean;
}

export interface Device {
  id: string;
  name: string;
  host: string;
  port: number;
  https: boolean;
  serial: string | null;
  model: string | null;
  firmware: string | null;
  createdAt: string;
  updatedAt: string;
}

function rowToDevice(r: DeviceRow): Device {
  return {
    id: r.id,
    name: r.name,
    host: r.host,
    port: r.port,
    https: !!r.https,
    serial: r.serial,
    model: r.model,
    firmware: r.firmware,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function getDeviceCredentials(id: string): DeviceCredentials | null {
  const row = db.prepare('SELECT * FROM devices WHERE id = ?').get(id) as
    | DeviceRow
    | undefined;
  if (!row) return null;
  return {
    host: row.host,
    port: row.port,
    https: !!row.https,
    username: row.username,
    password: row.password,
  };
}

export function getClient(id: string): HikvisionClient {
  const creds = getDeviceCredentials(id);
  if (!creds) throw new Error(`Device not found: ${id}`);
  return new HikvisionClient(creds);
}

export function listDevices(): Device[] {
  const rows = db.prepare('SELECT * FROM devices ORDER BY created_at').all() as DeviceRow[];
  return rows.map(rowToDevice);
}

export function getDevice(id: string): Device | null {
  const row = db.prepare('SELECT * FROM devices WHERE id = ?').get(id) as
    | DeviceRow
    | undefined;
  return row ? rowToDevice(row) : null;
}

export async function enrollDevice(input: EnrollDeviceInput): Promise<Device> {
  logger.info(
    {
      host: input.host,
      username: input.username,
      passwordLength: input.password.length,
      passwordTail: input.password.slice(-2),
    },
    'enrollDevice received input',
  );

  const client = new HikvisionClient({
    host: input.host,
    port: input.port,
    https: input.https,
    username: input.username,
    password: input.password,
  });

  const info = await client.getDeviceInfo();
  const d = (info as any).DeviceInfo ?? {};

  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO devices (id, name, host, port, https, username, password, serial, model, firmware, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.name,
    input.host,
    input.port ?? 80,
    input.https ? 1 : 0,
    input.username,
    input.password,
    d.serialNumber ?? null,
    d.deviceType ?? d.model ?? null,
    d.firmwareVersion ?? null,
    now,
    now,
  );

  logger.info(
    { id, host: input.host, model: d.deviceType, serial: d.serialNumber },
    'Device enrolled',
  );

  if (input.registerWebhook !== false && config.publicWebhookBaseUrl) {
    try {
      await registerWebhook(id);
    } catch (err) {
      logger.warn({ err, id }, 'Webhook registration failed (non-fatal)');
    }
  }

  return getDevice(id)!;
}

export async function updateDeviceCredentials(
  id: string,
  patch: Partial<Pick<EnrollDeviceInput, 'username' | 'password' | 'host' | 'port' | 'https' | 'name'>>,
): Promise<Device> {
  const existing = getDevice(id);
  if (!existing) throw new Error(`Device not found: ${id}`);
  db.prepare(
    `UPDATE devices SET
       name     = COALESCE(?, name),
       host     = COALESCE(?, host),
       port     = COALESCE(?, port),
       https    = COALESCE(?, https),
       username = COALESCE(?, username),
       password = COALESCE(?, password),
       updated_at = datetime('now')
     WHERE id = ?`,
  ).run(
    patch.name ?? null,
    patch.host ?? null,
    patch.port ?? null,
    patch.https === undefined ? null : patch.https ? 1 : 0,
    patch.username ?? null,
    patch.password ?? null,
    id,
  );
  return getDevice(id)!;
}

export function deleteDevice(id: string): void {
  db.prepare('DELETE FROM devices WHERE id = ?').run(id);
}

export async function registerWebhook(id: string): Promise<void> {
  if (!config.publicWebhookBaseUrl) {
    throw new Error('PUBLIC_WEBHOOK_BASE_URL not configured');
  }
  const url = new URL(config.publicWebhookBaseUrl);
  const client = getClient(id);

  await client.request({
    method: 'PUT',
    path: '/ISAPI/Event/notification/httpHosts/1',
    json: {
      HttpHostNotification: {
        id: '1',
        url: `/webhook/events/${id}`,
        protocolType: url.protocol === 'https:' ? 'HTTPS' : 'HTTP',
        parameterFormatType: 'JSON',
        addressingFormatType: 'ipaddress',
        ipAddress: url.hostname,
        portNo: Number(url.port || (url.protocol === 'https:' ? 443 : 80)),
        httpAuthenticationMethod: 'none',
      },
    },
  });

  logger.info({ id, url: config.publicWebhookBaseUrl }, 'Webhook registered on device');
}
