# Talviro Chat

Premium cross-platform messaging platform project.

## Repository layout
- `backend/` — Node.js + Express API for cPanel hosting
- `database/` — MySQL schema and seed guidance
- `web/` — responsive official website and admin UI starter
- `android/` — Android Java/XML project planning and starter sources (Android Studio/Gradle build required)

## Current implementation status
This repository is being built in phases. The current starter includes the API foundation and schema. Do not consider the product production-ready until authentication, authorization, messaging, calls, uploads, notifications, tests, and deployment configuration are implemented and verified.

## Backend local setup
1. Copy `backend/.env.example` to `backend/.env`.
2. Fill in local database credentials and a long random JWT secret. Never commit `.env`.
3. Run `npm install` inside `backend`.
4. Run `npm start`.
5. Check `/health` and `/api/v1/health/db`.

## cPanel
Use the Node.js application root for the backend, install dependencies with cPanel's Run NPM Install, and configure secrets using cPanel Environment Variables. The main website and admin panel should be deployed separately from the API if your hosting setup requires it.

## Security notes
- Never commit passwords, API secrets, Firebase service-account private keys, or LiveKit API secrets.
- Firebase Admin and LiveKit token generation must remain server-side.
- Admin access must be enforced by backend authorization, not just hidden UI elements.
- Use HTTPS in production and rotate any secret previously exposed in chat or a public repository.
