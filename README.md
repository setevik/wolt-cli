# Wolt CLI Expense Tracker

A CLI tool to track your Wolt expenses by fetching order history and generating interactive HTML reports.

## Features

- **Incremental Sync**: Fetches only new orders to save time.
- **Local Storage**: Saves order history locally in `~/.wolt-cli/orders.json`.
- **HTML Reports**: Generates a searchable, filterable HTML report with spending summaries.

## Examples

(too embarrassed to show real numbers, so just some generated numbers for illustration)

![Summaries](./images/summaries.png)

![Monthly chart](./images/monthly-chart.png)

![Orders](./images/orders.png)

## Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd wolt-cli
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Link the CLI globally (optional):
    ```bash
    npm link
    ```

## Usage

### 1. Configuration

You need your Wolt Authorization token.
1.  Log in to Wolt in your browser.
2.  Open Developer Tools (Network tab).
3.  Navigate to [https://wolt.com/en/me/order-history]("Order History" page).
4.  Find a request to `order_history`.
5.  Copy the value of the `Authorization` header (it starts with `Bearer ...`).

Run the config command:
```bash
wolt-cli config
```
and provide token value when prompted.

Unfortunately, automatic token retrieval blocked due to Wolt's bot-detection. Do you'll need to do this periodically.

### 2. Sync Orders

Fetch your order history and save it locally.

```bash
wolt-cli sync
```

To force a full re-sync (delete local cache and fetch everything again):
```bash
wolt-cli sync --force
```

### 3. Generate Report

Generate an HTML report from your local data.

```bash
wolt-cli report --output expenses.html
```

Then open `expenses.html` in your browser.

## Data Location

- **Orders**: `~/.wolt-cli/orders.json`
- **Config**: `~/.wolt-cli/config.json`
