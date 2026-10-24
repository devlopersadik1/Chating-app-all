# Authentication API (Phase 2)

Base URL: `https://api.talvirochat.sites.bd` (replace if your cPanel API hostname differs).

These endpoints implement email/password accounts. Phone OTP is **not** implemented yet; do not treat a phone number supplied at registration as verified.

## Required server environment

Set these in cPanel's Node.js application environment (never commit real values to GitHub):

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `JWT_SECRET`: a unique random secret of at least 32 characters.
- `JWT_EXPIRES_IN`: optional, defaults to `7d`.
- `CORS_ORIGIN`: comma-separated exact origins allowed to call the API.

Install dependencies in the application root with `npm install`, then restart the Node.js application. Apply `database/schema.sql` to the selected MySQL database before testing.

## POST /api/v1/auth/register

JSON body:

```json
{
  "name": "Test User",
  "username": "test_user_01",
  "email": "test@example.com",
  "password": "use-a-unique-password-here",
  "phone": "+8801XXXXXXXXX"
}
```

The `phone` property is optional and is not verified. Username accepts lowercase letters, numbers and underscores (3–30 characters); password length is 10–72 characters.

Success: HTTP 201 with `user` and a signed bearer `token`. The password and password hash are never returned.

## POST /api/v1/auth/login

JSON body:

```json
{
  "identifier": "test@example.com",
  "password": "use-a-unique-password-here"
}
```

`identifier` may be the registered email or username. Success returns `user` and `token`. Invalid credentials return a generic error. Inactive/blocked accounts cannot log in.

## GET /api/v1/auth/me

Send the token in the HTTP header:

```
Authorization: Bearer YOUR_TOKEN
```

Returns the current active account's public profile.

## Health checks

- `GET /health`
- `GET /api/v1/health/db`

Do not publish real credentials, tokens, service-account keys, or LiveKit secrets in GitHub, APKs, screenshots, or browser JavaScript. Use HTTPS in production. Add email verification, password reset, phone OTP, refresh/revocation strategy, and security tests before calling authentication production-ready.
