# Talviro Chat — Telegram-style feature parity roadmap

Goal: build an original Talviro product with a similarly broad feature set, not copy Telegram's proprietary server implementation, branding, or protected assets. Feature work is incremental; every item must be implemented, tested and secured before being called complete.

## Core discovery and contact experience
- Phone-number contact sync with explicit Android permission and consent, normalized numbers, privacy-safe matching, invite links, manual contacts, contact notes, favorites, block/report.
- Global search for usernames, people, chats, messages, public groups/channels and public posts, with filters and pagination.
- Phone-number visibility, who-can-find-me controls, username privacy, profile visibility and last-seen exceptions.
- Multiple accounts, account switching, active sessions/devices, session revocation, passkeys/2-step verification, account export/deletion.

## Chats and messaging
- Private chats, groups, large groups/supergroups, channels, linked discussion groups and communities.
- Text, photos, videos, files, voice notes, video messages, live locations, contacts, polls/quizzes, checklists, links and supported rich text.
- Reply/quote, forward, edit, delete-for-me/delete-for-everyone, pin, reactions, mentions, hashtags, message links, scheduled/repeated/silent messages, drafts, saved messages, bookmarks, per-chat themes.
- Sent/delivered/read states, typing/presence, unread markers, mute, archive, pin/reorder, custom folders and folder links.
- Media/file search, shared-media tabs, download manager, retention limits, upload validation, malware scanning hooks and storage quotas.
- Topics/threads, slow mode, join requests, invite links, granular member/admin permissions, ownership transfer, anti-spam, moderation queues and audit logs.

## Stories, social and creator tools
- Stories with expiry, audiences, close-friends/selected audiences, reactions, replies, view lists, albums and privacy settings.
- Channel posts, comments/discussion links, polls, suggested posts, scheduling, statistics, public-post discovery and translation hooks.
- Gifts/stickers/emoji/GIF search, sticker packs, profile customization, music/profile tabs and collectible items only if legally and technically supported.
- Bot API, bot permissions, webhooks, chat automation, Mini Apps/web apps, deep links, share-to-story integrations and anti-abuse controls.

## Voice/video and real-time
- 1:1 voice/video, group calls, call signaling, join/leave, incoming-call UI, call history, notification actions, device selection and reconnect logic.
- LiveKit token issuance only from the authenticated server; never put LiveKit API secrets in the app.
- FCM registration, token rotation, notification preferences, delivery retries and safe notification payloads.
- WebSocket/Socket.IO real-time events only if hosting supports persistent connections; polling fallback otherwise.
- E2EE is a separate audited milestone; do not advertise it before a reviewed protocol and tested implementation.

## Monetization and subscriber-gated access
- Free/Premium tiers, configurable entitlements/limits, paid channel subscriptions, subscriber-only posts, Stars/gifts, sponsored placements, creator revenue accounting, payout requests, referral/affiliate rewards, receipts, refunds and admin review.
- Payments must use a selected provider and verified server-side signed webhooks, idempotency, fraud controls and audit logs. Never trust client-side payment success.
- Sponsored content must be clearly labelled and moderated; ad personalization must respect consent and local law.
- Subscriber-only access is enforced by the API on every protected read/write, not merely hidden in the UI. Expired/refunded/cancelled plans revoke access consistently.
- Payment methods, creator payouts, taxes and digital-goods rules depend on provider and country availability; do not claim they are active until configured and tested.

## Platform, admin and quality
- Android Java/XML app, responsive web client, account settings, accessibility, localization, dark/light/premium themes, offline/error/loading states.
- Owner/admin/moderator/support roles with server-side RBAC, MFA, audit trail, review queues, abuse reports, rate limits, backup/restore and operational metrics.
- Automated API/security tests, migration compatibility checks, privacy review, performance/load tests, Play release signing and deployment/rollback docs.

## Current next milestone
Migration `0008_contacts_search_chat_folders.sql` adds schema for personal contacts/notes/favorites, chat folders and per-chat archive/pin/mute/unread/theme preferences. It is schema only; contact sync/search endpoints, Android permission flow and UI still need implementation. No production migration has been run.
