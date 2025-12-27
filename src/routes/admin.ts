import express, { type Request, type Response, type Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import db from "../db.ts";
import { upload, isValidImageSlug, deleteExerciseImage } from "../middleware/upload.ts";
import type {
  Logger,
  ExerciseSetRow,
  ExerciseRow,
  ExerciseSetWithExercises,
  CreateSetRequest,
} from "../types.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Validates a slug format (lowercase alphanumeric with hyphens)
 */
function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug);
}

export default (logger: Logger): Router => {
  const router = express.Router();

  // Admin dashboard - list all sets
  router.get("/", (req: Request, res: Response) => {
    try {
      const stmt = db.prepare(`
        SELECT
          s.*,
          COUNT(e.id) as exercise_count
        FROM exercise_sets s
        LEFT JOIN exercises e ON s.id = e.set_id
        GROUP BY s.id
        ORDER BY s.created_at DESC
      `);

      const sets = stmt.all() as (ExerciseSetRow & { exercise_count: number })[];

      res.render("admin/dashboard", { sets });
    } catch (error) {
      logger.error("Error fetching sets:", error);
      res.status(500).send("Error loading dashboard");
    }
  });

  // Render create set form
  router.get("/sets/new", (req: Request, res: Response) => {
    res.render("admin/set-form", { set: null, mode: "create" });
  });

  // Render edit set form
  router.get("/sets/:id/edit", (req: Request, res: Response) => {
    try {
      const setId = parseInt(req.params.id);

      // Fetch set
      const setStmt = db.prepare("SELECT * FROM exercise_sets WHERE id = ?");
      const set = setStmt.get(setId) as ExerciseSetRow | undefined;

      if (!set) {
        return res.status(404).send("Set not found");
      }

      // Fetch exercises
      const exercisesStmt = db.prepare(`
        SELECT * FROM exercises
        WHERE set_id = ?
        ORDER BY position ASC
      `);
      const exercises = exercisesStmt.all(setId) as ExerciseRow[];

      const setWithExercises: ExerciseSetWithExercises = {
        ...set,
        exercises,
      };

      res.render("admin/set-form", { set: setWithExercises, mode: "edit" });
    } catch (error) {
      logger.error("Error fetching set for edit:", error);
      res.status(500).send("Error loading set");
    }
  });

  // Get all sets (API endpoint)
  router.get("/api/sets", (req: Request, res: Response) => {
    try {
      const stmt = db.prepare(`
        SELECT
          s.*,
          COUNT(e.id) as exercise_count
        FROM exercise_sets s
        LEFT JOIN exercises e ON s.id = e.set_id
        GROUP BY s.id
        ORDER BY s.created_at DESC
      `);

      const sets = stmt.all();
      res.json(sets);
    } catch (error) {
      logger.error("Error fetching sets:", error);
      res.status(500).json({ error: "Failed to fetch sets" });
    }
  });

  // Get single set with exercises (API endpoint)
  router.get("/api/sets/:id", (req: Request, res: Response) => {
    try {
      const setId = parseInt(req.params.id);

      // Fetch set
      const setStmt = db.prepare("SELECT * FROM exercise_sets WHERE id = ?");
      const set = setStmt.get(setId) as ExerciseSetRow | undefined;

      if (!set) {
        return res.status(404).json({ error: "Set not found" });
      }

      // Fetch exercises
      const exercisesStmt = db.prepare(`
        SELECT * FROM exercises
        WHERE set_id = ?
        ORDER BY position ASC
      `);
      const exercises = exercisesStmt.all(setId) as ExerciseRow[];

      const setWithExercises: ExerciseSetWithExercises = {
        ...set,
        exercises,
      };

      res.json(setWithExercises);
    } catch (error) {
      logger.error("Error fetching set:", error);
      res.status(500).json({ error: "Failed to fetch set" });
    }
  });

  // Create new set
  router.post("/sets", (req: Request, res: Response) => {
    try {
      const { name, slug, description, exercises } = req.body as CreateSetRequest;

      // Validation
      if (!name || !slug || !description) {
        return res.status(400).json({ error: "Name, slug, and description are required" });
      }

      if (!isValidSlug(slug)) {
        return res.status(400).json({
          error: "Invalid slug format. Use lowercase letters, numbers, and hyphens only"
        });
      }

      if (!exercises || !Array.isArray(exercises) || exercises.length === 0) {
        return res.status(400).json({ error: "At least one exercise is required" });
      }

      // Validate exercises
      for (const exercise of exercises) {
        if (!exercise.name || !exercise.duration || !exercise.description) {
          return res.status(400).json({
            error: "Each exercise must have name, duration, and description"
          });
        }

        if (exercise.duration <= 0 || exercise.duration > 3600) {
          return res.status(400).json({
            error: "Duration must be between 1 and 3600 seconds"
          });
        }

        if (exercise.imageSlug && !isValidImageSlug(exercise.imageSlug)) {
          return res.status(400).json({
            error: "Invalid image slug format"
          });
        }
      }

      const timestamp = new Date().toISOString();

      // Insert set
      const setStmt = db.prepare(`
        INSERT INTO exercise_sets (name, slug, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      const setResult = setStmt.run(name, slug, description, timestamp, timestamp);
      const setId = setResult.lastInsertRowid as number;

      // Insert exercises
      const exerciseStmt = db.prepare(`
        INSERT INTO exercises (set_id, name, image_slug, duration, description, position, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const exercise of exercises) {
        exerciseStmt.run(
          setId,
          exercise.name,
          exercise.imageSlug || null,
          exercise.duration,
          exercise.description,
          exercise.position,
          timestamp,
          timestamp,
        );
      }

      logger.info(`Created set: ${name} (${exercises.length} exercises)`);

      res.status(201).json({
        success: true,
        id: setId,
        message: "Set created successfully"
      });
    } catch (error: any) {
      if (error.code === "SQLITE_CONSTRAINT") {
        return res.status(400).json({ error: "A set with this slug already exists" });
      }
      logger.error("Error creating set:", error);
      res.status(500).json({ error: "Failed to create set" });
    }
  });

  // Update existing set
  router.put("/sets/:id", (req: Request, res: Response) => {
    try {
      const setId = parseInt(req.params.id);
      const { name, slug, description, exercises } = req.body as CreateSetRequest;

      // Validation (same as create)
      if (!name || !slug || !description) {
        return res.status(400).json({ error: "Name, slug, and description are required" });
      }

      if (!isValidSlug(slug)) {
        return res.status(400).json({
          error: "Invalid slug format. Use lowercase letters, numbers, and hyphens only"
        });
      }

      if (!exercises || !Array.isArray(exercises) || exercises.length === 0) {
        return res.status(400).json({ error: "At least one exercise is required" });
      }

      for (const exercise of exercises) {
        if (!exercise.name || !exercise.duration || !exercise.description) {
          return res.status(400).json({
            error: "Each exercise must have name, duration, and description"
          });
        }

        if (exercise.duration <= 0 || exercise.duration > 3600) {
          return res.status(400).json({
            error: "Duration must be between 1 and 3600 seconds"
          });
        }

        if (exercise.imageSlug && !isValidImageSlug(exercise.imageSlug)) {
          return res.status(400).json({
            error: "Invalid image slug format"
          });
        }
      }

      // Check if set exists
      const checkStmt = db.prepare("SELECT id FROM exercise_sets WHERE id = ?");
      const existingSet = checkStmt.get(setId);

      if (!existingSet) {
        return res.status(404).json({ error: "Set not found" });
      }

      const timestamp = new Date().toISOString();

      // Update set
      const updateSetStmt = db.prepare(`
        UPDATE exercise_sets
        SET name = ?, slug = ?, description = ?, updated_at = ?
        WHERE id = ?
      `);
      updateSetStmt.run(name, slug, description, timestamp, setId);

      // Get existing exercises to handle image cleanup
      const existingExercisesStmt = db.prepare("SELECT image_slug FROM exercises WHERE set_id = ?");
      const existingExercises = existingExercisesStmt.all(setId) as ExerciseRow[];

      // Delete all existing exercises (will re-insert)
      const deleteExercisesStmt = db.prepare("DELETE FROM exercises WHERE set_id = ?");
      deleteExercisesStmt.run(setId);

      // Clean up images that are no longer used
      const newImageSlugs = new Set(exercises.map(e => e.imageSlug).filter(Boolean));
      for (const ex of existingExercises) {
        if (ex.image_slug && !newImageSlugs.has(ex.image_slug)) {
          deleteExerciseImage(ex.image_slug);
        }
      }

      // Insert updated exercises
      const exerciseStmt = db.prepare(`
        INSERT INTO exercises (set_id, name, image_slug, duration, description, position, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const exercise of exercises) {
        exerciseStmt.run(
          setId,
          exercise.name,
          exercise.imageSlug || null,
          exercise.duration,
          exercise.description,
          exercise.position,
          timestamp,
          timestamp,
        );
      }

      logger.info(`Updated set: ${name} (${exercises.length} exercises)`);

      res.json({
        success: true,
        message: "Set updated successfully"
      });
    } catch (error: any) {
      if (error.code === "SQLITE_CONSTRAINT") {
        return res.status(400).json({ error: "A set with this slug already exists" });
      }
      logger.error("Error updating set:", error);
      res.status(500).json({ error: "Failed to update set" });
    }
  });

  // Delete set
  router.delete("/sets/:id", (req: Request, res: Response) => {
    try {
      const setId = parseInt(req.params.id);

      // Get exercises to clean up images
      const exercisesStmt = db.prepare("SELECT image_slug FROM exercises WHERE set_id = ?");
      const exercises = exercisesStmt.all(setId) as ExerciseRow[];

      // Delete set (exercises will cascade delete)
      const deleteStmt = db.prepare("DELETE FROM exercise_sets WHERE id = ?");
      const result = deleteStmt.run(setId);

      if (result.changes === 0) {
        return res.status(404).json({ error: "Set not found" });
      }

      // Clean up exercise images
      for (const exercise of exercises) {
        if (exercise.image_slug) {
          deleteExerciseImage(exercise.image_slug);
        }
      }

      logger.info(`Deleted set ID: ${setId}`);

      res.json({
        success: true,
        message: "Set deleted successfully"
      });
    } catch (error) {
      logger.error("Error deleting set:", error);
      res.status(500).json({ error: "Failed to delete set" });
    }
  });

  // Upload exercise image
  router.post("/exercises/upload", upload.single("image"), (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const imageSlug = req.body.imageSlug;

      if (!imageSlug || !isValidImageSlug(imageSlug)) {
        // Delete the temp file
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Valid imageSlug is required" });
      }

      // Rename file from temp name to proper imageSlug name
      const ext = path.extname(req.file.filename);
      const newFilename = `${imageSlug}${ext}`;
      const oldPath = req.file.path;
      const newPath = path.join(path.dirname(oldPath), newFilename);

      // Delete old file with same imageSlug if it exists
      deleteExerciseImage(imageSlug);

      // Rename temp file to proper name
      fs.renameSync(oldPath, newPath);

      logger.info(`Uploaded exercise image: ${newFilename}`);

      res.json({
        success: true,
        filename: newFilename,
        path: `/images/exercises/${newFilename}`,
        imageSlug: imageSlug,
      });
    } catch (error) {
      logger.error("Error uploading image:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  return router;
};
