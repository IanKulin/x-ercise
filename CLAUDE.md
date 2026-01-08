# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

X-ercise is a web application for timing sets of exercises and tracking when they have been completed. Users can run exercise sets with timed intervals and track their progress over time.

## Tech Stack

- **Runtime**: Node.js with `--experimental-strip-types` flag (native TypeScript execution)
- **Framework**: Express 5 (note: using v5, not v4)
- **Database**: SQLite via better-sqlite3
- **Views**: EJS templates
- **Testing**: Node.js built-in test runner (`node:test`)
- **Type checking**: TypeScript (compile-time only, via `tsc --noEmit`)

## Commands

### Development

```bash
npm start              # Start server (runs on http://localhost:3000)
npm run typecheck      # Run TypeScript type checking
npm test               # Run tests (uses in-memory database)
npm run format         # Format code with Prettier
```

### Testing Specific Scenarios

```bash
# Use in-memory database
DATABASE_PATH=:memory: npm start

# Use custom database file
DATABASE_PATH=/path/to/custom.db npm start

# Run single test file
DATABASE_PATH=:memory: node --experimental-strip-types --test test/routes.test.ts
```

## Architecture

### Database Schema

The application uses three main tables:

1. **exercise_sets**: Stores exercise set metadata (name, slug, timestamps)
2. **exercises**: Stores individual exercises with foreign key to exercise_sets (cascade delete)
3. **completions**: Tracks when users complete sets (set_slug, username, completed_at)

Key constraints:

- `exercise_sets.slug` must be unique
- `exercises.set_id` has cascade delete (deleting set deletes exercises)
- Indexed on: `exercise_sets.slug`, `exercises.set_id`, `exercises.position`

### Database Configuration

The database path is determined by `getDatabasePath()` in src/db.ts:

- Default: `data/x-ercise.db` (production)
- Can be overridden with `DATABASE_PATH` environment variable
- Tests automatically use `:memory:` database (set in package.json)
- Supports absolute paths, relative paths, and special `:memory:` value

### Route Structure

- **src/routes.ts**: Public routes (home page, set viewer, completions API)
  - `GET /` - Home page listing all sets with completion stats
  - `GET /set/:slug` - Exercise runner page
  - `POST /completions` - Record a completion

- **src/routes/admin.ts**: Admin routes for CRUD operations
  - `GET /admin` - Admin dashboard
  - `GET /admin/sets/new` - Create set form
  - `GET /admin/sets/:id/edit` - Edit set form
  - `POST /admin/sets` - Create new set
  - `PUT /admin/sets/:id` - Update existing set
  - `DELETE /admin/sets/:id` - Delete set
  - `POST /admin/exercises/upload` - Upload exercise image

### Data Flow Patterns

**Home Page Query Optimization**: The home page uses a two-query approach to avoid N+1 problems:

1. Fetch all sets with exercise counts via LEFT JOIN
2. Fetch all completions for user in single query, build Map for O(1) lookup
3. Map over sets and enrich with completion data from the Map

**Set Management**: Creating/updating sets is transactional:

1. Insert/update set record
2. Delete all existing exercises (on update)
3. Insert all exercises with position ordering
4. Clean up orphaned exercise images (on update/delete)

### File Upload System

Exercise images are handled by src/middleware/upload.ts:

- Uses multer with disk storage
- Uploads to `public/images/exercises/`
- Two-step process: temp filename → rename to imageSlug
- Validates imageSlug format (alphanumeric, hyphens, underscores only)
- Deletes old images when imageSlug changes
- Max file size: 5MB
- Allowed types: JPEG, PNG, WebP, GIF

### Type System

All types are defined in src/types.ts. Key distinction:

- **Row types** (e.g., `ExerciseSetRow`, `ExerciseRow`): Database schema with all fields including IDs and timestamps
- **Interface types** (e.g., `ExerciseSet`, `Exercise`): Domain models used in views and API responses
- Transformation happens at route layer when querying database

## Testing

Tests use Node's built-in test runner with:

- In-memory database (`:memory:`)
- Test data seeded via `seedTestData()` helper
- HTTP requests to running server
- Cleanup in `after()` hook (close db and server)

When writing tests:

- Use `describe()` and `it()` from `node:test`
- Import `assert` from `node:assert`
- Seed test data before running tests
- Clean up any test-specific data in individual tests
- Remember to close db and server in `after()` hook
