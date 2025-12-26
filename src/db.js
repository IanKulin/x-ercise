const path = require('path');
const Database = require('better-sqlite3');

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

module.exports = db;
