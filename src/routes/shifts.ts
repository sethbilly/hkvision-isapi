import { Router } from 'express';
import { z } from 'zod';
import {
  deleteHoliday,
  deleteNormalShift,
  deleteShiftSchedule,
  deleteTimePeriod,
  deleteUserShift,
  getAttendanceRule,
  getCapabilities,
  getNormalShift,
  getShiftSchedule,
  getTimePeriod,
  listHolidays,
  listNormalShifts,
  listShiftSchedules,
  listTimePeriods,
  searchUserShifts,
  setAttendanceRule,
  setHoliday,
  setNormalShift,
  setShiftSchedule,
  setTimePeriod,
  setUserShift,
} from '../services/shifts.js';

export const shiftsRouter = Router({ mergeParams: true });

const idParam = z.object({ id: z.coerce.number().int().min(1) });
const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const timeRe = /^\d{2}:\d{2}(:\d{2})?$/;

// Capability discovery -------------------------------------------------------
shiftsRouter.get('/capabilities', async (req, res, next) => {
  try {
    const { deviceId } = req.params as { deviceId: string };
    res.json(await getCapabilities(deviceId));
  } catch (err) {
    next(err);
  }
});

// TimePeriod -----------------------------------------------------------------
shiftsRouter.get('/time-periods', async (req, res, next) => {
  try {
    res.json(await listTimePeriods((req.params as any).deviceId));
  } catch (err) {
    next(err);
  }
});

shiftsRouter.get('/time-periods/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    res.json(await getTimePeriod((req.params as any).deviceId, id));
  } catch (err) {
    next(err);
  }
});

shiftsRouter.put('/time-periods/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const schema = z.object({
      name: z.string().optional(),
      attendances: z
        .array(
          z.object({
            onDutyTime: z.string().regex(timeRe),
            offDutyTime: z.string().regex(timeRe),
            lateThresholdMin: z.number().int().min(0).optional(),
            earlyLeaveThresholdMin: z.number().int().min(0).optional(),
            mustCheckIn: z.boolean().optional(),
            mustCheckOut: z.boolean().optional(),
          }),
        )
        .min(1),
    });
    const body = schema.parse(req.body);
    res.json(
      await setTimePeriod((req.params as any).deviceId, { id, ...body }),
    );
  } catch (err) {
    next(err);
  }
});

shiftsRouter.delete('/time-periods/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    res.json(await deleteTimePeriod((req.params as any).deviceId, id));
  } catch (err) {
    next(err);
  }
});

// NormalShift ----------------------------------------------------------------
shiftsRouter.get('/normal-shifts', async (req, res, next) => {
  try {
    res.json(await listNormalShifts((req.params as any).deviceId));
  } catch (err) {
    next(err);
  }
});

shiftsRouter.get('/normal-shifts/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    res.json(await getNormalShift((req.params as any).deviceId, id));
  } catch (err) {
    next(err);
  }
});

shiftsRouter.put('/normal-shifts/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const schema = z.object({
      name: z.string().optional(),
      timePeriodIDs: z.array(z.number().int().min(1)).min(1),
    });
    const body = schema.parse(req.body);
    res.json(
      await setNormalShift((req.params as any).deviceId, { id, ...body }),
    );
  } catch (err) {
    next(err);
  }
});

shiftsRouter.delete('/normal-shifts/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    res.json(await deleteNormalShift((req.params as any).deviceId, id));
  } catch (err) {
    next(err);
  }
});

// ShiftSchedule --------------------------------------------------------------
shiftsRouter.get('/shift-schedules', async (req, res, next) => {
  try {
    res.json(await listShiftSchedules((req.params as any).deviceId));
  } catch (err) {
    next(err);
  }
});

shiftsRouter.get('/shift-schedules/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    res.json(await getShiftSchedule((req.params as any).deviceId, id));
  } catch (err) {
    next(err);
  }
});

shiftsRouter.put('/shift-schedules/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const schema = z.object({
      name: z.string().optional(),
      scheduleType: z.enum(['week', 'cycle']).optional(),
      weekShiftIDs: z.array(z.number().int().min(0)).length(7).optional(),
      cycleShiftIDs: z.array(z.number().int().min(0)).optional(),
      cycleStartDate: z.string().regex(dateRe).optional(),
    });
    const body = schema.parse(req.body);
    res.json(
      await setShiftSchedule((req.params as any).deviceId, { id, ...body }),
    );
  } catch (err) {
    next(err);
  }
});

shiftsRouter.delete('/shift-schedules/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    res.json(await deleteShiftSchedule((req.params as any).deviceId, id));
  } catch (err) {
    next(err);
  }
});

// UserShiftSchedule ----------------------------------------------------------
shiftsRouter.get('/user-shifts', async (req, res, next) => {
  try {
    const schema = z.object({
      employeeNo: z.string().optional(),
      offset: z.coerce.number().int().min(0).optional(),
      limit: z.coerce.number().int().min(1).max(500).optional(),
    });
    const q = schema.parse(req.query);
    res.json(await searchUserShifts((req.params as any).deviceId, q));
  } catch (err) {
    next(err);
  }
});

shiftsRouter.post('/user-shifts', async (req, res, next) => {
  try {
    const schema = z.object({
      employeeNo: z.string().min(1),
      shiftScheduleID: z.number().int().min(1),
      beginDate: z.string().regex(dateRe),
      endDate: z.string().regex(dateRe),
    });
    const body = schema.parse(req.body);
    res.json(await setUserShift((req.params as any).deviceId, body));
  } catch (err) {
    next(err);
  }
});

shiftsRouter.delete('/user-shifts/:employeeNo', async (req, res, next) => {
  try {
    const { employeeNo } = req.params as { employeeNo: string };
    res.json(
      await deleteUserShift((req.params as any).deviceId, employeeNo),
    );
  } catch (err) {
    next(err);
  }
});

// AttendanceRule -------------------------------------------------------------
shiftsRouter.get('/attendance-rule/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    res.json(await getAttendanceRule((req.params as any).deviceId, id));
  } catch (err) {
    next(err);
  }
});

shiftsRouter.put('/attendance-rule/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    res.json(
      await setAttendanceRule(
        (req.params as any).deviceId,
        id,
        req.body ?? {},
      ),
    );
  } catch (err) {
    next(err);
  }
});

// Holidays -------------------------------------------------------------------
shiftsRouter.get('/holidays', async (req, res, next) => {
  try {
    res.json(await listHolidays((req.params as any).deviceId));
  } catch (err) {
    next(err);
  }
});

shiftsRouter.put('/holidays/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const schema = z.object({
      name: z.string().optional(),
      beginDate: z.string().regex(dateRe),
      endDate: z.string().regex(dateRe),
    });
    const body = schema.parse(req.body);
    res.json(await setHoliday((req.params as any).deviceId, { id, ...body }));
  } catch (err) {
    next(err);
  }
});

shiftsRouter.delete('/holidays/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    res.json(await deleteHoliday((req.params as any).deviceId, id));
  } catch (err) {
    next(err);
  }
});
