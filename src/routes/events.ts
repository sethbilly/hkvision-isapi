import { Router } from 'express';
import { z } from 'zod';
import {
  getAttendance,
  iterateAcsEvents,
  listStoredEvents,
  recordWebhookEvent,
  searchAcsEvents,
} from '../services/events.js';

export const eventsRouter = Router({ mergeParams: true });

eventsRouter.get('/search', async (req, res, next) => {
  try {
    const { deviceId } = req.params as { deviceId: string };
    const schema = z.object({
      startTime: z.string(),
      endTime: z.string(),
      employeeNo: z.string().optional(),
      major: z.coerce.number().int().optional(),
      minor: z.coerce.number().int().optional(),
      offset: z.coerce.number().int().optional(),
      limit: z.coerce.number().int().optional(),
    });
    const q = schema.parse(req.query);
    res.json(await searchAcsEvents(deviceId, q));
  } catch (err) {
    next(err);
  }
});

eventsRouter.get('/all', async (req, res, next) => {
  try {
    const { deviceId } = req.params as { deviceId: string };
    const schema = z.object({
      startTime: z.string(),
      endTime: z.string(),
      employeeNo: z.string().optional(),
    });
    const q = schema.parse(req.query);
    const out: any[] = [];
    for await (const ev of iterateAcsEvents(deviceId, q)) out.push(ev);
    res.json(out);
  } catch (err) {
    next(err);
  }
});

eventsRouter.get('/attendance', async (req, res, next) => {
  try {
    const { deviceId } = req.params as { deviceId: string };
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    const schema = z.object({
      employeeNo: z.string().min(1).optional(),
      // Either both dates, or just `date` for a single day.
      date: z.string().regex(dateRe).optional(),
      startDate: z.string().regex(dateRe).optional(),
      endDate: z.string().regex(dateRe).optional(),
      tzOffset: z.string().regex(/^[+-]\d{2}:\d{2}$/).optional(),
      grantedOnly: z
        .string()
        .transform((s) => s !== 'false' && s !== '0')
        .optional(),
    });
    const q = schema.parse(req.query);
    const startDate = q.startDate ?? q.date;
    const endDate = q.endDate ?? q.date;
    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Provide either ?date=YYYY-MM-DD or both ?startDate= and ?endDate=',
      });
    }
    const records = await getAttendance(deviceId, {
      employeeNo: q.employeeNo,
      startDate,
      endDate,
      tzOffset: q.tzOffset,
      grantedOnly: q.grantedOnly,
    });
    res.json({
      employeeNo: q.employeeNo,
      startDate,
      endDate,
      count: records.length,
      records,
    });
  } catch (err) {
    next(err);
  }
});

eventsRouter.get('/stored', (req, res) => {
  const { deviceId } = req.params as { deviceId: string };
  const employeeNo = req.query.employeeNo as string | undefined;
  const since = req.query.since as string | undefined;
  const until = req.query.until as string | undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const offset = req.query.offset ? Number(req.query.offset) : undefined;
  res.json(listStoredEvents({ deviceId, employeeNo, since, until, limit, offset }));
});

export const webhookRouter = Router();

webhookRouter.post('/events/:deviceId', (req, res) => {
  try {
    const { deviceId } = req.params;
    const body = req.body;
    if (Buffer.isBuffer(body)) {
      try {
        const parsed = JSON.parse(body.toString('utf8'));
        recordWebhookEvent(deviceId, parsed);
      } catch {
        recordWebhookEvent(deviceId, { raw: body.toString('base64') });
      }
    } else {
      recordWebhookEvent(deviceId, body);
    }
    res.status(200).end();
  } catch {
    res.status(200).end();
  }
});
