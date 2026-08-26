# Creator HQ — Backend Setup Guide

Follow these steps once and your backend will be live forever at coltonwelgan.com/backend.

---

## Step 1 — Create a Supabase Project (free)

1. Go to **https://supabase.com** → Sign Up (free)
2. Click **New Project**
3. Name it `colton-hq` (or whatever)
4. Set a strong database password (save it somewhere — this is the Postgres password, not your login password)
5. Choose the closest region (US East works)
6. Wait ~2 minutes for it to spin up

---

## Step 2 — Create the Database Tables

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Paste ALL of this SQL and click **Run**:

```sql
-- CLIENTS table (your brand CRM)
create table clients (
  id               uuid default gen_random_uuid() primary key,
  name             text not null,
  contact_name     text,
  contact_email    text,
  rate             numeric,
  rate_type        text default 'per video',
  videos_per_month integer default 0,
  status           text default 'active',
  notes            text,
  created_at       timestamptz default now()
);

-- DELIVERABLES table (content tracker)
create table deliverables (
  id             uuid default gen_random_uuid() primary key,
  client_id      uuid references clients(id) on delete set null,
  title          text not null,
  content_type   text default 'UGC Video',
  stage          text default 'scripted',
  due_date       date,
  post_date      date,
  platform       text,
  revision_count int default 0,
  notes          text,
  created_at     timestamptz default now()
);

-- REVENUE table (money tracker)
create table revenue (
  id             uuid default gen_random_uuid() primary key,
  client_id      uuid references clients(id) on delete set null,
  deliverable_id uuid references deliverables(id) on delete set null,
  amount         numeric not null,
  date           date,
  status         text default 'pending',
  notes          text,
  created_at     timestamptz default now()
);

-- MEETINGS table (brand deal pipeline)
create table meetings (
  id           uuid default gen_random_uuid() primary key,
  brand        text not null,
  contact      text,
  email        text,
  value        numeric,
  stage        text default 'talking',
  last_contact date,
  followup     date,
  notes        text,
  created_at   timestamptz default now()
);

-- IG_ACCOUNTS table (your linked Instagram accounts)
create table ig_accounts (
  id           uuid default gen_random_uuid() primary key,
  handle       text not null,
  display_name text,
  profile_url  text,
  cpm          numeric default 5,   -- $ per 1,000 views, used for earnings projections
  notes        text,
  created_at   timestamptz default now()
);

-- IG_POSTS table (individual videos logged per account)
create table ig_posts (
  id         uuid default gen_random_uuid() primary key,
  account_id uuid references ig_accounts(id) on delete cascade,
  caption    text,
  post_date  date not null,
  views      integer default 0,
  likes      integer default 0,
  comments   integer default 0,
  post_url   text,
  created_at timestamptz default now()
);

-- Enable Row Level Security (keeps your data private)
alter table clients      enable row level security;
alter table deliverables enable row level security;
alter table revenue      enable row level security;
alter table meetings     enable row level security;
alter table ig_accounts  enable row level security;
alter table ig_posts     enable row level security;

-- Allow authenticated users (you) to do everything
create policy "auth_all_clients"      on clients      for all using (auth.role() = 'authenticated');
create policy "auth_all_deliverables" on deliverables for all using (auth.role() = 'authenticated');
create policy "auth_all_revenue"      on revenue      for all using (auth.role() = 'authenticated');
create policy "auth_all_meetings"     on meetings     for all using (auth.role() = 'authenticated');
create policy "auth_all_ig_accounts"  on ig_accounts  for all using (auth.role() = 'authenticated');
create policy "auth_all_ig_posts"     on ig_posts     for all using (auth.role() = 'authenticated');
```

---

## Step 3 — Create Your Login Account

1. In Supabase, go to **Authentication → Users**
2. Click **Add User → Create New User**
3. Enter YOUR email and a strong password

**Do this step yourself, directly in the Supabase dashboard.** Your login password should never be pasted into a chat with an AI assistant or written into any file in this repo — it isn't needed anywhere except Supabase's own system and your own head. If you ever do paste a password somewhere by accident, change it immediately in Supabase (Authentication → Users → your user → Reset Password).

---

## Step 4 — Get Your API Keys

1. In Supabase, go to **Settings → API**
2. Copy two things:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

These are safe to put in client-side code — they're not secret. Every request made with them is still gated by the Row Level Security policies from Step 2, so only a signed-in user can read or write your data.

---

## Step 5 — Add Your Keys to backend.html

Open `backend.html` in a text editor and find these two lines near the top of the `<script>` block:

```js
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

Replace with your actual values:

```js
const SUPABASE_URL = 'https://abcdefgh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

Save the file.

---

## Step 6 — Push to GitHub → Live on Vercel

```bash
git add backend.html
git commit -m "connect creator hq backend to supabase"
git push
```

Vercel auto-deploys. In ~30 seconds your dashboard is live at:
**https://coltonwelgan.com/backend**

---

## Done! Here's what your dashboard does

| Section | What it tracks |
|---|---|
| **Dashboard** | Active clients, deliverables due this week, monthly/yearly revenue, this week's combined Instagram views, top account of the week |
| **Instagram Analytics** | Linked accounts, weekly/monthly/yearly view totals (per account and combined), top and lowest video of the period with outlier flags, posts logged, avg views/post, CPM-based earnings projections |
| **Content Tracker** | Kanban board: Scripted → Filmed → Editing → Sent → Approved → Revision → Posted |
| **Calendar** | Visual monthly calendar showing every post date |
| **Clients** | Full CRM: name, contact, rate, status, notes |
| **Revenue** | Log payments, track paid vs invoiced vs pending, totals per client |
| **Pipeline** | Deals in progress — who you're talking to, deal value, stage, follow-ups |

Everything persists in Supabase — nothing resets, ever, and it's the same data on every device you log in from.

### On Instagram data

Video stats (views, likes, comments) are entered manually for now via **+ Log Video** on the Instagram Analytics page — there's no live sync to the Instagram API yet. That's a bigger lift (a Meta Developer App, your accounts being Business/Creator accounts linked to Facebook Pages, and server-side token handling) that can be added later without changing this schema.
