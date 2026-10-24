# Talviro Chat Frontend

This directory is the Next.js frontend for Talviro Chat. The current page is a premium responsive landing-page and chat-interface **visual prototype**.

## Stack

- Next.js App Router
- React + TypeScript
- CSS design system
- Lucide icons

## Run locally

Requires Node.js 20.9+.

```sh
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment

Set `NEXT_PUBLIC_API_BASE_URL` to the API base URL. Only public configuration belongs in `NEXT_PUBLIC_*` variables. Never add database credentials, JWT secrets, Firebase service-account keys, LiveKit API secrets, or Telegram bot tokens to frontend environment variables.

## Current limitations

The chat content is sample UI and not connected to a live API. Login, persistent messaging, theme publishing, uploads, calls, and notifications are not implemented by this page. These features must be connected to authenticated backend endpoints and tested before release.

## Hosting note

Next.js is not a static HTML-only site. Server-rendered or dynamically hosted Next.js needs a compatible Node.js runtime. Confirm that the target cPanel plan supports the required Node.js version and Next.js process before deployment.


## Authentication milestone

The frontend now has sign-in and registration pages and same-origin Next.js route handlers under `app/api/auth/`. These handlers call the Express authentication API and set the JWT in an HTTP-only, SameSite=Lax cookie rather than returning the token to browser JavaScript.

For local development, start Express on port 4000 (set `PORT=4000` in `backend/.env`) and Next.js on port 3000. Set `TALVIRO_API_BASE_URL=http://127.0.0.1:4000/api/v1` in `frontend/.env.local`. Use the live API origin for that server-side variable in deployment.

The account screen calls the API session-check route. It is only a basic authenticated account landing screen; messaging and profile editing are not implemented yet. Before public production, add CSRF protections for state-changing cookie-authenticated routes, account verification/password recovery, logout/session revocation, and automated security tests.
