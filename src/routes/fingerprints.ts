import { Router } from 'express';
import { z } from 'zod';
import {
  captureFingerprint,
  deleteFingerprints,
  enrollFingerprint,
  listFingerprints,
  saveFingerprint,
} from '../services/fingerprints.js';

export const fingerprintsRouter = Router({ mergeParams: true });

fingerprintsRouter.post('/capture', async (req, res, next) => {
  try {
    const { deviceId } = req.params as { deviceId: string };
    const schema = z.object({
      fingerNo: z.number().int().min(1).max(10).default(1),
    });
    const input = schema.parse(req.body ?? {});
    res.json(await captureFingerprint(deviceId, input));
  } catch (err) {
    next(err);
  }
});

fingerprintsRouter.post('/save', async (req, res, next) => {
  try {
    const { deviceId } = req.params as { deviceId: string };
    const schema = z.object({
      employeeNo: z.string().min(1),
      fingerNo: z.number().int().min(1).max(10),
      fingerData: z.string().min(1),
      fingerType: z.enum(['normalFP', 'duressFP', 'patrolFP', 'superFP']).optional(),
      cardReaderNos: z.array(z.number().int()).optional(),
      fingerPrintID: z.number().int().optional(),
    });
    const input = schema.parse(req.body);
    res.json(await saveFingerprint(deviceId, input));
  } catch (err) {
    next(err);
  }
});

fingerprintsRouter.post('/enroll', async (req, res, next) => {
  try {
    const { deviceId } = req.params as { deviceId: string };
    const schema = z.object({
      employeeNo: z.string().min(1),
      fingerNo: z.number().int().min(1).max(10),
      fingerType: z.enum(['normalFP', 'duressFP', 'patrolFP', 'superFP']).optional(),
      cardReaderNos: z.array(z.number().int()).optional(),
    });
    const input = schema.parse(req.body);
    res.json(await enrollFingerprint(deviceId, input));
  } catch (err) {
    next(err);
  }
});

fingerprintsRouter.get('/', async (req, res, next) => {
  try {
    const { deviceId } = req.params as { deviceId: string };
    const employeeNo = String(req.query.employeeNo ?? '');
    if (!employeeNo) return res.status(400).json({ error: 'employeeNo required' });
    const cardReaderNo = req.query.cardReaderNo ? Number(req.query.cardReaderNo) : undefined;
    res.json(await listFingerprints(deviceId, { employeeNo, cardReaderNo }));
  } catch (err) {
    next(err);
  }
});

fingerprintsRouter.delete('/', async (req, res, next) => {
  try {
    const { deviceId } = req.params as { deviceId: string };
    const schema = z.object({
      employeeNo: z.string().min(1),
      fingerNo: z.number().int().min(1).max(10).optional(),
    });
    const input = schema.parse(req.body);
    res.json(await deleteFingerprints(deviceId, input));
  } catch (err) {
    next(err);
  }
});
