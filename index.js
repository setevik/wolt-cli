#!/usr/bin/env node

import { Command } from 'commander';
import { setToken, getToken } from './lib/config.js';
import { getOrders, saveOrders, clearOrders } from './lib/storage.js';
import { fetchOrdersPage } from './lib/wolt.js';
import { generateHtml } from './lib/report.js';
import fs from 'fs/promises';

const program = new Command();

program
    .name('wolt-cli')
    .description('CLI to track Wolt expenses')
    .version('1.0.0');

program.command('config')
    .description('Set the authentication token')
    .requiredOption('-t, --token <token>', 'Wolt Authorization Bearer token')
    .action((options) => {
        setToken(options.token);
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

        if (newOrders.length > 0) {
            const allOrders = newOrders.concat(existingOrders);
            await saveOrders(allOrders);
            console.log(`Sync complete. Added ${newOrders.length} new orders.`);
        } else {
            console.log('Sync complete. No new orders found.');
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
