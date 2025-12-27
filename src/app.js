import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';
import routes from './routes.js';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Set up EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// Set up routes
app.use('/', routes(logger));

const server = app.listen(port, () => {
    logger.info(`X-ercise app listening at http://localhost:${port}`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${port} is already in use. Another instance may be running.`);
        logger.error(`Run "lsof -i :${port}" to find the process, or "pkill -f 'node src/app.js'" to kill it.`);
        process.exit(1);
    } else {
        logger.error('Server error:', err);
        process.exit(1);
    }
});

const shutdown = () => {
    logger.info('Shutting down server...');
    server.close(() => {
        logger.info('Server shut down.');
        db.close();
        logger.info('Database connection closed.');
        process.exit(0);
    });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export { app, server };
