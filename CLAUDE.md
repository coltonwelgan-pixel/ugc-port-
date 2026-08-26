# Colton Welgan — UGC Portfolio & Creator HQ

## Who I Am
I'm Colton Welgan, a UGC creator and podcaster. This repo is my personal website (coltonwelgan.com) and creator backend dashboard.

## The Stack
- **Frontend**: Static HTML/CSS/JS — no frameworks
- **Hosting**: Vercel (auto-deploys from GitHub on push)
- **Backend database**: Supabase (PostgreSQL) — handles auth + data persistence
- **Fonts**: Inter (body), Bebas Neue (headings) via Google Fonts
- **Design system**: Dark theme — `#0A0A0A` bg, `#7B2D8B` purple accent, `#9B3DAB` accent hover

## Files in This Repo
| File | Purpose |
|---|---|
| `index.html` | Public portfolio site (coltonwelgan.com) |
| `results.html` | Results/case studies page |
| `backend.html` | Private admin dashboard (coltonwelgan.com/backend) — requires Supabase login |
| `vercel.json` | Routes `/backend` → `backend.html` |
| `BACKEND_SETUP.md` | Step-by-step guide to get the backend live |
| `neuro-logo.svg` | Brand logo asset |
| `triips-logo.svg` | Brand logo asset |
| `photo.jpg` | Profile photo |

## Backend Dashboard (backend.html)
A single-file admin panel at `/backend`. Uses Supabase JS client loaded from CDN.

### Auth
- Supabase email/password auth
- Sessions persist via Supabase tokens
- The two config constants at the top of `backend.html` must be filled in:
  ```js
  const SUPABASE_URL  = 'https://xxxx.supabase.co';
  const SUPABASE_KEY  = 'eyJ...';
  ```

### Supabase Tables
**`clients`** — Brand CRM
- `id`, `name`, `contact_name`, `contact_email`, `rate`, `rate_type`, `videos_per_month`, `status` (active/lead/inactive), `notes`, `created_at`

**`deliverables`** — Content tracker
- `id`, `client_id` (FK → clients), `title`, `content_type`, `stage` (scripted/filmed/editing/sent/approved/revision/posted), `due_date`, `post_date`, `platform`, `revision_count`, `notes`, `created_at`

**`revenue`** — Money tracker
- `id`, `client_id` (FK → clients), `deliverable_id` (FK → deliverables), `amount`, `date`, `status` (pending/invoiced/paid), `notes`, `created_at`

**`meetings`** — Brand deal pipeline
- `id`, `brand`, `contact`, `email`, `value`, `stage` (talking/proposal/negotiating/waiting/signed/lost), `last_contact`, `followup`, `notes`, `created_at`

**`ig_accounts`** — Linked Instagram accounts
- `id`, `handle`, `display_name`, `profile_url`, `cpm` ($ per 1,000 views, used for earnings projections), `notes`, `created_at`

**`ig_posts`** — Individual videos logged per account
- `id`, `account_id` (FK → ig_accounts), `caption`, `post_date`, `views`, `likes`, `comments`, `post_url`, `created_at`

Row Level Security is enabled on every table — only authenticated users can read/write. Instagram data entry is manual (via **+ Log Video**) — there's no live Instagram API sync.

### Dashboard Sections
1. **Dashboard** — stat cards (active clients, due this week, in-progress count, monthly/yearly revenue, revision count, this week's combined Instagram views, top account of the week) + due-soon table + active clients list
2. **Instagram Analytics** — linked accounts (add/edit/delete, filterable by account or "All Accounts"); week/month/year period toggle with prev/next navigation showing total views, post count, avg views/post, top and lowest video (with 🔥 outlier / ⚠️ underperformer badges at ≥2x / ≤0.4x the account's average views); a Chart.js bar chart (weekly-within-month or monthly-within-year); a CPM-based earnings projector (actual this month + run-rate projection to month-end); and a logged-videos table
3. **Content Tracker** — Kanban board across 7 stages, filterable by client
4. **Calendar** — Monthly calendar, events plotted by `post_date`
5. **Clients** — Full CRM table, searchable and filterable by status
6. **Revenue** — Payment log with totals (total / paid / outstanding), filterable
7. **Pipeline** — Brand deal tracker (stage, value, follow-ups)

## Design Rules (for any new pages or features)
- Background: `#0A0A0A`, raised surfaces: `#0F0F0F`, cards: `#131313`
- Accent: `#7B2D8B`, accent hover: `#9B3DAB`
- Borders: `rgba(255,255,255,0.07)` (subtle), `rgba(255,255,255,0.12)` (medium)
- Font: Inter for everything
- Buttons: `.btn-primary` (purple), `.btn-ghost` (outlined), `.btn-danger` (red-tinted)
- Keep everything in a single HTML file — no separate CSS or JS files
- No frameworks — vanilla JS only

## My Content Workflow (for context)
Content moves through these stages in order:
`Scripted → Recorded → Editing → Revisions → Sent → Posted`

Each deliverable is tied to a client/brand and has a due date (when the brand needs it) and a post date (when it goes live).

## Deploying Changes
```bash
git add .
git commit -m "description"
git push
```
Vercel auto-deploys. Live in ~30 seconds.

## My Goals With This Project
- Track every brand deal and deliverable in one place
- Never miss a deadline or post date
- Know exactly how much I'm making per brand
- Have a clean CRM so I'm not digging through emails for contact info
- Access everything at coltonwelgan.com/backend from any device
