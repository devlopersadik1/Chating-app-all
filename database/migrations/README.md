# Database migrations

All database changes for Talviro Chat are tracked here as ordered SQL files. Apply them in numeric order to a backup of the target database, using phpMyAdmin or the MySQL CLI. Do not repeatedly run a migration that contains non-idempotent ALTER statements unless its instructions explicitly say it is safe.

## Current order

1. `0001_initial_schema.sql` — baseline users/admin/audit tables.
2. `0002_auth_and_sessions.sql` — email verification and token/session support tables.

For a fresh database, you can instead import `database/schema.sql` as the baseline, then apply only migrations not already included in that baseline. Check each migration's header before running it. Back up the database first.
