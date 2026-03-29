#!/usr/bin/env node
/**
 * Interactive Glyf workflow TUI for explicit RP2040 build/flash/app flows.
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as p from '@clack/prompts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const buildSh = join(root, 'domains/glyf/display/build.sh');
const flashUf2Sh = join(root, 'domains/glyf/display/flash-uf2.sh');
const flashPicotoolSh = join(root, 'domains/glyf/display/flash-picotool.sh');

function run(command, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: 'inherit',
      env: process.env,
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code}`));
    });
  });
}

function runScript(scriptPath, extraArgs = []) {
  return run('bash', [scriptPath, ...extraArgs]);
}

function runPnpm(scriptName) {
  return run('pnpm', ['run', scriptName]);
}

async function runBuildFlashLaunch(flashMode) {
  await runScript(buildSh, []);

  if (flashMode === 'picotool') {
    await runScript(flashPicotoolSh, []);
  } else if (flashMode === 'uf2') {
    await runScript(flashUf2Sh, []);
  }

  await runPnpm('dev:glyf');
}

function actionOptions() {
  return [
    { value: 'build', label: 'Build Firmware', hint: 'produce glyf.uf2 only' },
    { value: 'flash-picotool', label: 'Flash Existing UF2 via picotool', hint: 'explicit USB tool path' },
    { value: 'flash-uf2', label: 'Flash Existing UF2 via mounted RPI-RP2', hint: 'explicit BOOTSEL mass-storage path' },
    { value: 'launch-app', label: 'Launch Glyf App', hint: 'start the Tauri companion only' },
    { value: 'workflow-picotool', label: 'Build -> Flash via picotool -> Launch App', hint: 'full dev loop' },
    { value: 'workflow-uf2', label: 'Build -> Flash via RPI-RP2 -> Launch App', hint: 'bring-up / recovery loop' },
    { value: 'cancel', label: 'Exit' },
  ];
}

async function main() {
  p.intro('Glyf — Workflow TUI');

  const action = await p.select({
    message: 'Choose an action',
    options: actionOptions(),
  });

  if (p.isCancel(action) || action === 'cancel') {
    p.cancel('Cancelled.');
    process.exit(0);
  }

  try {
    if (action === 'build') await runScript(buildSh, []);
    else if (action === 'flash-picotool') await runScript(flashPicotoolSh, []);
    else if (action === 'flash-uf2') await runScript(flashUf2Sh, []);
    else if (action === 'launch-app') await runPnpm('dev:glyf');
    else if (action === 'workflow-picotool') await runBuildFlashLaunch('picotool');
    else if (action === 'workflow-uf2') await runBuildFlashLaunch('uf2');
    p.outro('Done.');
  } catch {
    p.cancel('Failed.');
    process.exit(1);
  }
}

main();
