# Talviro Chat Frontend Architecture

## Decision

The web frontend uses **Next.js App Router + React + TypeScript**. Styling is authored in CSS. The API/backend remains **Node.js + Express**. MySQL remains the database. This replaces the earlier standalone HTML Theme Studio/landing-page approach as the target web application architecture.

## Current code added

- `frontend/app/page.tsx`: premium responsive landing page and illustrative chat UI.
- `frontend/app/globals.css`: responsive visual system and UI styling.
- `frontend/app/layout.tsx`: app metadata and root layout.
- `frontend/package.json`: Next.js dependencies and scripts.
- `frontend/next.config.ts`: basic Next.js configuration.
- `frontend/.env.example`: public API URL placeholder only.
- `frontend/README.md`: local setup and limitations.

## Important: not a complete messaging application yet

The current Next.js page is a frontend prototype. It is not connected to login, live conversations, persistent themes, uploads, calls, or push notifications. Those need implementation and tests. The old `web/admin/themes.html` remains a prototype reference, not the production admin panel.

## Next milestones

1. Install dependencies and run `npm run build` in an environment with Node.js and internet/package access.
2. Add typed API client and safe session/auth flow. Prefer secure, HTTP-only cookies through a backend/BFF strategy; never store provider secrets in the browser.
3. Implement sign-up/login UI and connect it to Express auth endpoints.
4. Implement chat list and conversation UI backed by authenticated REST + Socket.IO events.
5. Build the real admin panel and role-checked theme APIs; only authorized roles may save/publish themes.
6. Add validated image upload endpoints and user theme preference persistence.
7. Integrate FCM and LiveKit with server-generated, short-lived call tokens.
8. Add secured Telegram bot integration on the backend only.
9. Test responsive behavior, authorization, validation, abuse/rate limits, accessibility, and release builds.

## Deployment

A production Next.js application commonly needs a compatible Node.js runtime for server rendering. Confirm cPanel supports the required Node.js version and persistent process before deployment. Do not upload or run migrations against the live database until its existing schema is inspected and a backup is taken.
