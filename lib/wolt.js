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
            // Add jitter before request to avoid thundering herd / pattern detection
            // Base wait of 500ms + up to 1000ms jitter
            const waitTime = getJitter(500, 1000);
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
                backoff = getJitter(backoff, 1000);

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
