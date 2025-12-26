import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';
import routes from './routes.js';

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

app.listen(port, () => {
    logger.info(`X-ercise app listening at http://localhost:${port}`);
});
