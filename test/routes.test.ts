import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { app, server } from "../src/app.ts";
import db from "../src/db.ts";
import { seedTestData } from "./seed-test-data.ts";

describe("API Tests", () => {
  before(() => {
    // Seed test data into in-memory database
    seedTestData(db);
  });

  after(() => {
    // Cleanup after all tests run
    db.close();
    server.close();
  });

  describe("GET /", () => {
    it("should return 200 OK and render the home page", async () => {
      const response = await fetch("http://localhost:3000/");
      assert.strictEqual(response.status, 200);
      const body = await response.text();
      assert.ok(body.includes("Choose Your Set"));
    });

    it("should show zero completions when no username is provided", async () => {
      const response = await fetch("http://localhost:3000/");
      const body = await response.text();
      assert.ok(!body.includes("Completed"));
    });

    it("should show completion count for user with history", async () => {
      // Insert test data
      db.prepare(
        "INSERT INTO completions (set_slug, username, completed_at) VALUES (?, ?, ?)",
      ).run("morning-warm-up", "testuser", new Date().toISOString());

      const response = await fetch("http://localhost:3000/?username=testuser");
      const body = await response.text();
      assert.ok(body.includes("Completed"));
      assert.ok(body.includes("times"));

      // Cleanup
      db.prepare("DELETE FROM completions WHERE username = ?").run("testuser");
    });

    it("should show zero completions for user with no history", async () => {
      const response = await fetch("http://localhost:3000/?username=newuser");
      const body = await response.text();
      assert.ok(!body.includes("Completed"));
    });

    it("should show correct data when user completed some sets but not others", async () => {
      // Insert completion for only one set
      db.prepare(
        "INSERT INTO completions (set_slug, username, completed_at) VALUES (?, ?, ?)",
      ).run("morning-warm-up", "partialuser", new Date().toISOString());

      const response = await fetch(
        "http://localhost:3000/?username=partialuser",
      );
      const body = await response.text();

      // Verify both sets appear
      assert.ok(body.includes("Morning Warm-up"));
      assert.ok(body.includes("Another Set"));

      // Verify completion text appears (for the one completed set)
      assert.ok(body.includes("Completed"));

      // Cleanup
      db.prepare("DELETE FROM completions WHERE username = ?").run(
        "partialuser",
      );
    });
  });

  describe("GET /set/:slug", () => {
    it("should return 200 OK and render a valid set", async () => {
      const response = await fetch("http://localhost:3000/set/morning-warm-up");
      assert.strictEqual(response.status, 200);
      const body = await response.text();
      assert.ok(body.includes("Morning Warm-up"));
    });

    it("should return 404 Not Found for an invalid set", async () => {
      const response = await fetch("http://localhost:3000/set/invalid-set");
      assert.strictEqual(response.status, 404);
    });
  });

  describe("POST /completions", () => {
    it("should return 201 Created for a valid completion", async () => {
      const response = await fetch("http://localhost:3000/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ set_slug: "morning-warm-up" }),
      });
      assert.strictEqual(response.status, 201);
      const body = await response.json();
      assert.deepStrictEqual(body, { success: true });
    });

    it("should return 400 Bad Request for a missing set_slug", async () => {
      const response = await fetch("http://localhost:3000/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      assert.strictEqual(response.status, 400);
    });
  });

  describe("GET /admin/sets/:id/export", () => {
    it("should export set as JSON with correct structure", async () => {
      // Get the ID of a test set
      const sets = db.prepare("SELECT id FROM exercise_sets WHERE slug = ?").get("morning-warm-up") as { id: number } | undefined;
      assert.ok(sets, "Test set should exist");

      const response = await fetch(`http://localhost:3000/admin/sets/${sets.id}/export`);
      assert.strictEqual(response.status, 200);

      // Check Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      assert.ok(contentDisposition);
      assert.ok(contentDisposition.includes('attachment'));
      assert.ok(contentDisposition.includes('morning-warm-up.json'));

      const data = await response.json();

      // Verify structure
      assert.strictEqual(typeof data.name, 'string');
      assert.strictEqual(typeof data.slug, 'string');
      assert.ok(Array.isArray(data.exercises));

      // Verify DB fields are excluded
      assert.strictEqual(data.id, undefined);
      assert.strictEqual(data.description, undefined);
      assert.strictEqual(data.created_at, undefined);
      assert.strictEqual(data.updated_at, undefined);

      // Verify exercise structure
      if (data.exercises.length > 0) {
        const exercise = data.exercises[0];
        assert.strictEqual(typeof exercise.name, 'string');
        assert.strictEqual(typeof exercise.duration, 'number');
        assert.strictEqual(typeof exercise.description, 'string');
        assert.strictEqual(typeof exercise.position, 'number');

        // Verify exercise DB fields are excluded
        assert.strictEqual(exercise.id, undefined);
        assert.strictEqual(exercise.set_id, undefined);
        assert.strictEqual(exercise.created_at, undefined);
        assert.strictEqual(exercise.updated_at, undefined);
      }
    });

    it("should return 404 for non-existent set", async () => {
      const response = await fetch("http://localhost:3000/admin/sets/99999/export");
      assert.strictEqual(response.status, 404);
    });

    it("should handle sets with no exercises", async () => {
      // Create a set with no exercises
      const timestamp = new Date().toISOString();
      const result = db.prepare(
        "INSERT INTO exercise_sets (name, slug, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
      ).run("Empty Set", "empty-set", "", timestamp, timestamp);

      const setId = result.lastInsertRowid as number;

      const response = await fetch(`http://localhost:3000/admin/sets/${setId}/export`);
      assert.strictEqual(response.status, 200);

      const data = await response.json();
      assert.strictEqual(data.name, "Empty Set");
      assert.strictEqual(data.slug, "empty-set");
      assert.strictEqual(data.exercises.length, 0);

      // Cleanup
      db.prepare("DELETE FROM exercise_sets WHERE id = ?").run(setId);
    });

    it("should exclude imageSlug when null", async () => {
      // Create a set with an exercise without imageSlug
      const timestamp = new Date().toISOString();
      const setResult = db.prepare(
        "INSERT INTO exercise_sets (name, slug, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
      ).run("Test Set No Image", "test-set-no-image", "", timestamp, timestamp);

      const setId = setResult.lastInsertRowid as number;

      db.prepare(
        "INSERT INTO exercises (set_id, name, image_slug, duration, description, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(setId, "Exercise No Image", null, 30, "Description", 0, timestamp, timestamp);

      const response = await fetch(`http://localhost:3000/admin/sets/${setId}/export`);
      assert.strictEqual(response.status, 200);

      const data = await response.json();
      assert.strictEqual(data.exercises[0].imageSlug, undefined);

      // Cleanup
      db.prepare("DELETE FROM exercise_sets WHERE id = ?").run(setId);
    });
  });

  describe("POST /admin/sets/import", () => {
    it("should import valid JSON file", async () => {
      const json = {
        name: "Test Import",
        slug: "test-import",
        exercises: [
          {
            name: "Exercise 1",
            imageSlug: "ex1",
            duration: 30,
            description: "Test exercise",
            position: 0
          }
        ]
      };

      // Create form data with JSON file
      const boundary = "----WebKitFormBoundary" + Math.random().toString(36);
      const fileContent = JSON.stringify(json);
      const body = [
        `--${boundary}`,
        `Content-Disposition: form-data; name="setFile"; filename="test.json"`,
        `Content-Type: application/json`,
        ``,
        fileContent,
        `--${boundary}--`
      ].join("\r\n");

      const response = await fetch("http://localhost:3000/admin/sets/import", {
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`
        },
        body: body,
        redirect: "manual"
      });

      // Should redirect to admin dashboard
      assert.strictEqual(response.status, 302);
      const location = response.headers.get("location");
      assert.ok(location);
      assert.ok(location.includes("/admin"));
      assert.ok(location.includes("imported=true"));

      // Verify in database
      const set = db.prepare("SELECT * FROM exercise_sets WHERE slug = ?").get("test-import");
      assert.ok(set);

      // Cleanup
      db.prepare("DELETE FROM exercise_sets WHERE slug = ?").run("test-import");
    });

    it("should auto-rename on slug conflict", async () => {
      // Create existing set with slug 'conflict-test'
      const timestamp = new Date().toISOString();
      db.prepare(
        "INSERT INTO exercise_sets (name, slug, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
      ).run("Existing Set", "conflict-test", "", timestamp, timestamp);

      // Import another with same slug
      const json = {
        name: "Conflict Test",
        slug: "conflict-test",
        exercises: [
          {
            name: "Exercise 1",
            duration: 30,
            description: "Test exercise",
            position: 0
          }
        ]
      };

      const boundary = "----WebKitFormBoundary" + Math.random().toString(36);
      const fileContent = JSON.stringify(json);
      const body = [
        `--${boundary}`,
        `Content-Disposition: form-data; name="setFile"; filename="test.json"`,
        `Content-Type: application/json`,
        ``,
        fileContent,
        `--${boundary}--`
      ].join("\r\n");

      const response = await fetch("http://localhost:3000/admin/sets/import", {
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`
        },
        body: body,
        redirect: "manual"
      });

      assert.strictEqual(response.status, 302);
      const location = response.headers.get("location");
      assert.ok(location);
      assert.ok(location.includes("conflict-test-1"));

      // Verify new one is 'conflict-test-1'
      const newSet = db.prepare("SELECT * FROM exercise_sets WHERE slug = ?").get("conflict-test-1");
      assert.ok(newSet);

      // Cleanup
      db.prepare("DELETE FROM exercise_sets WHERE slug IN (?, ?)").run("conflict-test", "conflict-test-1");
    });

    it("should return 400 for missing required fields", async () => {
      const json = {
        name: "Test Import"
        // Missing slug and exercises
      };

      const boundary = "----WebKitFormBoundary" + Math.random().toString(36);
      const fileContent = JSON.stringify(json);
      const body = [
        `--${boundary}`,
        `Content-Disposition: form-data; name="setFile"; filename="test.json"`,
        `Content-Type: application/json`,
        ``,
        fileContent,
        `--${boundary}--`
      ].join("\r\n");

      const response = await fetch("http://localhost:3000/admin/sets/import", {
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`
        },
        body: body
      });

      assert.strictEqual(response.status, 400);
    });

    it("should return 400 for invalid JSON", async () => {
      const boundary = "----WebKitFormBoundary" + Math.random().toString(36);
      const fileContent = "{ invalid json }";
      const body = [
        `--${boundary}`,
        `Content-Disposition: form-data; name="setFile"; filename="test.json"`,
        `Content-Type: application/json`,
        ``,
        fileContent,
        `--${boundary}--`
      ].join("\r\n");

      const response = await fetch("http://localhost:3000/admin/sets/import", {
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`
        },
        body: body
      });

      assert.strictEqual(response.status, 400);
    });

    it("should return 400 for invalid exercise duration", async () => {
      const json = {
        name: "Test Import",
        slug: "test-import",
        exercises: [
          {
            name: "Exercise 1",
            duration: 99999, // Invalid: too large
            description: "Test exercise",
            position: 0
          }
        ]
      };

      const boundary = "----WebKitFormBoundary" + Math.random().toString(36);
      const fileContent = JSON.stringify(json);
      const body = [
        `--${boundary}`,
        `Content-Disposition: form-data; name="setFile"; filename="test.json"`,
        `Content-Type: application/json`,
        ``,
        fileContent,
        `--${boundary}--`
      ].join("\r\n");

      const response = await fetch("http://localhost:3000/admin/sets/import", {
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`
        },
        body: body
      });

      assert.strictEqual(response.status, 400);
    });

    it("should handle exercises without imageSlug", async () => {
      const json = {
        name: "Test Import No Images",
        slug: "test-import-no-images",
        exercises: [
          {
            name: "Exercise 1",
            duration: 30,
            description: "Test exercise without image",
            position: 0
          }
        ]
      };

      const boundary = "----WebKitFormBoundary" + Math.random().toString(36);
      const fileContent = JSON.stringify(json);
      const body = [
        `--${boundary}`,
        `Content-Disposition: form-data; name="setFile"; filename="test.json"`,
        `Content-Type: application/json`,
        ``,
        fileContent,
        `--${boundary}--`
      ].join("\r\n");

      const response = await fetch("http://localhost:3000/admin/sets/import", {
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`
        },
        body: body,
        redirect: "manual"
      });

      assert.strictEqual(response.status, 302);

      // Verify in database
      const set = db.prepare("SELECT * FROM exercise_sets WHERE slug = ?").get("test-import-no-images");
      assert.ok(set);

      const exercises = db.prepare("SELECT * FROM exercises WHERE set_id = ?").all((set as any).id);
      assert.strictEqual(exercises.length, 1);
      assert.strictEqual((exercises[0] as any).image_slug, null);

      // Cleanup
      db.prepare("DELETE FROM exercise_sets WHERE slug = ?").run("test-import-no-images");
    });
  });
});
