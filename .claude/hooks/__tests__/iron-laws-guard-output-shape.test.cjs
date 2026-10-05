#!/usr/bin/env node
/**
 * Contract test — iron-laws-guard.cjs must emit the modern Claude
 * context-only shape when it fires on a production-code Edit/Write:
 * a `hookSpecificOutput` object carrying `hookEventName: 'PreToolUse'`
 * and `additionalContext`, with NO `permissionDecision` key. On every
 * non-triggering path it must emit an empty `{}`.
 *
 * A missing `hookEventName` is rejected by the Claude harness with
 * "hookSpecificOutput is missing required field hookEventName".
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('child_process');
const path = require('path');

const HOOK_PATH = path.join(__dirname, '..', 'iron-laws-guard.cjs');

function runHook(payload) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [HOOK_PATH], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));

    proc.stdin.write(JSON.stringify(payload));
    proc.stdin.end();

    const t = setTimeout(() => {
      if (!settled) {
        settled = true;
        proc.kill('SIGTERM');
        reject(new Error('Hook timed out'));
      }
    }, 1000);

    proc.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(t);
      let parsed = null;
      try { parsed = stdout.trim() ? JSON.parse(stdout.trim()) : null; } catch (_) {}
      resolve({ stdout, stderr, exitCode: code, parsed });
    });
  });
}

describe('iron-laws-guard.cjs — modern Claude context-only shape', () => {
  it('production-code Edit: emits hookSpecificOutput with hookEventName and no permissionDecision', async () => {
    const payload = {
      hook_event_name: 'PreToolUse',
      tool_name: 'Edit',
      tool_input: { file_path: 'src/payments/charge.ts' },
    };
    const { parsed, exitCode } = await runHook(payload);
    assert.strictEqual(exitCode, 0);
    assert.ok(parsed, 'must emit JSON on stdout');
    assert.ok(parsed.hookSpecificOutput, 'must have hookSpecificOutput');
    assert.strictEqual(
      parsed.hookSpecificOutput.hookEventName,
      'PreToolUse',
      'hookSpecificOutput must carry hookEventName (required by the harness)'
    );
    assert.strictEqual(
      parsed.hookSpecificOutput.permissionDecision,
      undefined,
      'context-only hook must NOT set permissionDecision'
    );
    assert.ok(
      parsed.hookSpecificOutput.additionalContext.includes('Iron Law #1'),
      'additionalContext should include the Iron Law #1 reminder'
    );
    assert.ok(
      parsed.hookSpecificOutput.additionalContext.includes('MoMorph visual-contract'),
      'reminder must preserve the explicit presentational visual-contract exception'
    );
    assert.ok(
      parsed.hookSpecificOutput.additionalContext.includes('Never use visual-contract for behavior'),
      'visual-contract exception must not weaken behavior/backend RED-first'
    );
  });

  it('test file: emits empty object (no reminder)', async () => {
    const payload = {
      hook_event_name: 'PreToolUse',
      tool_name: 'Edit',
      tool_input: { file_path: 'src/payments/charge.test.ts' },
    };
    const { parsed, exitCode } = await runHook(payload);
    assert.strictEqual(exitCode, 0);
    assert.deepStrictEqual(parsed, {});
  });

  it('non-Edit/Write tool: emits empty object', async () => {
    const payload = {
      hook_event_name: 'PreToolUse',
      tool_name: 'Read',
      tool_input: { file_path: 'src/payments/charge.ts' },
    };
    const { parsed, exitCode } = await runHook(payload);
    assert.strictEqual(exitCode, 0);
    assert.deepStrictEqual(parsed, {});
  });

  it('PostToolUse payload: emits empty object', async () => {
    const payload = {
      hook_event_name: 'PostToolUse',
      tool_name: 'Edit',
      tool_input: { file_path: 'src/payments/charge.ts' },
    };
    const { parsed, exitCode } = await runHook(payload);
    assert.strictEqual(exitCode, 0);
    assert.deepStrictEqual(parsed, {});
  });

  // Post-cutover, kit hooks are installed by the tkm CLI from each hook's `meta`
  // export (dual-mode `--eval`), NOT hand-registered in the kit's settings.json.
  // The install contract therefore lives in `meta`: PreToolUse / Edit|Write only.
  it('meta registers the guard under PreToolUse Edit|Write only (no PostToolUse)', () => {
    const { meta } = require('../iron-laws-guard.cjs');
    assert.ok(meta, 'iron-laws-guard must export meta');
    assert.deepStrictEqual(meta.events, ['PreToolUse'], 'guard fires on PreToolUse only');
    assert.strictEqual(
      meta.matchers?.PreToolUse,
      'Edit|Write',
      'matcher must match the hook inputs'
    );
    assert.ok(!meta.events.includes('PostToolUse'), 'no stale PostToolUse registration');
  });
});
