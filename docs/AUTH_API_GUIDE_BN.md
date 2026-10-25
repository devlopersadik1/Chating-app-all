# Talviro Chat — Login ও Registration API (বাংলা)

এই ডকুমেন্ট backend-এর বর্তমান route-এর সঙ্গে মিলিয়ে লেখা। এটি UI তৈরি বা deploy করে না।

API base URL: আপনার cPanel Node.js app-এর আসল HTTPS URL-এর শেষে `/api/v1` যোগ করুন। উদাহরণ URL কেবল উদাহরণ—আপনার আসল domain দিয়ে বদলাতে হবে।

## Login

`POST /auth/login`

Header:
```
Content-Type: application/json
```

Body:
```json
{
  "identifier": "user@example.com",
  "password": "your-password"
}
```

`identifier`-এ email অথবা username পাঠাতে হয়। বর্তমান backend phone OTP login দেয় না। সফল হলে response-এ `status`, `user`, এবং `token` আসে।

## Registration

`POST /auth/register`

Body:
```json
{
  "name": "Your Name",
  "username": "your_name",
  "email": "user@example.com",
  "phone": "+8801XXXXXXXXX",
  "password": "use-a-strong-password"
}
```

নিয়ম:
- নাম 2–100 অক্ষর।
- username 3–30 অক্ষর; ছোট হাতের ইংরেজি অক্ষর, সংখ্যা এবং underscore।
- বৈধ email দরকার।
- password 10–72 অক্ষরের মধ্যে।
- phone ঐচ্ছিক।

## Current user

Login response-এর token দিয়ে:

`GET /auth/me`

Header:
```
Authorization: Bearer YOUR_LOGIN_TOKEN
```

Token-টি URL, screenshot, public issue বা GitHub commit-এ দেবেন না। Browser app-এ production session-এর জন্য HttpOnly Secure cookie সাধারণত localStorage-এ দীর্ঘমেয়াদি token রাখার চেয়ে ভালো; cookie ব্যবহার করলে backend-এ cookie/CSRF support আলাদা করে বাস্তবায়ন করতে হবে।

## Frontend TypeScript উদাহরণ

```ts
type LoginResponse = {
  status: "ok";
  message: string;
  user: {
    id: number;
    name: string;
    username: string;
    email: string;
  };
  token: string;
};

export async function login(
  apiBase: string,
  identifier: string,
  password: string
): Promise<LoginResponse> {
  const response = await fetch(`${apiBase}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Login failed"
    );
  }
  return data as LoginResponse;
}
```

`apiBase`-এর শেষে `/api/v1` থাকতে হবে। যেমন: `https://YOUR_REAL_API_HOST/api/v1`। `YOUR_REAL_API_HOST`-কে আসল host দিয়ে বদলান।

## পরীক্ষা করার ক্রম
1. প্রথমে `GET /health` খুলে API চালু আছে কি না দেখুন।
2. Database setup সম্পন্ন হলে `GET /api/v1/health/db` পরীক্ষা করুন।
3. Test database-এ একটি account register করুন।
4. সেই account দিয়ে login করে token response পান।
5. `GET /api/v1/auth/me`-এ Bearer token পাঠিয়ে যাচাই করুন।
6. ভুল password দিলে `401` আসা উচিত।

এগুলো নির্দেশনা; বাস্তব hosting-এ পরীক্ষা করা হয়েছে এমন দাবি নয়। Production database-এ পরীক্ষা করার আগে backup ও test account ব্যবহার করুন।
