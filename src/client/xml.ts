/**
 * Minimal Hikvision XML → JS object parser.
 *
 * Hikvision XML is shallow and well-formed: one root element containing
 * simple leaf tags (sometimes nested objects, occasionally lists). This
 * parser handles those cases without a full XML dependency.
 *
 * Example input:
 *   <DeviceInfo><deviceName>T&amp;A</deviceName><model>X</model></DeviceInfo>
 * Output:
 *   { DeviceInfo: { deviceName: 'T&A', model: 'X' } }
 */

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&');
}

type Node = string | { [k: string]: Node | Node[] };

function parseNode(inner: string): Node {
  // Strip XML comments
  inner = inner.replace(/<!--[\s\S]*?-->/g, '');
  const obj: Record<string, Node | Node[]> = {};
  let hasChildren = false;
  const re = /<([A-Za-z_][\w:-]*)([^>]*)>([\s\S]*?)<\/\1>|<([A-Za-z_][\w:-]*)([^>]*)\/>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner)) !== null) {
    hasChildren = true;
    const tag = m[1] ?? m[4]!;
    const body = m[3];
    const value: Node = body === undefined ? '' : parseNode(body);
    if (obj[tag] !== undefined) {
      if (Array.isArray(obj[tag])) (obj[tag] as Node[]).push(value);
      else obj[tag] = [obj[tag] as Node, value];
    } else {
      obj[tag] = value;
    }
  }
  if (!hasChildren) {
    const text = decodeEntities(inner.trim());
    return text;
  }
  return obj;
}

export function parseHikvisionXml(xml: string): Record<string, unknown> {
  // Drop XML declaration and surrounding whitespace
  const cleaned = xml.replace(/^\s*<\?xml[^?]*\?>\s*/i, '').trim();
  const result = parseNode(cleaned);
  if (typeof result === 'string') return {};
  return result as Record<string, unknown>;
}

export function looksLikeXml(body: unknown): body is string {
  return typeof body === 'string' && /^\s*<\?xml|^\s*<[A-Za-z]/.test(body);
}

/**
 * Serialize a single-rooted JS object to Hikvision-flavoured XML.
 *
 * Input must have exactly one top-level key (the root element name).
 * Values may be primitives, nested objects, or arrays of objects/primitives
 * (which are emitted as repeated tags).
 */
export function buildHikvisionXml(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj);
  if (keys.length !== 1) {
    throw new Error('buildHikvisionXml: object must have exactly one root key');
  }
  const root = keys[0]!;
  return `<?xml version="1.0" encoding="UTF-8"?>\n` + serialize(root, obj[root]);
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function serialize(tag: string, value: unknown): string {
  if (value === null || value === undefined) return `<${tag}/>`;
  if (Array.isArray(value)) {
    return value.map((v) => serialize(tag, v)).join('');
  }
  if (typeof value === 'object') {
    const inner = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => serialize(k, v))
      .join('');
    return `<${tag}>${inner}</${tag}>`;
  }
  return `<${tag}>${escapeXml(String(value))}</${tag}>`;
}
