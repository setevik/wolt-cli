import { generateDemoOrders } from '../../lib/demo.js';
import { processData, parseAmount, getOrderCurrency, getOrderCity, generateHtml } from '../../lib/report.js';

const END = new Date(2026, 8, 23, 23, 59);

describe('generateDemoOrders', () => {
    const orders = generateDemoOrders({ seed: 7, endDate: END });

    test('is reproducible for the same seed and end date', () => {
        expect(generateDemoOrders({ seed: 7, endDate: END })).toEqual(orders);
        expect(generateDemoOrders({ seed: 8, endDate: END })).not.toEqual(orders);
    });

    test('returns orders newest first and never after the end date', () => {
        for (let i = 1; i < orders.length; i++) {
            expect(orders[i - 1].payment_time_ts).toBeGreaterThanOrEqual(orders[i].payment_time_ts);
        }
        expect(orders[0].payment_time_ts).toBeLessThanOrEqual(END.getTime());
    });

    test('each total equals items + delivery + service fee', () => {
        for (const o of orders) {
            const d = o.details;
            const lines = d.order_items.reduce((s, l) => s + l.base_price * l.count, 0);
            expect(lines).toBe(d.items_price);
            expect(parseAmount(o.total_amount)).toBeCloseTo((d.items_price + d.delivery_base_price + d.service_fee) / 100, 2);
        }
    });

    test('pays in CZK only in Prague and in EUR only in Germany', () => {
        for (const o of orders) {
            const { country } = getOrderCity(o);
            expect(getOrderCurrency(o)).toBe(country === 'Czech Republic' ? 'CZK' : 'EUR');
        }
        expect(new Set(orders.map(o => getOrderCity(o).city))).toEqual(new Set(['Berlin', 'Hamburg', 'Prague']));
    });

    test('produces plausible spending figures', () => {
        const eur = processData(orders.filter(o => getOrderCurrency(o) === 'EUR'), END);
        const weeks = (END - eur.firstOrderDate) / (7 * 24 * 3600 * 1000);
        const feeShare = (eur.totalDeliveryFees + eur.totalServiceFees) / eur.allTimeTotal;

        expect(eur.totalOrderCount / weeks).toBeGreaterThan(1.5);
        expect(eur.totalOrderCount / weeks).toBeLessThan(5);
        expect(eur.avgOrderValue).toBeGreaterThan(12);
        expect(eur.avgOrderValue).toBeLessThan(40);
        expect(feeShare).toBeGreaterThan(0.08);
        expect(feeShare).toBeLessThan(0.25);
        expect(eur.ytdTotal).toBeGreaterThan(0);
        expect(eur.lastYearToDateTotal).toBeGreaterThan(0);
        expect(eur.monthly).toHaveLength(12);

        const czk = processData(orders.filter(o => getOrderCurrency(o) === 'CZK'), END);
        expect(czk.totalOrderCount).toBeGreaterThan(5);
        expect(czk.avgOrderValue).toBeGreaterThan(200);
        expect(czk.avgOrderValue).toBeLessThan(1000);
    });

    test('includes a few rejected orders that the report ignores', () => {
        const rejected = orders.filter(o => o.status === 'rejected');
        expect(rejected.length).toBeGreaterThan(0);
        const data = processData(orders, END);
        expect(data.totalOrderCount).toBe(orders.length - rejected.length);
    });
});

describe('generateHtml with demo options', () => {
    test('marks the report as demo and pins the as-of date', async () => {
        const html = await generateHtml([], { demo: true, asOf: END });
        expect(html).toContain('made-up demo data');
        expect(html).toContain(`"asOf":"${END.toISOString()}"`);
    });

    test('escapes "<" in embedded data', async () => {
        const html = await generateHtml([{ venue_name: '</script><b>x' }]);
        expect(html).not.toContain('</script><b>x');
    });
});
