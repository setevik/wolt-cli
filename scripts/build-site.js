#!/usr/bin/env node
/**
 * Regenerates the demo report used by the GitHub Pages site (docs/).
 *
 *   npm run site                       # demo history ends today
 *   npm run site -- --as-of 2026-09-23 # pin the end date
 *
 * The seed is fixed so the published numbers only change when the generator
 * or the end date does.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateDemoOrders } from '../lib/demo.js';
import { generateHtml } from '../lib/report.js';

const SEED = 7;
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const arg = process.argv.indexOf('--as-of');
let asOf = new Date();
if (arg > -1) {
    const [y, m, d] = (process.argv[arg + 1] || '').split('-').map(Number);
    asOf = new Date(y, m - 1, d, 23, 59);
    if (Number.isNaN(asOf.getTime())) {
        console.error('--as-of must be YYYY-MM-DD');
        process.exit(1);
    }
}

const orders = generateDemoOrders({ seed: SEED, endDate: asOf });
const html = await generateHtml(orders, { asOf, demo: true });
const out = path.join(root, 'docs', 'demo', 'index.html');
await fs.mkdir(path.dirname(out), { recursive: true });
await fs.writeFile(out, html);
console.log(`Wrote ${path.relative(root, out)} (${orders.length} orders, as of ${asOf.toDateString()})`);
