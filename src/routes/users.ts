import { Router } from 'express';
import { z } from 'zod';
import {
  addUser,
  countUsers,
  deleteAllUsers,
  deleteUser,
  searchUsers,
  updateUser,
} from '../services/users.js';

export const usersRouter = Router({ mergeParams: true });

const userSchema = z.object({
  employeeNo: z.string().min(1),
  name: z.string().min(1),
  userType: z.enum(['normal', 'visitor', 'blackList']).optional(),
  gender: z.enum(['male', 'female', 'unknown']).optional(),
  beginTime: z.string().optional(),
  endTime: z.string().optional(),
  doorNo: z.number().int().optional(),
  planTemplateNo: z.string().optional(),
});

usersRouter.post('/', async (req, res, next) => {
  try {
    const { deviceId } = req.params as { deviceId: string };
    const input = userSchema.parse(req.body);
    res.status(201).json(await addUser(deviceId, input));
  } catch (err) {
    next(err);
  }
});

usersRouter.get('/', async (req, res, next) => {
  try {
    const { deviceId } = req.params as { deviceId: string };
    const offset = req.query.offset ? Number(req.query.offset) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const employeeNo = req.query.employeeNo as string | undefined;
    res.json(await searchUsers(deviceId, { offset, limit, employeeNo }));
  } catch (err) {
    next(err);
  }
});

usersRouter.get('/count', async (req, res, next) => {
  try {
    const { deviceId } = req.params as { deviceId: string };
    res.json(await countUsers(deviceId));
  } catch (err) {
    next(err);
  }
});

usersRouter.patch('/:employeeNo', async (req, res, next) => {
  try {
    const { deviceId, employeeNo } = req.params as { deviceId: string; employeeNo: string };
    const patch = userSchema.partial().parse(req.body);
    res.json(await updateUser(deviceId, { ...patch, employeeNo }));
  } catch (err) {
    next(err);
  }
});

usersRouter.delete('/:employeeNo', async (req, res, next) => {
  try {
    const { deviceId, employeeNo } = req.params as { deviceId: string; employeeNo: string };
    res.json(await deleteUser(deviceId, employeeNo));
  } catch (err) {
    next(err);
  }
});

usersRouter.delete('/', async (req, res, next) => {
  try {
    const { deviceId } = req.params as { deviceId: string };
    res.json(await deleteAllUsers(deviceId));
  } catch (err) {
    next(err);
  }
});
