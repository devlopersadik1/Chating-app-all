# Talviro Chat — cPanel setup and error logging

This document defines the cPanel setup/diagnostics requirements. It is a plan, not an installer; it does not deploy anything or run database migrations.

## Setup assistant

- Check the selected runtime and required versions before installation.
- Check HTTPS, required environment variables, writable storage/log directories, and database connectivity.
- Create only application-owned directories when the hosting account permissions allow it (for example `storage/logs`, `storage/cache`, and configured upload directories).
- Prepare database migrations and show the exact pending migrations. Require an explicit administrator action and a verified backup before applying schema changes.
- Provide a clear pass/fail report with safe remediation steps.
- Never overwrite an existing `.env`, delete user data, or silently reset credentials.

## Error logging and diagnostics

- Write application errors to a private log directory outside the public web root where possible.
- Use timestamps, severity, request/correlation ID, and a safe error message; never log passwords, OTPs, reset tokens, API secrets, authorization headers, or full message contents.
- In production, do not display stack traces or database details to users. Show a generic error and a reference ID.
- Add log rotation/retention guidance and a diagnostics page restricted to authenticated administrators.
- Diagnostics should check API health, database connectivity, storage writability, mail configuration, FCM/LiveKit configuration presence, and recent error counts without revealing secret values.

## cPanel compatibility and security

- Detect the hosting environment instead of assuming every cPanel account supports Node.js or a particular PHP version.
- Keep `.env`, logs, backups, and installer files inaccessible from the public web.
- Use least-privilege database credentials and HTTPS.
- The installer/diagnostics endpoint must be disabled or removed after setup, protected against CSRF and unauthorized access, and must not offer public arbitrary command execution.
- Never run migrations, deploy code, or modify production data without explicit owner approval.

## Implementation status

Requirements recorded; the actual installer, health-check endpoints, private logging configuration, and admin diagnostics still need implementation and testing in the target cPanel environment.