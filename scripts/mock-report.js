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

// Venue configurations with realistic data
const VENUES = [
    { name: 'Golda', type: 'restaurant', avgPrice: 65, items: ['Shakshuka', 'Israeli Breakfast', 'Eggs Benedict', 'Pancakes'] },
    { name: 'Japanika', type: 'restaurant', avgPrice: 95, items: ['Salmon Roll', 'Tuna Sashimi', 'Ramen', 'Gyoza', 'Edamame'] },
    { name: 'Burgerim', type: 'restaurant', avgPrice: 75, items: ['Classic Burger', 'Cheese Burger', 'Fries', 'Onion Rings'] },
    { name: 'Pizza Hut', type: 'restaurant', avgPrice: 85, items: ['Pepperoni Pizza', 'Margherita', 'Garlic Bread', 'Wings'] },
    { name: 'Aroma Espresso Bar', type: 'restaurant', avgPrice: 55, items: ['Latte', 'Croissant', 'Sandwich', 'Salad'] },
    { name: 'Sushi Yam', type: 'restaurant', avgPrice: 110, items: ['Combo Box', 'Dragon Roll', 'Nigiri Set', 'Miso Soup'] },
    { name: 'Thai House', type: 'restaurant', avgPrice: 70, items: ['Pad Thai', 'Green Curry', 'Tom Yum', 'Spring Rolls'] },
    { name: 'McDonald\'s', type: 'restaurant', avgPrice: 50, items: ['Big Mac', 'McChicken', 'Fries', 'McNuggets'] },
    { name: 'Cafe Cafe', type: 'restaurant', avgPrice: 60, items: ['Pasta', 'Caesar Salad', 'Coffee', 'Cheesecake'] },
    { name: 'Hummus Eliyahu', type: 'restaurant', avgPrice: 45, items: ['Hummus Plate', 'Falafel', 'Pita Bread', 'Salads'] },
    { name: 'Shufersal', type: 'grocery', avgPrice: 180, items: ['Milk', 'Bread', 'Vegetables', 'Fruits', 'Cheese'] },
    { name: 'AM:PM', type: 'grocery', avgPrice: 85, items: ['Snacks', 'Drinks', 'Sandwiches', 'Ice Cream'] },
    { name: 'Super-Pharm', type: 'drugstore', avgPrice: 120, items: ['Vitamins', 'Shampoo', 'Skincare', 'Medicine'] },
    { name: 'Yellow Grocery', type: 'grocery', avgPrice: 150, items: ['Groceries', 'Dairy', 'Meat', 'Produce'] },
    { name: 'Wine & More', type: 'alcohol', avgPrice: 95, items: ['Red Wine', 'White Wine', 'Beer Pack', 'Whiskey'] },
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

    return {
        id: `order_${Date.now()}_${randomInt(1000, 9999)}`,
        venue_name: venue.name,
        status: 'delivered',
        received_at: formatDate(date),
        total_amount: `₪${(totalAmount / 100).toFixed(2)}`,
        details: {
            venue_product_line: venue.type,
            items_price: itemsPrice,
            delivery_base_price: deliveryFee,
            service_fee: serviceFee,
            delivery_distance_in_meters: distance,
            order_items: items
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
