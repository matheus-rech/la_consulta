# In-Memory Database Persistence

## Overview

The backend uses an in-memory database for proof of concept. To mitigate data loss on server restarts, an **automatic disk persistence mechanism** has been implemented as a stopgap measure.

## How It Works

### Startup Behavior

When the application starts:
1. The database checks for an existing snapshot file in the `data/` directory
2. If found, it loads all data (users, documents, extractions, annotations)
3. A warning banner is displayed in the logs about the limitations

### Automatic Persistence

Data is automatically persisted to disk in the following scenarios:
- **User Registration**: After a new user is created
- **Document Operations**: After creating or deleting a document
- **Extraction Operations**: After creating or deleting an extraction
- **Annotation Operations**: After creating, updating, or deleting an annotation
- **Shutdown**: When the server is gracefully shut down

### Storage Format

Data is stored in JSON format at `data/db_snapshot.json`:
- All Pydantic models are serialized to JSON
- DateTime objects are converted to ISO format strings
- The file is written atomically (temp file + rename) to prevent corruption

### Recovery

On startup, if a snapshot file exists:
- All data is deserialized back into Python objects
- DateTime strings are converted back to datetime objects
- Index mappings (user_by_email, documents_by_user, etc.) are restored
- Statistics are logged showing recovered data count

## Warnings & Limitations

### ⚠️ Important Warnings

The following warnings are logged on every startup:

```
================================================================================
IMPORTANT: In-memory database is active (proof of concept mode)
Data persistence: Automatic snapshots to disk are enabled as a stopgap measure
Persistence directory: /path/to/data
LIMITATION: In production, migrate to a proper database (PostgreSQL/MongoDB)
WARNING: Disk persistence is NOT a replacement for proper database replication
================================================================================
```

### Limitations

1. **No Transaction Support**: Operations are not atomic across multiple changes
2. **No Concurrent Access**: Multiple server instances will overwrite each other's data
3. **No Backup/Replication**: Single point of failure
4. **Performance**: Entire database is written to disk on every modification
5. **Memory Constraints**: All data must fit in RAM
6. **No Query Optimization**: Linear scans for all queries

## Testing

Run the persistence tests:

```bash
cd backend
poetry run python tests/test_persistence.py
```

## Migration Path

For production deployment, migrate to a proper database:

### Recommended Options

1. **PostgreSQL** (Recommended for structured data)
   - Full ACID compliance
   - Rich query capabilities
   - Excellent for relational data
   - Python library: `psycopg2` or `asyncpg`

2. **MongoDB** (Alternative for document storage)
   - Flexible schema
   - Good for document-oriented data
   - Python library: `motor` (async) or `pymongo`

3. **Cloud Databases**
   - **Supabase**: PostgreSQL with built-in auth
   - **Firebase Firestore**: NoSQL with real-time capabilities
   - **AWS RDS**: Managed PostgreSQL/MySQL

### Migration Checklist

- [ ] Choose database system
- [ ] Set up database infrastructure
- [ ] Create schema/models
- [ ] Implement ORM layer (SQLAlchemy, Tortoise-ORM)
- [ ] Migrate existing data from JSON snapshots
- [ ] Update all CRUD operations
- [ ] Add database migrations (Alembic for PostgreSQL)
- [ ] Update deployment configuration
- [ ] Test thoroughly
- [ ] Deploy and monitor

## File Exclusions

The `data/` directory is excluded from version control via `.gitignore`:

```gitignore
# Backend persistence data
backend/data/
data/
```

This prevents database snapshots from being committed to the repository.

## Environment Variables

You can configure the persistence directory via the database initialization:

```python
# In app/models.py
db = InMemoryDatabase(persistence_dir="custom/path")
```

By default, it uses `"data"` relative to the working directory.

## Troubleshooting

### Data Not Persisting

Check the logs for errors during `db.persist()`:
```
Failed to save database snapshot: [error message]
```

### Data Not Loading on Startup

Check the logs for recovery messages:
```
Database snapshot loaded successfully from data/db_snapshot.json
Recovered: N users, M documents, X extractions, Y annotations
```

If you see:
```
No existing database snapshot found. Starting with empty database.
```

Then no snapshot file exists (this is normal for first run).

### Corrupted Snapshot

If the JSON file is corrupted:
1. Check the logs for parsing errors
2. Inspect `data/db_snapshot.json` manually
3. Delete the file to start fresh (⚠️ data loss)
4. Restore from backup if available

## Performance Considerations

### Write Performance

Currently, the entire database is written on every modification. For production with many writes:
- Consider batching writes
- Implement a write-ahead log (WAL)
- Use a proper database with optimized I/O

### Read Performance

All reads are from memory, so they're fast. However:
- No indexing beyond simple dictionaries
- Linear scans for complex queries
- Memory usage grows with data size

## Security Considerations

1. **File Permissions**: Ensure `data/` directory has appropriate permissions
2. **Sensitive Data**: The JSON file contains password hashes and user data
3. **Backup Encryption**: If backing up snapshots, encrypt them
4. **Access Control**: Restrict access to the `data/` directory

## Next Steps

This persistence mechanism is a **temporary solution**. For production deployment:

1. Migrate to PostgreSQL or MongoDB
2. Implement proper backup and replication
3. Add database migrations
4. Configure connection pooling
5. Set up monitoring and alerts
