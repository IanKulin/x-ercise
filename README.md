# X-ercise

This is a web app for timing 'sets' of exercises and keeping track of when they have been completed.

## Configuration

### Database Path

The application uses SQLite for data storage. By default, the database is stored at `data/x-ercise.db`.

You can override the database location using the `DATABASE_PATH` environment variable:

```bash
# Use default database (data/x-ercise.db)
npm start

# Use in-memory database (useful for testing)
DATABASE_PATH=:memory: npm start

# Use custom database file
DATABASE_PATH=/path/to/custom.db npm start
```

**Note:** Tests automatically use an in-memory database (`:memory:`) to avoid affecting production data.
