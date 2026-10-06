import express from 'express';
import pinoHttp from 'pino-http';
import { config } from './config.js';
import { logger } from './logger.js';
import { devicesRouter } from './routes/devices.js';
import { usersRouter } from './routes/users.js';
import { fingerprintsRouter } from './routes/fingerprints.js';
import { eventsRouter, webhookRouter } from './routes/events.js';
import { shiftsRouter } from './routes/shifts.js';
import { HikvisionError } from './client/HikvisionClient.js';

const app = express();

app.use(pinoHttp({ logger }));

app.use('/webhook', express.raw({ type: '*/*', limit: '10mb' }));
app.use('/api', express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/devices', devicesRouter);
app.use('/api/devices/:deviceId/users', usersRouter);
app.use('/api/devices/:deviceId/fingerprints', fingerprintsRouter);
app.use('/api/devices/:deviceId/events', eventsRouter);
app.use('/api/devices/:deviceId/shifts', shiftsRouter);
app.use('/webhook', webhookRouter);

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (err instanceof HikvisionError) {
      return res.status(err.status ?? 502).json({
        error: err.message,
        device_response: err.data,
      });
    }
    const e = err as any;
    if (e?.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: e.errors });
    }
    logger.error({ err }, 'Unhandled error');
    res.status(500).json({ error: e?.message ?? 'Internal server error' });
  },
);

app.listen(config.port, () => {
  logger.info(
    { port: config.port, webhookBase: config.publicWebhookBaseUrl || '(unset)' },
    'hikvision-isapi listening',
  );
});
