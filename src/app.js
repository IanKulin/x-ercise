const express = require('express');
const path = require('path');
const routes = require('./routes');

const app = express();
const port = 3000;

// Set up EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// Set up routes
app.use('/', routes);

app.listen(port, () => {
    console.log(`X-ercise app listening at http://localhost:${port}`);
});
