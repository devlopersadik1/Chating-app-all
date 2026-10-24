# Talviro Chat — Quality and Implementation Standards

This document is the project-wide acceptance checklist. A feature is not considered complete merely because its screen exists.

## Architecture rules

- Android client: Java + XML; keep UI, networking, data models, and call/chat logic separated.
- Backend: Node.js + Express; validate all inputs server-side and use parameterized SQL.
- Database: MySQL/InnoDB, utf8mb4, foreign keys and indexes where appropriate. Every schema change gets an ordered SQL migration in `database/migrations/`.
- Web UI: responsive semantic HTML/CSS/JavaScript; no provider secrets or privileged authorization decisions in browser code.
- Firebase FCM: notification delivery only; server credentials remain on the server.
- LiveKit: server generates short-lived room tokens after checking the user's permission; API secret must never reach the client.
- Keep API response shapes and route names documented. Do not silently break existing endpoints.

## Feature completion definition

A feature is complete only when all applicable items pass:
1. Database migration exists and includes necessary constraints/indexes.
2. API validates input, checks authentication and authorization, handles expected errors, and avoids leaking secrets.
3. UI includes loading, empty, success, validation-error, network-error, and retry states.
4. The feature is connected to real APIs, not just mock data.
5. Authorization is enforced by the backend, not only by hiding UI controls.
6. Tests or reproducible manual test steps are documented.
7. Mobile and desktop layouts are reviewed.
8. Accessibility basics are present: readable contrast, clear labels, and touch targets.
9. Logs exclude passwords, bearer tokens, private keys, and sensitive message contents.
10. Docs and example environment configuration are updated.

## Security baseline

- Never commit real `.env` files, database passwords, Firebase service-account private keys, JWT secrets, or LiveKit secrets.
- Use bcrypt password hashing, HTTPS in production, strict CORS allowlists, request-size limits, and rate limits on authentication endpoints.
- Use parameterized SQL; do not build SQL from user-provided strings.
- Do not allow users to set their own role or account status through public registration.
- Admin/reseller roles must be checked on every privileged backend route.
- Protect uploads by size/type limits, randomized storage names, and authorization checks.
- Treat user-supplied text/media as untrusted.
- E2EE must not be claimed until key management, device behavior, recovery limits, and security review are actually implemented.

## Release gates

- Static syntax checks pass.
- Fresh database installation and upgrade migrations are tested separately.
- Authentication and authorization tests pass.
- Negative cases are tested (wrong password, duplicate account, expired/invalid token, blocked account, unauthorized admin action, invalid upload).
- API health and database health checks pass on the target hosting environment.
- A clean setup from the README is reproducible.
- ZIP release contains source and safe example configuration only; no real secrets, caches, or dependency folders.
- State clearly which features are complete, partial, and planned.

## Design system direction

- Premium, calm visual hierarchy; consistent spacing, typography, icon style, radii, and component states.
- Dark and light themes with accessible contrast.
- Responsive layouts for small Android screens, tablets, and desktop.
- Reusable design tokens/components rather than styling each page independently.
- Avoid decorative controls that do nothing; every visible action must work or be clearly disabled with an explanation.
