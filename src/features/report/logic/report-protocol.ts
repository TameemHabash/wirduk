/**
 * What "report an issue" sends, shared by the app and the relay
 * (workers/report). No React Native or Node imports: both sides use it.
 *
 * The app sends one JSON POST. The relay checks it with `parseReport` and
 * creates a GitHub issue in a private repo. Nothing else is sent or stored.
 */

export const REPORT_LIMITS = {
  minChars: 10,
  maxChars: 4000,
  maxImages: 4,
  /** One screenshot after the app shrinks it (JPEG). */
  maxImageBytes: 1_000_000,
  /** The whole request, with the images in base64. */
  maxBodyBytes: 6_000_000,
  /** Each detail value. */
  maxDetailChars: 100,
} as const;

/** The app and device details, shown to the user before sending. All optional. */
export const DETAIL_KEYS = [
  'appVersion',
  'contentVersion',
  'os',
  'device',
  'screen',
  'fontScale',
  'freeStorage',
  'language',
  'theme',
  'dhikrFont',
  'dhikrFontSize',
] as const;
export type DetailKey = (typeof DETAIL_KEYS)[number];
export type ReportDetails = Partial<Record<DetailKey, string>>;

export type ImageType = 'image/jpeg' | 'image/png';

export interface ReportImage {
  type: ImageType;
  /** Base64, no `data:` prefix. */
  data: string;
}

export interface Report {
  description: string;
  details: ReportDetails;
  images: ReportImage[];
}

/** The relay's answers. `error` names the reason; the app shows a message for each. */
export type ReportError = 'invalid' | 'too-big' | 'rate-limited' | 'unavailable' | 'failed';

/** Bytes a base64 string decodes to. */
export function base64Bytes(data: string): number {
  const padding = data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0;
  return Math.floor((data.length * 3) / 4) - padding;
}

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
/** The first bytes of the file, in base64: FF D8 FF (JPEG) and 89 50 4E 47 (PNG). */
const MAGIC: Record<ImageType, string> = { 'image/jpeg': '/9j/', 'image/png': 'iVBORw0KGgo' };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** The length the relay checks: without the spaces at the start and the end. */
export function descriptionLength(text: string): number {
  return text.trim().length;
}

/** Checks a report received by the relay. Returns the cleaned report, or why it was refused. */
export function parseReport(body: unknown): Report | { error: 'invalid' | 'too-big' } {
  if (!isRecord(body)) return { error: 'invalid' };
  const { description, details, images } = body;

  if (typeof description !== 'string') return { error: 'invalid' };
  const text = description.trim();
  if (text.length < REPORT_LIMITS.minChars) return { error: 'invalid' };
  if (text.length > REPORT_LIMITS.maxChars) return { error: 'too-big' };

  const cleanDetails: ReportDetails = {};
  if (details !== undefined) {
    if (!isRecord(details)) return { error: 'invalid' };
    for (const [key, value] of Object.entries(details)) {
      if (!(DETAIL_KEYS as readonly string[]).includes(key)) return { error: 'invalid' };
      if (typeof value !== 'string' || value.length > REPORT_LIMITS.maxDetailChars) {
        return { error: 'invalid' };
      }
      cleanDetails[key as DetailKey] = value;
    }
  }

  const cleanImages: ReportImage[] = [];
  if (images !== undefined) {
    if (!Array.isArray(images)) return { error: 'invalid' };
    if (images.length > REPORT_LIMITS.maxImages) return { error: 'too-big' };
    for (const image of images) {
      if (!isRecord(image)) return { error: 'invalid' };
      const { type, data } = image;
      if (type !== 'image/jpeg' && type !== 'image/png') return { error: 'invalid' };
      if (typeof data !== 'string' || !data.startsWith(MAGIC[type]) || !BASE64.test(data)) {
        return { error: 'invalid' };
      }
      if (base64Bytes(data) > REPORT_LIMITS.maxImageBytes) return { error: 'too-big' };
      cleanImages.push({ type, data });
    }
  }

  return { description: text, details: cleanDetails, images: cleanImages };
}
