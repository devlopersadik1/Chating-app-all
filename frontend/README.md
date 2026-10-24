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
