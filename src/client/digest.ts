import crypto from 'node:crypto';

/**
 * Minimal HTTP Digest auth helper. Computes the Authorization header
 * given the WWW-Authenticate challenge, method, URI (path+query), and creds.
 * Supports qop=auth (the only mode Hikvision uses).
 */

function md5(s: string): string {
  return crypto.createHash('md5').update(s).digest('hex');
}

export interface DigestChallenge {
  realm: string;
  nonce: string;
  qop?: string;
  opaque?: string;
  algorithm?: string; // typically "MD5"
}

export function parseChallenge(header: string): DigestChallenge | null {
  const m = /^Digest\s+(.*)$/is.exec(header.trim());
  if (!m) return null;
  const params: Record<string, string> = {};
  // key=value pairs where value is quoted or unquoted token, separated by commas.
  const re = /(\w+)\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([^,]+))(?:\s*,\s*|\s*$)/g;
  let r: RegExpExecArray | null;
  while ((r = re.exec(m[1]!)) !== null) {
    const key = r[1]!.toLowerCase();
    const val = (r[2] ?? r[3] ?? '').trim();
    params[key] = val;
  }
  if (!params.realm || !params.nonce) return null;
  return {
    realm: params.realm,
    nonce: params.nonce,
    qop: params.qop,
    opaque: params.opaque,
    algorithm: params.algorithm ?? 'MD5',
  };
}

export interface DigestComputeDebug {
  ha1: string;
  ha2: string;
  response: string;
  nc: string;
  cnonce: string;
  qop: string;
  uri: string;
  algorithm: string;
}

export function buildAuthHeader(opts: {
  challenge: DigestChallenge;
  username: string;
  password: string;
  method: string;
  uri: string;
  nc?: string;
  cnonce?: string;
  debugSink?: (d: DigestComputeDebug) => void;
}): string {
  const nc = opts.nc ?? '00000001';
  const cnonce = opts.cnonce ?? crypto.randomBytes(8).toString('hex');
  const qopList = (opts.challenge.qop ?? '').split(',').map((s) => s.trim());
  const qop = qopList.includes('auth') ? 'auth' : qopList[0] || '';
  const algorithm = (opts.challenge.algorithm ?? 'MD5').toUpperCase();

  // HA1 — for MD5-sess we need an extra hash with nonce + cnonce
  let ha1 = md5(`${opts.username}:${opts.challenge.realm}:${opts.password}`);
  if (algorithm === 'MD5-SESS') {
    ha1 = md5(`${ha1}:${opts.challenge.nonce}:${cnonce}`);
  }
  const ha2 = md5(`${opts.method}:${opts.uri}`);
  const response = qop
    ? md5(`${ha1}:${opts.challenge.nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
    : md5(`${ha1}:${opts.challenge.nonce}:${ha2}`);

  if (opts.debugSink) {
    opts.debugSink({ ha1, ha2, response, nc, cnonce, qop, uri: opts.uri, algorithm });
  }

  const parts = [
    `username="${opts.username}"`,
    `realm="${opts.challenge.realm}"`,
    `nonce="${opts.challenge.nonce}"`,
    `uri="${opts.uri}"`,
    `algorithm=${algorithm}`,
    `response="${response}"`,
  ];
  if (qop) {
    parts.push(`qop=${qop}`);
    parts.push(`nc=${nc}`);
    parts.push(`cnonce="${cnonce}"`);
  }
  if (opts.challenge.opaque) {
    parts.push(`opaque="${opts.challenge.opaque}"`);
  }
  return 'Digest ' + parts.join(', ');
}
