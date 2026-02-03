# Deployment Guide

This guide walks you through deploying the Name Rememberer app step by step.

---

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click **"New Project"**
3. Fill in:
   - **Name**: `name-rememberer` (or any name you like)
   - **Database Password**: Generate a strong password and save it somewhere
   - **Region**: Choose the closest to your users (e.g., Northeast Asia for Korea)
4. Click **"Create new project"** and wait ~2 minutes for setup

### Get Your API Keys

1. In your Supabase project, go to **Settings** (gear icon) → **API**
2. Copy these values (you'll need them later):
   - **Project URL** → This is `VITE_SUPABASE_URL`
   - **anon public** key → This is `VITE_SUPABASE_ANON_KEY`
   - **service_role** key → This is `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

---

## Step 2: Set Up the Database

### Run the Schema

1. In Supabase, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Copy the entire contents of `supabase/schema.sql` and paste it
4. Click **"Run"** (or press Cmd/Ctrl + Enter)
5. You should see "Success. No rows returned" - this is normal

### Create the Storage Bucket

1. Go to **Storage** (left sidebar)
2. Click **"New bucket"**
3. Fill in:
   - **Name**: `children-photos` (must be exactly this name)
   - **Public bucket**: Toggle ON (checked)
4. Click **"Create bucket"**

### Set Up Storage Policies

1. Click on your new `children-photos` bucket
2. Go to the **Policies** tab
3. Click **"New policy"** → **"For full customization"**

**Policy 1 - Allow uploads (admins only)**:

- Policy name: `Admins can upload`
- Allowed operation: `INSERT`
- Target roles: `authenticated`
- Policy definition:

```sql
EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
```

**Policy 2 - Allow deletes (admins only)**:

- Policy name: `Admins can delete`
- Allowed operation: `DELETE`
- Target roles: `authenticated`
- Policy definition:

```sql
EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
```

**Policy 3 - Allow public viewing**:

- Policy name: `Anyone can view`
- Allowed operation: `SELECT`
- Target roles: `anon, authenticated` (or leave blank for public)
- Policy definition: `true`

---

## Step 3: Create a Resend Account

1. Go to [resend.com](https://resend.com) and sign up
2. After signing in, go to **API Keys**
3. Click **"Create API Key"**
   - Name: `name-rememberer`
   - Permission: `Full access`
4. Copy the API key → This is your `RESEND_API_KEY`

### (Optional) Set Up Your Domain

For production, you should verify your domain:

1. Go to **Domains** in Resend
2. Add your domain and follow DNS verification steps
3. Update the `from` address in `api/send-quiz-email.ts`

For testing, Resend allows sending from `onboarding@resend.dev` to your own email.

---

## Step 4: Test Locally

1. Create a `.env` file in the project root:

```bash
cp .env.example .env
```

2. Edit `.env` with your values:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
RESEND_API_KEY=re_xxxxxxxxxxxx
VITE_APP_URL=http://localhost:5173
```

3. Start the dev server:

```bash
npm run dev
```

4. Open [http://localhost:5173](http://localhost:5173)

5. Enter your email and click "시작하기" to log in (no password needed!)

---

## Step 5: Make Yourself Admin

1. Go back to Supabase → **SQL Editor**
2. Run this query (replace with your email):

```sql
UPDATE profiles
SET is_admin = true
WHERE email = 'your-email@example.com';
```

3. Refresh the app - you should now see the "관리" (Admin) tab in the navigation

---

## Step 6: Deploy to Vercel

### Push to GitHub

1. Create a new repository on [github.com](https://github.com/new)

   - Name: `name-rememberer`
   - Keep it private if you prefer
   - Don't initialize with README (we already have one)

2. In your terminal, run:

```bash
cd /Users/kimyoungjin/Projects/good-morning-name-rememberer

git init
git add .
git commit -m "Initial commit: Name rememberer flashcard app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/name-rememberer.git
git push -u origin main
```

### Import to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up/login with GitHub
2. Click **"Add New..."** → **"Project"**
3. Find and select your `name-rememberer` repository
4. Click **"Import"**

### Configure Environment Variables

Before deploying, add your environment variables:

1. Expand **"Environment Variables"**
2. Add each variable:

| Name                        | Value                                                     |
| --------------------------- | --------------------------------------------------------- |
| `VITE_SUPABASE_URL`         | `https://xxxxx.supabase.co`                               |
| `VITE_SUPABASE_ANON_KEY`    | `eyJhbG...`                                               |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...`                                               |
| `RESEND_API_KEY`            | `re_xxxx...`                                              |
| `VITE_APP_URL`              | `https://your-app.vercel.app` (update after first deploy) |
| `CRON_SECRET`               | Any random string (optional, for security)                |

3. Click **"Deploy"**

### Update App URL

After your first deploy:

1. Copy your Vercel URL (e.g., `https://name-rememberer-abc123.vercel.app`)
2. Go to **Settings** → **Environment Variables**
3. Update `VITE_APP_URL` with your actual URL
4. Redeploy: **Deployments** → click the three dots → **Redeploy**

---

## Step 7: Verify Cron Job

Vercel Cron jobs run automatically based on `vercel.json`. The email job runs daily at 8:00 AM UTC.

To check if it's configured:

1. Go to your Vercel project dashboard
2. Click **Settings** → **Cron Jobs**
3. You should see `/api/send-quiz-email` scheduled for `0 8 * * *`

To test manually:

```bash
curl https://your-app.vercel.app/api/send-quiz-email
```

---

## Troubleshooting

### "Missing Supabase environment variables"

- Make sure `.env` file exists and has the correct values
- Restart the dev server after changing `.env`

### Can't upload photos

- Check that you're logged in as an admin
- Verify the storage bucket is named exactly `children-photos`
- Check storage policies are set up correctly

### Emails not sending

- Verify your Resend API key is correct
- Check Resend dashboard for error logs
- For testing, send only to your own email

### Login not working

- This app uses simple email-only login (no password needed)
- Just enter your email and click "시작하기" to log in
- If it's not working, check the browser console for errors

---

## Free Tier Limits

| Service      | Limit                                                    |
| ------------ | -------------------------------------------------------- |
| **Vercel**   | 100GB bandwidth/month, unlimited deploys                 |
| **Supabase** | 500MB database, 1GB storage, 50,000 monthly active users |
| **Resend**   | 3,000 emails/month, 100 emails/day                       |

These limits are more than enough for a small group of users!
