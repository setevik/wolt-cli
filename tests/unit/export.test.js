import { exportCsv } from '../../lib/export.js';

describe('exportCsv', () => {
    test('returns CSV with headers for empty orders', () => {
        const csv = exportCsv([]);
        expect(csv).toBe('Date,Venue,Type,Items,Amount,Currency,Delivery Fee,Service Fee,City,Country,Status\n');
    });

    test('exports order data correctly', () => {
        const orders = [{
            venue_name: 'Pizza Place',
            total_amount: '₪50.00',
            status: 'delivered',
            received_at: '15/01/2025',
            items: [{ name: 'Margherita' }, { name: 'Coke' }],
            details: {
                venue_product_line: 'restaurant',
                delivery_base_price: 990,
                service_fee: 299
            }
        }];

        const csv = exportCsv(orders);
        const lines = csv.trim().split('\n');
        expect(lines).toHaveLength(2);
        expect(lines[0]).toBe('Date,Venue,Type,Items,Amount,Currency,Delivery Fee,Service Fee,City,Country,Status');

        const row = lines[1];
        expect(row).toContain('2025-01-15');
        expect(row).toContain('Pizza Place');
        expect(row).toContain('restaurant');
        expect(row).toContain('Margherita; Coke');
        expect(row).toContain('50.00');
        expect(row).toContain('9.90');
        expect(row).toContain('2.99');
        expect(row).toContain('delivered');
    });

    test('escapes CSV values with commas and quotes', () => {
        const orders = [{
            venue_name: 'Joe\'s Pizza, Burgers & More',
            total_amount: '100',
            status: 'delivered',
            received_at: '01/06/2025',
            items: [{ name: 'Burger "Supreme"' }],
            details: null
        }];

        const csv = exportCsv(orders);
        const lines = csv.trim().split('\n');
        expect(lines[1]).toContain('"Joe\'s Pizza, Burgers & More"');
        expect(lines[1]).toContain('"Burger ""Supreme"""');
    });

    test('handles orders without details', () => {
        const orders = [{
            venue_name: 'Test',
            total_amount: '25.50',
            status: 'delivered',
            payment_time_ts: '2025-03-01T12:00:00Z',
            items: 'Item A'
        }];

        const csv = exportCsv(orders);
        const lines = csv.trim().split('\n');
        expect(lines[1]).toContain('25.50');
        expect(lines[1]).toContain('0.00,0.00');
    });
});
