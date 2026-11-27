// Claude Code hook (PreToolUse on Bash and PowerShell): the owner's git rules.
// - A commit message has no Co-Authored-By line and no AI attribution (and no BOM).
// - Only main goes to origin (public); archive-main (private history) never does.
// The checks are in scripts/dev/git-guard.ts (tested in git-guard.test.ts). This file reads the
// tool call from stdin, asks git about the repository, and answers "deny" with the reason.
// Run by node directly (exec form in .claude/settings.json): Git Bash cannot start here.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { checkCommand } from '../../scripts/dev/git-guard.ts';

/** One git answer, or null when git fails (no such ref, no such config). */
function gitOut(cwd, args) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function realGit(cwd) {
  return {
    currentBranch: () => gitOut(cwd, ['symbolic-ref', '--quiet', '--short', 'HEAD']),
    defaultPushRemote: (branch) =>
      (branch && gitOut(cwd, ['config', `branch.${branch}.pushRemote`])) ||
      gitOut(cwd, ['config', 'remote.pushDefault']) ||
      (branch && gitOut(cwd, ['config', `branch.${branch}.remote`])) ||
      'origin',
    remoteUrl: (name) => gitOut(cwd, ['remote', 'get-url', name]),
    isTag: (name) => gitOut(cwd, ['show-ref', '--verify', '--quiet', `refs/tags/${name}`]) !== null,
    inMain: (ref) => gitOut(cwd, ['merge-base', '--is-ancestor', ref, 'refs/heads/main']) !== null,
    readFile: (path) => {
      try {
        return readFileSync(resolve(cwd, path), 'utf8');
      } catch {
        return null;
      }
    },
  };
}

try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const command = input?.tool_input?.command;
  if (typeof command === 'string' && /\bgit\b/i.test(command)) {
    const cwd = input.cwd || process.cwd();
    const reason = checkCommand(command, (dir) => realGit(resolve(cwd, dir ?? '.')));
    if (reason) {
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason: reason,
          },
        }),
      );
    }
  }
} catch (error) {
  // A broken check must be seen, not silently pass: a non-blocking hook error.
  process.stderr.write(`guard-git: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
