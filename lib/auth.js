import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';

export async function runAuthFlow() {
    console.log('Launching browser for authentication...');
    console.log('Please log in to Wolt in the opened browser window.');
    console.log('The browser will close automatically once the token is detected.');

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        ignoreDefaultArgs: ['--enable-automation'],
        args: [
            '--start-maximized',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars',
            `--user-agent=${USER_AGENT}`
        ]
    });

    const page = await browser.newPage();

    let token = null;

    // Intercept network requests to find the token
    await page.setRequestInterception(true);

    page.on('request', request => {
        const headers = request.headers();
        // Look for Authorization header in requests to Wolt API
        if (headers['authorization'] && request.url().includes('wolt.com')) {
            const authHeader = headers['authorization'];
            if (authHeader.startsWith('Bearer ')) {
                const extractedToken = authHeader.substring(7);
                if (!token) {
                    token = extractedToken;
                    console.log('Token detected!');
                }
            }
        }
        request.continue();
    });

    try {
        await page.goto('https://wolt.com/en/me/order-history', { waitUntil: 'networkidle2' });

        // Wait until token is found or browser is closed
        while (!token) {
            if (browser.isConnected() === false) {
                throw new Error('Browser closed by user before token was detected.');
            }
            await new Promise(r => setTimeout(r, 500));
        }

        console.log('Token successfully extracted.');
        return token;

    } catch (error) {
        console.error('Authentication failed:', error.message);
        throw error;
    } finally {
        if (browser.isConnected()) {
            await browser.close();
        }
    }
}
