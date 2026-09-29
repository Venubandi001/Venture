# VENTURE — plot venture website

A customer-facing interactive plot map (like spacer.land) plus an admin console for layouts, plot inventory and leads.

**Stack:** Next.js 16 · Supabase Postgres (Mumbai) via Drizzle ORM · Supabase Storage · MapLibre.

## Code layout

```
src/app/         routes: pages + /api route handlers (thin — call into src/server)
src/components/  frontend UI (browser)
src/server/      backend only: db/ (Drizzle client + schema), auth, layouts, storage, email, validation
                 ("server-only" guarded — importing these from a browser component fails the build)
src/shared/      pure code used by both: plot geometry & layout model, statuses, ventures, filters, types
drizzle/         SQL migrations        scripts/  CLI tools (migrate, admin, seed, checks)
```

## Who signs in

- **Buyers never sign in** — `/`, `/explore/*` and the enquiry form are public.
- **Staff** sign in at `/admin` (roles: admin, sales). There is no public sign-up.
- **First admin**: created from the command line by whoever holds the server keys (see Accounts below).

## Setup

1. `npm install` (needs **Node 22+**)
2. Create `.env.local` in this folder (never commit it):
   ```
   DATABASE_URL=postgresql://postgres.<project>:<password>@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   SUPABASE_SECRET_KEY=sb_secret_...
   ```
   Use the **Transaction pooler** URI (port 6543), from Supabase → Connect → Direct → Transaction pooler.
3. Create the tables: `node --env-file=.env.local scripts/migrate.mjs`
4. Run: `npx next dev -p 3100` (PowerShell-safe; bash/cmd: `npm run dev -- -p 3100`)

5. Create the first admin: `node --env-file=.env.local --experimental-strip-types scripts/admin.mjs create you@company.com "Your Name"`
   (prints a one-time password; you choose your own at first sign-in)

- Customer map: `http://localhost:3100/explore/my-fortune`
- Admin: `http://localhost:3100/admin`

### Optional: password-reset emails

Add SMTP settings to enable “Forgot password?” emails from your own mailbox (Gmail, Google Workspace, Zoho, Hostinger, Outlook…). Without them, the page tells people to ask an administrator.
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=you@gmail.com
SMTP_PASS=<App Password, not your normal password>
EMAIL_FROM=VENTURE <you@gmail.com>
APP_URL=https://yourdomain.com
```

## Accounts

| Situation | What to do |
|---|---|
| New team member | *Users & Roles → Add* — a one-time password is shown once; they set their own at first sign-in |
| Someone forgot their password | They use *Forgot password?* (if email is set up), or an admin clicks *Reset password* |
| Someone leaves | *Deactivate* — signed out immediately, history kept |
| The only admin is locked out | `scripts/admin.mjs reset you@company.com` (needs the server keys) |
| See all accounts | `scripts/admin.mjs list` |

Security: passwords hashed with scrypt; sessions are random tokens stored hashed; changing/resetting a password signs out every device; wrong email, wrong password and deactivated accounts get the same message; login/reset/enquiry rate limits are stored in Postgres (work across servers); reset links are single-use, 30 minutes, built from `APP_URL` (never the request host).

## Adding a venture's layout

*Layouts & GIS → 1 · Layout file*:

- **Shapefile (recommended):** a `.zip` with `.shp`, `.shx`, `.dbf` and `.prj`, from the surveyor or CAD team.
  - The `.prj` is required. Any coordinate system works (e.g. UTM 44N).
  - The plot-number column is detected automatically and can be changed in the preview. Facing, status and sq-yd area columns are used when present; otherwise the exact measured area is used.
  - Parks, amenities, boundary and road-name lines are recognised from layer or attribute names. If the file has no boundary, the site outline is generated.
  - Re-importing an updated file keeps each existing plot's status, price and zone (matched by plot number).
- **Plan image:** upload a PNG/JPG, pin it on the satellite map, then trace the plots.

## Database

- Schema: `src/server/schema.ts`. Change it, then run `npx drizzle-kit generate --name <what>` and `scripts/migrate.mjs`.
- **Every new table needs `ENABLE ROW LEVEL SECURITY`** (see `drizzle/0001_lock_down_data_api.sql`). Supabase's public Data API must not be able to read app tables. The app itself connects as the database owner.
- Files: Supabase Storage bucket `media`. The browser uploads directly with a one-time signed URL; stored links look like `/api/uploads/<uuid>.<ext>` and redirect to the CDN.

## Scripts

| Command | What |
|---|---|
| `node --env-file=.env.local scripts/migrate.mjs` | apply migrations |
| `node --env-file=.env.local --experimental-strip-types scripts/admin.mjs create\|reset\|list` | manage accounts from the command line |
| `node --env-file=.env.local --experimental-strip-types scripts/seed-my-fortune.mjs [--force]` | install the traced My Fortune layout (111 plots) |
| `node --env-file=.env.local --experimental-strip-types scripts/move-to-supabase.mjs` | one-time copy of an old local `data/` (SQLite) install into Supabase |
| `node --experimental-strip-types scripts/check-layout.mjs` | geometry and validation checks |

## Roles

| | Admin | Sales |
|---|---|---|
| Leads (view, assign, status) | ✓ | ✓ |
| Plot status (Inventory, admin map) | ✓ | ✓ |
| Layouts, uploads, users | ✓ | — |

## Deploying (Vercel)

Import the GitHub repo in Vercel, add the four `.env.local` values under **Settings → Environment Variables**, and set the function region to **Mumbai (bom1)**. Use Vercel **Pro** and Supabase **Pro** for the live site (the free tiers don't allow commercial use, and they pause).
