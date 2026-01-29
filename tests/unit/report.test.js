import { generateHtml } from '../../lib/report.js';

// We need to export or expose internal functions for unit testing if we want to test them in isolation.
// However, `report.js` only exports `generateHtml`. 
// For now, we'll verify the output HTML or modify report.js to export helpers if needed.
// Actually, let's verify `processData` logic indirectly via HTML output or simply by extracting `processData`?
// It's better to export `processData` in `report.js` for testing.

describe('Report Generation', () => {
    test('generateHtml should return a string', async () => {
        const orders = [];
        const html = await generateHtml(orders);
        expect(typeof html).toBe('string');
        expect(html).toContain('Wolt Expense Report');
    });

    test('generateHtml handles empty orders', async () => {
        const html = await generateHtml([]);
        expect(html).toContain('id="total-spent-ytd">0</h2>');
    });
});
