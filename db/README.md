# Local database

This folder contains the local SQLite setup for the Camrail RF planning app.

- `schema.sql` is versioned and describes the database structure.
- `seed.mjs` creates `camrail.sqlite` and loads starter data.
- `camrail.sqlite` is ignored by Git so project data stays local.

Run:

```bash
npm run db:seed
```

