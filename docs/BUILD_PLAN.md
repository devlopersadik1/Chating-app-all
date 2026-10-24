# Talviro Chat — implementation plan

## Product surfaces
- Android app: Java + XML
- Responsive official website and admin/reseller web console
- Node.js + Express API on cPanel
- MySQL
- Socket.IO for real-time events (subject to hosting support)
- Firebase Cloud Messaging for push notifications
- LiveKit Cloud for voice/video rooms and server-issued access tokens

## Milestones
1. Foundation: repository, environment configuration, health checks, schema.
2. Authentication: registration, email/password login, phone OTP provider, session/JWT lifecycle, rate limiting and recovery.
3. Authorization: owner bootstrap process, RBAC permissions, admin MFA, audit logs.
4. User profiles, search, block/report.
5. Private and group messages, message persistence, delivery/read receipts, pagination and media upload constraints.
6. FCM device registration and notification delivery.
7. LiveKit token endpoint, call signaling, incoming-call notification and call lifecycle.
8. Stories/status and privacy controls.
9. Owner/admin/reseller web dashboard backed by real authorized API endpoints.
10. Responsive Android app and optional browser chat client.
11. Automated tests, security review, deployment docs and release packaging.

## Rules
- Every admin action must be checked on the server and recorded in audit logs.
- Never expose service-account private keys, JWT secrets, DB credentials or LiveKit API secrets in the browser, APK or Git history.
- Do not store raw passwords; use a password hash.
- Do not claim end-to-end encryption until a reviewed E2EE protocol is implemented and tested.
- Keep UI labels honest: incomplete features should be marked as planned/disabled.
- Shared hosting can impose limits on WebSockets, background workers, upload sizes and process uptime; verify those capabilities with the hosting provider.
