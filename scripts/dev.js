#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const root = resolve(process.cwd());

// Load .env file into process.env
const envPath = resolve(root, '.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

// Start API server
const api = spawn('node', ['--enable-source-maps', './dist/index.mjs'], {
  cwd: resolve(root, 'artifacts/api-server'),
  env: { ...process.env, PORT: process.env.PORT ?? '5000' },
  stdio: 'inherit',
});

// Start frontend dev server
const viteBin = resolve(root, 'artifacts/global-marketplace/node_modules/.bin/vite');
const web = spawn(viteBin, ['--config', 'vite.config.ts', '--host', '0.0.0.0'], {
  cwd: resolve(root, 'artifacts/global-marketplace'),
  env: { ...process.env, PORT: process.env.PORT_WEB ?? '5173' },
  stdio: 'inherit',
});

// Cleanup on exit
function cleanup() {
  api.kill();
  web.kill();
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
