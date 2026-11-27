import { checkCommand, splitCommands, type Git, type GitFor } from './git-guard.ts';

const ORIGIN = 'https://github.com/TameemHabash/wirduk.git';
const ARCHIVE = 'https://github.com/TameemHabash/wirduk-archive.git';

interface Repo {
  branch?: string | null;
  /** branch → where a plain `git push` goes */
  pushRemotes?: Record<string, string>;
  files?: Record<string, string>;
  tags?: Record<string, boolean>; // tag → on main?
}

/** A pretend repository, per folder (`git -C`). */
function repo(main: Repo = {}, others: Record<string, Repo> = {}): GitFor {
  const make = (r: Repo): Git => ({
    currentBranch: () => (r.branch === undefined ? 'main' : r.branch),
    defaultPushRemote: (branch) => (branch && r.pushRemotes?.[branch]) || 'origin',
    remoteUrl: (name) => ({ origin: ORIGIN, archive: ARCHIVE })[name] ?? null,
    isTag: (name) => r.tags?.[name] !== undefined,
    inMain: (ref) => r.tags?.[ref.replace('refs/tags/', '')] === true,
    readFile: (path) => r.files?.[path] ?? null,
  });
  return (dir) => make(dir === undefined ? main : (others[dir] ?? {}));
}

const blocked = (command: string, git: GitFor = repo()) => checkCommand(command, git) !== null;

describe('commit messages', () => {
  const clean = 'Refactor RF7: Claude Code setup and docs\n\nThe hook, the skills, the docs.\n';
  const signed = `${clean}\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n`;

  it('lets a message file without attribution through (Claude Code named in it is fine)', () => {
    expect(
      blocked('git commit -F .local/msg-1.txt', repo({ files: { '.local/msg-1.txt': clean } })),
    ).toBe(false);
  });

  it('blocks a message file with a Co-Authored-By line', () => {
    const why = checkCommand(
      'git commit -F .local/msg-2.txt',
      repo({ files: { '.local/msg-2.txt': signed } }),
    );
    expect(why).toMatch(/Co-Authored-By/);
  });

  it.each([
    [
      'a "Generated with" line',
      `${clean}\nGenerated with [Claude Code](https://claude.com/claude-code)\n`,
    ],
    ['the robot sign', `${clean}\n\u{1F916} done\n`],
    ['an Anthropic address', `${clean}\nnoreply@anthropic.com\n`],
  ])('blocks %s', (_, text) => {
    expect(blocked('git commit -F m.txt', repo({ files: { 'm.txt': text } }))).toBe(true);
  });

  it('blocks a message file that starts with a BOM', () => {
    const bom = String.fromCharCode(0xfeff);
    const why = checkCommand('git commit -F m.txt', repo({ files: { 'm.txt': bom + clean } }));
    expect(why).toMatch(/BOM/);
  });

  it('reads the file in every way git takes it', () => {
    const git = repo({ files: { 'm.txt': signed } });
    expect(blocked('git commit --file=m.txt', git)).toBe(true);
    expect(blocked('git commit --file m.txt', git)).toBe(true);
    expect(blocked('git commit -aF m.txt', git)).toBe(true);
    expect(blocked('git commit -Fm.txt', git)).toBe(true);
    expect(blocked('git commit -F "m.txt"', git)).toBe(true);
  });

  it('reads the file named by a PowerShell variable set before', () => {
    const git = repo({ files: { '.local/msg-3.txt': signed } });
    expect(blocked("$msg = '.local/msg-3.txt'; git commit -F $msg", git)).toBe(true);
    expect(blocked('$msg=\'.local/msg-3.txt\'\ngit commit -F "$msg"', git)).toBe(true);
  });

  it('reads the file in the folder given with -C', () => {
    const git = repo({}, { '../other': { files: { 'm.txt': signed } } });
    expect(blocked('git -C ../other commit -F m.txt', git)).toBe(true);
  });

  it('blocks attribution written in the command itself', () => {
    expect(blocked('git commit -m "Fix" -m "Co-Authored-By: Someone <a@b.c>"')).toBe(true);
    expect(blocked("git commit -m @'\nFix the reader\n\nCo-Authored-By: x <y>\n'@")).toBe(true);
    expect(blocked('git commit -m "$(cat <<\'EOF\'\nFix\n\nCo-Authored-By: x <y>\nEOF\n)"')).toBe(
      true,
    );
  });

  it('does not take a message that starts with -F for a file', () => {
    expect(blocked('git commit -m "-Fix the tab"', repo({ files: { 'ix the tab': signed } }))).toBe(
      false,
    );
  });

  it('lets an unreadable file through (git reports it)', () => {
    expect(blocked('git commit -F missing.txt')).toBe(false);
  });

  it('ignores commands that only mention git in a string', () => {
    expect(blocked('Write-Host "git commit -m Co-Authored-By: x"')).toBe(false);
  });
});

describe('pushes', () => {
  it.each([
    'git push origin main',
    'git push -u origin main',
    'git push --force-with-lease origin main',
    'git push origin main:main',
    'git push origin refs/heads/main:refs/heads/main',
    'git push origin HEAD',
    'git push',
    'git push archive archive-main',
    `git push ${ARCHIVE} archive-main`,
    'npm run verify',
  ])('lets `%s` through on main', (command) => {
    expect(checkCommand(command, repo())).toBeNull();
  });

  it.each([
    'git push origin archive-main',
    'git push origin archive-main:main',
    'git push origin +archive-main',
    'git push --dry-run origin archive-main',
    `git push ${ORIGIN} archive-main`,
    `git push ${ORIGIN.replace('.git', '')}/ archive-main`,
    'git push origin feature',
    'git push --all',
    'git push origin --all',
    'git push --mirror origin',
    'git push origin --tags',
    'git push --prune origin main',
    'git push origin --delete old',
    'git push -d origin old',
    'git push origin :old',
  ])('blocks `%s`', (command) => {
    expect(checkCommand(command, repo())).toMatch(/only main goes to origin/);
  });

  it('blocks a plain push from another branch when it goes to origin', () => {
    expect(blocked('git push', repo({ branch: 'archive-main' }))).toBe(true);
    expect(blocked('git push origin HEAD', repo({ branch: 'feature' }))).toBe(true);
    expect(blocked('git push', repo({ branch: null }))).toBe(true);
  });

  it('lets a plain push from archive-main through when it goes to the archive', () => {
    const git = repo({ branch: 'archive-main', pushRemotes: { 'archive-main': 'archive' } });
    expect(blocked('git push', git)).toBe(false);
  });

  it('lets a tag through only when its commit is on main', () => {
    const git = repo({ tags: { 'test-build': true, old: false } });
    expect(blocked('git push origin test-build', git)).toBe(false);
    expect(blocked('git push --force origin refs/tags/test-build', git)).toBe(false);
    expect(blocked('git push origin old', git)).toBe(true);
    expect(blocked('git push origin test-build:main', git)).toBe(true);
  });

  it('checks every command of a chain', () => {
    const git = repo({ files: { 'm.txt': 'Fix the reader\n' } });
    expect(blocked('git add -A; git commit -F m.txt; if ($?) { git push origin main }', git)).toBe(
      false,
    );
    expect(blocked('git commit -F m.txt && git push origin archive-main', git)).toBe(true);
  });
});

describe('splitCommands', () => {
  it('splits on separators and keeps quoted text whole', () => {
    expect(splitCommands("git add -A; if ($?) { git commit -F 'a b.txt' }")).toEqual([
      ['git', 'add', '-A'],
      ['if'],
      ['$?'],
      ['git', 'commit', '-F', 'a b.txt'],
    ]);
  });

  it("reads PowerShell's doubled quote and escaped double quotes", () => {
    expect(splitCommands(`echo 'it''s' "say \\"hi\\"" "a\`"b"`)).toEqual([
      ['echo', "it's", 'say "hi"', 'a"b'],
    ]);
  });

  it('reads a here-string as one word', () => {
    expect(splitCommands("git commit -m @'\nline one; two\n'@\ngit log")).toEqual([
      ['git', 'commit', '-m', 'line one; two'],
      ['git', 'log'],
    ]);
  });
});
