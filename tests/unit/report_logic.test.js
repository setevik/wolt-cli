import { generateHtml, processData, parseAmount, getOrderDate } from '../../lib/report.js';

describe('Report Logic', () => {
    describe('parseAmount', () => {
        test('parses currency string', () => {
            expect(parseAmount("₪74.55")).toBe(74.55);
        });
        test('handles numbers', () => {
            expect(parseAmount(123)).toBe(123);
        });
        test('handles empty/null', () => {
            expect(parseAmount(null)).toBe(0);
            expect(parseAmount("")).toBe(0);
        });
    });

    describe('processData (Aggregation)', () => {
        const mockOrders = [
            {
                total_amount: "₪100.00",
                received_at: new Date().toISOString(), // Today
                details: {
                    items_price: 8000, // 80.00
                    delivery_base_price: 1500, // 15.00
                    service_fee: 500, // 5.00
                    venue_product_line: 'Restaurant'
                }
            },
            {
                total_amount: "₪50.00",
                received_at: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString(), // Last Year
                details: {
                    items_price: 4000,
                    delivery_base_price: 1000,
                    service_fee: 0,
                    venue_product_line: 'Retail'
                }
            }
        ];

        test('calculates YTD total correctly', () => {
            const data = processData(mockOrders);
            expect(data.ytdTotal).toBeCloseTo(100.00);
        });

        test('calculates Last Year total correctly', () => {
            const data = processData(mockOrders);
            expect(data.lastYearTotal).toBeCloseTo(50.00);
        });

        test('calculates fees correctly (handling minor units)', () => {
            const data = processData(mockOrders);
            // Delivery: 15.00 + 10.00 = 25.00
            expect(data.totalDeliveryFees).toBeCloseTo(25.00);
            // Service: 5.00 + 0 = 5.00
            expect(data.totalServiceFees).toBeCloseTo(5.00);
        });
    });
});
