# Talviro Chat Android client (Java/XML)

This is the native Android project area for Talviro Chat. It is separate from the backend that will be hosted on cPanel; it is not a consumer website and does not use a Telegram bot.

## Before building
1. Install/open this repository in Android Studio or a compatible Android build environment.
2. In `android/app/build.gradle`, replace `https://YOUR_DOMAIN.example/api/v1/` with the real HTTPS URL for the cPanel API. Do not put passwords, API secrets, or private keys in this file.
3. Connect the existing sign-in flow to save the session token into Android SharedPreferences `talviro_session`, key `access_token`. The current auth implementation has not yet been ported into this native project, so the screens will display a sign-in/session error until that is wired.
4. Ensure database migration `0008_contacts_search_chat_folders.sql` is reviewed and applied to the target database before testing these APIs. Do not apply it to production without a backup and explicit approval.

## Screens included in this step
- `ContactsActivity`: loads the private contact book and can add a contact.
- `ChatFoldersActivity`: lists/creates folders, adds/removes conversations by conversation ID, and lists folder conversation IDs.
- `ApiClient`: HTTPS JSON API helper using a bearer token from SharedPreferences.

## Current limitations
- These screens are a first native integration foundation, not a complete app navigation flow.
- The folder screen currently asks for a conversation ID; the next UI improvement should select from the actual conversation list instead.
- Contacts currently supports adding manually-entered contacts; linking a searched Talviro account, editing/deleting contacts, favorites, and contact sync need later work.
- There is no verified Android build/test in this repository step. Keep API credentials and server secrets out of the APK and GitHub.
