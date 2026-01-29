#!/usr/bin/env node

import { Command } from 'commander';
import { setToken, getToken } from './lib/config.js';
import { getOrders } from './lib/storage.js';
import { generateHtml } from './lib/report.js';
import inquirer from 'inquirer';
import fs from 'fs/promises';
import { runSync } from './lib/sync.js';

const program = new Command();

program
    .name('wolt-cli')
    .description('CLI to track Wolt expenses')
    .version('1.0.0');

program.command('config')
    .description('Set the authentication token')
    .option('-t, --token [token]', 'Wolt Authorization Bearer token')
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

        if (token) {
            setToken(token);
            console.log('Token saved to configuration successfully.');
        } else {
            console.log('No token provided.');
        }
    });

program.command('sync')
    .description('Fetch and save orders locally')
    .option('-f, --force', 'Force full re-sync (ignore local data)')
    .action(async (options) => {
        const token = getToken();
        await runSync({
            token,
            force: options.force
        });
    });

program.command('report')
    .description('Generate HTML report')
    .option('-o, --output <file>', 'Output HTML file', 'report.html')
    .action(async (options) => {
        try {
            const orders = await getOrders();
            if (orders.length === 0) {
                console.log('No orders found. Run "wolt-cli sync" first.');
                return;
            }

            console.log(`Generating report for ${orders.length} orders...`);
            const html = await generateHtml(orders);
            await fs.writeFile(options.output, html);
            console.log(`Report generated: ${options.output}`);
        } catch (error) {
            console.error('Error generating report:', error.message);
        }
    });

program.parse();
