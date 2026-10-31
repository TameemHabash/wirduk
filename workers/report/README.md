# The "report an issue" relay

A small Cloudflare Worker. The app sends a report here (`POST /report`, JSON). The Worker keeps the
GitHub token, saves the screenshots in a **private** repo and opens an issue there. The reporter
needs no account, and the app holds no token.

- Code: `src/handler.ts` (checks, limits), `src/github.ts` (the issue). The report format and limits
  are shared with the app: `src/features/report/report-protocol.ts`.
- Tests run with the app tests (`npm run verify`, or `npx jest workers`).
- Limits: body ≤ 6 MB, description 10–4000 characters, ≤ 4 images (JPEG/PNG, ≤ 1 MB each, the
  app shrinks them first), 2 reports a minute per IP, 10 a minute for everyone (approximate, per
  Cloudflare location). Cloudflare logs are off; the Worker logs only a GitHub error code.
- Answers: `201 {ok:true}`, or `{ok:false, error}` with `invalid` (400), `too-big` (413),
  `rate-limited` (429), `failed` (502, GitHub refused), `unavailable` (503, no token yet).

## Setting it up (the owner's steps, once)

Each step creates something outside this repo, so it is done only with the owner's OK.

1. **Private repo** for the reports: `TameemHabash/wirduk-reports` (the name is in
   `wrangler.jsonc`, `vars.GITHUB_REPO`). Private, so screenshots and texts are not public.
2. **Log in to Cloudflare** from this folder: `npx wrangler@4 login` (opens the browser).
3. **Deploy**: `npx wrangler@4 deploy`. It prints the address, like
   `https://wirduk-report.<account>.workers.dev`. Live since 2026-10-23 at
   `https://wirduk-report.wirduk.workers.dev` (workers.dev name `wirduk`). A new account first
   needs a workers.dev name: Cloudflare dashboard → Workers & Pages → Subdomain.
4. **GitHub token** (the owner makes it; nobody else sees it): GitHub → Settings → Developer
   settings → Fine-grained tokens → Generate. Repository access: **only** `wirduk-reports`.
   Permissions: **Contents: Read and write**, **Issues: Read and write**. Nothing else.
   Then, in this folder: `npx wrangler@4 secret put GITHUB_TOKEN` and paste it there. Or in the
   Cloudflare dashboard: wirduk-report → Settings → Variables and Secrets → Add, **Type: Secret**
   (not "Text": a Text variable is shown in the dashboard, and the next `wrangler deploy`
   removes it, because the variables in `wrangler.jsonc` replace the dashboard ones). Never put
   the token in `wrangler.jsonc`, even if the dashboard suggests it.
5. Put the address in the app: `APP_CONFIG.report.endpoint` (`src/config/app-config.ts`). The
   "الإبلاغ عن مشكلة" row then shows in Settings.
6. The privacy policy (`wirduk-audio/privacy/`) must say what a report sends, before release.

## Later changes

- Change the code, run the tests, then `npx wrangler@4 deploy` again.
- **A new detail name** (`DETAIL_KEYS` in `report-protocol.ts`): deploy the relay **before**
  any app build sends it. The relay refuses unknown names, and an older relay would refuse every
  report from the new app. Also add it to the privacy page.
- A new token (when it expires): step 4 again.
- Stop all reports at once: `npx wrangler@4 delete` (sending then fails with an error message).
  Or remove the token: `npx wrangler@4 secret delete GITHUB_TOKEN` (the app says "not available
  now").
