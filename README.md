# Wolt CLI Expense Tracker

A CLI tool to track your Wolt expenses by fetching order history and generating interactive HTML reports. Helps you understand the "real" cost of food delivery so we can cry together.

This is a "quick and dirty" implementation mostly to satisfy curiosity and offload most of the code generation to Gemini, don't expect anything smart in the source code.

**Website & live demo:** https://setevik.github.io/wolt-cli/

## Features

- **Incremental Sync**: Fetches only new orders to save time / avoid non-necessary API calls.
- **Local Storage**: Saves order history locally in `~/.wolt-cli/orders.json`.
- **HTML Reports**: A single self-contained, searchable, filterable HTML report: lifetime and yearly totals (compared with the same period last year), monthly chart, fee breakdown, activity calendar, top venues and items, habits, and a full order list. Light and dark mode.
- **Multi-currency**: Orders paid in different currencies are totalled separately, with a currency switcher.
- **CSV Export**: Export order history to CSV for use in spreadsheets.
- **Token Validation**: Validates your API token on save so you know immediately if it's expired.
- **Demo Mode**: `wolt-cli demo` builds a report from realistic made-up data, no account needed.

## Examples

Screenshots come from the demo report (made-up data).

![Summaries](./images/summaries.png)

![Monthly chart](./images/monthly_chart.png)

![Orders](./images/orders.png)

## Installation

Requires Node.js 20.12 or newer.

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
3.  Navigate to the ["Order History" page](https://wolt.com/en/me/order-history).
4.  Find a request to `order_history`.
5.  Copy the value of the `Authorization` header (it starts with `Bearer ...`).

Run the config command:
```bash
wolt-cli config
```
and provide token value when prompted. The token is validated against the Wolt API before saving. To skip validation:
```bash
wolt-cli config --skip-validation
```

Unfortunately, automatic token retrieval is blocked due to Wolt's bot-detection. So you'll need to do this periodically.

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

To generate and open in your browser in one step:
```bash
wolt-cli report --open
```

The report loads Chart.js from jsDelivr to draw its charts; everything else, including your data, is inside the HTML file.

### 4. Try it without an account

Generate a report from realistic, reproducible demo data: a Berlin-based persona paying in EUR, with trips to Prague paid in CZK. Totals always add up to items + delivery fee + service fee.

```bash
wolt-cli demo --open
wolt-cli demo --seed 3 --as-of 2026-06-30 --output demo.html --json demo-orders.json
```

Or without linking the CLI: `npm run demo`.

### 5. Export to CSV

Export your order history to a CSV file for use in Excel, Google Sheets, etc.

```bash
wolt-cli export
wolt-cli export --output my-orders.csv
```

### 6. Check Status

View a quick summary of your local data without generating a report.

```bash
wolt-cli status
```

```
  Wolt CLI Status
  ───────────────────────────────
  Orders stored:     247
  With details:      247/247
  Date range:        2022-03-15 to 2026-01-28
  Total spent:       48231.50 (valid orders)
  Storage size:      4.2 MB
  Storage path:      ~/.wolt-cli/orders.json
```

## Data Location

- **Orders**: `~/.wolt-cli/orders.json`
- **Config**: `~/.wolt-cli/config.json`

## Project Site

The GitHub Pages site lives in `docs/` (Settings → Pages → Deploy from branch → `main` / `docs`).
`docs/demo/index.html` is the demo report; regenerate it after changing the report or the demo generator:

```bash
npm run site                       # demo history ends today
npm run site -- --as-of 2026-09-23 # or pin the end date
```

