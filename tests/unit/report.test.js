import { generateHtml } from '../../lib/report.js';

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

    test('generateHtml should inject orders data correctly', async () => {
        const orders = [{ id: 1, total_amount: 100 }];
        const html = await generateHtml(orders);
        expect(html).toContain('const orders = [{"id":1,"total_amount":100}];');
    });
});
