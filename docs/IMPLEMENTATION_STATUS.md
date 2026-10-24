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


## Latest milestone — first text-chat implementation

- Added authenticated Express endpoints for public user search, conversation listing/creation, message history, and sending text messages.
- Conversation and message access is checked against active conversation membership; direct conversations are blocked if either participant has blocked the other.
- Added Next.js server-side proxy routes so the browser calls same-origin chat endpoints while the session JWT stays in an HTTP-only cookie.
- Added the first responsive chat screen at `/chat`, with people search, direct conversation creation, message history, and text sending.
- Added a GitHub Actions workflow to run backend syntax checks and a Next.js production build on pushes and pull requests.

**Not yet verified:** the CI workflow has been committed but its run result has not been checked. No live database connection, live API test, migration, or cPanel deployment was performed. Real-time delivery, unread/read receipts, file/media uploads, group UI, FCM, LiveKit, and E2EE remain future work.


## Latest milestone — message receipts

- Opening message history marks incoming messages as delivered/read for the signed-in conversation member.
- Outgoing message history includes delivery/read counts; the web chat refreshes messages and conversation list every five seconds and displays Sent, Delivered, or Seen.
- This is polling, not WebSocket real-time. Requires migration `0003_chat_schema.sql` to be applied after checking and backing up the database.
- CI/build, live database, and cPanel deployment have not been verified or performed.


## Latest milestone — floating Talviro AI assistant

- Added a floating round assistant launcher globally through the root layout, so it appears across frontend pages.
- Added an assistant panel with suggested prompts, message history for the current open panel, loading/error states, and a server-side provider route.
- The AI provider is optional and not yet configured. Set `TALVIRO_AI_API_URL`, `TALVIRO_AI_API_KEY`, and `TALVIRO_AI_MODEL` in the frontend server environment; keep the key private and never use a `NEXT_PUBLIC_` variable for it.
- No frontend production build or live provider request has been verified. Until the provider settings are configured, the assistant endpoint intentionally returns a setup message.


## Latest milestone — channels, groups, and sponsored placements schema

- Added migration `0005_channels_groups_sponsored_ads.sql` for public/private channels and groups, membership roles and join approval, posts and media metadata, views, reactions, comments, and separately moderated sponsored campaigns/impressions.
- Sponsored campaigns are not automatically displayed: a future API must serve only approved campaigns within their active dates.
- The Talviro AI floating assistant is now mounted on the home page only, not globally on every page.
- This is a schema foundation only. Channel/group UI, API endpoints, admin ad review, targeting controls, billing, and analytics still need implementation.
- Do not apply migration 0005 to the live cPanel database until the existing schema is inspected and a backup is verified.


## Latest milestone — profile, stories, stars, premium, payments, and storage schema

- Added migration `0006_profiles_stories_stars_premium_payments_storage.sql` for profile/privacy settings, expiring stories and views, saved messages, a stars ledger, premium plans/subscriptions, payment transactions and idempotent webhook event records, a user media library, and admin audit events.
- Payment schema is provider-neutral. No payment gateway is configured and no payment can be accepted until server-side provider integration, signed webhook verification, idempotent processing, and refund/error handling are implemented.
- Downloading to a device's public Downloads/Talviro Chat folder requires Android-side download and MediaStore/Storage Access Framework implementation; this database migration does not implement device downloads.
- Admin control still requires authorization checks on every admin API, server-side audit logging, and an owner recovery policy. A schema table alone does not grant or enforce admin permissions.
- These are schema foundations only. No migration was run against the live cPanel database. Inspect the existing schema and verify a backup before applying migrations.


## Latest milestone — configurable monetization and subscriber-only features

- Added migration `0007_monetization_subscriptions_entitlements.sql`: feature entitlements, plan-to-feature mapping, time-bounded user grants, paid channel subscription plans, subscriber-only post access, creator earnings ledger, payout requests, referral codes/attributions, and user ad preferences.
- This creates a configurable foundation for subscription tiers: the server can later grant features only while a valid subscription/entitlement is active. It does not yet enforce these entitlements in API routes or process payments/payouts.
- Monetization options represented in the schema include premium subscriptions, paid channel subscriptions, stars-related creator earnings, ad revenue accounting, and referral rewards. Actual provider APIs, fraud checks, tax/compliance rules, refunds, payout provider, and admin review workflows still need implementation.
- No payment gateway has been selected or activated. Do not store payment secrets in the repository or trust client-side payment success. Verify signed provider webhooks server-side and make fulfillment idempotent.
- No live database migration or deployment was performed. Apply only after schema compatibility review and a verified backup.

## Latest milestone — authenticated channel/group API foundation

- Added authenticated endpoints to create a channel or group, list the signed-in user's spaces, discover public spaces, join public spaces (including pending membership when approval is required), list posts for active members, and create text-only posts.
- Space creation creates the owner membership in a transaction. Channel posting and admin-only group posting are restricted by membership role. Private spaces are not shown in public discovery and cannot be joined through the public join endpoint.
- Username format is validated and duplicate public usernames return a conflict response. API queries use bound parameters for user-supplied values.
- This milestone depends on migration `0005_channels_groups_sponsored_ads.sql`; it has **not** been run on cPanel. No live database/API test has been performed, and the new JavaScript has not yet been confirmed by CI.
- Still missing: membership approval/rejection and role-management endpoints, leave/ban/remove-member flows, channel/group native Android UI, public post reading without joining, post edits/deletes/reactions/comments/views, media uploads, admin sponsored-campaign review/delivery, automated route tests, and a confirmed build result.
- The Android native starter remains a separate incomplete foundation: the API URL is still a placeholder, login/session wiring is missing, and an APK build has not been verified.

## Next checks before production

1. Confirm GitHub Actions syntax/build checks for the latest commit and fix any failures.
2. Add automated tests for access control and channel/group membership transitions.
3. Implement moderation/approval and admin authorization before sponsored campaigns can be served.
4. Add Android XML screens for login/session, channel discovery, channel/group creation, and post feeds.
5. Review schema compatibility and verify backups before any cPanel migration. No deployment or live migration is authorized by this milestone.

## Android Home screen milestone — four primary tabs

- Replaced the basic home shortcuts with four primary navigation actions: **Chats, Status, Calls, Contacts**.
- Chats is the initial selected panel; Chat Folders remains a separate action inside Chats. Contacts opens the existing ContactsActivity.
- Status and Calls currently show honest placeholder copy. Story APIs/UI and LiveKit call history/flows are not yet connected.
- Updated `MainActivity.java` and `activity_main.xml`; source files were fetched again after commit to confirm the expected tab IDs and click handlers exist.
- Build status: **not verified**. No Android SDK/Gradle build or device test was run in this step. The configured API base URL remains a placeholder and login/session wiring remains incomplete.
