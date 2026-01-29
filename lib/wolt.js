import axios from 'axios';

const BASE_URL = 'https://consumer-api.wolt.com/order-tracking-api/v1/order_history/';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getJitter(baseMs, jitterMs) {
    return baseMs + Math.random() * jitterMs;
}

export async function fetchOrdersPage(token, pageToken = null) {
    const params = {
        limit: 50,
    };
    if (pageToken) {
        params.page_token = pageToken;
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://wolt.com/',
        'Platform': 'Web',
        'App-Language': 'en'
    };

    let retries = 0;
    const maxRetries = 5;

    while (retries < maxRetries) {
        try {
            const waitTime = getJitter(1000, 1500);
            if (retries > 0) {
                console.log(`Waiting ${Math.round(waitTime)}ms before retry...`);
            } else if (pageToken) {
                // Only wait between pages, not necessarily for the first one, 
                // but user asked for jitter between requests, so let's be safe.
                // We can do it here.
                await sleep(waitTime);
            }

            const response = await axios.get(BASE_URL, {
                params,
                headers
            });
            return response.data;
        } catch (error) {
            if (error.response && error.response.status === 429) {
                retries++;
                const retryAfter = error.response.headers['retry-after'];
                let backoff = 0;

                if (retryAfter) {
                    backoff = parseInt(retryAfter, 10) * 1000;
                } else {
                    // Exponential backoff: 2s, 4s, 8s, 16s, 32s
                    backoff = Math.pow(2, retries) * 1000;
                }

                // Add some jitter to the backoff too
                backoff = getJitter(backoff, 2000);

                console.warn(`Rate limited (429). Retrying in ${Math.round(backoff / 1000)}s... (Attempt ${retries}/${maxRetries})`);
                await sleep(backoff);
                continue;
            }

            if (error.response) {
                console.error(`API Error: ${error.response.status} - ${error.response.statusText}`);
                console.error(error.response.data);
            } else {
                console.error('Network Error:', error.message);
            }
            throw error;
        }
    }
    throw new Error(`Failed after ${maxRetries} retries due to rate limiting.`);
}

export async function fetchOrderDetails(token, purchaseId) {
    const url = `https://consumer-api.wolt.com/order-tracking-api/v1/order_history/purchase/${purchaseId}`;
    const params = {
        tips_use_percentage: false
    };

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Referer': 'https://wolt.com/',
        'Platform': 'Web',
        'App-Language': 'en',
        'Origin': 'https://wolt.com',
        'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:145.0) Gecko/20100101 Firefox/145.0'
    };

    let retries = 0;
    const maxRetries = 5;

    while (retries < maxRetries) {
        try {
            // Add jitter before request
            const waitTime = getJitter(1000, 1500);
            await sleep(waitTime);

            const response = await axios.get(url, {
                params,
                headers
            });
            return response.data;
        } catch (error) {
            if (error.response && error.response.status === 429) {
                retries++;
                const retryAfter = error.response.headers['retry-after'];
                let backoff = 0;

                if (retryAfter) {
                    backoff = parseInt(retryAfter, 10) * 1000;
                } else {
                    // Exponential backoff: 5s, 10s, 20s, 40s, 80s
                    backoff = 5000 * Math.pow(2, retries - 1);
                }

                backoff = getJitter(backoff, 2000);

                console.warn(`Rate limited (429) fetching details for ${purchaseId}. Retrying in ${Math.round(backoff / 1000)}s... (Attempt ${retries}/${maxRetries})`);
                await sleep(backoff);
                continue;
            }

            if (error.response) {
                console.error(`API Error fetching details for ${purchaseId}: ${error.response.status} - ${error.response.statusText}`);
            } else {
                console.error(`Network Error fetching details for ${purchaseId}:`, error.message);
            }
            throw error;
        }
    }
    throw new Error(`Failed to fetch details for ${purchaseId} after ${maxRetries} retries.`);
}
