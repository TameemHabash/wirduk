/**
 * The owner's git rules, checked before Claude Code runs a shell command (the hook
 * `.claude/hooks/guard-git.mjs` calls `checkCommand`):
 *
 *  - A commit message has no Co-Authored-By line and no AI attribution, and does not start
 *    with a BOM (PowerShell's Set-Content adds one).
 *  - Only `main` goes to `origin` (public). `archive-main` (the private history before
 *    2026-11-01) and every other branch never do. A tag may go when its commit is on main
 *    (the phone APK's `test-build`).
 *
 * The command is PowerShell or bash text. `checkCommand` returns why it is blocked, or null.
 * `Git` answers the few questions about the repository, so tests need no repository.
 */

export interface Git {
  /** The current branch, or null when HEAD is detached. */
  currentBranch(): string | null;
  /** Where a plain `git push` on this branch goes (pushRemote, pushDefault, remote). */
  defaultPushRemote(branch: string | null): string;
  /** The URL of a remote, or null when there is no such remote. */
  remoteUrl(name: string): string | null;
  /** Whether `refs/tags/<name>` exists. */
  isTag(name: string): boolean;
  /** Whether a commit-ish is on main (main itself or an ancestor of it). */
  inMain(ref: string): boolean;
  /** A file's text (for `git commit -F`), or null when it cannot be read. */
  readFile(path: string): string | null;
}

/** Gives the `Git` for a folder (`git -C <dir>`), or for the working folder (undefined). */
export type GitFor = (dir: string | undefined) => Git;

const ATTRIBUTION: readonly (readonly [RegExp, string])[] = [
  [/co-authored-by\s*:/i, 'a Co-Authored-By line'],
  [/noreply@anthropic\.com/i, 'an Anthropic address'],
  [/generated (with|by) \[?claude/i, 'a "Generated with Claude" line'],
  [/\u{1F916}/u, 'the robot sign'],
  [/\bclaude[ -](opus|sonnet|haiku|fable)\b/i, 'a Claude model name'],
];

/** The byte-order mark PowerShell's Set-Content puts before the subject. */
const BOM = String.fromCharCode(0xfeff);

const RULE_COMMIT =
  "The owner's rule: commit messages have no Co-Authored-By line and no Claude/AI attribution.";
const RULE_PUSH =
  "The owner's rule: only main goes to origin (public). archive-main is private history and " +
  'never goes to origin.';

/** Why the command is blocked, or null. */
export function checkCommand(command: string, gitFor: GitFor): string | null {
  const vars = new Map<string, string>();
  for (const words of splitCommands(command)) {
    rememberAssignment(words, vars);
    const call = gitCall(words);
    if (!call) continue;
    const git = gitFor(call.dir);
    const why =
      call.sub === 'commit'
        ? checkCommit(call.args, command, git, vars)
        : call.sub === 'push'
          ? checkPush(call.args, git)
          : null;
    if (why) return why;
  }
  return null;
}

/**
 * The command split into simple commands, each a list of words with the quotes removed.
 * Separators: newlines, `;`, `|`, `&`, braces and parentheses (enough for `if ($?) { … }`).
 * Quotes: '…' (PowerShell's '' inside), "…" (\" or `" inside), here-strings @'…'@ and @"…"@.
 */
export function splitCommands(command: string): string[][] {
  const commands: string[][] = [];
  let words: string[] = [];
  let word = '';
  let inWord = false;
  const endWord = () => {
    if (inWord) words.push(word);
    word = '';
    inWord = false;
  };
  const endCommand = () => {
    endWord();
    if (words.length > 0) commands.push(words);
    words = [];
  };

  const at = (n: number) => command.charAt(n);
  let i = 0;
  while (i < command.length) {
    const c = at(i);
    const next = at(i + 1);
    if (c === '@' && (next === "'" || next === '"') && /^\r?\n/.test(command.slice(i + 2))) {
      const close = command.indexOf(`\n${next}@`, i + 2);
      const end = close === -1 ? command.length : close;
      word += command.slice(command.indexOf('\n', i) + 1, end).replace(/\r$/, '');
      inWord = true;
      i = close === -1 ? command.length : close + 3;
    } else if (c === "'") {
      i++;
      while (i < command.length) {
        if (at(i) === "'" && at(i + 1) === "'") {
          word += "'";
          i += 2;
        } else if (at(i) === "'") {
          i++;
          break;
        } else word += at(i++);
      }
      inWord = true;
    } else if (c === '"') {
      i++;
      while (i < command.length && at(i) !== '"') {
        if ((at(i) === '\\' || at(i) === '`') && at(i + 1) === '"') i++;
        word += at(i++);
      }
      i++;
      inWord = true;
    } else if (c === '\n' || ';|&{}()'.includes(c)) {
      endCommand();
      i++;
    } else if (/\s/.test(c)) {
      endWord();
      i++;
    } else {
      word += c;
      inWord = true;
      i++;
    }
  }
  endCommand();
  return commands;
}

/** PowerShell `$name = 'value'` (or bash `name=value`), so `git commit -F $name` can be read. */
function rememberAssignment(words: string[], vars: Map<string, string>): void {
  const [first = '', second, third] = words;
  const spaced = /^\$(\w+)$/.exec(first)?.[1];
  if (spaced !== undefined && second === '=' && third !== undefined && words.length === 3) {
    vars.set(spaced, third);
    return;
  }
  const [, name, value] = /^\$?(\w+)=(.+)$/.exec(first) ?? [];
  if (name !== undefined && value !== undefined && words.length === 1) vars.set(name, value);
}

function resolveVar(value: string, vars: Map<string, string>): string {
  const name = /^\$\{?(\w+)\}?$/.exec(value)?.[1];
  return (name !== undefined && vars.get(name)) || value;
}

interface GitCall {
  sub: string;
  args: string[];
  dir: string | undefined;
}

/** `git [-C dir] [-c k=v] [--options] <sub> args…` anywhere in the words, or null. */
function gitCall(words: string[]): GitCall | null {
  const start = words.findIndex((w) => /^(.*[\\/])?git(\.exe)?$/i.test(w));
  if (start === -1) return null;
  let dir: string | undefined;
  let i = start + 1;
  for (let option = words[i]; option?.startsWith('-'); option = words[++i]) {
    if (option === '-C') dir = words[++i];
    else if (option === '-c' || option === '--git-dir' || option === '--work-tree') i++;
  }
  const sub = words[i];
  return sub === undefined ? null : { sub, args: words.slice(i + 1), dir };
}

function checkCommit(
  args: string[],
  command: string,
  git: Git,
  vars: Map<string, string>,
): string | null {
  // The command itself may hold the message (-m, a here-string, a bash here-doc).
  const texts = [command];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? '';
    let file: string | undefined;
    if (arg === '-m' || arg === '--message' || /^-[a-zA-Z]*m$/.test(arg)) {
      i++; // the message itself: already in the command text
      continue;
    }
    if (arg === '-F' || arg === '--file') file = args[++i];
    else if (arg.startsWith('--file=')) file = arg.slice('--file='.length);
    else if (/^-[a-zA-Z]*F/.test(arg)) {
      const rest = arg.slice(arg.indexOf('F') + 1);
      file = rest === '' ? args[++i] : rest;
    }
    if (file === undefined) continue;
    const path = resolveVar(file, vars);
    if (path === '-') continue; // from stdin: a here-doc, part of the command text
    const text = git.readFile(path);
    if (text === null) continue;
    if (text.startsWith(BOM)) {
      return `Blocked: the commit message file ${path} starts with a BOM (PowerShell Set-Content adds one). Write it with the Write tool.`;
    }
    texts.push(text);
  }
  for (const text of texts) {
    for (const [pattern, what] of ATTRIBUTION) {
      if (pattern.test(text)) {
        return `Blocked: the commit message has ${what}. ${RULE_COMMIT} Write the message to a new file without it, then commit with -F.`;
      }
    }
  }
  return null;
}

const normalUrl = (url: string) =>
  url
    .trim()
    .toLowerCase()
    .replace(/\/+$/, '')
    .replace(/\.git$/, '');

function isOrigin(remote: string, git: Git): boolean {
  if (remote === 'origin') return true;
  const origin = git.remoteUrl('origin');
  if (origin === null) return false;
  const url = git.remoteUrl(remote) ?? remote;
  return normalUrl(url) === normalUrl(origin);
}

function checkPush(args: string[], git: Git): string | null {
  const positional: string[] = [];
  const flags: string[] = [];
  let repo: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? '';
    if (arg === '--') {
      positional.push(...args.slice(i + 1));
      break;
    }
    if (arg === '--repo') repo = args[++i];
    else if (arg.startsWith('--repo=')) repo = arg.slice('--repo='.length);
    else if (['-o', '--push-option', '--receive-pack', '--exec'].includes(arg)) i++;
    else if (arg.startsWith('-')) flags.push(arg.replace(/=.*$/, ''));
    else positional.push(arg);
  }
  const has = (...names: string[]) => flags.some((f) => names.includes(f));
  const shortHas = (letter: string) =>
    flags.some((f) => /^-[a-zA-Z]+$/.test(f) && f.includes(letter));

  const current = git.currentBranch();
  const remote = positional.shift() ?? repo ?? git.defaultPushRemote(current);
  if (!isOrigin(remote, git)) return null;

  const blocked = (what: string) => `Blocked: this push ${what}. ${RULE_PUSH}`;
  if (has('--all', '--branches', '--mirror')) return blocked('sends every branch to origin');
  if (has('--tags')) return blocked('sends every tag to origin (push one tag by name)');
  if (has('--prune')) return blocked('can delete branches on origin');
  if (has('--delete') || shortHas('d')) return blocked('deletes refs on origin (ask the owner)');

  if (positional.length === 0) {
    return current === 'main' ? null : blocked(`sends ${current ?? 'a detached HEAD'} to origin`);
  }
  for (const spec of positional) {
    const why = checkRefspec(spec.replace(/^\+/, ''), current, git);
    if (why) return blocked(why);
  }
  return null;
}

/** Why one refspec may not go to origin, or null. */
function checkRefspec(spec: string, current: string | null, git: Git): string | null {
  const colon = spec.indexOf(':');
  const src = colon === -1 ? spec : spec.slice(0, colon);
  const dst = colon === -1 ? undefined : spec.slice(colon + 1);
  if (src === '') return `deletes ${dst} on origin (ask the owner)`;

  const branch = src === 'HEAD' || src === '@' ? current : src.replace(/^refs\/heads\//, '');
  const toMain = dst === undefined || dst === 'main' || dst === 'refs/heads/main';
  if (branch === 'main' && toMain) return null;

  const tag = src.replace(/^refs\/tags\//, '');
  const isTagSource = src.startsWith('refs/tags/') || (!src.includes('/') && git.isTag(tag));
  const toTag = dst === undefined || dst === tag || dst === `refs/tags/${tag}`;
  if (isTagSource && toTag) {
    return git.inMain(`refs/tags/${tag}`) ? null : `sends the tag ${tag}, which is not on main`;
  }
  return `sends ${src}${dst === undefined ? '' : ` as ${dst}`} to origin`;
}
