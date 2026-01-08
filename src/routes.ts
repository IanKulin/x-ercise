import express, { type Request, type Response, type Router } from "express";
import db from "./db.ts";
import type {
  Logger,
  ExerciseSet,
  CompletionData,
  SetWithCompletions,
  CompletionRequestBody,
  ExerciseSetRow,
  ExerciseRow,
} from "./types.ts";

export default (logger: Logger): Router => {
  const router = express.Router();

  // Home page - list all sets
  router.get("/", (req: Request, res: Response) => {
    const username = req.query.username as string | undefined;

    try {
      // Fetch all sets from database with exercise count
      const setsStmt = db.prepare(`
        SELECT
          s.*,
          COUNT(e.id) as exercise_count
        FROM exercise_sets s
        LEFT JOIN exercises e ON s.id = e.set_id
        GROUP BY s.id
        ORDER BY s.created_at DESC
      `);
      const setsData = setsStmt.all() as (ExerciseSetRow & {
        exercise_count: number;
      })[];

      // Transform to ExerciseSet format (without loading all exercises)
      const exerciseSets: ExerciseSet[] = setsData.map((setRow) => ({
        name: setRow.name,
        slug: setRow.slug,
        exercises: [], // We don't need full exercises for home page
      }));

      // Handle unauthenticated users early
      if (!username) {
        const setsWithCompletions: SetWithCompletions[] = exerciseSets.map(
          (set) => ({
            ...set,
            completions: 0,
            last_completed_at: null,
          }),
        );
        return res.render("home", { sets: setsWithCompletions, username });
      }

      // Execute single aggregated query to fetch all completion data
      const stmt = db.prepare(`
        SELECT
          set_slug,
          COUNT(*) as completions,
          MAX(completed_at) as last_completed_at
        FROM completions
        WHERE username = ?
        GROUP BY set_slug
      `);
      const completionData = stmt.all(username) as CompletionData[];

      // Build lookup map for O(1) access during set mapping
      const completionsMap = new Map<string, CompletionData>(
        completionData.map((row) => [row.set_slug, row]),
      );

      // Map over exercise sets and enrich with completion data
      const setsWithCompletions: SetWithCompletions[] = exerciseSets.map(
        (set) => {
          const completion = completionsMap.get(set.slug);

          return {
            ...set,
            completions: completion ? completion.completions : 0,
            last_completed_at:
              completion && completion.last_completed_at
                ? new Date(completion.last_completed_at).toLocaleDateString(
                    "en-AU",
                  )
                : null,
          };
        },
      );

      res.render("home", { sets: setsWithCompletions, username });
    } catch (error) {
      logger.error("Error loading home page:", error);
      res.status(500).send("Error loading exercise sets");
    }
  });

  // Exercise runner page
  router.get("/set/:slug", (req: Request, res: Response) => {
    try {
      // Fetch set by slug
      const setStmt = db.prepare("SELECT * FROM exercise_sets WHERE slug = ?");
      const setRow = setStmt.get(req.params.slug) as ExerciseSetRow | undefined;

      if (!setRow) {
        return res.status(404).send("Set not found");
      }

      // Fetch exercises for this set
      const exercisesStmt = db.prepare(`
        SELECT * FROM exercises
        WHERE set_id = ?
        ORDER BY position ASC
      `);
      const exerciseRows = exercisesStmt.all(setRow.id) as ExerciseRow[];

      // Transform to ExerciseSet interface for compatibility with template
      const set: ExerciseSet = {
        name: setRow.name,
        slug: setRow.slug,
        exercises: exerciseRows.map((ex) => ({
          name: ex.name,
          imageSlug: ex.image_slug || "",
          duration: ex.duration,
          description: ex.description,
        })),
      };

      res.render("set", { set });
    } catch (error) {
      logger.error("Error loading set:", error);
      res.status(500).send("Error loading exercise set");
    }
  });

  // Completion endpoint
  router.post(
    "/completions",
    (req: Request<{}, {}, CompletionRequestBody>, res: Response) => {
      const { set_slug, username } = req.body;

      if (!set_slug) {
        return res.status(400).json({ error: "set_slug is required" });
      }

      try {
        const completed_at = new Date().toISOString();
        const stmt = db.prepare(
          "INSERT INTO completions (set_slug, username, completed_at) VALUES (?, ?, ?)",
        );
        stmt.run(set_slug, username ?? null, completed_at);
        res.status(201).json({ success: true });
      } catch (error) {
        logger.error("Database error:", error);
        res.status(500).json({ error: "Failed to record completion" });
      }
    },
  );

  return router;
};
