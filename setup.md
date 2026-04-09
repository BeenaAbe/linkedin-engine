# Setup Guide

## 1. Supabase

1. Go to https://supabase.com/dashboard
2. Click **New Project** → name it `linkedin-agent` → set DB password → pick region
3. Wait ~2 min for it to spin up
4. Go to **Settings → API** and copy these into `.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
   ```

5. Go to **SQL Editor** → New Query → paste the contents of `supabase/migrations/001_initial_schema.sql` → click **Run**
6. Verify: go to **Table Editor** — you should see `brands` (2 rows), `posts`, `post_history`, `notification_settings`

## 2. Groq

1. Go to https://console.groq.com/keys
2. Create a new API key
3. Paste into `.env.local`:

   ```
   GROQ_API_KEY=gsk_...
   ```

## 3. Run

```bash
cd linkedin-agent
npm install
npm run dev
```

Open http://localhost:3000

## 4. Deploy to Vercel (when ready)

```bash
npm i -g vercel
vercel
```

Add the same env vars in Vercel Dashboard → Settings → Environment Variables.

## 5. WhatsApp (optional, later)

1. Sign up at https://www.twilio.com/console
2. Enable WhatsApp Sandbox
3. Uncomment and fill the Twilio vars in `.env.local`
