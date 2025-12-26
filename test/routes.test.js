import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { app, server } from '../src/app.js';
import db from '../src/db.js';

describe('API Tests', () => {

    before(() => {
        // Optional: Setup before all tests run
        // e.g., seed the database with test data
    });

    after(() => {
        // Cleanup after all tests run
        db.close();
        server.close();
    });

    describe('GET /', () => {
        it('should return 200 OK and render the home page', async () => {
            const response = await fetch('http://localhost:3000/');
            assert.strictEqual(response.status, 200);
            const body = await response.text();
            assert.ok(body.includes('Choose Your Set'));
        });
    });

    describe('GET /set/:slug', () => {
        it('should return 200 OK and render a valid set', async () => {
            const response = await fetch('http://localhost:3000/set/morning-warm-up');
            assert.strictEqual(response.status, 200);
            const body = await response.text();
            assert.ok(body.includes('Morning Warm-up'));
        });

        it('should return 404 Not Found for an invalid set', async () => {
            const response = await fetch('http://localhost:3000/set/invalid-set');
            assert.strictEqual(response.status, 404);
        });
    });

    describe('POST /completions', () => {
        it('should return 201 Created for a valid completion', async () => {
            const response = await fetch('http://localhost:3000/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ set_slug: 'morning-warm-up' }),
            });
            assert.strictEqual(response.status, 201);
            const body = await response.json();
            assert.deepStrictEqual(body, { success: true });
        });

        it('should return 400 Bad Request for a missing set_slug', async () => {
            const response = await fetch('http://localhost:3000/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({}),
            });
            assert.strictEqual(response.status, 400);
        });
    });
});
