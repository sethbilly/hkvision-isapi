import dgram from 'node:dgram';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { parseHikvisionXml } from '../client/xml.js';
import { logger } from '../logger.js';

const SADP_MULTICAST = '239.255.255.250';
const SADP_PORT = 37020;

export interface DiscoveredDevice {
  uuid?: string;
  deviceType?: string;
  deviceDescription?: string;
  serialNo?: string;
  mac?: string;
  ipv4: string;
  subnetMask?: string;
  gateway?: string;
  ipv6?: string;
  httpPort?: number;
  commandPort?: number;
  dspVersion?: string;
  bootTime?: string;
  activated?: boolean;
  raw: Record<string, any>;
}

function buildProbe(uuid: string): Buffer {
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<Probe>' +
    `<Uuid>${uuid}</Uuid>` +
    '<Types>inquiry</Types>' +
    '</Probe>';
  return Buffer.from(xml, 'utf8');
}

function broadcastAddresses(): string[] {
  const addrs = new Set<string>();
  const ifaces = os.networkInterfaces();
  for (const list of Object.values(ifaces)) {
    for (const i of list ?? []) {
      if (i.family !== 'IPv4' || i.internal) continue;
      // Compute broadcast = address | ~netmask
      const a = i.address.split('.').map(Number);
      const m = i.netmask.split('.').map(Number);
      if (a.length !== 4 || m.length !== 4) continue;
      const bcast = a.map((oct, idx) => (oct & (m[idx] ?? 0)) | (~(m[idx] ?? 0) & 0xff));
      addrs.add(bcast.join('.'));
    }
  }
  return [...addrs];
}

function pickStr(obj: any, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj?.[k];
    if (v != null && String(v).length > 0) return String(v);
  }
  return undefined;
}

function pickNum(obj: any, ...keys: string[]): number | undefined {
  for (const k of keys) {
    const v = obj?.[k];
    if (v != null && String(v).length > 0) {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

function pickBool(obj: any, ...keys: string[]): boolean | undefined {
  for (const k of keys) {
    const v = obj?.[k];
    if (v == null) continue;
    const s = String(v).toLowerCase();
    if (s === 'true' || s === '1' || s === 'yes') return true;
    if (s === 'false' || s === '0' || s === 'no') return false;
  }
  return undefined;
}

/**
 * Discover Hikvision devices on the LAN via SADP (UDP multicast 239.255.255.250:37020).
 *
 * The host running this code must share an L2 broadcast domain with the
 * device — NAT-mode VMs typically cannot reach physical-LAN devices.
 */
export async function discoverDevices(timeoutMs = 4000): Promise<DiscoveredDevice[]> {
  return new Promise((resolve, reject) => {
    const found = new Map<string, DiscoveredDevice>();
    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

    const finish = () => {
      try {
        socket.close();
      } catch {
        /* noop */
      }
      resolve([...found.values()]);
    };

    socket.on('error', (err) => {
      logger.warn({ err }, 'SADP socket error');
      try {
        socket.close();
      } catch {
        /* noop */
      }
      reject(err);
    });

    socket.on('message', (msg, rinfo) => {
      const text = msg.toString('utf8');
      if (!text.includes('<')) return;
      let parsed: any;
      try {
        parsed = parseHikvisionXml(text);
      } catch {
        return;
      }
      const m =
        parsed?.ProbeMatch ?? parsed?.Probe ?? parsed?.Inquiry ?? parsed;
      // Ignore our own probe echoes.
      if (m?.Types && String(m.Types).toLowerCase() === 'inquiry' && !m.IPv4Address) {
        return;
      }
      const ipv4 = pickStr(m, 'IPv4Address', 'Ipv4Address', 'IPAddress') ?? rinfo.address;
      if (!ipv4) return;
      const key = pickStr(m, 'DeviceSN', 'SerialNo') ?? `${ipv4}|${pickStr(m, 'MAC') ?? ''}`;
      found.set(key, {
        uuid: pickStr(m, 'Uuid'),
        deviceType: pickStr(m, 'DeviceType'),
        deviceDescription: pickStr(m, 'DeviceDescription'),
        serialNo: pickStr(m, 'DeviceSN', 'SerialNo'),
        mac: pickStr(m, 'MAC'),
        ipv4,
        subnetMask: pickStr(m, 'IPv4SubnetMask', 'Ipv4SubnetMask'),
        gateway: pickStr(m, 'IPv4Gateway', 'Ipv4Gateway'),
        ipv6: pickStr(m, 'IPv6Address'),
        httpPort: pickNum(m, 'HttpPort'),
        commandPort: pickNum(m, 'CommandPort'),
        dspVersion: pickStr(m, 'DSPVersion', 'SoftwareVersion'),
        bootTime: pickStr(m, 'BootTime'),
        activated: pickBool(m, 'Activated'),
        raw: m,
      });
    });

    socket.bind(0, () => {
      try {
        socket.setBroadcast(true);
        try {
          socket.setMulticastTTL(2);
        } catch {
          /* some platforms reject this on unbound mcast */
        }
      } catch (err) {
        logger.warn({ err }, 'SADP socket setup partial failure');
      }

      const uuid = randomUUID();
      const probe = buildProbe(uuid);

      const targets = [SADP_MULTICAST, '255.255.255.255', ...broadcastAddresses()];
      for (const t of new Set(targets)) {
        socket.send(probe, 0, probe.length, SADP_PORT, t, (err) => {
          if (err) logger.warn({ err, target: t }, 'SADP probe send failed');
        });
      }

      setTimeout(finish, timeoutMs);
    });
  });
}
