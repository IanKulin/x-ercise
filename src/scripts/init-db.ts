import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import db from "../db.ts";
import logger from "../logger.ts";
import type { ExerciseSet } from "../types.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Migrates exercise sets from JSON files to the database
 */
function migrateJsonToDatabase(): void {
  // Check if exercise_sets table is already populated
  const countStmt = db.prepare(
    "SELECT COUNT(*) as count FROM exercise_sets",
  );
  const result = countStmt.get() as { count: number };

  if (result.count > 0) {
    logger.info(
      `Database already contains ${result.count} exercise sets. Skipping migration.`,
    );
    return;
  }

  logger.info("Starting migration of JSON files to database...");

  const setsDirectory = path.join(__dirname, "../../data/sets");

  // Check if directory exists
  if (!fs.existsSync(setsDirectory)) {
    logger.warn(`Sets directory not found at ${setsDirectory}`);
    return;
  }

  const files = fs
    .readdirSync(setsDirectory)
    .filter((file) => file.endsWith(".json"));

  if (files.length === 0) {
    logger.info("No JSON files found to migrate.");
    return;
  }

  // Prepare statements for insertion
  const insertSetStmt = db.prepare(`
    INSERT INTO exercise_sets (name, slug, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertExerciseStmt = db.prepare(`
    INSERT INTO exercises (set_id, name, image_slug, duration, description, position, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let migratedSets = 0;
  let migratedExercises = 0;

  for (const file of files) {
    try {
      const filePath = path.join(setsDirectory, file);
      const fileContent = fs.readFileSync(filePath, "utf8");
      const setData = JSON.parse(fileContent) as ExerciseSet;

      const timestamp = new Date().toISOString();

      // Insert exercise set
      const setResult = insertSetStmt.run(
        setData.name,
        setData.slug,
        setData.description,
        timestamp,
        timestamp,
      );

      const setId = setResult.lastInsertRowid as number;
      migratedSets++;

      // Insert exercises
      setData.exercises.forEach((exercise, index) => {
        insertExerciseStmt.run(
          setId,
          exercise.name,
          exercise.imageSlug || null,
          exercise.duration,
          exercise.description,
          index,
          timestamp,
          timestamp,
        );
        migratedExercises++;
      });

      logger.info(
        `Migrated set: ${setData.name} (${setData.exercises.length} exercises)`,
      );
    } catch (error) {
      logger.error(`Error migrating file ${file}:`, error);
    }
  }

  logger.info(
    `Migration complete: ${migratedSets} sets, ${migratedExercises} exercises`,
  );
}

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    migrateJsonToDatabase();
    logger.info("Database initialization complete.");
    process.exit(0);
  } catch (error) {
    logger.error("Database initialization failed:", error);
    process.exit(1);
  }
}

export { migrateJsonToDatabase };
