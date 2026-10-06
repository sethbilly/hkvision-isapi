import { Router } from 'express';
import { z } from 'zod';
import {
  deleteDevice,
  enrollDevice,
  getClient,
  getDevice,
  listDevices,
  registerWebhook,
  updateDeviceCredentials,
} from '../services/devices.js';
import { discoverDevices } from '../services/discover.js';
import { discoverCapabilities } from '../services/capabilities.js';

export const devicesRouter = Router();

// LAN discovery via SADP (UDP 239.255.255.250:37020). Must be defined
// before the `/:id` route so the literal path matches first.
devicesRouter.get('/discover', async (req, res, next) => {
  try {
    const timeoutMs = Math.min(
      15000,
      Math.max(1000, Number(req.query.timeoutMs) || 4000),
    );
    const devices = await discoverDevices(timeoutMs);
    res.json({ count: devices.length, timeoutMs, devices });
  } catch (err) {
    next(err);
  }
});

const enrollSchema = z.object({
  name: z.string().min(1),
  host: z.string().min(1),
  port: z.number().int().positive().optional(),
  https: z.boolean().optional(),
  username: z.string().min(1),
  password: z.string().min(1),
  registerWebhook: z.boolean().optional(),
});

devicesRouter.post('/', async (req, res, next) => {
  try {
    const input = enrollSchema.parse(req.body);
    const device = await enrollDevice(input);
    res.status(201).json(device);
  } catch (err) {
    next(err);
  }
});

devicesRouter.get('/', (_req, res) => {
  res.json(listDevices());
});

devicesRouter.get('/:id', (req, res) => {
  const d = getDevice(req.params.id);
  if (!d) return res.status(404).json({ error: 'Device not found' });
  res.json(d);
});

devicesRouter.patch('/:id', async (req, res, next) => {
  try {
    const schema = enrollSchema.partial();
    const patch = schema.parse(req.body);
    const d = await updateDeviceCredentials(req.params.id, patch);
    res.json(d);
  } catch (err) {
    next(err);
  }
});

devicesRouter.delete('/:id', (req, res) => {
  deleteDevice(req.params.id);
  res.status(204).end();
});

devicesRouter.get('/:id/capabilities', async (req, res, next) => {
  try {
    res.json(await discoverCapabilities(req.params.id));
  } catch (err) {
    next(err);
  }
});

devicesRouter.get('/:id/info', async (req, res, next) => {
  try {
    const client = getClient(req.params.id);
    res.json(await client.getDeviceInfo());
  } catch (err) {
    next(err);
  }
});

devicesRouter.post('/:id/reboot', async (req, res, next) => {
  try {
    const client = getClient(req.params.id);
    res.json(await client.reboot());
  } catch (err) {
    next(err);
  }
});

devicesRouter.post('/:id/time', async (req, res, next) => {
  try {
    const schema = z.object({
      localTime: z.string().optional(),
      timeZone: z.string().optional(),
    });
    const { localTime, timeZone } = schema.parse(req.body);
    const client = getClient(req.params.id);
    // Default: now() in UTC, formatted as YYYY-MM-DDTHH:mm:ss+00:00
    const iso = localTime ?? formatLocalTimeUtc(new Date());
    res.json(await client.setTime(iso, timeZone));
  } catch (err) {
    next(err);
  }
});

function formatLocalTimeUtc(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}+00:00`
  );
}

devicesRouter.post('/:id/webhook', async (req, res, next) => {
  try {
    await registerWebhook(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
