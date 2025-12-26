import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../data/x-ercise.db');
const db = new Database(dbPath);

// Create the 'completions' table if it doesn't exist
const createTable = `
    CREATE TABLE IF NOT EXISTS completions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        set_slug TEXT NOT NULL,
        completed_at TEXT NOT NULL
    );
`;
db.exec(createTable);

console.log('Database initialized.');

export default db;