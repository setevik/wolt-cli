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

        // Daily activity data for heatmap (last 365 days)
        const dailyActivity = {};
        const oneYearAgo = new Date(today);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        // Top venues tracking
        const venueStats = {};
        const allUniqueVenues = new Set();  // Track ALL unique venues

        // Order counts for averages and trends
        let ytdOrderCount = 0;
        let lastYearOrderCount = 0;
        let totalOrderCount = 0;
        let allTimeTotal = 0;  // Track all-time spending for accurate calculations

        // Phase 2: Additional analytics
        const itemStats = {};  // Most ordered items
        let totalItemsPrice = 0;  // For cost breakdown
        const dayOfWeekStats = [0, 0, 0, 0, 0, 0, 0];  // Sun-Sat order counts
        const dayOfWeekSpent = [0, 0, 0, 0, 0, 0, 0];  // Sun-Sat spending
        let biggestOrder = { amount: 0, venue: '', date: '' };
        let lateNightOrders = 0;  // Orders after 10pm
        let totalItemsCount = 0;

        validOrders.forEach(order => {
            const totalAmount = parseAmount(order.total_amount || '0');
            const date = getOrderDate(order);
            const year = date.getFullYear();
            const monthKey = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            const venueType = (order.details && order.details.venue_product_line) ? order.details.venue_product_line : 'Other';
            const venueName = order.venue_name || 'Unknown';
            uniqueVenueTypes.add(venueType);

            // Check if this is a gift card purchase (exclude from certain stats)
            const isGiftCard = venueType.toLowerCase().includes('gift') ||
                               venueName.toLowerCase().includes('gift card') ||
                               venueName.toLowerCase().includes('giftcard');

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
                ytdOrderCount += 1;
            }
            if (year === lastYear) {
                lastYearTotal += totalAmount;
                lastYearDistance += distance;
                lastYearOrderCount += 1;
            }

            // Track venue stats for top venues (exclude gift cards)
            if (!isGiftCard) {
                allUniqueVenues.add(venueName);  // Track unique venue names
                if (!venueStats[venueName]) {
                    venueStats[venueName] = { name: venueName, total: 0, orderCount: 0, type: venueType };
                }
                venueStats[venueName].total += totalAmount;
                venueStats[venueName].orderCount += 1;
            }
            totalOrderCount += 1;
            allTimeTotal += totalAmount;  // Track all-time total

            // Phase 2: Track most ordered items
            // Items can be in different locations depending on Wolt API response structure
            let orderItems = null;
            if (Array.isArray(order.items) && order.items.length > 0) {
                orderItems = order.items;
            } else if (order.details) {
                if (Array.isArray(order.details.order_items) && order.details.order_items.length > 0) {
                    orderItems = order.details.order_items;
                } else if (Array.isArray(order.details.items) && order.details.items.length > 0) {
                    orderItems = order.details.items;
                } else if (Array.isArray(order.details.purchases) && order.details.purchases.length > 0) {
                    orderItems = order.details.purchases;
                }
            }

            if (orderItems) {
                orderItems.forEach(item => {
                    // Handle different item structures
                    const itemName = item?.name?.trim() || item?.product_name?.trim() || item?.item_name?.trim();
                    const itemCount = item?.count || item?.quantity || 1;
                    if (itemName) {
                        if (!itemStats[itemName]) {
                            itemStats[itemName] = { name: itemName, count: 0 };
                        }
                        itemStats[itemName].count += itemCount;
                        totalItemsCount += itemCount;
                    }
                });
            }

            // Track total items price for cost breakdown
            totalItemsPrice += itemsPrice;

            // Track day of week stats
            const dayOfWeek = date.getDay();  // 0 = Sunday
            dayOfWeekStats[dayOfWeek] += 1;
            dayOfWeekSpent[dayOfWeek] += totalAmount;

            // Track biggest order (exclude gift cards)
            if (!isGiftCard && totalAmount > biggestOrder.amount) {
                biggestOrder = {
                    amount: totalAmount,
                    venue: venueName,
                    date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                };
            }

            // Track late night orders (after 10pm or before 4am)
            // Parse time from received_at string (format: "DD/MM/YYYY, HH:MM")
            let orderHour = -1;
            if (typeof order.received_at === 'string' && order.received_at.includes(',')) {
                const timePart = order.received_at.split(',')[1]?.trim();
                if (timePart) {
                    const hourMatch = timePart.match(/^(\d{1,2}):/);
                    if (hourMatch) {
                        orderHour = parseInt(hourMatch[1], 10);
                    }
                }
            }
            if (orderHour >= 22 || (orderHour >= 0 && orderHour < 4)) {
                lateNightOrders += 1;
            }

            // Daily activity aggregation (for heatmap) - exclude gift cards
            if (date >= oneYearAgo && !isGiftCard) {
                const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                if (!dailyActivity[dayKey]) {
                    dailyActivity[dayKey] = {
                        date: dayKey,
                        total: 0,
                        orderCount: 0,
                        venues: []
                    };
                }
                dailyActivity[dayKey].total += totalAmount;
                dailyActivity[dayKey].orderCount += 1;
                if (!dailyActivity[dayKey].venues.includes(venueName)) {
                    dailyActivity[dayKey].venues.push(venueName);
                }
            }

            if (monthlyData[monthKey]) {
                if (!venueTypes[venueType]) venueTypes[venueType] = 0;
                venueTypes[venueType] += totalAmount;
            }

            totalDeliveryFees += deliveryPrice;
            totalServiceFees += serviceFee;
        });

        // Calculate top venues (sorted by total spent)
        const topVenues = Object.values(venueStats)
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        // Calculate average order value (all-time for consistency)
        const avgOrderValue = totalOrderCount > 0 ? allTimeTotal / totalOrderCount : 0;

        // Count unique venues (excluding gift cards)
        const uniqueVenueCount = allUniqueVenues.size;

        // Phase 2: Top items (sorted by count)
        const topItems = Object.values(itemStats)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Cost breakdown
        const costBreakdown = {
            items: totalItemsPrice,
            delivery: totalDeliveryFees,
            service: totalServiceFees
        };

        // Favorite day of week
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        let favoriteDayIndex = 0;
        let maxOrders = 0;
        dayOfWeekStats.forEach((count, index) => {
            if (count > maxOrders) {
                maxOrders = count;
                favoriteDayIndex = index;
            }
        });
        const favoriteDay = {
            name: dayNames[favoriteDayIndex],
            orderCount: dayOfWeekStats[favoriteDayIndex],
            totalSpent: dayOfWeekSpent[favoriteDayIndex]
        };

        // Day of week breakdown for chart
        const dayOfWeekBreakdown = dayNames.map((name, i) => ({
            day: name.substring(0, 3),
            orders: dayOfWeekStats[i],
            spent: dayOfWeekSpent[i]
        }));

        return {
            monthly: months.map(k => monthlyData[k]),
            monthsKeys: months,
            ytdTotal,
            lastYearTotal,
            last6MonthsTotal,
            allTimeTotal,
            ytdDistance,
            lastYearDistance,
            venueTypes,
            uniqueVenueTypes: Array.from(uniqueVenueTypes).sort(),
            stackedTypes: Array.from(monthlyVenueTypes).sort(),
            totalDeliveryFees,
            totalServiceFees,
            dailyActivity,
            topVenues,
            uniqueVenueCount,
            avgOrderValue,
            ytdOrderCount,
            lastYearOrderCount,
            totalOrderCount,
            // Phase 2 data
            topItems,
            costBreakdown,
            favoriteDay,
            dayOfWeekBreakdown,
            biggestOrder,
            lateNightOrders,
            totalItemsCount
        };
    } catch (e) {
        console.error('Error in processData:', e);
        return { monthly: [], monthsKeys: [], ytdTotal: 0, lastYearTotal: 0, last6MonthsTotal: 0, allTimeTotal: 0, ytdDistance: 0, lastYearDistance: 0, venueTypes: {}, uniqueVenueTypes: [], stackedTypes: [], totalDeliveryFees: 0, totalServiceFees: 0, dailyActivity: {}, topVenues: [], uniqueVenueCount: 0, avgOrderValue: 0, ytdOrderCount: 0, lastYearOrderCount: 0, totalOrderCount: 0, topItems: [], costBreakdown: { items: 0, delivery: 0, service: 0 }, favoriteDay: { name: '', orderCount: 0, totalSpent: 0 }, dayOfWeekBreakdown: [], biggestOrder: { amount: 0, venue: '', date: '' }, lateNightOrders: 0, totalItemsCount: 0 };
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
