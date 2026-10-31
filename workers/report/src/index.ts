/** Cloudflare Worker entry: `npx wrangler deploy` from workers/report (see its README). */
import { type Env, handleRequest } from './handler';

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env, {
      fetch: (input, init) => fetch(input, init),
      now: () => new Date(),
      newId: () => crypto.randomUUID().slice(0, 8),
    });
  },
};
