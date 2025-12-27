import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import logger from "./logger.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, "../data/x-ercise.db");
const db = new Database(dbPath);

// Create the 'completions' table if it doesn't exist
const createCompletionsTable = `
    CREATE TABLE IF NOT EXISTS completions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        set_slug TEXT NOT NULL,
        username TEXT,
        completed_at TEXT NOT NULL
    );
`;
db.exec(createCompletionsTable);

// Create the 'exercise_sets' table
const createExerciseSetsTable = `
    CREATE TABLE IF NOT EXISTS exercise_sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
`;
db.exec(createExerciseSetsTable);

// Create index on slug for faster lookups
db.exec(
  "CREATE INDEX IF NOT EXISTS idx_sets_slug ON exercise_sets(slug);",
);

// Create the 'exercises' table
const createExercisesTable = `
    CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        set_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        image_slug TEXT,
        duration INTEGER NOT NULL,
        description TEXT NOT NULL,
        position INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (set_id) REFERENCES exercise_sets(id) ON DELETE CASCADE
    );
`;
db.exec(createExercisesTable);

// Create indexes for exercises table
db.exec(
  "CREATE INDEX IF NOT EXISTS idx_exercises_set_id ON exercises(set_id);",
);
db.exec(
  "CREATE INDEX IF NOT EXISTS idx_exercises_position ON exercises(set_id, position);",
);

logger.info("Database initialized.");

export default db;
