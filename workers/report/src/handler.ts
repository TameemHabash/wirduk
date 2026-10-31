/**
 * The relay for "report an issue": POST /report with the JSON the app sends
 * (src/features/report/report-protocol.ts). It keeps the GitHub token, so the
 * app never has one and the reporter needs no account.
 *
 * Spam limits: the body size, the report checks, and two rate limits (per IP
 * and for everyone). It stores nothing and logs no report content.
 */
import {
  REPORT_LIMITS,
  type ReportError,
  parseReport,
} from '../../../src/features/report/report-protocol';

import { type GitHubDeps, GitHubError, createIssue } from './github';

/** Cloudflare's Rate Limiting binding (wrangler.jsonc, "ratelimits"). */
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  /** Secret: `npx wrangler secret put GITHUB_TOKEN` (the owner sets it). */
  GITHUB_TOKEN?: string;
  /** "owner/name" of the private repo that receives the reports. */
  GITHUB_REPO?: string;
  IP_LIMITER: RateLimiter;
  GLOBAL_LIMITER: RateLimiter;
}

const json = (status: number, body: object, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

const refuse = (status: number, error: ReportError) => json(status, { ok: false, error });

/** The body as text, or null when it is larger than `max` bytes (stops reading early). */
async function readBody(request: Request, max: number): Promise<string | null> {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function handleRequest(
  request: Request,
  env: Env,
  deps: GitHubDeps,
): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (pathname !== '/report') return json(404, { ok: false });
  if (request.method !== 'POST') return json(405, { ok: false }, { Allow: 'POST' });
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) return refuse(503, 'unavailable');

  const declared = Number(request.headers.get('Content-Length'));
  if (declared > REPORT_LIMITS.maxBodyBytes) return refuse(413, 'too-big');

  // Before reading the body: a refused request costs almost nothing.
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const perIp = await env.IP_LIMITER.limit({ key: ip });
  if (!perIp.success) return refuse(429, 'rate-limited');
  const everyone = await env.GLOBAL_LIMITER.limit({ key: 'all' });
  if (!everyone.success) return refuse(429, 'rate-limited');

  const text = await readBody(request, REPORT_LIMITS.maxBodyBytes);
  if (text === null) return refuse(413, 'too-big');
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return refuse(400, 'invalid');
  }
  const report = parseReport(body);
  if ('error' in report) return refuse(report.error === 'too-big' ? 413 : 400, report.error);

  try {
    await createIssue(report, env.GITHUB_REPO, env.GITHUB_TOKEN, deps);
  } catch (error) {
    // Only the step and the status code: never the report or the token.
    console.error(error instanceof GitHubError ? error.message : 'GitHub request failed');
    return refuse(502, 'failed');
  }
  return json(201, { ok: true });
}
