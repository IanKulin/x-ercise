import type Database from "better-sqlite3";

export function seedTestData(db: Database.Database): void {
  const timestamp = new Date().toISOString();

  // Insert test exercise sets
  const insertSet = db.prepare(`
    INSERT INTO exercise_sets (name, slug, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertSet.run(
    "Morning Warm-up",
    "morning-warm-up",
    "A gentle morning routine",
    timestamp,
    timestamp,
  );

  insertSet.run(
    "Another Set",
    "another-set",
    "Another exercise set",
    timestamp,
    timestamp,
  );

  // Get the IDs of the inserted sets
  const morningSet = db
    .prepare("SELECT id FROM exercise_sets WHERE slug = ?")
    .get("morning-warm-up") as { id: number };

  const anotherSet = db
    .prepare("SELECT id FROM exercise_sets WHERE slug = ?")
    .get("another-set") as { id: number };

  // Insert test exercises for morning-warm-up
  const insertExercise = db.prepare(`
    INSERT INTO exercises (set_id, name, image_slug, duration, description, position, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertExercise.run(
    morningSet.id,
    "Stretching",
    "stretching",
    30,
    "Basic stretching exercise",
    1,
    timestamp,
    timestamp,
  );

  insertExercise.run(
    morningSet.id,
    "Jumping Jacks",
    "jumping-jacks",
    45,
    "Cardio warm-up",
    2,
    timestamp,
    timestamp,
  );

  // Insert test exercises for another-set
  insertExercise.run(
    anotherSet.id,
    "Push-ups",
    "pushups",
    60,
    "Upper body exercise",
    1,
    timestamp,
    timestamp,
  );
}
