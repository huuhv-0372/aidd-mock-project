#!/usr/bin/env node
/**
 * Tests for the slim dual-mode session-state.cjs hook.
 *
 * Post-cutover contract:
 *   - SessionStart (startup|compact) → RESTORE previous / post-compaction state as context.
 *   - Stop / SubagentStop → PERSIST the markdown snapshot.
 *   - PostToolUse activity role is DROPPED (owned by the CLI `session-activity` built-in) —
 *     the hook is no longer installed for PostToolUse and writes no activity snapshot.
 *   - `run(input, ctx)` is pure (no stdin/stdout/exit); the self-exec path mirrors it.
 *
 * Run: node --test .claude/hooks/__tests__/session-state.test.cjs
 */

const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const HOOK_PATH = path.join(__dirname, '..', 'session-state.cjs');
const { run } = require('../session-state.cjs');
const { resultToStdout } = require('../lib/hook-dual-mode.cjs');

const tempDirs = new Set();

function makeTempHome() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ss-home-'));
  tempDirs.add(dir);
  return dir;
}

function stateDirFor(home, cwd) {
  const hash = crypto.createHash('md5').update(cwd).digest('hex').slice(0, 12);
  return path.join(home, '.claude', 'session-states', hash);
}

function seedState(home, cwd, body) {
  const dir = stateDirFor(home, cwd);
  fs.mkdirSync(dir, { recursive: true });
  const content = `<!-- Generated: ${new Date().toISOString()} -->\n${body}`;
  fs.writeFileSync(path.join(dir, 'latest.md'), content);
  return content;
}

/** Spawn the hook with an isolated HOME so state writes land in a temp dir. */
function runHook(inputData, home) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [HOOK_PATH], {
      cwd: process.cwd(),
      env: { ...process.env, HOME: home, USERPROFILE: home },
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.stdin.write(JSON.stringify(inputData));
    proc.stdin.end();
    proc.on('close', (code) => resolve({ stdout, stderr, exitCode: code }));
    proc.on('error', reject);
    setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error('Hook execution timed out'));
    }, 5000);
  });
}

afterEach(() => {
  for (const dir of tempDirs) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
  tempDirs.clear();
});

describe('session-state.cjs (slim dual-mode)', () => {
  it('restores previous state as context on a startup SessionStart', async () => {
    const home = makeTempHome();
    const cwd = process.cwd();
    seedState(home, cwd, '## Progress\nDid the thing.');

    const result = await runHook(
      { hook_event_name: 'SessionStart', source: 'startup', cwd },
      home,
    );
    assert.strictEqual(result.exitCode, 0);
    const payload = JSON.parse(result.stdout);
    const ctx = payload.hookSpecificOutput.additionalContext;
    assert.match(ctx, /Previous Session State/);
    assert.match(ctx, /Did the thing\./);
    assert.doesNotMatch(ctx, /Post-Compaction Recovery/);
  });

  it('restores with the post-compaction header on a compact SessionStart', async () => {
    const home = makeTempHome();
    const cwd = process.cwd();
    seedState(home, cwd, '## Progress\nMid-flight work.');

    const result = await runHook(
      { hook_event_name: 'SessionStart', source: 'compact', cwd },
      home,
    );
    const ctx = JSON.parse(result.stdout).hookSpecificOutput.additionalContext;
    assert.match(ctx, /Post-Compaction Recovery/);
    assert.match(ctx, /Mid-flight work\./);
    assert.match(ctx, /Do NOT re-do completed work/);
  });

  it('emits nothing (no state) when there is no saved state', async () => {
    const home = makeTempHome();
    const result = await runHook(
      { hook_event_name: 'SessionStart', source: 'startup', cwd: process.cwd() },
      home,
    );
    assert.strictEqual(result.stdout.trim(), '{}');
  });

  it('does not restore on resume/clear', async () => {
    const home = makeTempHome();
    seedState(home, process.cwd(), '## Progress\nignored.');
    const result = await runHook(
      { hook_event_name: 'SessionStart', source: 'resume', cwd: process.cwd() },
      home,
    );
    assert.strictEqual(result.stdout.trim(), '{}');
  });

  it('persists a markdown snapshot on Stop', async () => {
    const home = makeTempHome();
    const cwd = process.cwd();
    const result = await runHook(
      { hook_event_name: 'Stop', cwd, session_id: 'stop-1' },
      home,
    );
    assert.strictEqual(result.exitCode, 0);
    const statePath = path.join(stateDirFor(home, cwd), 'latest.md');
    assert.ok(fs.existsSync(statePath), 'Stop should write a state snapshot');
  });

  it('persists on SubagentStop', async () => {
    const home = makeTempHome();
    const cwd = process.cwd();
    const result = await runHook(
      { hook_event_name: 'SubagentStop', cwd, session_id: 'sub-1' },
      home,
    );
    assert.strictEqual(result.exitCode, 0);
    const statePath = path.join(stateDirFor(home, cwd), 'latest.md');
    assert.ok(fs.existsSync(statePath), 'SubagentStop should write a state snapshot');
  });

  it('DROPS the PostToolUse activity role — emits {} and writes no state', async () => {
    const home = makeTempHome();
    const cwd = process.cwd();
    const result = await runHook(
      { hook_event_name: 'PostToolUse', tool_name: 'TaskUpdate', cwd, session_id: 'ptu-1' },
      home,
    );
    assert.strictEqual(result.stdout.trim(), '{}', 'PostToolUse should be a silent no-op now');
    assert.doesNotMatch(result.stdout, /continue/);
    const statePath = path.join(stateDirFor(home, cwd), 'latest.md');
    assert.ok(!fs.existsSync(statePath), 'PostToolUse must not persist activity state');
  });

  it('run() is pure: returns a HookResult, never writes stdout or exits', () => {
    const seededHome = makeTempHome();
    const cwd = process.cwd();
    seedState(seededHome, cwd, '## Progress\npurity-check.');
    const origHome = process.env.HOME;
    process.env.HOME = seededHome;
    try {
      const result = run({ hook_event_name: 'SessionStart', source: 'startup', cwd }, {});
      assert.strictEqual(typeof result, 'object');
      assert.strictEqual(result.status, 'context');
      assert.match(result.output, /purity-check\./);
    } finally {
      process.env.HOME = origHome;
    }
  });

  it('eval/self-exec parity: run()→resultToStdout matches the spawned stdout', async () => {
    const home = makeTempHome();
    const cwd = process.cwd();
    seedState(home, cwd, '## Progress\nparity.');
    const input = { hook_event_name: 'SessionStart', source: 'startup', cwd };

    const origHome = process.env.HOME;
    process.env.HOME = home;
    let evalStdout;
    try {
      evalStdout = resultToStdout(run(input, {}), 'SessionStart');
    } finally {
      process.env.HOME = origHome;
    }

    const spawned = await runHook(input, home);
    assert.strictEqual(spawned.stdout.trim(), evalStdout.trim());
  });
});
