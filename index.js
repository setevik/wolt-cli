#!/usr/bin/env node

import { Command } from 'commander';
import { setToken, getToken } from './lib/config.js';
import { getOrders, saveOrders, clearOrders } from './lib/storage.js';
import { fetchOrdersPage, fetchOrderDetails } from './lib/wolt.js';
import { generateHtml } from './lib/report.js';
import { runAuthFlow } from './lib/auth.js';
import cliProgress from 'cli-progress';
import inquirer from 'inquirer';
import fs from 'fs/promises';

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

program.command('auth')
    .description('Login to Wolt and extract token automatically')
    .action(async () => {
        try {
            const token = await runAuthFlow();
            if (token) {
                setToken(token);
                console.log('Token saved to configuration successfully.');
            }
        } catch (error) {
            console.error('Auth command failed:', error.message);
        }
    });

program.command('sync')
    .description('Fetch and save orders locally')
    .option('-f, --force', 'Force full re-sync (ignore local data)')
    .action(async (options) => {
        const token = getToken();
        let existingOrders = [];

        if (!options.force) {
            existingOrders = await getOrders();
        } else {
            console.log('Force flag detected. Clearing local state and fetching full history.');
            await clearOrders();
        }

        const existingIds = new Set(existingOrders.map(o => o.purchase_id || o.id)); // Adjust based on actual API response field

        console.log(`Found ${existingOrders.length} existing orders locally.`);

        let newOrders = [];
        let pageToken = null;
        let hasMore = true;
        let fetchedPages = 0;

        console.log('Starting sync...');

        while (hasMore) {
            try {
                process.stdout.write(`Fetching page ${fetchedPages + 1}... `);
                const data = await fetchOrdersPage(token, pageToken);
                const orders = data.orders || [];

                if (orders.length === 0) {
                    console.log('No more orders found.');
                    hasMore = false;
                    break;
                }

                let stopFetching = false;
                let pageNewOrders = [];

                for (const order of orders) {
                    // The API response example shows "purchase_id", let's use that.
                    // Fallback to "id" if purchase_id is missing, just in case.
                    const id = order.purchase_id || order.id;
                    if (existingIds.has(id)) {
                        stopFetching = true;
                        // We found an existing order, so we can assume all subsequent orders are also existing
                        // (assuming reverse chronological order)
                        break;
                    }
                    pageNewOrders.push(order);
                }

                newOrders = newOrders.concat(pageNewOrders);
                console.log(`Found ${pageNewOrders.length} new orders.`);

                if (stopFetching) {
                    console.log('Reached existing orders. Stopping sync.');
                    hasMore = false;
                } else if (data.next_page_token) {
                    pageToken = data.next_page_token;
                    fetchedPages++;
                } else {
                    console.log('End of history reached.');
                    hasMore = false;
                }
            } catch (error) {
                console.error('\nError during sync:', error.message);
                hasMore = false;
            }
        }

        const allOrders = newOrders.concat(existingOrders);
        let detailsFetched = 0;

        // Count orders missing details
        const ordersMissingDetails = allOrders.filter(o => !o.details);

        if (ordersMissingDetails.length > 0) {
            console.log(`Fetching details for ${ordersMissingDetails.length} orders...`);
            const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
            progressBar.start(ordersMissingDetails.length, 0);

            for (const order of allOrders) {
                if (!order.details) {
                    const id = order.purchase_id || order.id;
                    try {
                        const details = await fetchOrderDetails(token, id);
                        order.details = details;
                        detailsFetched++;
                        progressBar.increment();

                        // Save progress every 5 orders to allow resuming if interrupted
                        if (detailsFetched % 5 === 0) {
                            await saveOrders(allOrders, true);
                        }
                    } catch (error) {
                        // Stop bar to log error, then resume (or just log to stderr so bar stays?)
                        // cli-progress might get messed up by console.error. 
                        // Let's stop, log, restart or just log to a file? 
                        // For now, let's just log error after bar or try to keep it simple.
                        // Actually, let's stop the bar to log the error clearly.
                        progressBar.stop();
                        console.error(`\nFailed to fetch details for ${id}:`, error.message);
                        progressBar.start(ordersMissingDetails.length, detailsFetched);
                    }
                }
            }
            progressBar.stop();
        } else {
            console.log('All orders have details.');
        }

        if (newOrders.length > 0 || detailsFetched > 0) {
            await saveOrders(allOrders);
            console.log(`Sync complete. Added ${newOrders.length} new orders and fetched details for ${detailsFetched} orders.`);
        } else {
            console.log('Sync complete. No new orders or details found.');
        }
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
            const html = generateHtml(orders);
            await fs.writeFile(options.output, html);
            console.log(`Report generated: ${options.output}`);
        } catch (error) {
            console.error('Error generating report:', error.message);
        }
    });

program.parse();
