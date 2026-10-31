/**
 * Turns a checked report into a GitHub issue in the private reports repo:
 * each screenshot is saved as a file in the repo, then the issue links them.
 * The token needs "Contents: read and write" and "Issues: read and write" on
 * that one repo only.
 */
import type { Report } from '../../../src/features/report/report-protocol';

const API = 'https://api.github.com';

export interface GitHubDeps {
  fetch: typeof fetch;
  now: () => Date;
  /** A short random id that ties the issue to its screenshots. */
  newId: () => string;
}

export class GitHubError extends Error {
  constructor(
    readonly step: string,
    readonly status: number,
  ) {
    super(`GitHub ${step} failed: ${status}`);
  }
}

/** No @mentions (they would notify people), no raw HTML. */
export function escapeText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/@/g, '@​');
}

const escapeCell = (text: string) => escapeText(text).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

export function issueTitle(description: string): string {
  const firstLine = description.split(/\r?\n/)[0]!.trim();
  const short = firstLine.length > 60 ? `${firstLine.slice(0, 60)}…` : firstLine;
  return `Report: ${escapeText(short)}`;
}

export function issueBody(report: Report, repo: string, imagePaths: string[], id: string): string {
  const parts = [escapeText(report.description)];
  if (imagePaths.length > 0) {
    parts.push(
      '### Screenshots',
      imagePaths
        .map((path, i) => {
          const url = `https://github.com/${repo}/blob/HEAD/${path}`;
          return `[![Screenshot ${i + 1}](${url}?raw=true)](${url})`;
        })
        .join('\n'),
    );
  }
  const details = Object.entries(report.details);
  if (details.length > 0) {
    parts.push(
      '### Details',
      ['| | |', '|---|---|', ...details.map(([k, v]) => `| ${k} | ${escapeCell(v)} |`)].join('\n'),
    );
  }
  parts.push(`<sub>Sent from the app. Report ${id}.</sub>`);
  return parts.join('\n\n');
}

export async function createIssue(
  report: Report,
  repo: string,
  token: string,
  deps: GitHubDeps,
): Promise<number> {
  const call = async (step: string, path: string, method: string, body: unknown) => {
    const res = await deps.fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'wirduk-report',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new GitHubError(step, res.status);
    return (await res.json()) as Record<string, unknown>;
  };

  const id = deps.newId();
  const day = deps.now().toISOString().slice(0, 10);
  const paths: string[] = [];
  for (const [i, image] of report.images.entries()) {
    const ext = image.type === 'image/png' ? 'png' : 'jpg';
    const path = `screenshots/${day}/${id}-${i + 1}.${ext}`;
    await call(`screenshot ${i + 1}`, `/repos/${repo}/contents/${path}`, 'PUT', {
      message: `Screenshot ${i + 1} of report ${id}`,
      content: image.data,
    });
    paths.push(path);
  }
  const issue = await call('issue', `/repos/${repo}/issues`, 'POST', {
    title: issueTitle(report.description),
    body: issueBody(report, repo, paths, id),
  });
  return Number(issue.number);
}
