import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';

export default (logger) => {
    const router = express.Router();

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const setsDirectory = path.join(__dirname, '../data/sets');
    const exerciseSets = [];

    // Pre-load exercise sets on startup
    fs.readdirSync(setsDirectory).forEach(file => {
        if (path.extname(file) === '.json') {
            const filePath = path.join(setsDirectory, file);
            const fileContent = fs.readFileSync(filePath, 'utf8');
            exerciseSets.push(JSON.parse(fileContent));
        }
    });

    // Home page - list all sets
    router.get('/', (req, res) => {
        const username = req.query.username;

        // Handle unauthenticated users early
        if (!username) {
            const setsWithCompletions = exerciseSets.map(set => ({
                ...set,
                completions: 0,
                last_completed_at: null
            }));
            return res.render('home', { sets: setsWithCompletions, username });
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
        const completionData = stmt.all(username);

        // Build lookup map for O(1) access during set mapping
        const completionsMap = new Map(
            completionData.map(row => [row.set_slug, row])
        );

        // Map over exercise sets and enrich with completion data
        const setsWithCompletions = exerciseSets.map(set => {
            const completion = completionsMap.get(set.slug);

            return {
                ...set,
                completions: completion ? completion.completions : 0,
                last_completed_at: completion && completion.last_completed_at
                    ? new Date(completion.last_completed_at).toLocaleDateString('en-AU')
                    : null
            };
        });

        res.render('home', { sets: setsWithCompletions, username });
    });

    // Exercise runner page
    router.get('/set/:slug', (req, res) => {
        const set = exerciseSets.find(s => s.slug === req.params.slug);
        if (set) {
            res.render('set', { set });
        } else {
            res.status(404).send('Set not found');
        }
    });

    // Completion endpoint
    router.post('/completions', (req, res) => {
        const { set_slug, username } = req.body;

        if (!set_slug) {
            return res.status(400).json({ error: 'set_slug is required' });
        }

        try {
            const completed_at = new Date().toISOString();
            const stmt = db.prepare('INSERT INTO completions (set_slug, username, completed_at) VALUES (?, ?, ?)');
            stmt.run(set_slug, username, completed_at);
            res.status(201).json({ success: true });
        } catch (error) {
            logger.error('Database error:', error);
            res.status(500).json({ error: 'Failed to record completion' });
        }
    });

    return router;
};
