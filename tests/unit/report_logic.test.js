import { generateHtml, processData, parseAmount, getOrderDate, getOrderCurrency, getOrderCity } from '../../lib/report.js';

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

    describe('getOrderCurrency', () => {
        test('returns currency from details.currency', () => {
            expect(getOrderCurrency({ details: { currency: 'CZK' } })).toBe('CZK');
        });
        test('detects ILS from total_amount symbol', () => {
            expect(getOrderCurrency({ total_amount: '₪100.00' })).toBe('ILS');
        });
        test('detects CZK from total_amount symbol', () => {
            expect(getOrderCurrency({ total_amount: '100.00 Kč' })).toBe('CZK');
        });
        test('detects EUR from total_amount symbol', () => {
            expect(getOrderCurrency({ total_amount: '€50.00' })).toBe('EUR');
        });
        test('defaults to ILS when no currency info', () => {
            expect(getOrderCurrency({ total_amount: '100.00' })).toBe('ILS');
        });
        test('prefers details.currency over total_amount detection', () => {
            expect(getOrderCurrency({ details: { currency: 'CZK' }, total_amount: '₪100.00' })).toBe('CZK');
        });
    });

    describe('getOrderCity', () => {
        test('returns city and country from details', () => {
            const result = getOrderCity({ details: { venue_city: 'Prague', venue_country: 'Czech Republic' } });
            expect(result).toEqual({ city: 'Prague', country: 'Czech Republic' });
        });
        test('returns city from nested venue object', () => {
            const result = getOrderCity({ details: { venue: { city: 'Tel Aviv', country: 'Israel' } } });
            expect(result).toEqual({ city: 'Tel Aviv', country: 'Israel' });
        });
        test('returns city from top-level order fields', () => {
            const result = getOrderCity({ venue_city: 'Haifa', venue_country: 'Israel' });
            expect(result).toEqual({ city: 'Haifa', country: 'Israel' });
        });
        test('returns nulls when no city data', () => {
            const result = getOrderCity({ details: {} });
            expect(result).toEqual({ city: null, country: null });
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

        test('returns primaryCurrency and currencyBreakdown', () => {
            const data = processData(mockOrders);
            expect(data.primaryCurrency).toBe('ILS');
            expect(data.currencyBreakdown).toBeDefined();
            expect(data.currencyBreakdown['ILS']).toBeDefined();
            expect(data.currencyBreakdown['ILS'].total).toBeCloseTo(150.00);
            expect(data.currencyBreakdown['ILS'].orders).toBe(2);
        });

        test('tracks multiple currencies', () => {
            const multiCurrencyOrders = [
                {
                    total_amount: "₪100.00",
                    received_at: new Date().toISOString(),
                    details: { currency: 'ILS', items_price: 8000, delivery_base_price: 1500, service_fee: 500, venue_product_line: 'Restaurant' }
                },
                {
                    total_amount: "280.00 Kč",
                    received_at: new Date().toISOString(),
                    details: { currency: 'CZK', items_price: 22000, delivery_base_price: 5000, service_fee: 1000, venue_product_line: 'Restaurant' }
                },
                {
                    total_amount: "₪80.00",
                    received_at: new Date().toISOString(),
                    details: { currency: 'ILS', items_price: 6000, delivery_base_price: 1500, service_fee: 500, venue_product_line: 'Restaurant' }
                }
            ];
            const data = processData(multiCurrencyOrders);
            expect(data.primaryCurrency).toBe('ILS');
            expect(Object.keys(data.currencyBreakdown)).toContain('ILS');
            expect(Object.keys(data.currencyBreakdown)).toContain('CZK');
            expect(data.currencyBreakdown['ILS'].orders).toBe(2);
            expect(data.currencyBreakdown['CZK'].orders).toBe(1);
        });

        test('returns empty citiesWithOrders when no city data', () => {
            const data = processData(mockOrders);
            expect(data.citiesWithOrders).toEqual([]);
        });

        test('tracks cities with orders', () => {
            const ordersWithCities = [
                {
                    total_amount: "₪100.00",
                    received_at: new Date().toISOString(),
                    details: { venue_city: 'Tel Aviv', venue_country: 'Israel', items_price: 8000, delivery_base_price: 1500, service_fee: 500, venue_product_line: 'Restaurant' }
                },
                {
                    total_amount: "₪80.00",
                    received_at: new Date().toISOString(),
                    details: { venue_city: 'Tel Aviv', venue_country: 'Israel', items_price: 6000, delivery_base_price: 1500, service_fee: 500, venue_product_line: 'Restaurant' }
                },
                {
                    total_amount: "280.00 Kč",
                    received_at: new Date().toISOString(),
                    details: { currency: 'CZK', venue_city: 'Prague', venue_country: 'Czech Republic', items_price: 22000, delivery_base_price: 5000, service_fee: 1000, venue_product_line: 'Restaurant' }
                }
            ];
            const data = processData(ordersWithCities);
            expect(data.citiesWithOrders.length).toBe(2);
            expect(data.citiesWithOrders[0].city).toBe('Tel Aviv');
            expect(data.citiesWithOrders[0].country).toBe('Israel');
            expect(data.citiesWithOrders[0].orderCount).toBe(2);
            expect(data.citiesWithOrders[1].city).toBe('Prague');
            expect(data.citiesWithOrders[1].country).toBe('Czech Republic');
            expect(data.citiesWithOrders[1].orderCount).toBe(1);
        });
    });
});
