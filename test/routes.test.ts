import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { app, server } from "../src/app.ts";
import db from "../src/db.ts";

describe("API Tests", () => {
  before(() => {
    // Optional: Setup before all tests run
    // e.g., seed the database with test data
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
});
