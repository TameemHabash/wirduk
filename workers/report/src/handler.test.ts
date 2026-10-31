import { REPORT_LIMITS } from '../../../src/features/report/report-protocol';

import { escapeText, issueBody, issueTitle } from './github';
import { type Env, type RateLimiter, handleRequest } from './handler';

const JPEG = '/9j/4AAQSkZJRg==';
const TEXT = 'العداد لا يتحرك بعد الضغط';
const REPO = 'owner/reports';

function limiter(allowed = Infinity): RateLimiter & { keys: string[] } {
  const keys: string[] = [];
  return {
    keys,
    limit: ({ key }) => {
      keys.push(key);
      return Promise.resolve({ success: keys.length <= allowed });
    },
  };
}

function setup(env: Partial<Env> = {}, githubStatus = 201) {
  const calls: { url: string; method: string; body: Record<string, unknown> }[] = [];
  const fetchMock = jest.fn((url: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(url),
      method: init?.method ?? 'GET',
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
    });
    return Promise.resolve(new Response(JSON.stringify({ number: 7 }), { status: githubStatus }));
  });
  const fullEnv: Env = {
    GITHUB_TOKEN: 'test-token',
    GITHUB_REPO: REPO,
    IP_LIMITER: limiter(),
    GLOBAL_LIMITER: limiter(),
    ...env,
  };
  const send = (body: unknown, init: RequestInit & { path?: string } = {}) =>
    handleRequest(
      new Request(`https://relay.example${init.path ?? '/report'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.5' },
        body: typeof body === 'string' ? body : JSON.stringify(body),
        ...init,
      }),
      fullEnv,
      {
        fetch: fetchMock as typeof fetch,
        now: () => new Date('2026-10-23T08:00:00Z'),
        newId: () => 'abcd1234',
      },
    );
  return { send, calls, env: fullEnv };
}

const report = {
  description: TEXT,
  details: { appVersion: '1.0.0', os: 'Android 14' },
  images: [{ type: 'image/jpeg', data: JPEG }],
};

describe('report relay', () => {
  it('saves the screenshots, then creates the issue that shows them', async () => {
    const { send, calls } = setup();
    const res = await send(report);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });

    expect(calls).toHaveLength(2);
    const [image, issue] = calls;
    expect(image).toMatchObject({
      method: 'PUT',
      url: `https://api.github.com/repos/${REPO}/contents/screenshots/2026-10-23/abcd1234-1.jpg`,
      body: { content: JPEG },
    });
    expect(issue).toMatchObject({
      method: 'POST',
      url: `https://api.github.com/repos/${REPO}/issues`,
      body: { title: `Report: ${TEXT}` },
    });
    const body = String(issue!.body.body);
    expect(body).toContain(TEXT);
    expect(body).toContain(
      `https://github.com/${REPO}/blob/HEAD/screenshots/2026-10-23/abcd1234-1.jpg?raw=true`,
    );
    expect(body).toContain('| os | Android 14 |');
  });

  it('sends the token only to GitHub, in the header', async () => {
    const fetchSpy = jest.fn(() => Promise.resolve(new Response('{"number":1}', { status: 201 })));
    await handleRequest(
      new Request('https://relay.example/report', {
        method: 'POST',
        body: JSON.stringify({ description: TEXT }),
      }),
      {
        GITHUB_TOKEN: 'secret-1',
        GITHUB_REPO: REPO,
        IP_LIMITER: limiter(),
        GLOBAL_LIMITER: limiter(),
      },
      { fetch: fetchSpy as typeof fetch, now: () => new Date(), newId: () => 'x' },
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url.startsWith('https://api.github.com/')).toBe(true);
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer secret-1');
    expect(String(init.body)).not.toContain('secret-1');
  });

  it('refuses other paths and methods', async () => {
    const { send, calls } = setup();
    expect((await send(report, { path: '/' })).status).toBe(404);
    const get = await send(undefined, { method: 'GET', body: null });
    expect(get.status).toBe(405);
    expect(calls).toHaveLength(0);
  });

  it('says "unavailable" until the token is set', async () => {
    const { send } = setup({ GITHUB_TOKEN: undefined });
    const res = await send(report);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, error: 'unavailable' });
  });

  it('limits each IP, and everyone together, before reading the report', async () => {
    const ip = limiter(2);
    const { send, calls } = setup({ IP_LIMITER: ip });
    expect((await send(report)).status).toBe(201);
    expect((await send(report)).status).toBe(201);
    const third = await send(report);
    expect(third.status).toBe(429);
    expect(await third.json()).toEqual({ ok: false, error: 'rate-limited' });
    expect(ip.keys).toEqual(['203.0.113.5', '203.0.113.5', '203.0.113.5']);
    expect(calls).toHaveLength(4); // two reports, two calls each

    const all = setup({ GLOBAL_LIMITER: limiter(0) });
    expect((await all.send(report)).status).toBe(429);
    expect(all.calls).toHaveLength(0);
  });

  it('refuses a body that is too large, even without a Content-Length', async () => {
    const { send, calls } = setup();
    const huge = 'x'.repeat(REPORT_LIMITS.maxBodyBytes + 1);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(huge));
        controller.close();
      },
    });
    const res = await send(undefined, { body: stream, duplex: 'half' } as RequestInit);
    expect(res.status).toBe(413);
    expect(calls).toHaveLength(0);
  });

  it('refuses bad JSON and bad reports', async () => {
    const { send, calls } = setup();
    const notJson = await send('{not json');
    expect(notJson.status).toBe(400);
    expect(await notJson.json()).toEqual({ ok: false, error: 'invalid' });
    expect((await send({ description: 'قصير' })).status).toBe(400);
    expect(
      (await send({ ...report, images: [{ type: 'image/svg+xml', data: 'PHN2Zz4=' }] })).status,
    ).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it('answers "failed" when GitHub refuses, without logging the report', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { send } = setup({}, 401);
    const res = await send(report);
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, error: 'failed' });
    expect(log).toHaveBeenCalledWith('GitHub screenshot 1 failed: 401');
    expect(JSON.stringify(log.mock.calls)).not.toContain(TEXT);
    log.mockRestore();
  });
});

describe('issue text', () => {
  it('stops @mentions and HTML', () => {
    expect(escapeText('hi @owner <img src=x>')).toBe('hi @​owner &lt;img src=x>');
  });

  it('uses the first line, at most 60 characters, as the title', () => {
    expect(issueTitle(`${'ب'.repeat(70)}\nالسطر الثاني`)).toBe(`Report: ${'ب'.repeat(60)}…`);
  });

  it('leaves out empty sections', () => {
    const body = issueBody({ description: TEXT, details: {}, images: [] }, REPO, [], 'id1');
    expect(body).not.toContain('### Screenshots');
    expect(body).not.toContain('### Details');
    expect(body).toContain('Report id1.');
  });
});
