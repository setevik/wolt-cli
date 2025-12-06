export function generateHtml(orders) {
    const ordersJson = JSON.stringify(orders);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wolt Expense Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background: #f4f4f4; color: #333; }
        .container { max-width: 1000px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        h1 { margin-top: 0; }
        .summary { display: flex; gap: 20px; margin-bottom: 20px; }
        .card { background: #f9f9f9; padding: 15px; border-radius: 5px; flex: 1; text-align: center; }
        .card h2 { margin: 0; font-size: 2em; color: #009de0; }
        .card p { margin: 5px 0 0; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f8f8; }
        tr:hover { background-color: #f1f1f1; }
        .search-box { width: 100%; padding: 10px; margin-bottom: 20px; box-sizing: border-box; font-size: 16px; border: 1px solid #ddd; border-radius: 4px; }
        .hidden { display: none; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Wolt Expense Report</h1>
        
        <div class="summary">
            <div class="card">
                <h2 id="total-spent">0</h2>
                <p>Total Spent</p>
            </div>
            <div class="card">
                <h2 id="total-orders">0</h2>
                <p>Total Orders</p>
            </div>
        </div>

        <input type="text" id="search" class="search-box" placeholder="Search orders (venue, items, date)...">

        <table id="orders-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Venue</th>
                    <th>Items</th>
                    <th>Amount</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
    </div>

    <script>
        const orders = ${ordersJson};

        function parseAmount(amountStr) {
            // Remove currency symbols and convert to float
            // Example: "₪74.55" -> 74.55
            return parseFloat(amountStr.replace(/[^0-9.-]+/g, ""));
        }

        function formatDate(ts) {
            return new Date(ts).toLocaleString();
        }

        function render() {
            const tbody = document.querySelector('#orders-table tbody');
            const search = document.getElementById('search').value.toLowerCase();
            let totalSpent = 0;
            let count = 0;

            tbody.innerHTML = '';

            orders.forEach(order => {
                const venue = order.venue_name || 'Unknown';
                const items = order.items || '';
                const dateStr = order.received_at || formatDate(order.payment_time_ts);
                const amountStr = order.total_amount || '0';
                
                // Search filter
                if (search && !venue.toLowerCase().includes(search) && !items.toLowerCase().includes(search) && !dateStr.toLowerCase().includes(search)) {
                    return;
                }

                // Status filter
                const ignoredStatuses = ['deferred_payment_failed', 'rejected', 'pending_transaction'];
                if (ignoredStatuses.includes(order.status)) {
                    return;
                }

                const amount = parseAmount(amountStr);
                totalSpent += amount;
                count++;

                const tr = document.createElement('tr');
                tr.innerHTML = \`
                    <td>\${dateStr}</td>
                    <td>\${venue}</td>
                    <td>\${items}</td>
                    <td>\${amountStr}</td>
                    <td>\${order.status}</td>
                \`;
                tbody.appendChild(tr);
            });

            document.getElementById('total-spent').textContent = totalSpent.toFixed(2);
            document.getElementById('total-orders').textContent = count;
        }

        document.getElementById('search').addEventListener('input', render);
        
        // Initial render
        render();
    </script>
</body>
</html>`;
}
