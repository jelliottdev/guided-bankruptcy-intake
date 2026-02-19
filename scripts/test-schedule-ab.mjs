#!/usr/bin/env node
/**
 * Run Schedule A/B validation: load seed → build gold → fill template → assert.
 * Prints PASS or FAIL; on failure lists every failed assertion (label, field, expected, actual).
 * Usage: node scripts/test-schedule-ab.mjs
 *        WRITE_SCHEDULE_AB=1 node scripts/test-schedule-ab.mjs   # also write tmp/schedule-ab-output.pdf
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const writePdf = process.env.WRITE_SCHEDULE_AB === '1';

const child = spawn(
  'npm',
  ['run', 'test', '--', 'src/export/scheduleAB.validation.test.ts', '--run'],
  {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, WRITE_SCHEDULE_AB: writePdf ? '1' : '' },
    shell: true,
  }
);

let out = '';
let err = '';
child.stdout.setEncoding('utf8').on('data', (d) => {
  out += d;
  process.stdout.write(d);
});
child.stderr.setEncoding('utf8').on('data', (d) => {
  err += d;
  process.stderr.write(d);
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('\nSchedule A/B: PASS (all gold assertions passed)');
    if (writePdf) console.log('Wrote tmp/schedule-ab-output.pdf');
  } else {
    console.log('\nSchedule A/B: FAIL (see failed assertions above)');
    const msgMatch = out.match(/expected \[\] to have length 0[^\n]*\n[^\n]*\n\s*(.+)/);
    if (msgMatch) console.log('Failed:', msgMatch[1]);
  }
  process.exit(code ?? 0);
});
