# Talviro Chat — Next.js থেকে Express API সংযোগ (বাংলা)

বর্তমান API host: `https://api.talvirochat.sites.bd` (আপনার cPanel Node.js app-এর public URL যাচাই করে নেবেন)। API backend root `/api/v1` ব্যবহার করে।

## 1. Next.js environment variable
Next.js frontend project-এর root-এ `.env.local` তৈরি করুন:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.talvirochat.sites.bd/api/v1
```

এই URL secret নয়। JWT secret, DB password, LiveKit secret বা Firebase service-account key কখনো `NEXT_PUBLIC_*` variable-এ রাখবেন না।

## 2. ছোট API helper
`src/lib/api.ts` (অথবা আপনার project structure অনুযায়ী `lib/api.ts`) ফাইল তৈরি করুন:

```ts
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  if (!API_BASE) throw new Error("API URL is not configured");

  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.message === "string" ? data.message : `API error (${response.status})`);
  }
  return data as T;
}
```

## 3. Login call-এর উদাহরণ
API-এর register/login request shape আগে backend route-এর সঙ্গে মিলিয়ে নিন। Login UI-তে password কখনো URL বা console log-এ দেবেন না। Token সংরক্ষণের জন্য production-এ নিরাপদ server-side session/HttpOnly cookie পছন্দনীয়; browser localStorage-এ দীর্ঘমেয়াদি bearer token রাখলে XSS ঝুঁকি থাকে।

```ts
type LoginResult = {
  status: "ok";
  token: string;
  user: { id: number; username: string; name: string };
};

const result = await apiRequest<LoginResult>(
  "/auth/login",
  {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }
);
```

## 4. cPanel CORS
cPanel Node.js app-এর environment variable `CORS_ORIGIN`-এ Next.js site-এর exact origin দিন, যেমন `https://talvirochat.sites.bd`। একাধিক origin হলে comma দিয়ে আলাদা করুন। শেষে path যোগ করবেন না। পরিবর্তনের পর Node.js app restart করুন।

## 5. যাচাই
1. `https://api.talvirochat.sites.bd/health` খুলুন; প্রত্যাশিত JSON-এ `status: ok` থাকবে।
2. `https://api.talvirochat.sites.bd/api/v1/health/db` পরীক্ষা করুন; DB সেটআপ না থাকলে এটি ব্যর্থ হওয়া স্বাভাবিক।
3. Next.js থেকে browser devtools/network-এ request status দেখুন। CORS error হলে exact origin এবং cPanel env যাচাই করুন।

## সতর্কতা
- এই গাইড কেবল সংযোগের উদাহরণ; এটি আপনার Next.js app-এ নিজে থেকে ফাইল তৈরি বা deploy করে না।
- Login response-এর প্রকৃত shape কোডে থাকা route অনুযায়ী যাচাই করতে হবে।
- API host/domain চালু আছে বা login end-to-end কাজ করছে—এটি এই ডকুমেন্ট দিয়ে নিশ্চিত করা হয়নি.
