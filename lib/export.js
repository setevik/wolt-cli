import { parseAmount, getOrderDate, getOrderCurrency, getOrderCity } from './report.js';

function escapeCsv(value) {
    const str = String(value ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

export function exportCsv(orders) {
    const headers = ['Date', 'Venue', 'Type', 'Items', 'Amount', 'Currency', 'Delivery Fee', 'Service Fee', 'City', 'Country', 'Status'];
    const lines = [headers.join(',')];

    const sorted = [...orders].sort((a, b) => getOrderDate(b) - getOrderDate(a));

    for (const order of sorted) {
        const date = getOrderDate(order);
        const isoDate = !isNaN(date.getTime())
            ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
            : '';
        const venue = order.venue_name || 'Unknown';
        const type = (order.details && order.details.venue_product_line) ? order.details.venue_product_line : 'Other';

        let items = '';
        if (Array.isArray(order.items)) {
            items = order.items.map(i => i ? i.name : '').filter(Boolean).join('; ');
        } else if (typeof order.items === 'string') {
            items = order.items;
        }

        const amount = parseAmount(order.total_amount || '0');
        const currency = getOrderCurrency(order);
        const { city, country } = getOrderCity(order);

        let deliveryFee = 0;
        let serviceFee = 0;
        if (order.details) {
            const getVal = (val) => {
                if (typeof val === 'number') return val / 100;
                return parseAmount(val);
            };
            deliveryFee = getVal(order.details.delivery_base_price) || 0;
            serviceFee = getVal(order.details.service_fee) || 0;
        }

        const row = [
            escapeCsv(isoDate),
            escapeCsv(venue),
            escapeCsv(type),
            escapeCsv(items),
            amount.toFixed(2),
            escapeCsv(currency),
            deliveryFee.toFixed(2),
            serviceFee.toFixed(2),
            escapeCsv(city || ''),
            escapeCsv(country || ''),
            escapeCsv(order.status || '')
        ];
        lines.push(row.join(','));
    }

    return lines.join('\n') + '\n';
}
