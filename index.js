#!/usr/bin/env node

import { Command } from 'commander';
import { setToken, getToken } from './lib/config.js';
import { getOrders } from './lib/storage.js';
import { generateHtml, parseAmount, getOrderDate } from './lib/report.js';
import { exportCsv } from './lib/export.js';
import { validateToken } from './lib/wolt.js';
import inquirer from 'inquirer';
import fs from 'fs/promises';
import { exec } from 'child_process';
import os from 'os';
import path from 'path';
import { runSync } from './lib/sync.js';

const program = new Command();

program
    .name('wolt-cli')
    .description('CLI to track Wolt expenses')
    .version('1.0.0');

program.command('config')
    .description('Set the authentication token')
    .option('-t, --token [token]', 'Wolt Authorization Bearer token')
    .option('--skip-validation', 'Skip token validation')
    .action(async (options) => {
        let token = options.token;

        if (!token || token === true) {
            const answers = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'token',
                    message: 'Enter your Wolt Authorization Bearer token:',
                }
            ]);
            token = answers.token;
        }

        if (!token) {
            console.log('No token provided.');
            process.exitCode = 1;
            return;
        }

        const cleanToken = token.replace(/^Bearer\s+/i, '');

        if (!options.skipValidation) {
            process.stdout.write('Validating token... ');
            const result = await validateToken(cleanToken);
            if (result.valid) {
                console.log('valid.');
            } else {
                console.log('failed.');
                console.error(`Token validation failed: ${result.status ? result.status + ' ' : ''}${result.message}`);
                const { proceed } = await inquirer.prompt([{
                    type: 'confirm',
                    name: 'proceed',
                    message: 'Save the token anyway?',
                    default: false
                }]);
                if (!proceed) {
                    console.log('Token not saved.');
                    return;
                }
            }
        }

        setToken(token);
        console.log('Token saved to configuration successfully.');
    });

program.command('sync')
    .description('Fetch and save orders locally')
    .option('-f, --force', 'Force full re-sync (ignore local data)')
    .action(async (options) => {
        try {
            const token = getToken();
            await runSync({
                token,
                force: options.force
            });
        } catch (error) {
            console.error('Sync failed:', error.message);
            process.exitCode = 1;
        }
    });

program.command('report')
    .description('Generate HTML report')
    .option('-o, --output <file>', 'Output HTML file', 'report.html')
    .option('--open', 'Open the report in your default browser')
    .action(async (options) => {
        try {
            const orders = await getOrders();
            if (orders.length === 0) {
                console.log('No orders found. Run "wolt-cli sync" first.');
                process.exitCode = 1;
                return;
            }

            console.log(`Generating report for ${orders.length} orders...`);
            const html = await generateHtml(orders);
            const outputPath = path.resolve(options.output);
            await fs.writeFile(outputPath, html);
            console.log(`Report generated: ${outputPath}`);

            if (options.open) {
                const platform = process.platform;
                const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
                exec(`${cmd} "${outputPath}"`, (err) => {
                    if (err) console.error('Could not open browser automatically. Open the file manually.');
                });
            }
        } catch (error) {
            console.error('Error generating report:', error.message);
            process.exitCode = 1;
        }
    });

program.command('status')
    .description('Show summary of local data')
    .action(async () => {
        try {
            const orders = await getOrders();
            if (orders.length === 0) {
                console.log('No orders stored locally. Run "wolt-cli sync" first.');
                process.exitCode = 1;
                return;
            }

            const dates = orders.map(o => getOrderDate(o)).filter(d => !isNaN(d.getTime())).sort((a, b) => a - b);
            const oldest = dates[0];
            const newest = dates[dates.length - 1];

            const validStatuses = orders.filter(o => !['deferred_payment_failed', 'rejected', 'pending_transaction'].includes(o.status));
            const totalSpent = validStatuses.reduce((sum, o) => sum + parseAmount(o.total_amount || '0'), 0);
            const withDetails = orders.filter(o => o.details).length;

            const storagePath = path.join(os.homedir(), '.wolt-cli', 'orders.json');
            let fileSize = 'unknown';
            try {
                const stat = await fs.stat(storagePath);
                fileSize = (stat.size / 1024 / 1024).toFixed(1) + ' MB';
            } catch {}

            console.log('');
            console.log('  Wolt CLI Status');
            console.log('  ───────────────────────────────');
            console.log(`  Orders stored:     ${orders.length}`);
            console.log(`  With details:      ${withDetails}/${orders.length}`);
            console.log(`  Date range:        ${oldest.toISOString().split('T')[0]} to ${newest.toISOString().split('T')[0]}`);
            console.log(`  Total spent:       ${totalSpent.toFixed(2)} (valid orders)`);
            console.log(`  Storage size:      ${fileSize}`);
            console.log(`  Storage path:      ${storagePath}`);
            console.log('');
        } catch (error) {
            console.error('Error reading status:', error.message);
            process.exitCode = 1;
        }
    });

program.command('export')
    .description('Export orders to CSV')
    .option('-o, --output <file>', 'Output CSV file', 'orders.csv')
    .action(async (options) => {
        try {
            const orders = await getOrders();
            if (orders.length === 0) {
                console.log('No orders found. Run "wolt-cli sync" first.');
                process.exitCode = 1;
                return;
            }

            const csv = exportCsv(orders);
            await fs.writeFile(options.output, csv);
            console.log(`Exported ${orders.length} orders to ${options.output}`);
        } catch (error) {
            console.error('Error exporting orders:', error.message);
            process.exitCode = 1;
        }
    });

program.parse();
