# Talviro Chat — password reset setup

This repository includes an Android request screen, backend reset endpoints, SMTP configuration examples, a token-table migration, and a static reset page.

## Before enabling it

1. Upload `reset-password.html` to the HTTPS web root (for example, cPanel `public_html/reset-password.html`).
2. Edit the page and replace `https://YOUR_DOMAIN.example/api/v1` with the real API base URL, including `/api/v1`.
3. In the backend server's private `.env`, set `PASSWORD_RESET_URL=https://your-real-domain/reset-password.html`.
4. Set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_SECURE=false`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM_NAME`, and `MAIL_FROM_ADDRESS`. For Gmail, use a Google App Password, not the account password.
5. Install backend dependencies with `npm install` so Nodemailer is installed.
6. Review `database/migrations/0009_password_reset_tokens.sql` and back up the database before running it. Do not run migrations against production without a backup and explicit approval.
7. Confirm the backend can reach Gmail SMTP and that the API is served over HTTPS. Test with a non-critical test account.

## Security notes

- Never commit real SMTP credentials, database credentials, or JWT secrets.
- The API intentionally returns the same response whether an email exists, to reduce account enumeration.
- Reset tokens are random, stored as SHA-256 hashes, expire after 30 minutes, and are single-use.
- The reset endpoint is rate-limited. Review server logs and mail delivery before production use.
- The reset page is a static client. It is not a substitute for the backend validation.
