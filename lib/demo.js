/**
 * Demo data generator.
 *
 * Produces a believable, reproducible order history in the same shape that
 * `wolt-cli sync` stores, so the report can be previewed without a Wolt account.
 *
 * Persona: someone living in Berlin (EUR) who orders a few times a week, has a
 * handful of favourite places, does a Sunday grocery run now and then, spent a
 * weekend in Hamburg and made two trips to Prague where they paid in CZK.
 *
 * All venues are fictional. All randomness comes from a seeded PRNG, so the
 * same seed + end date always yields the same orders.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Seeded randomness
// ---------------------------------------------------------------------------

function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function createRandom(seed) {
    const next = mulberry32(seed);
    const rnd = {
        next,
        int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
        chance: (p) => next() < p,
        pick: (arr) => arr[Math.floor(next() * arr.length)],
        weighted: (arr, weightOf) => {
            const total = arr.reduce((s, x) => s + weightOf(x), 0);
            let r = next() * total;
            for (const x of arr) {
                r -= weightOf(x);
                if (r <= 0) return x;
            }
            return arr[arr.length - 1];
        },
        sample: (arr, count) => {
            const copy = [...arr];
            const out = [];
            while (out.length < count && copy.length) {
                out.push(copy.splice(Math.floor(next() * copy.length), 1)[0]);
            }
            return out;
        }
    };
    return rnd;
}

// ---------------------------------------------------------------------------
// Places
// ---------------------------------------------------------------------------

// Prices are in minor units (cents / haléře), exactly like Wolt's detail API.
// The first `mains` (default 2) menu entries are main dishes, the rest sides.
// `meals` restricts when a venue is realistically ordered from.
// `weight` models favourites; `since` (days before the end date) models places
// discovered later on.
const CITIES = {
    berlin: {
        city: 'Berlin', country: 'Germany', currency: 'EUR',
        venues: [
            { name: 'Pho Song Mitte', type: 'restaurant', weight: 9, meals: ['lunch', 'dinner'], distance: [900, 2200],
              menu: [['Pho Bo', 1290], ['Bun Bo Nam Bo', 1350], ['Summer Rolls', 650], ['Vietnamese Iced Coffee', 420]] },
            { name: 'Nonna Rosa Pizzeria', type: 'restaurant', weight: 8, meals: ['dinner'], distance: [1200, 3100],
              menu: [['Pizza Margherita', 1050], ['Pizza Diavola', 1290], ['Tiramisu', 590], ['Lemon Soda', 350]] },
            { name: 'Kiez Döner', type: 'restaurant', weight: 5, meals: ['lunch', 'dinner', 'late'], distance: [400, 1300],
              menu: [['Döner Kebab', 750], ['Dürüm', 800], ['Fries', 350], ['Ayran', 250]] },
            { name: 'Burger Brigade', type: 'restaurant', weight: 5, meals: ['dinner', 'late'], distance: [1500, 3400],
              mains: 1, menu: [['Double Cheeseburger', 1290], ['Chili Cheese Fries', 550], ['Sweet Potato Fries', 490], ['Cola', 290]] },
            { name: 'Sushi Kaito', type: 'restaurant', weight: 5, meals: ['dinner'], distance: [2000, 4200],
              menu: [['Salmon Maki Set', 1490], ['Crunchy Ebi Roll', 1190], ['Miso Soup', 350], ['Edamame', 450]] },
            { name: 'Curry Haus', type: 'restaurant', weight: 5, meals: ['dinner'], distance: [1800, 3600],
              menu: [['Butter Chicken', 1390], ['Palak Paneer', 1250], ['Garlic Naan', 350], ['Mango Lassi', 450]] },
            { name: 'Green Bowl Kitchen', type: 'restaurant', weight: 6, meals: ['lunch'], distance: [700, 1800], since: 520,
              menu: [['Salmon Poke Bowl', 1390], ['Falafel Bowl', 1190], ['Kombucha', 390]] },
            { name: 'Thai Orchid', type: 'restaurant', weight: 3, meals: ['dinner'], distance: [1400, 2900],
              menu: [['Pad Thai', 1250], ['Green Curry', 1350], ['Spring Rolls', 590]] },
            { name: 'La Esquina Taqueria', type: 'restaurant', weight: 4, meals: ['dinner'], distance: [2200, 4600], since: 300,
              menu: [['Tacos al Pastor', 1090], ['Burrito', 1150], ['Nachos', 750], ['Horchata', 390]] },
            { name: 'Morgenrot Bakery', type: 'restaurant', weight: 4, meals: ['breakfast'], distance: [300, 900],
              mains: 1, menu: [['Avocado Toast', 950], ['Flat White', 380], ['Croissant', 240], ['Cinnamon Bun', 320]] },
            { name: 'Kiez Market', type: 'grocery', weight: 1, meals: ['grocery'], distance: [600, 1600],
              menu: [['Oat Milk', 229], ['Bananas', 149], ['Spaghetti', 199], ['Cherry Tomatoes', 249], ['Sourdough Bread', 420],
                     ['Free-Range Eggs', 329], ['Coffee Beans', 899], ['Greek Yogurt', 219], ['Ice Cream', 549], ['Sparkling Water 6x', 399]] },
            { name: 'Apotheke am Park', type: 'pharmacy', weight: 1, meals: ['errand'], distance: [500, 1500],
              menu: [['Ibuprofen 400', 549], ['Throat Lozenges', 699], ['Vitamin D', 1290], ['Sunscreen SPF 50', 1490], ['Plasters', 349]] },
            { name: 'Blumen Wildwuchs', type: 'florist', weight: 1, meals: ['flowers'], distance: [1100, 2500],
              menu: [['Seasonal Bouquet', 3490], ['Tulips (10)', 1990], ['Greeting Card', 350]] }
        ]
    },
    hamburg: {
        city: 'Hamburg', country: 'Germany', currency: 'EUR',
        venues: [
            { name: 'Hafen Fischbrötchen', type: 'restaurant', weight: 3, meals: ['lunch', 'dinner'], distance: [800, 2000],
              menu: [['Fish & Chips', 1290], ['Fischbrötchen', 650], ['Rhubarb Spritzer', 390]] },
            { name: 'Elbe Pasta Bar', type: 'restaurant', weight: 3, meals: ['dinner'], distance: [1200, 2600],
              menu: [['Cacio e Pepe', 1350], ['Lasagne', 1450], ['Panna Cotta', 590]] }
        ]
    },
    prague: {
        city: 'Prague', country: 'Czech Republic', currency: 'CZK',
        venues: [
            { name: 'U Zlatého Kohouta', type: 'restaurant', weight: 4, meals: ['dinner'], distance: [900, 2400],
              menu: [['Svíčková', 28900], ['Beef Goulash', 25900], ['Bread Dumplings', 6900], ['Pilsner 0.5l', 6900]] },
            { name: 'Bageterie Karlín', type: 'restaurant', weight: 4, meals: ['breakfast', 'lunch'], distance: [500, 1500],
              mains: 1, menu: [['Bagel Sandwich', 15900], ['Cappuccino', 7900], ['Fresh Lemonade', 8900]] },
            { name: 'Pho Holešovice', type: 'restaurant', weight: 3, meals: ['lunch', 'dinner', 'late'], distance: [1100, 2800],
              menu: [['Pho Bo', 18900], ['Bun Cha', 21900], ['Nem Rolls', 11900]] },
            { name: 'Potraviny Letná', type: 'grocery', weight: 1, meals: ['grocery'], distance: [400, 1200],
              menu: [['Still Water 1.5l', 2500], ['Kolache', 4900], ['Fruit Box', 8900], ['Beer 6-pack', 17900], ['Rohlík (6)', 3000]] }
        ]
    }
};

// Delivery / service fee rules per currency, in minor units.
const FEES = {
    EUR: {
        delivery: (m) => Math.min(499, 99 + Math.round(m / 1000 * 60 / 10) * 10),
        service: (items) => Math.max(49, Math.min(249, Math.round(items * 0.05))) + (items < 1000 ? 1000 - items : 0)
    },
    CZK: {
        delivery: (m) => Math.min(8900, 3900 + Math.round(m / 1000 * 15) * 100),
        service: (items) => Math.max(1500, Math.min(5900, Math.round(items * 0.05 / 100) * 100)) + (items < 25000 ? 25000 - items : 0)
    }
};

const CURRENCY_FORMAT = {
    EUR: (minor) => `€${(minor / 100).toFixed(2)}`,
    CZK: (minor) => `${(minor / 100).toFixed(2)} Kč`
};

// Meal slots: local hour ranges.
const MEAL_HOURS = {
    breakfast: [8, 10],
    lunch: [12, 13],
    dinner: [18, 21],
    late: [22, 23],
    grocery: [10, 17],
    errand: [9, 18],
    flowers: [10, 15]
};

// ---------------------------------------------------------------------------
// Calendar helpers
// ---------------------------------------------------------------------------

function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d, n) {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
}

function pad(n) {
    return String(n).padStart(2, '0');
}

// Wolt's order list uses "DD/MM/YYYY, HH:MM"
function formatReceivedAt(d) {
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function inRange(day, range) {
    return day >= range.start && day < range.end;
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

/**
 * @param {object} [options]
 * @param {number} [options.seed=7]     PRNG seed
 * @param {Date}   [options.endDate]    last day of history (default: now)
 * @param {number} [options.months=26]  length of history in months
 * @returns {object[]} orders, newest first, in `wolt-cli sync` storage shape
 */
export function generateDemoOrders(options = {}) {
    const seed = options.seed ?? 7;
    const endDate = options.endDate ? new Date(options.endDate) : new Date();
    const months = options.months ?? 26;
    const rnd = createRandom(seed);

    const end = startOfDay(endDate);
    const start = new Date(end.getFullYear(), end.getMonth() - months, end.getDate());
    const totalDays = Math.round((end - start) / DAY_MS);

    // Trips and time away, expressed relative to the end date so the story
    // stays the same whenever the demo is generated.
    const trips = [
        { key: 'prague', start: addDays(end, -290), end: addDays(end, -286) },  // long weekend
        { key: 'hamburg', start: addDays(end, -200), end: addDays(end, -197) }, // weekend
        { key: 'prague', start: addDays(end, -128), end: addDays(end, -119) }   // proper holiday
    ];
    const offline = [
        { start: addDays(end, -410), end: addDays(end, -397) } // visiting family, no orders
    ];

    // Weekday base rates (Sun..Sat): expected food orders per day
    const WEEKDAY_RATE = [0.42, 0.22, 0.24, 0.28, 0.32, 0.55, 0.48];

    const orders = [];
    let counter = 0;

    const makeOrder = (day, place, venue, meal, extra = {}) => {
        const [hMin, hMax] = MEAL_HOURS[meal];
        const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), rnd.int(hMin, hMax), rnd.int(0, 59));
        if (at > endDate) return null;

        // Prices creep up ~4% a year
        const ageYears = (end - day) / (365 * DAY_MS);
        const inflation = 1 / Math.pow(1.04, ageYears);
        const priceOf = (base) => place.currency === 'CZK'
            ? Math.round(base * inflation / 100) * 100
            : Math.round(base * inflation / 10) * 10 - (base % 10 === 9 ? 1 : 0);

        let lines;
        if (meal === 'grocery' || meal === 'errand' || meal === 'flowers') {
            const n = meal === 'grocery' ? rnd.int(3, 7) : rnd.int(1, 2);
            lines = rnd.sample(venue.menu, n).map(([name, price]) => ({
                name, count: meal === 'grocery' && rnd.chance(0.25) ? 2 : 1, base_price: priceOf(price)
            }));
        } else {
            const forTwo = extra.forTwo;
            const mains = venue.menu.slice(0, venue.mains ?? 2);
            const sides = venue.menu.slice(mains.length);
            const main = rnd.pick(mains);
            lines = [{ name: main[0], count: forTwo ? 2 : 1, base_price: priceOf(main[1]) }];
            if (forTwo && mains.length > 1 && rnd.chance(0.5)) {
                const other = rnd.pick(mains.filter(m => m !== main));
                lines[0].count = 1;
                lines.push({ name: other[0], count: 1, base_price: priceOf(other[1]) });
            }
            if (sides.length && rnd.chance(forTwo ? 0.85 : 0.65)) {
                const side = rnd.pick(sides);
                lines.push({ name: side[0], count: forTwo && rnd.chance(0.5) ? 2 : 1, base_price: priceOf(side[1]) });
            }
        }

        const items = lines.reduce((s, l) => s + l.base_price * l.count, 0);
        const distance = rnd.int(venue.distance[0], venue.distance[1]);
        const fees = FEES[place.currency];
        const delivery = fees.delivery(distance);
        const service = fees.service(items);
        const total = items + delivery + service;

        counter += 1;
        const id = `demo${seed.toString(36)}${String(counter).padStart(5, '0')}`;
        return {
            purchase_id: id,
            venue_name: venue.name,
            status: extra.status || 'delivered',
            received_at: formatReceivedAt(at),
            payment_time_ts: at.getTime(),
            total_amount: CURRENCY_FORMAT[place.currency](total),
            items: lines.map(l => ({ name: l.name, count: l.count })),
            details: {
                venue_product_line: venue.type,
                currency: place.currency,
                venue_city: place.city,
                venue_country: place.country,
                items_price: items,
                delivery_base_price: delivery,
                service_fee: service,
                delivery_distance: distance,
                order_items: lines
            }
        };
    };

    const pickVenue = (place, meal, dayIndex) => {
        const candidates = place.venues.filter(v =>
            v.meals.includes(meal) && (v.since === undefined || totalDays - dayIndex <= v.since));
        if (!candidates.length) return null;
        return rnd.weighted(candidates, v => v.weight);
    };

    for (let i = 0; i <= totalDays; i++) {
        const day = addDays(start, i);
        if (offline.some(r => inRange(day, r))) continue;

        const trip = trips.find(r => inRange(day, r));
        const place = CITIES[trip ? trip.key : 'berlin'];
        const dow = day.getDay();
        const month = day.getMonth();

        // Winter comfort ordering, summer eating out; gentle growth over time
        const season = [1.3, 1.25, 1.1, 1.0, 0.9, 0.8, 0.75, 0.75, 0.9, 1.05, 1.2, 1.3][month];
        const growth = 0.92 + 0.16 * (i / totalDays);
        const rate = trip ? 1.5 : WEEKDAY_RATE[dow] * season * growth;

        // Food orders for the day
        let count = 0;
        let p = rate;
        while (p > 0 && rnd.chance(Math.min(p, 0.9))) {
            count += 1;
            p -= 0.9;
        }
        const usedMeals = new Set();
        for (let k = 0; k < count; k++) {
            const isWeekend = dow === 0 || dow === 6;
            const meal = rnd.weighted(
                [['breakfast', isWeekend ? 1.2 : 0.2], ['lunch', isWeekend ? 0.6 : 1.4], ['dinner', 4], ['late', dow === 5 || dow === 6 ? 0.8 : 0.25]]
                    .filter(([m]) => !usedMeals.has(m)),
                ([, w]) => w
            )[0];
            usedMeals.add(meal);
            // Smaller cities have fewer options: fall back to a dinner place
            const venue = pickVenue(place, meal, i) || pickVenue(place, 'dinner', i);
            if (!venue) continue;
            const forTwo = meal === 'dinner' && (dow === 5 || dow === 6 ? rnd.chance(0.5) : rnd.chance(0.2));
            const status = rnd.chance(0.012) ? 'rejected' : undefined;
            const o = makeOrder(day, place, venue, meal, { forTwo, status });
            if (o) orders.push(o);
        }

        // Grocery run: mostly Sundays (shops are closed) and during trips
        const groceryChance = trip ? (i === Math.round((trip.start - start) / DAY_MS) ? 0.9 : 0.08) : dow === 0 ? 0.16 : 0.025;
        if (rnd.chance(groceryChance)) {
            const venue = pickVenue(place, 'grocery', i);
            if (venue) {
                const o = makeOrder(day, place, venue, 'grocery');
                if (o) orders.push(o);
            }
        }

        if (!trip) {
            // The odd pharmacy errand, more often in cold months
            if (rnd.chance(month <= 2 || month >= 10 ? 0.025 : 0.01)) {
                const o = makeOrder(day, place, pickVenue(place, 'errand', i), 'errand');
                if (o) orders.push(o);
            }
            // Flowers for Valentine's and Mother's Day (2nd Sunday of May)
            const isValentines = month === 1 && day.getDate() === 14;
            const isMothersDay = month === 4 && dow === 0 && day.getDate() >= 8 && day.getDate() <= 14;
            if (isValentines || isMothersDay) {
                const o = makeOrder(day, place, pickVenue(place, 'flowers', i), 'flowers');
                if (o) orders.push(o);
            }
        }
    }

    // Newest first, like the Wolt API
    orders.sort((a, b) => b.payment_time_ts - a.payment_time_ts);
    return orders;
}
