# Creator HQ — Backend Setup Guide

The Supabase project and schema are already live (done together in an earlier session). What's left is wiring up email + editor invites, which need two secrets only you can enter — I never see or handle them.

---

## Step 1 — Sign up for Resend (free)

1. Go to **https://resend.com** → Sign Up (free)
2. Skip domain verification for now — the app sends from `onboarding@resend.dev` by default, which works immediately without a custom domain. Verify your own domain later if you want emails to come from `@coltonwelgan.com` instead.
3. Go to **API Keys** → **Create API Key** → copy it (starts with `re_...`)

---

## Step 2 — Get your Supabase service role key

1. In your Supabase project → **Settings → API Keys → Legacy anon, service_role API keys**
2. Find **service_role** (marked `secret`) → **Reveal** → copy it

**This key bypasses every Row Level Security policy in your database.** It must never appear in `backend.html`, never get committed to git, and never get pasted anywhere except Vercel's Environment Variables in the next step.

---

## Step 3 — Add both as Environment Variables in Vercel

1. Go to your project on **vercel.com** → **Settings → Environment Variables**
2. Add:
   - `SUPABASE_URL` = `https://tfladstuvagsuzzdtiup.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = (the secret key from Step 2)
   - `RESEND_API_KEY` = (the key from Step 1)
3. Apply to Production (and Preview if you want it working on preview deploys too)
4. Redeploy (Vercel → Deployments → ⋯ → Redeploy) so the `api/` functions pick up the new variables

---

## What's already done (for reference)

- Supabase project `colton-hq`, all tables created, Row Level Security locked down per-role (admin vs editor)
- Your own login (`welgancreative@gmail.com`) exists in Supabase Auth with an `admin` role in the `profiles` table
- `backend.html` has the public `SUPABASE_URL` / anon key wired in already — those are safe client-side, not secrets

---

## Adding an editor

Once the environment variables above are set:

1. Log into `/backend` as admin → **Editing Jobs** → **+ Invite Editor**
2. Enter their email and name → they get an email with a link to set their own password
3. They log in at the same `/backend` URL and only ever see their own assigned jobs — they cannot reach any admin page, even by guessing the URL (enforced by the database itself, not just hidden buttons)

---

## Real Instagram data (later, optional)

Right now Instagram stats are entered manually (**+ Log Video**). Live syncing from Instagram is possible but requires, before any code changes will actually do anything:

1. Each Instagram account converted to a **Business** account (you already have this) and **linked to a Facebook Page** (you don't have this yet — this is a Meta requirement, not something any app or automation can bypass)
2. A **Meta Developer App** (developers.facebook.com) with Facebook Login for Business configured

Say the word when you've done step 1 and I'll walk you through step 2 and build the connection flow.

---

## Everything else already documented in CLAUDE.md

Table schemas, RLS policies, and the full section-by-section breakdown of the dashboard live in `CLAUDE.md` — that's the source of truth for what's built.
