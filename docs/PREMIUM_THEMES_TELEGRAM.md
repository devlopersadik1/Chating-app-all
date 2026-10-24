# Premium UI, Theme Studio, and Telegram Bot Integration Plan

## Visual direction
Talviro Chat should use a premium, polished design system rather than a generic template: considered typography, balanced whitespace, subtle depth, refined gradients, consistent iconography, purposeful motion, and clear hierarchy. Build responsive layouts for compact Android phones, larger phones, tablets, and desktop. Include accessible contrast, touch-friendly controls, and loading/empty/error states.

## User-controlled themes
- Users can choose Light, Dark, System, or a published custom theme.
- Users can select supported accent colors and chat wallpapers/backgrounds.
- User preferences are saved to their account and synchronized across signed-in devices.
- Theme selection must never require downloading executable code.

## Admin Theme Studio
- Authorized admins can create, edit, preview, publish, unpublish, and select the default theme.
- Support a validated color palette and approved assets (wallpaper/logo/background) uploaded through a secured upload endpoint.
- Enforce MIME sniffing, file-size and image-dimension limits, random storage names, and permission checks.
- Never accept or execute uploaded JavaScript, HTML, or arbitrary CSS as a theme.
- User choices should remain available unless an admin explicitly disables a theme; explain what happens to affected users.
- All privileged actions must be audited and enforced on the backend.

## Telegram Bot integration
Plan an optional Telegram bot for operational alerts and carefully scoped admin commands, such as service health summaries, new-report alerts, and notification to authorized operators. Bot token stays only in server environment/secret storage. Verify Telegram webhook secret/token, restrict commands by Telegram user/chat ID and server-side role mapping, rate-limit commands, and write audit logs. Never expose user passwords, authentication tokens, private messages, Firebase credentials, or LiveKit secrets to Telegram. Destructive actions (blocking users, changing roles, mass broadcasts) require strong authorization and preferably confirmation in the secure admin panel.

## Integration principles
Firebase FCM, LiveKit, email/SMS providers, storage, and Telegram can be configured via server-side environment variables or secret references. The admin panel may expose safe settings and connection status, but must never display raw provider secrets. Some account, billing, and project-level settings still require the provider's own console.

## Acceptance criteria
- Theme preview is accurate on phone and desktop.
- Published themes are validated and versioned; user preferences persist across sessions.
- Upload failures, unsupported formats, large files, and unauthorized uploads show clear errors.
- Telegram bot rejects unknown users and unapproved commands.
- Secrets are redacted in logs and responses.
- Every visible control works; no fake/demo buttons in a claimed-complete feature.
- Keep the current SQL migration sequence and update docs whenever a schema or API changes.
