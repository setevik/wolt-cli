export function generateHtml(orders) {
    const ordersJson = JSON.stringify(orders);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wolt Expense Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background: #f4f4f4; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        h1 { margin-top: 0; }
        
        /* Tabs */
        .tabs { display: flex; border-bottom: 2px solid #ddd; margin-bottom: 20px; }
        .tab-btn { padding: 10px 20px; border: none; background: none; font-size: 16px; cursor: pointer; color: #666; font-weight: 500; }
        .tab-btn.active { color: #009de0; border-bottom: 2px solid #009de0; margin-bottom: -2px; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }

        /* Dashboard */
        .dashboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .chart-container { background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #eee; height: 300px; }
        .full-width { grid-column: 1 / -1; }
        .stats-summary { display: flex; gap: 20px; margin-bottom: 20px; }
        .stat-card { background: #f9f9f9; padding: 15px; border-radius: 5px; flex: 1; text-align: center; border: 1px solid #eee; }
        .stat-card h2 { margin: 0; font-size: 2em; color: #009de0; }
        .stat-card p { margin: 5px 0 0; color: #666; }
        .stat-card .sub-text { font-size: 0.9em; color: #999; margin-top: 5px; }

        /* Filters */
        .filters-bar { display: flex; gap: 10px; margin-bottom: 20px; align-items: center; flex-wrap: wrap; }
        .filter-group { display: flex; flex-direction: column; gap: 5px; }
        .filter-group label { font-size: 12px; font-weight: bold; color: #666; }
        .form-control { padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
        .search-box { flex-grow: 1; }
        .btn-clear { padding: 8px 15px; background: #eee; border: none; border-radius: 4px; cursor: pointer; color: #333; align-self: flex-end; }
        .btn-clear:hover { background: #ddd; }

        /* Orders Table */
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f8f8; }
        tr:hover { background-color: #f1f1f1; }
        
        .hidden { display: none; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Wolt Expense Report</h1>
        
        <div class="tabs">
            <button class="tab-btn active" onclick="switchTab('dashboard')">Dashboard</button>
            <button class="tab-btn" onclick="switchTab('orders')">Orders List</button>
        </div>

        <!-- Dashboard Tab -->
        <div id="dashboard" class="tab-content active">
            <div class="stats-summary">
                <div class="stat-card">
                    <h2 id="total-spent-ytd">0</h2>
                    <p>YTD Spent (This Year)</p>
                    <div id="ytd-comparison" class="sub-text">vs 0 Last Year</div>
                </div>
                <div class="stat-card">
                    <h2 id="total-spent-6m">0</h2>
                    <p>Last 6 Months Spent</p>
                </div>
                 <div class="stat-card">
                    <h2 id="avg-monthly">0</h2>
                    <p>Avg Monthly (Last 6m)</p>
                </div>
                <div class="stat-card">
                    <h2 id="total-distance-ytd">0 km</h2>
                    <p>Total Delivery Distance (YTD)</p>
                    <div id="distance-comparison" class="sub-text">vs 0 km Last Year</div>
                </div>
                <div class="stat-card">
                    <h2 id="total-delivery-fees">0</h2>
                    <p>Total Delivery Fees (All Time)</p>
                </div>
                 <div class="stat-card">
                    <h2 id="total-service-fees">0</h2>
                    <p>Total Service Fees (All Time)</p>
                </div>
            </div>

            <div class="dashboard-grid">
                <div class="chart-container full-width">
                    <canvas id="monthlyTrendChart"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="venueTypeChart"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="yearlyCompChart"></canvas>
                </div>
            </div>
        </div>

        <!-- Orders Tab -->
        <div id="orders" class="tab-content">
            <div class="filters-bar">
                <div class="filter-group search-box">
                    <label for="search">Search</label>
                    <input type="text" id="search" class="form-control" placeholder="Venue, items, etc...">
                </div>
                <div class="filter-group">
                    <label for="filter-venue-type">Venue Type</label>
                    <select id="filter-venue-type" class="form-control">
                        <option value="">All Types</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="filter-month">Month</label>
                    <input type="month" id="filter-month" class="form-control">
                </div>
                <button class="btn-clear" onclick="clearFilters()">Clear Filters</button>
            </div>
            
            <div id="orders-summary" style="margin-bottom: 10px; color: #666;"></div>
            <table id="orders-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Venue</th>
                        <th>Type</th>
                        <th>Items</th>
                        <th>Amount</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    </div>

    <script>
        const orders = ${ordersJson};

        // Debug: Log orders to console to help troubleshooting
        console.log('Loaded orders:', orders);

        function switchTab(tabId) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
            document.querySelector(\`button[onclick="switchTab('\${tabId}')"]\`).classList.add('active');
        }

        function parseAmount(amountStr) {
            // Remove currency symbols and convert to float
            // Example: "₪74.55" -> 74.55
            if (typeof amountStr === 'number') return amountStr;
            if (!amountStr) return 0;
            return parseFloat(amountStr.replace(/[^0-9.-]+/g, ""));
        }

        function formatDate(ts) {
            if (!ts) return '';
            const d = new Date(ts);
            return isNaN(d.getTime()) ? '' : d.toLocaleString();
        }

        function getOrderDate(order) {
             let d;
             
             // Try manual parsing of received_at if it looks like a string first
             // This avoids ambiguity where "08/01/2026" is parsed as Aug 1st by new Date() 
             // but is meant to be Jan 8th (DD/MM/YYYY).
             if (typeof order.received_at === 'string') {
                 // Try to split by expected delimiters
                 const parts = order.received_at.split(',')[0].split('/');
                 if (parts.length === 3) {
                     // Assert DD/MM/YYYY
                     const day = parseInt(parts[0], 10);
                     const month = parseInt(parts[1], 10) - 1; 
                     const year = parseInt(parts[2], 10);
                     
                     // Basic validation
                     if (day > 0 && day <= 31 && month >= 0 && month <= 11 && year > 2000) {
                        d = new Date(year, month, day);
                     }
                 }
             }

             // Fallback to standard parsing if manual failed or wasn't string
             if ((!d || isNaN(d.getTime())) && order.received_at) {
                 d = new Date(order.received_at);
             }

             // Fallback to payment_time_ts if d is still null/invalid
             if ((!d || isNaN(d.getTime())) && order.payment_time_ts) {
                 d = new Date(order.payment_time_ts);
             }
             
             if (!d || isNaN(d.getTime())) {
                 console.warn('Invalid date for order:', order);
                 return new Date(); // Fallback to now
             }
             return d;
        }

        function processData() {
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
                    const key = \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, '0')}\`;
                    // byType will hold total for each venue type in this month
                    monthlyData[key] = { 
                        total: 0, 
                        label: d.toLocaleString('default', { month: 'short', year: 'numeric' }),
                        byType: {} 
                    };
                    months.push(key); // keep order
                }

                // 2. Year Comparison & Distance
                let ytdTotal = 0;
                let lastYearTotal = 0;
                let last6MonthsTotal = 0;
                
                let ytdDistance = 0;
                let lastYearDistance = 0;

                let totalDeliveryFees = 0;
                let totalServiceFees = 0;

                // 3. Venue Types
                const venueTypes = {}; // Total aggregation for simple pie chart
                const uniqueVenueTypes = new Set(); // For filters
                const monthlyVenueTypes = new Set(); // Types present in last 6 months for stacked chart legend

                validOrders.forEach(order => {
                    const totalAmount = parseAmount(order.total_amount || '0');
                    const date = getOrderDate(order);
                    const year = date.getFullYear();
                    const monthKey = \`\${year}-\${String(date.getMonth() + 1).padStart(2, '0')}\`;

                    const venueType = (order.details && order.details.venue_product_line) ? order.details.venue_product_line : 'Other';
                    uniqueVenueTypes.add(venueType);
                    
                    // Cost Components
                    let itemsPrice = 0;
                    let deliveryPrice = 0;
                    let serviceFee = 0;
                    
                    if (order.details) {
                        // Helper to handle minor currency units (ints) vs strings
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
                    
                    // If breakdown is zero/missing, fall back to totalAmount for the "venueType" (legacy behavior/safety)
                    // But if we have valid breakdown, itemsPrice maps to venueType
                    if (itemsPrice === 0 && deliveryPrice === 0 && serviceFee === 0) {
                        itemsPrice = totalAmount;
                    }

                    // Distance
                    let distance = 0;
                    if (order.details && order.details.delivery_distance) {
                         // Distance is usually in meters, maintain as is (meters)
                         // The dashboard display divides by 1000 for km.
                         // But wait, if previous logic used parseAmount which returns the number, and it was displaying correctly in km...
                         // Line 409 says: const toKm = (v) => (v / 1000).toFixed(1);
                         // So distance should be in METERS.
                         // If details.delivery_distance is 1234 (meters), parseAmount returned 1234.
                         // If I use getDetailAmount, it would divide by 100 -> 12.34. That would be wrong for distance (meters).
                         // Distance is NOT a currency.
                         distance = parseAmount(order.details.delivery_distance) || 0;
                    }

                    // Update Monthly Data (if within last 6 months buckets)
                    if (monthlyData[monthKey]) {
                        monthlyData[monthKey].total += totalAmount;
                        
                        // Items -> Venue Type
                        if (!monthlyData[monthKey].byType[venueType]) monthlyData[monthKey].byType[venueType] = 0;
                        monthlyData[monthKey].byType[venueType] += itemsPrice;
                        monthlyVenueTypes.add(venueType);

                        // Delivery
                        if (deliveryPrice > 0) {
                            if (!monthlyData[monthKey].byType['Delivery']) monthlyData[monthKey].byType['Delivery'] = 0;
                            monthlyData[monthKey].byType['Delivery'] += deliveryPrice;
                            monthlyVenueTypes.add('Delivery');
                        }

                        // Service Fee
                        if (serviceFee > 0) {
                            if (!monthlyData[monthKey].byType['Service Fee']) monthlyData[monthKey].byType['Service Fee'] = 0;
                            monthlyData[monthKey].byType['Service Fee'] += serviceFee;
                            monthlyVenueTypes.add('Service Fee');
                        }

                        // Catch remainder/other fees if total > sum(parts)
                        const remainder = totalAmount - (itemsPrice + deliveryPrice + serviceFee);
                        if (remainder > 0.01) { // tolerance
                             if (!monthlyData[monthKey].byType['Other Fees']) monthlyData[monthKey].byType['Other Fees'] = 0;
                             monthlyData[monthKey].byType['Other Fees'] += remainder;
                             monthlyVenueTypes.add('Other Fees');
                        }

                        last6MonthsTotal += totalAmount;
                    }

                    // Update YTD
                    if (year === currentYear) {
                        ytdTotal += totalAmount;
                        ytdDistance += distance;
                    }
                    // Update Last Year Total
                    if (year === lastYear) {
                        lastYearTotal += totalAmount;
                        lastYearDistance += distance;
                    }

                    // Update Venue Types (Last 6 months only - for Pie Chart) - Using Total Amount here for simpler categorization overview? 
                    // Or should pie chart also be items only? Usually spending by category implies total spent at that category.
                    // I'll keep it as total amount per venue type for the Pie Chart to keep it consistent with "Where did my money go?"
                    if (monthlyData[monthKey]) {
                         // Pie chart logic: stick to Venue Type for simplicity of "Who got my money" (roughly)
                         // Or should we break it down too? User didn't specify for Pie chart.
                         // Let's keep it simply venue type using total amount.
                        if (!venueTypes[venueType]) venueTypes[venueType] = 0;
                        venueTypes[venueType] += totalAmount;
                    }
                    
                    // Accumulate global fees
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

        function populateFilters(uniqueTypes) {
            const select = document.getElementById('filter-venue-type');
            const currentVal = select.value;
            // Keep first option (All)
            while (select.options.length > 1) {
                select.remove(1);
            }
            uniqueTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                select.appendChild(option);
            });
            if (currentVal) select.value = currentVal;
        }

        function clearFilters() {
            document.getElementById('search').value = '';
            document.getElementById('filter-venue-type').value = '';
            document.getElementById('filter-month').value = '';
            renderOrders();
        }
        
        // Colors for charts
        const COLORS = {
            'restaurant': '#FF6384', // Red/Pink
            'retail': '#36A2EB',     // Blue
            'grocery': '#FFCE56',    // Yellow
            'drugstore': '#4BC0C0',  // Teal
            'alcohol': '#9966FF',    // Purple
            'florist': '#FF9F40',    // Orange
            'home': '#C9CBCF',       // Grey
            'other': '#E7E9ED',
            'delivery': '#607D8B',    // Blue Grey
            'service fee': '#FFC107', // Amber
            'other fees': '#9E9E9E'   // Grey
        };
        
        function getColor(type, index) {
            if (COLORS[type.toLowerCase()]) return COLORS[type.toLowerCase()];
            // Fallback colors
            const palette = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe'];
            return palette[index % palette.length];
        }

        function renderDashboard() {
            try {
                const data = processData();
                populateFilters(data.uniqueVenueTypes);

                // KPIs
                document.getElementById('total-spent-ytd').textContent = data.ytdTotal.toFixed(2);
                document.getElementById('ytd-comparison').textContent = \`vs \${data.lastYearTotal.toFixed(2)} Last Year\`;
                document.getElementById('total-spent-6m').textContent = data.last6MonthsTotal.toFixed(2);
                document.getElementById('avg-monthly').textContent = (data.last6MonthsTotal / 6).toFixed(2);
                
                // Distance Formatting (assuming meters, convert to km)
                // If the value is small (e.g., < 100), maybe it's already km? Wolt API usually meters.
                // Let's assume meters / 1000.
                const toKm = (v) => (v / 1000).toFixed(1);
                document.getElementById('total-distance-ytd').textContent = \`\${toKm(data.ytdDistance)} km\`;
                document.getElementById('distance-comparison').textContent = \`vs \${toKm(data.lastYearDistance)} km Last Year\`;

                document.getElementById('total-delivery-fees').textContent = data.totalDeliveryFees.toFixed(2);
                document.getElementById('total-service-fees').textContent = data.totalServiceFees.toFixed(2);


                // Chart 1: Monthly Trend (Stacked Bar)
                // Need to create a dataset for each venue type found in the monthly data
                const stackedDatasets = data.stackedTypes.map((type, i) => {
                    return {
                        label: type,
                        data: data.monthly.map(m => m.byType[type] || 0),
                        backgroundColor: getColor(type, i),
                        stack: 'combined'
                    };
                });
                
                new Chart(document.getElementById('monthlyTrendChart'), {
                    type: 'bar',
                    data: {
                        labels: data.monthly.map(d => [d.label, d.total.toFixed(2)]),
                        datasets: stackedDatasets
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { 
                            legend: { display: true, position: 'top' }, 
                            title: { display: true, text: 'Spending Trend by Category (Last 6 Months)' },
                            tooltip: {
                                mode: 'index',
                                intersect: false
                            }
                        },
                        scales: {
                            x: { stacked: true },
                            y: { stacked: true }
                        },
                        onClick: (e, elements) => {
                            if (elements.length > 0) {
                                const index = elements[0].index;
                                const monthKey = data.monthsKeys[index];
                                document.getElementById('filter-month').value = monthKey;
                                switchTab('orders');
                                renderOrders();
                            }
                        }
                    }
                });

                // Chart 2: Venue Types
                const venueLabels = Object.keys(data.venueTypes);
                const venueValues = Object.values(data.venueTypes);
                const venueColors = venueLabels.map((l, i) => getColor(l, i));
                
                new Chart(document.getElementById('venueTypeChart'), {
                    type: 'doughnut',
                    data: {
                        labels: venueLabels,
                        datasets: [{
                            data: venueValues,
                            backgroundColor: venueColors
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { title: { display: true, text: 'Total Spending by Category (Last 6 Months)' } }
                    }
                });

                // Chart 3: YTD vs Last Year (Simple Bar)
                new Chart(document.getElementById('yearlyCompChart'), {
                    type: 'bar',
                    data: {
                        labels: ['This Year (YTD)', 'Last Year (Total)'],
                        datasets: [{
                            label: 'Total Spent',
                            data: [data.ytdTotal, data.lastYearTotal],
                            backgroundColor: ['#009de0', '#ccc'],
                            borderRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: 'y',
                        plugins: { legend: { display: false }, title: { display: true, text: 'Yearly Comparison' } }
                    }
                });
            } catch (error) {
                console.error('Error rendering dashboard:', error);
                document.getElementById('dashboard').innerHTML += \`<p style="color:red">Error rendering dashboard: \${error.message}</p>\`;
            }
        }

        function renderOrders() {
            try {
                const tbody = document.querySelector('#orders-table tbody');
                
                const searchText = document.getElementById('search').value.toLowerCase();
                const filterVenueType = document.getElementById('filter-venue-type').value;
                const filterMonth = document.getElementById('filter-month').value; // YYYY-MM

                let count = 0;
                let totalFiltered = 0;

                tbody.innerHTML = '';

                // Sort orders by date desc
                orders.sort((a, b) => getOrderDate(b) - getOrderDate(a));

                orders.forEach(order => {
                    const venue = order.venue_name || 'Unknown';
                    const type = (order.details && order.details.venue_product_line) ? order.details.venue_product_line : 'Other';
                    
                    // Safe items mapping
                    let itemsDisplay = '';
                    if (Array.isArray(order.items)) {
                        itemsDisplay = order.items.map(i => i ? i.name : '').filter(n => n).join(', ');
                    } else if (typeof order.items === 'string') {
                        itemsDisplay = order.items;
                    }

                    const dateObj = getOrderDate(order);
                    const isoDate = !isNaN(dateObj.getTime()) ? dateObj.toISOString().split('T')[0] : 'N/A';
                    const amountStr = order.total_amount || '0';
                    const orderMonth = !isNaN(dateObj.getTime()) ? \`\${dateObj.getFullYear()}-\${String(dateObj.getMonth() + 1).padStart(2, '0')}\` : '';

                    // FILTERS
                    
                    // 1. Text Search (Venue, items, date)
                    if (searchText && 
                        !venue.toLowerCase().includes(searchText) && 
                        !itemsDisplay.toLowerCase().includes(searchText) && 
                        !isoDate.includes(searchText)) {
                        return;
                    }

                    // 2. Venue Type Filter
                    if (filterVenueType && type !== filterVenueType) {
                        return;
                    }

                    // 3. Month Filter
                    if (filterMonth && orderMonth !== filterMonth) {
                        return;
                    }

                    // Status filter (always active)
                    const ignoredStatuses = ['deferred_payment_failed', 'rejected', 'pending_transaction'];
                    if (ignoredStatuses.includes(order.status)) {
                        return;
                    }

                    count++;
                    totalFiltered += parseAmount(amountStr);

                    const tr = document.createElement('tr');
                    
                    tr.innerHTML = \`
                        <td>\${isoDate}</td>
                        <td>\${venue}</td>
                        <td>\${type}</td>
                        <td>\${itemsDisplay}</td>
                        <td>\${amountStr}</td>
                        <td>\${order.status}</td>
                    \`;
                    tbody.appendChild(tr);
                });
                
                document.getElementById('orders-summary').textContent = \`Showing \${count} orders. Total: \${totalFiltered.toFixed(2)}\`;
            } catch (error) {
                console.error('Error rendering orders:', error);
                document.getElementById('orders-summary').textContent = \`Error loading orders: \${error.message}\`;
            }
        }

        // Event Listeners
        document.getElementById('search').addEventListener('input', renderOrders);
        document.getElementById('filter-venue-type').addEventListener('change', renderOrders);
        document.getElementById('filter-month').addEventListener('change', renderOrders);
        
        // Initial render
        renderDashboard();
        renderOrders();
    </script>
</body>
</html>`;
}
