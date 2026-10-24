# Talviro Chat — cPanel-এ Backend আপলোড (বাংলা)

এই নির্দেশিকা বর্তমান Node.js + Express backend-এর জন্য। এটি কোনো deployment বা database migration নিজে থেকে চালায় না।

## 1. আগে Node.js সুবিধা যাচাই করুন
cPanel-এ **Setup Node.js App** বা সমমানের Node.js Application অপশন খুঁজুন। বর্তমান `backend/package.json` Node.js 20 বা তার বেশি চায়। এই সুবিধা না থাকলে এই backend সরাসরি cPanel-এ চালানো যাবে না; PHP/Laravel backend আলাদা করে তৈরি করতে হবে।

## 2. GitHub থেকে ZIP নিন
Repository: https://github.com/devlopersadik1/Chating-app-all
ZIP: https://github.com/devlopersadik1/Chating-app-all/archive/refs/heads/main.zip

ZIP extract করে `backend/` ফোল্ডারের ফাইলগুলো server-এ রাখুন, যেমন:
`/home/CPANEL_USERNAME/talviro-api/`
এটিকে public_html-এর ভেতরে না রাখাই ভালো। পুরো repository upload করা জরুরি নয়।

Backend directory-তে অন্তত এগুলো থাকবে:
- `app.js`
- `package.json`
- `.env.example` (এটি কপি করে `.env` বানাবেন; উদাহরণ ফাইল সরাসরি production config নয়)

## 3. MySQL database তৈরি করুন
cPanel → MySQL Databases থেকে database ও আলাদা database user তৈরি করুন। User-কে ওই database-এ প্রয়োজনীয় privileges দিন। নামগুলো cPanel prefix-সহ হতে পারে। Database-এর নাম, user ও password নিজের নিরাপদ স্থানে রাখুন।

## 4. Environment config
`.env.example`-এর কপি `.env` নামে তৈরি করে নিজের hosting-এর মান বসান:
- `NODE_ENV=production`
- `PORT` — hosting Node.js app যে port দেয়, সেটির নির্দেশনা অনুসরণ করুন
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `JWT_SECRET` — কমপক্ষে 32 অক্ষরের অনন্য random secret
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`
- `MAIL_FROM_NAME`, `MAIL_FROM_ADDRESS`
- `PASSWORD_RESET_URL` — আপনার আসল HTTPS reset page URL
- `MEDIA_STORAGE_DIR` — `public_html`-এর বাইরে private writable folder, যেমন `/home/CPANEL_USERNAME/talviro-private/media`
- `CORS_ORIGIN` — শুধুমাত্র আপনার অনুমোদিত origin; Android app-এর জন্য browser CORS সাধারণত প্রযোজ্য নয়

কোনো secret GitHub-এ commit করবেন না। আগের কোনো secret প্রকাশিত হয়ে থাকলে সেটি rotate করুন।

## 5. Dependencies এবং app চালু
cPanel Node.js App screen-এ application root হিসেবে backend directory, entry file হিসেবে `app.js`, এবং hosting-এর নির্দেশিত Node.js version নির্বাচন করুন। cPanel-এর terminal/setup control থেকে package install করার জন্য hosting-এর নির্দেশনা অনুসরণ করুন (সাধারণত `npm install`)। তারপর app restart করুন।

## 6. Database schema / migrations — সাবধান
এখনো production database-এ কোনো migration চালানো হয়নি। আগে backup নিন এবং migration ফাইলগুলো পড়ে সঠিক ক্রম নিশ্চিত করুন। `database/schema.sql` ও migrations-এ overlap থাকতে পারে; সব SQL অন্ধভাবে একসাথে চালাবেন না। প্রথমে test database-এ schema যাচাই করুন। Owner-এর স্পষ্ট অনুমতি ছাড়া production migration চালাবেন না।

## 7. Media upload সেটআপ

নতুন API route:
- `POST /api/v1/conversations/:id/media` — authenticated multipart upload; field `media_type` (image/video/voice/file), optional `body` caption, এবং `file`। সর্বোচ্চ 20 MB। Metadata field-গুলো file field-এর আগে পাঠাতে হবে।
- `GET /api/v1/media/:messageId` — authenticated conversation members-দের জন্য private media download। URL-টি একা public link নয়; Authorization Bearer token লাগবে।

অনুমোদিত MIME ধরন সীমিত। APK, executable এবং অন্যান্য অজানা file type গ্রহণ করা হয় না। Hosting-এ `MEDIA_STORAGE_DIR` তৈরি করে Node.js process-কে লিখতে দেওয়ার আগে নিশ্চিত করুন যে directory public web root-এর বাইরে।

## 8. Health check
App চালু হলে hosting-এর নির্ধারিত HTTPS URL-এ `/health` খুলে দেখুন। Database check endpoint `/api/v1/health/db` কেবল hosting ও database configuration প্রস্তুত হওয়ার পর পরীক্ষা করুন। Health check সফল হওয়া login/message/upload সব ঠিক থাকার প্রমাণ নয়।

## বর্তমান সীমাবদ্ধতা
- এই নির্দেশিকা কোনো upload/deploy করেনি।
- Node.js support, environment variables, SMTP, database schema, API endpoints এবং Android app এখনো আপনার cPanel-এ end-to-end test করা হয়নি।
- Media API কোড যোগ হয়েছে, কিন্তু hosting permissions, MIME validation, Android multipart client এবং end-to-end tests এখনো যাচাই করা হয়নি। FCM notifications, LiveKit calling এবং admin diagnostics production-ready নয়।
