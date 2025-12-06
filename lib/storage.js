import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const STORAGE_DIR = path.join(os.homedir(), '.wolt-cli');
const ORDERS_FILE = path.join(STORAGE_DIR, 'orders.json');

async function ensureStorageDir() {
    try {
        await fs.access(STORAGE_DIR);
    } catch {
        await fs.mkdir(STORAGE_DIR, { recursive: true });
    }
}

export async function getOrders() {
    await ensureStorageDir();
    try {
        const data = await fs.readFile(ORDERS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

export async function clearOrders() {
    try {
        await fs.unlink(ORDERS_FILE);
        console.log('Local state cleared.');
    } catch (error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }
}

export async function saveOrders(orders, silent = false) {
    await ensureStorageDir();
    await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));
    if (!silent) {
        console.log(`Saved ${orders.length} orders to ${ORDERS_FILE}`);
    }
}
