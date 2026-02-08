#!/usr/bin/env node
/**
 * Mock Report Generator
 * Generates an HTML report with realistic demo data for demonstration purposes
 */

import { generateHtml } from '../lib/report.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Currency formatting helpers for mock data
const CURRENCY_SYMBOLS = { 'ILS': '₪', 'CZK': 'Kč', 'EUR': '€', 'USD': '$', 'GBP': '£' };
const SUFFIX_CURRENCY_SET = new Set(['CZK']);

// Venue configurations with realistic data, including city, country, and currency
const VENUES = [
    { name: 'Golda', type: 'restaurant', avgPrice: 65, items: ['Shakshuka', 'Israeli Breakfast', 'Eggs Benedict', 'Pancakes'], city: 'Tel Aviv', country: 'Israel', currency: 'ILS' },
    { name: 'Japanika', type: 'restaurant', avgPrice: 95, items: ['Salmon Roll', 'Tuna Sashimi', 'Ramen', 'Gyoza', 'Edamame'], city: 'Tel Aviv', country: 'Israel', currency: 'ILS' },
    { name: 'Burgerim', type: 'restaurant', avgPrice: 75, items: ['Classic Burger', 'Cheese Burger', 'Fries', 'Onion Rings'], city: 'Haifa', country: 'Israel', currency: 'ILS' },
    { name: 'Pizza Hut', type: 'restaurant', avgPrice: 85, items: ['Pepperoni Pizza', 'Margherita', 'Garlic Bread', 'Wings'], city: 'Jerusalem', country: 'Israel', currency: 'ILS' },
    { name: 'Aroma Espresso Bar', type: 'restaurant', avgPrice: 55, items: ['Latte', 'Croissant', 'Sandwich', 'Salad'], city: 'Tel Aviv', country: 'Israel', currency: 'ILS' },
    { name: 'Sushi Yam', type: 'restaurant', avgPrice: 110, items: ['Combo Box', 'Dragon Roll', 'Nigiri Set', 'Miso Soup'], city: 'Tel Aviv', country: 'Israel', currency: 'ILS' },
    { name: 'Thai House', type: 'restaurant', avgPrice: 70, items: ['Pad Thai', 'Green Curry', 'Tom Yum', 'Spring Rolls'], city: 'Haifa', country: 'Israel', currency: 'ILS' },
    { name: 'McDonald\'s', type: 'restaurant', avgPrice: 50, items: ['Big Mac', 'McChicken', 'Fries', 'McNuggets'], city: 'Tel Aviv', country: 'Israel', currency: 'ILS' },
    { name: 'Cafe Cafe', type: 'restaurant', avgPrice: 60, items: ['Pasta', 'Caesar Salad', 'Coffee', 'Cheesecake'], city: 'Jerusalem', country: 'Israel', currency: 'ILS' },
    { name: 'Hummus Eliyahu', type: 'restaurant', avgPrice: 45, items: ['Hummus Plate', 'Falafel', 'Pita Bread', 'Salads'], city: 'Haifa', country: 'Israel', currency: 'ILS' },
    { name: 'Shufersal', type: 'grocery', avgPrice: 180, items: ['Milk', 'Bread', 'Vegetables', 'Fruits', 'Cheese'], city: 'Tel Aviv', country: 'Israel', currency: 'ILS' },
    { name: 'AM:PM', type: 'grocery', avgPrice: 85, items: ['Snacks', 'Drinks', 'Sandwiches', 'Ice Cream'], city: 'Tel Aviv', country: 'Israel', currency: 'ILS' },
    { name: 'Super-Pharm', type: 'drugstore', avgPrice: 120, items: ['Vitamins', 'Shampoo', 'Skincare', 'Medicine'], city: 'Tel Aviv', country: 'Israel', currency: 'ILS' },
    { name: 'Yellow Grocery', type: 'grocery', avgPrice: 150, items: ['Groceries', 'Dairy', 'Meat', 'Produce'], city: 'Jerusalem', country: 'Israel', currency: 'ILS' },
    { name: 'Wine & More', type: 'alcohol', avgPrice: 95, items: ['Red Wine', 'White Wine', 'Beer Pack', 'Whiskey'], city: 'Tel Aviv', country: 'Israel', currency: 'ILS' },
    // Czech Republic venues (CZK)
    { name: 'Potrefena Husa', type: 'restaurant', avgPrice: 280, items: ['Svickova', 'Goulash', 'Bramborak', 'Beer'], city: 'Prague', country: 'Czech Republic', currency: 'CZK' },
    { name: 'Bohemia Bagel', type: 'restaurant', avgPrice: 220, items: ['Bagel Sandwich', 'Smoothie', 'Coffee', 'Salad'], city: 'Prague', country: 'Czech Republic', currency: 'CZK' },
    { name: 'Rohlik.cz', type: 'grocery', avgPrice: 450, items: ['Milk', 'Bread', 'Cheese', 'Vegetables'], city: 'Brno', country: 'Czech Republic', currency: 'CZK' },
];

// Generate a random date within a range
function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Generate a random integer between min and max
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Pick random items from an array
function pickRandom(arr, count = 1) {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// Format date as DD/MM/YYYY, HH:MM
function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year}, ${hours}:${minutes}`;
}

// Generate a single mock order
function generateOrder(date) {
    const venue = VENUES[randomInt(0, VENUES.length - 1)];
    const itemCount = randomInt(1, 4);
    const items = pickRandom(venue.items, itemCount).map(name => ({
        name,
        count: randomInt(1, 2),
        base_price: randomInt(20, 60) * 100
    }));

    const itemsPrice = items.reduce((sum, item) => sum + (item.base_price * item.count), 0);
    const deliveryFee = randomInt(8, 18) * 100;
    const serviceFee = Math.round(itemsPrice * 0.05);
    const totalAmount = itemsPrice + deliveryFee + serviceFee;
    const distance = randomInt(500, 5000);

    const currencySymbol = CURRENCY_SYMBOLS[venue.currency] || venue.currency;
    const isSuffix = SUFFIX_CURRENCY_SET.has(venue.currency);
    const amountStr = isSuffix
        ? `${(totalAmount / 100).toFixed(2)} ${currencySymbol}`
        : `${currencySymbol}${(totalAmount / 100).toFixed(2)}`;

    return {
        id: `order_${Date.now()}_${randomInt(1000, 9999)}`,
        venue_name: venue.name,
        status: 'delivered',
        received_at: formatDate(date),
        total_amount: amountStr,
        details: {
            venue_product_line: venue.type,
            items_price: itemsPrice,
            delivery_base_price: deliveryFee,
            service_fee: serviceFee,
            delivery_distance_in_meters: distance,
            order_items: items,
            currency: venue.currency,
            venue_city: venue.city,
            venue_country: venue.country
        },
        items: items
    };
}

// Generate mock orders for the past 2 years
function generateMockOrders() {
    const orders = [];
    const now = new Date();
    const twoYearsAgo = new Date(now);
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    // Generate approximately 3-8 orders per week for 2 years
    let currentDate = new Date(twoYearsAgo);

    while (currentDate < now) {
        // Weekly order frequency varies
        const ordersThisWeek = randomInt(2, 8);

        for (let i = 0; i < ordersThisWeek; i++) {
            const orderDate = new Date(currentDate);
            orderDate.setDate(orderDate.getDate() + randomInt(0, 6));

            // Vary hours - more orders at lunch and dinner
            const hour = Math.random() < 0.3
                ? randomInt(11, 14)   // Lunch
                : Math.random() < 0.7
                    ? randomInt(18, 22)  // Dinner
                    : randomInt(22, 23); // Late night

            orderDate.setHours(hour, randomInt(0, 59));

            if (orderDate < now) {
                orders.push(generateOrder(orderDate));
            }
        }

        currentDate.setDate(currentDate.getDate() + 7);
    }

    // Sort by date descending (newest first)
    orders.sort((a, b) => {
        const parseDate = (str) => {
            const [datePart] = str.split(',');
            const [d, m, y] = datePart.split('/').map(Number);
            return new Date(y, m - 1, d);
        };
        return parseDate(b.received_at) - parseDate(a.received_at);
    });

    return orders;
}

async function main() {
    console.log('Generating mock report data...');

    const orders = generateMockOrders();
    console.log(`Generated ${orders.length} mock orders`);

    console.log('Rendering HTML report...');
    const html = await generateHtml(orders);

    const outputPath = path.join(__dirname, '..', 'mock-report.html');
    await fs.writeFile(outputPath, html, 'utf-8');

    console.log(`\nMock report saved to: ${outputPath}`);
    console.log(`Open in browser: file://${outputPath}`);
}

main().catch(console.error);
