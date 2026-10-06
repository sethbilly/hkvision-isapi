import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

fs.mkdirSync(path.dirname(path.resolve(config.dbPath)), { recursive: true });

export const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS devices (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  host         TEXT NOT NULL,
  port         INTEGER NOT NULL DEFAULT 80,
  https        INTEGER NOT NULL DEFAULT 0,
  username     TEXT NOT NULL,
  password     TEXT NOT NULL,
  serial       TEXT,
  model        TEXT,
  firmware     TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id    TEXT NOT NULL,
  event_time   TEXT NOT NULL,
  employee_no  TEXT,
  name         TEXT,
  major        INTEGER,
  minor        INTEGER,
  verify_mode  TEXT,
  door_no      INTEGER,
  raw          TEXT NOT NULL,
  received_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_events_device_time ON events(device_id, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_events_employee    ON events(employee_no);
`);

export interface DeviceRow {
  id: string;
  name: string;
  host: string;
  port: number;
  https: number;
  username: string;
  password: string;
  serial: string | null;
  model: string | null;
  firmware: string | null;
  created_at: string;
  updated_at: string;
}
