# Talviro Chat — Implementation Status

Last updated: 2026-10-24

## Completed in this step

- Added the initial Next.js App Router frontend under `frontend/` with TypeScript, responsive CSS, package scripts, and ESLint configuration.
- Added sign-in and registration screens connected through Next.js server route handlers to the existing Express auth endpoints.
- Added HTTP-only `SameSite=Lax` session cookie handling, a current-session check route, logout route, and a basic account landing screen.
- Added local-development API configuration: Express example port 4000 and Next.js port 3000.
- Confirmed the new authentication/frontend files are present in the GitHub repository. This is a repository-content check, not a successful build or runtime test.

- Added `web/admin/themes.html`, a responsive Theme Studio UI prototype.
- Added four local preview presets: Midnight Aura, Deep Ocean, Orchid Bloom, and Pearl Light.
- Added color/mode controls, local wallpaper preview with image type and 5 MB checks, palette copy, and JSON export.
- Verified that the new file exists in the GitHub repository.

## Important limitations

The Theme Studio is currently a **browser-only prototype**. It does not authenticate an administrator, save themes to MySQL, publish themes, upload wallpaper assets to the server, or synchronize user preferences across devices. Do not treat the prototype as a production admin panel.

## Next implementation sequence

1. Add and test backend role checks before any admin-only endpoint is exposed.
2. Implement authenticated theme APIs using the existing theme and preferences tables from migration `0004_themes_preferences_integrations.sql`.
3. Validate image uploads on the server (allowlisted image MIME types/extensions, size limits, randomized filenames, safe storage outside executable paths, and authorization). Never accept uploaded executable CSS or JavaScript as themes.
4. Implement theme save, preview, publish/unpublish, and default-theme selection.
5. Implement user theme preferences and sync them across devices.
6. Add automated/API tests and document deployment configuration.
7. Continue with chat, messaging, FCM notifications, LiveKit calling, and secured Telegram bot integration in separate milestones.

## Database migration rule

New schema changes must be added as a new, sequentially numbered file in `database/migrations/`. Do not run migrations against the live cPanel database until the existing schema is checked and a backup is available. The migrations in this repository have not been confirmed as applied to the live database.

## Secret-handling rule

Do not commit `.env`, database passwords, Firebase service-account private keys, LiveKit API secrets, or Telegram bot tokens. Keep provider credentials in server-side environment variables only. Any credential previously exposed publicly should be rotated before deployment.


## Latest milestone — frontend authentication foundation

The Next.js login/register pages now call same-origin `/api/auth/*` route handlers. The route handlers forward requests to Express server-side and place the returned JWT into an HTTP-only cookie. Browser JavaScript does not receive the raw token from these handlers.

Before production use, implement CSRF protections for cookie-authenticated state-changing routes, token/session revocation on logout, email verification and password recovery, then run a real dependency install/build and API security tests. No cPanel deployment or database migration was performed in this milestone.
