# Colton Welgan — UGC Portfolio & Creator HQ

## Who I Am
I'm Colton Welgan, a UGC creator and podcaster. This repo is my personal website (coltonwelgan.com) and creator backend dashboard.

## The Stack
- **Frontend**: Static HTML/CSS/JS — no frameworks
- **Hosting**: Vercel (auto-deploys from GitHub on push)
- **Backend database**: Supabase (PostgreSQL) — handles auth, roles, and data persistence
- **Backend logic**: Vercel Serverless Functions in `api/` — the only things a static page can't do safely on its own (sending email, inviting users). Deploys automatically with the same `git push`, no separate hosting.
- **Email**: Resend, called from `api/notify-editor.js` and `api/notify-admin.js`
- **Fonts**: Inter (body), Bebas Neue (headings) via Google Fonts
- **Design system**: Dark theme — `#0A0A0A` bg, `#7B2D8B` purple accent, `#9B3DAB` accent hover

## Files in This Repo
| File | Purpose |
|---|---|
| `index.html` | Public portfolio site (coltonwelgan.com) |
| `results.html` | Results/case studies page |
| `backend.html` | Private admin dashboard + editor portal (coltonwelgan.com/backend) — role-routed after Supabase login |
| `api/invite-editor.js` | Admin-only: invites an editor via Supabase Auth, creates their `profiles` row |
| `api/notify-editor.js` | Emails an editor when a job is assigned to them |
| `api/notify-admin.js` | Emails the admin(s) when an editor submits a job for review |
| `api/_supabase.js` | Shared server-side Supabase client + admin/user auth check helpers |
| `vercel.json` | Routes `/backend` → `backend.html` |
| `BACKEND_SETUP.md` | Step-by-step guide to get the backend + email + editor invites live |
| `package.json` | Node deps for the `api/` functions (`@supabase/supabase-js`, `resend`) |

## Backend Dashboard (backend.html)
A single-file dashboard at `/backend`, split into two experiences by role after login:
- **Admin** (Colton): full dashboard — Instagram analytics, brands, editing jobs, expenses.
- **Editor**: a walled-off portal showing only their own assigned jobs. They cannot reach any admin page, including by URL — enforced by Row Level Security, not just hidden UI.

### Auth & roles
- Supabase email/password auth (admin) and Supabase-invited accounts (editors — they set their own password via an emailed link, never handled by Colton or by Claude).
- After login, the app reads the user's `profiles.role` and renders `#app-admin` or `#app-editor` accordingly.
- The two config constants at the top of `backend.html` (`SUPABASE_URL`, `SUPABASE_KEY`) are the public anon key — safe client-side, access is gated entirely by RLS.
- **Never** put the Supabase **service role key** or the **Resend API key** in `backend.html` or any committed file — those live only in Vercel's Environment Variables and are used exclusively inside `api/*.js`.

### Supabase Tables
**`profiles`** — role registry, one row per authenticated user
- `id` (= `auth.users.id`), `email`, `full_name`, `role` (`admin`/`editor`), `created_at`
- `current_user_role()` is a `security definer` SQL function used inside RLS policies to check role without recursive-RLS issues.

**`clients`** — brands Colton works with
- `id`, `name`, `contact_name`, `contact_email`, `rate`, `rate_type`, `status` (active/lead/inactive), `notes`, `created_at`

**`ig_accounts`** — linked Instagram accounts
- `id`, `handle`, `display_name`, `profile_url`, `cpm` ($ per 1,000 views), `notes`, `ig_business_id`, `connected` (both nullable, reserved for live API sync — phase 2b), `created_at`

**`ig_posts`** — individual videos logged per account
- `id`, `account_id` (FK → ig_accounts), `caption`, `post_date`, `views`, `likes`, `comments`, `post_url`, `source` (`manual`/`api`), `created_at`

**`ig_tokens`** — Instagram OAuth tokens (phase 2b). RLS enabled with **no policies at all** — unreachable by the anon/authenticated roles, only by server-side code using the service role key.

**`editing_jobs`** — the editor workflow
- `id`, `title`, `editor_id` (FK → profiles), `drive_link`, `asset_links` (newline-separated), `notes`, `status` (`assigned`→`in_progress`→`submitted`→`approved`, or `revision` sent back by admin), `created_at`, `submitted_at`, `approved_at`

**`expenses`** — lightweight business expense log, admin-only
- `id`, `description`, `category`, `amount`, `date`, `notes`, `created_at`

**`deliverables`**, **`revenue`**, **`meetings`** — from an earlier version of this dashboard (Content Tracker / Calendar / old Revenue / Pipeline). Removed from the nav and no longer rendered, but the tables and data still exist in Supabase untouched.

### Row Level Security
Every table restricts to `current_user_role() = 'admin'`, **except**:
- `profiles` — a user can read their own row; admins can read all.
- `editing_jobs` — editors can `select`/`update` only rows where `editor_id = auth.uid()` (their own jobs); admins have full access.
- `ig_tokens` — no client access at all, service-role only.

### Dashboard Sections (admin)
1. **Dashboard** — active brands, this week's combined Instagram views, top account of the week, a brands table, and a per-account week/month/year views table
2. **Instagram Analytics** — linked accounts (add/edit/delete, filterable by account or "All Accounts"); week/month/year period toggle with prev/next navigation showing total views, post count, avg views/post, top and lowest video (🔥 outlier / ⚠️ underperformer badges at ≥2x / ≤0.4x the account's average views); a Chart.js bar chart; a CPM-based earnings projector (actual this month + run-rate projection to month-end); a logged-videos table. Data entry is manual (**+ Log Video**) — live Instagram API sync is phase 2b, gated on Colton linking his Business accounts to Facebook Pages and creating a Meta Developer App.
3. **Brands** — brand list: name, contact, rate, status, notes
4. **Editing Jobs** — invite editors (emailed a password-setup link), assign jobs (Drive link + asset links + notes → emails the editor), review submissions (Approve or Send Back → emails fire automatically)
5. **Expenses** — simple logged list + totals (all-time / this month / this year)

### Editor Portal
One page: cards for each job assigned to them (title, status, Drive link, asset links, notes) with a single action button that advances status — Start Working → Submit for Review (emails the admin) — or Resume Work if sent back for revisions.

## Design Rules (for any new pages or features)
- Background: `#0A0A0A`, raised surfaces: `#0F0F0F`, cards: `#131313`
- Accent: `#7B2D8B`, accent hover: `#9B3DAB`
- Borders: `rgba(255,255,255,0.07)` (subtle), `rgba(255,255,255,0.12)` (medium)
- Font: Inter for everything
- Buttons: `.btn-primary` (purple), `.btn-ghost` (outlined), `.btn-danger` (red-tinted)
- Frontend stays a single HTML file — no separate CSS/JS files, no UI framework. Server-side logic that genuinely can't live in the browser (email, privileged Supabase Auth calls) goes in small, single-purpose `api/*.js` Vercel functions — not a general backend framework.

## Deploying Changes
```bash
git add .
git commit -m "description"
git push
```
Vercel auto-deploys (including `api/` functions). Live in ~30 seconds.

## My Goals With This Project
- Know exactly how each Instagram account is performing — weekly, monthly, yearly, per account and combined — and catch outlier videos
- Keep a lightweight list of brands I'm working with, no CRM bloat
- Assign editing work without a group chat — Drive link + assets + notes, they get emailed, I get emailed back when it's done
- Track basic business expenses
- Access everything at coltonwelgan.com/backend from any device, with editors walled off from everything that isn't theirs
