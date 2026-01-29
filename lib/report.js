export function parseAmount(amountStr) {
    // Remove currency symbols and convert to float
    // Example: "₪74.55" -> 74.55
    if (typeof amountStr === 'number') return amountStr;
    if (!amountStr) return 0;
    return parseFloat(amountStr.replace(/[^0-9.-]+/g, ""));
}

export function getOrderDate(order) {
    // We need to recreate the Date object because when this runs on client, 
    // it needs Order object. When running in Node tests, same.
    // NOTE: In client injection, dependencies like 'Date' are available globally.
    // But safely parsing requires logic self-contained or passed in.

    let d;

    // Try manual parsing of received_at if it looks like a string first
    // This avoids ambiguity where "08/01/2026" is parsed as Aug 1st by new Date() 
    // but is meant to be Jan 8th (DD/MM/YYYY).
    if (typeof order.received_at === 'string') {
        const parts = order.received_at.split(',')[0].split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);

            if (day > 0 && day <= 31 && month >= 0 && month <= 11 && year > 2000) {
                d = new Date(year, month, day);
            }
        }
    }

    if ((!d || isNaN(d.getTime())) && order.received_at) {
        d = new Date(order.received_at);
    }

    if ((!d || isNaN(d.getTime())) && order.payment_time_ts) {
        d = new Date(order.payment_time_ts);
    }

    if (!d || isNaN(d.getTime())) {
        // console.warn('Invalid date for order:', order); 
        // console.warn might fail in some contexts or be noisy
        return new Date();
    }
    return d;
}

export function processData(orders) {
    try {
        const today = new Date();
        const currentYear = today.getFullYear();
        const lastYear = currentYear - 1;

        // Filter valid orders
        const validOrders = orders.filter(o => {
            const status = o.status;
            return !['deferred_payment_failed', 'rejected', 'pending_transaction'].includes(status);
        });

        // 1. Monthly Trends (Last 6 Months)
        const monthlyData = {};
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthlyData[key] = {
                total: 0,
                label: d.toLocaleString('default', { month: 'short', year: 'numeric' }),
                byType: {}
            };
            months.push(key);
        }

        let ytdTotal = 0;
        let lastYearTotal = 0;
        let last6MonthsTotal = 0;

        let ytdDistance = 0;
        let lastYearDistance = 0;

        let totalDeliveryFees = 0;
        let totalServiceFees = 0;

        const venueTypes = {};
        const uniqueVenueTypes = new Set();
        const monthlyVenueTypes = new Set();

        validOrders.forEach(order => {
            const totalAmount = parseAmount(order.total_amount || '0');
            const date = getOrderDate(order);
            const year = date.getFullYear();
            const monthKey = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            const venueType = (order.details && order.details.venue_product_line) ? order.details.venue_product_line : 'Other';
            uniqueVenueTypes.add(venueType);

            // Cost Components
            let itemsPrice = 0;
            let deliveryPrice = 0;
            let serviceFee = 0;

            if (order.details) {
                const getDetailAmount = (val) => {
                    if (typeof val === 'number') return val / 100;
                    return parseAmount(val);
                };

                itemsPrice = getDetailAmount(order.details.items_price) || 0;
                if (!itemsPrice && order.details.items_price && order.details.items_price.amount) {
                    itemsPrice = getDetailAmount(order.details.items_price.amount) || 0;
                }

                deliveryPrice = getDetailAmount(order.details.delivery_base_price) || 0;
                serviceFee = getDetailAmount(order.details.service_fee) || 0;
            }

            if (itemsPrice === 0 && deliveryPrice === 0 && serviceFee === 0) {
                itemsPrice = totalAmount;
            }

            // Distance
            let distance = 0;
            if (order.details && order.details.delivery_distance) {
                distance = parseAmount(order.details.delivery_distance) || 0;
            }

            if (monthlyData[monthKey]) {
                monthlyData[monthKey].total += totalAmount;

                if (!monthlyData[monthKey].byType[venueType]) monthlyData[monthKey].byType[venueType] = 0;
                monthlyData[monthKey].byType[venueType] += itemsPrice;
                monthlyVenueTypes.add(venueType);

                if (deliveryPrice > 0) {
                    if (!monthlyData[monthKey].byType['Delivery']) monthlyData[monthKey].byType['Delivery'] = 0;
                    monthlyData[monthKey].byType['Delivery'] += deliveryPrice;
                    monthlyVenueTypes.add('Delivery');
                }

                if (serviceFee > 0) {
                    if (!monthlyData[monthKey].byType['Service Fee']) monthlyData[monthKey].byType['Service Fee'] = 0;
                    monthlyData[monthKey].byType['Service Fee'] += serviceFee;
                    monthlyVenueTypes.add('Service Fee');
                }

                const remainder = totalAmount - (itemsPrice + deliveryPrice + serviceFee);
                if (remainder > 0.01) {
                    if (!monthlyData[monthKey].byType['Other Fees']) monthlyData[monthKey].byType['Other Fees'] = 0;
                    monthlyData[monthKey].byType['Other Fees'] += remainder;
                    monthlyVenueTypes.add('Other Fees');
                }

                last6MonthsTotal += totalAmount;
            }

            if (year === currentYear) {
                ytdTotal += totalAmount;
                ytdDistance += distance;
            }
            if (year === lastYear) {
                lastYearTotal += totalAmount;
                lastYearDistance += distance;
            }

            if (monthlyData[monthKey]) {
                if (!venueTypes[venueType]) venueTypes[venueType] = 0;
                venueTypes[venueType] += totalAmount;
            }

            totalDeliveryFees += deliveryPrice;
            totalServiceFees += serviceFee;
        });

        return {
            monthly: months.map(k => monthlyData[k]),
            monthsKeys: months,
            ytdTotal,
            lastYearTotal,
            last6MonthsTotal,
            ytdDistance,
            lastYearDistance,
            venueTypes,
            uniqueVenueTypes: Array.from(uniqueVenueTypes).sort(),
            stackedTypes: Array.from(monthlyVenueTypes).sort(),
            totalDeliveryFees,
            totalServiceFees
        };
    } catch (e) {
        console.error('Error in processData:', e);
        return { monthly: [], monthsKeys: [], ytdTotal: 0, lastYearTotal: 0, last6MonthsTotal: 0, ytdDistance: 0, lastYearDistance: 0, venueTypes: {}, uniqueVenueTypes: [], stackedTypes: [] };
    }
}

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import ejs from 'ejs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generateHtml(orders) {
    const templatePath = path.join(__dirname, 'report.template.ejs');
    const template = await fs.readFile(templatePath, 'utf-8');

    return ejs.render(template, {
        orders,
        parseAmountFn: parseAmount.toString(),
        getOrderDateFn: getOrderDate.toString(),
        processDataFn: processData.toString()
    });
}
