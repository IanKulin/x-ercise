# Agent Instructions for `x-ercise`

This document provides instructions for AI agents working on the `x-ercise` codebase.

## About This Project

`x-ercise` is a web application for completing exercise sets. It is built with Node.js and Express.

- **Web Framework**: Express.js
- **Templating**: EJS (`.ejs` files in `views/`)
- **Database**: SQLite (`data/x-ercise.db`), accessed using `better-sqlite3`.
- **Logging**: A custom logger is used, available in `src/logger.js`.
- **Data**: Exercise sets are defined as JSON files in the `data/sets` directory.

## Commands

- **Start the application**: `npm start`
  - This will start the web server on `http://localhost:3000`.
- **Install dependencies**: `npm install`

## Code Organization

- `src/app.js`: The main entry point of the application. It sets up the Express app, middleware, and starts the server.
- `src/routes.js`: Defines all the application routes. It exports a function that takes a logger instance and returns an Express router.
- `src/db.js`: Initializes the SQLite database connection and creates the necessary tables. It exports the `db` connection object.
- `src/logger.js`: Configures and exports the logger instance.
- `views/`: Contains the EJS templates for the UI.
- `public/`: Holds static assets like CSS and client-side JavaScript.
- `data/`: Contains the SQLite database file (`x-ercise.db`) and JSON definitions for exercise sets (`data/sets/*.json`).

## Patterns & Conventions

- **ES Modules**: The project uses ES Modules (`import`/`export` syntax).
- **Routing**: Routes are defined in `src/routes.js` and are passed the logger instance. The main app file `src/app.js` uses the router.
- **Database**: The database is initialized in `src/db.js` and the connection is exported for use in other parts of the application, such as the routes. Database queries are made using `better-sqlite3`.
- **Data Loading**: Exercise sets are loaded from JSON files in `data/sets` on application startup in `src/routes.js`.

## Testing

Using the Node built in test runner

## Guardrails

- You must not run any git commands
