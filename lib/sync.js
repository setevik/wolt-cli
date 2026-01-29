import { fetchOrdersPage, fetchOrderDetails } from './wolt.js';
import { getOrders, saveOrders, clearOrders, getToken } from './storage.js';
import cliProgress from 'cli-progress';

export async function runSync(options = {}) {
    const token = options.token; // Pass token explicitly or retrieve inside? Design choice. 
    // Let's passed it or use the getter if not passed? 
    // To decouple, passing it is better, but existing code used getToken(). 
    // Let's match existing behavior but allow injection for tests.

    let existingOrders = [];

    if (!options.force) {
        existingOrders = await getOrders();
    } else {
        console.log('Force flag detected. Clearing local state and fetching full history.');
        await clearOrders();
    }

    const existingIds = new Set(existingOrders.map(o => o.purchase_id || o.id));

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
                const id = order.purchase_id || order.id;
                if (existingIds.has(id)) {
                    stopFetching = true;
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

                    if (detailsFetched % 5 === 0) {
                        await saveOrders(allOrders, true);
                    }
                } catch (error) {
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
}
