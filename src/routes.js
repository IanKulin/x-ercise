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
        res.render('home', { sets: exerciseSets });
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
        const { set_slug } = req.body;

        if (!set_slug) {
            return res.status(400).json({ error: 'set_slug is required' });
        }

        try {
            const completed_at = new Date().toISOString();
            const stmt = db.prepare('INSERT INTO completions (set_slug, completed_at) VALUES (?, ?)');
            stmt.run(set_slug, completed_at);
            res.status(201).json({ success: true });
        } catch (error) {
            logger.error('Database error:', error);
            res.status(500).json({ error: 'Failed to record completion' });
        }
    });

    return router;
};
