import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import https from 'node:https';
import { logger } from '../logger.js';
import { buildAuthHeader, parseChallenge } from './digest.js';
import { buildHikvisionXml, looksLikeXml, parseHikvisionXml } from './xml.js';

export interface DeviceCredentials {
  host: string;
  port?: number;
  https?: boolean;
  username: string;
  password: string;
}

export interface HikRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  /** JSON body. Mutually exclusive with `xml`. */
  json?: unknown;
  /**
   * XML body (object form). Will be serialized via buildHikvisionXml().
   * Use this for endpoints that don't honour ?format=json on writes
   * (e.g. /ISAPI/System/time).
   */
  xml?: Record<string, unknown>;
  query?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
  raw?: boolean;
  responseType?: AxiosRequestConfig['responseType'];
}

export class HikvisionError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = 'HikvisionError';
  }
}

/**
 * ISAPI client with native HTTP Digest auth.
 */
export class HikvisionClient {
  private readonly baseUrl: string;
  private readonly axios: AxiosInstance;

  constructor(private readonly creds: DeviceCredentials) {
    const scheme = creds.https ? 'https' : 'http';
    const port = creds.port ?? (creds.https ? 443 : 80);
    this.baseUrl = `${scheme}://${creds.host}:${port}`;
    this.axios = axios.create({
      httpsAgent: creds.https
        ? new https.Agent({ rejectUnauthorized: false })
        : undefined,
      validateStatus: () => true,
      // Hikvision is picky about Accept; some firmwares 401 on */*  with no Accept.
      headers: { Accept: 'application/json, */*' },
    });
  }

  async request<T = unknown>(opts: HikRequestOptions): Promise<T> {
    const url = new URL(this.baseUrl + opts.path);
    // Set ?format hint matching the body. Some Hikvision endpoints default to
    // JSON parsing when no format is given (e.g. FingerPrintUpload), so we
    // pass format=xml explicitly when sending XML.
    let formatParam: 'json' | 'xml' | undefined;
    if (!opts.raw) formatParam = opts.xml !== undefined ? 'xml' : 'json';
    const query: Record<string, string | number | boolean | undefined> = {
      ...(formatParam ? { format: formatParam } : {}),
      ...opts.query,
    };
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
    const requestUri = url.pathname + url.search;
    const fullUrl = url.toString();

    let body: unknown;
    let contentType: string | undefined;
    if (opts.xml !== undefined) {
      body = buildHikvisionXml(opts.xml);
      contentType = 'application/xml';
    } else if (opts.json !== undefined) {
      body = opts.json;
      contentType = 'application/json';
    }

    const baseConfig: AxiosRequestConfig = {
      method: opts.method,
      url: fullUrl,
      data: body,
      headers: contentType ? { 'Content-Type': contentType } : {},
      timeout: opts.timeoutMs ?? 15_000,
      responseType: opts.responseType,
      // Prevent axios auto-stringifying our XML string
      transformRequest: opts.xml !== undefined ? [(d) => d] : undefined,
    };

    // Step 1: probe to get the WWW-Authenticate challenge.
    const first = await this.axios.request(baseConfig);

    if (first.status !== 401) {
      if (first.status >= 400) throw this.toError(opts, first.status, first.data);
      return this.normalizeBody(first.data) as T;
    }

    const wwwAuth =
      (first.headers['www-authenticate'] as string | undefined) ??
      (first.headers['WWW-Authenticate'] as string | undefined);
    logger.info(
      { url: fullUrl, wwwAuthenticate: wwwAuth ?? '(missing)' },
      'Hikvision digest challenge received',
    );
    if (!wwwAuth) {
      throw this.toError(opts, 401, first.data, 'No WWW-Authenticate header');
    }
    const challenge = parseChallenge(wwwAuth);
    if (!challenge) {
      throw this.toError(opts, 401, first.data, `Unparsable challenge: ${wwwAuth}`);
    }
    logger.info({ challenge }, 'Parsed digest challenge');

    const authHeader = buildAuthHeader({
      challenge,
      username: this.creds.username,
      password: this.creds.password,
      method: opts.method,
      uri: requestUri,
      debugSink: (d) =>
        logger.info({ digest: d, uri: requestUri }, 'Computed digest response'),
    });

    const second = await this.axios.request({
      ...baseConfig,
      headers: { ...baseConfig.headers, Authorization: authHeader },
    });

    if (second.status >= 400) {
      logger.warn(
        {
          status: second.status,
          authHeaderSent: authHeader,
          responseHeaders: second.headers,
          responseBody: second.data,
        },
        'Hikvision digest retry rejected',
      );
      throw this.toError(opts, second.status, second.data);
    }
    return this.normalizeBody(second.data) as T;
  }

  /**
   * Hikvision endpoints may return XML even when ?format=json is requested.
   * Normalize XML string bodies to objects so downstream code can treat
   * both the same way.
   */
  private normalizeBody(data: unknown): unknown {
    if (looksLikeXml(data)) {
      try {
        return parseHikvisionXml(data);
      } catch (err) {
        logger.warn({ err }, 'Failed to parse Hikvision XML response');
        return data;
      }
    }
    return data;
  }

  private toError(
    opts: HikRequestOptions,
    status: number,
    data: unknown,
    extra?: string,
  ) {
    logger.warn(
      { status, url: this.baseUrl + opts.path, data, extra },
      'Hikvision ISAPI error response',
    );
    return new HikvisionError(
      `ISAPI ${opts.method} ${opts.path} failed: ${status}${extra ? ' (' + extra + ')' : ''}`,
      status,
      data,
    );
  }

  getDeviceInfo() {
    return this.request<{ DeviceInfo: Record<string, unknown> }>({
      method: 'GET',
      path: '/ISAPI/System/deviceInfo',
    });
  }

  getStatus() {
    return this.request({ method: 'GET', path: '/ISAPI/System/status' });
  }

  reboot() {
    return this.request({ method: 'PUT', path: '/ISAPI/System/reboot' });
  }

  /**
   * Set device time. `localTime` must be `YYYY-MM-DDTHH:mm:ss±HH:MM`.
   * `timeZone` follows Hikvision's POSIX-style format e.g. `CST-0:00:00`
   * (UTC), `CST-8:00:00` (UTC+8), `CST+5:00:00` (UTC-5).
   */
  setTime(localTime: string, timeZone = 'CST-0:00:00') {
    // /ISAPI/System/time on this firmware ignores ?format=json on writes
    // and parses the body as XML regardless of Content-Type.
    return this.request({
      method: 'PUT',
      path: '/ISAPI/System/time',
      xml: { Time: { timeMode: 'manual', localTime, timeZone } },
    });
  }
}
