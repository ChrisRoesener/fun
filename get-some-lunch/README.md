# Get Some Lunch

Never argue about where to eat again. Set your preferences, gather your group, and let the algorithm pick the perfect spot — then vote on the top picks in seconds.

## How it works

1. **Create a group** for your office or friend group
2. **Add restaurants** by searching nearby (Foursquare API) or entering them manually
3. **Set preferences** — how often you'd like to visit each restaurant (daily, weekly, monthly, never, etc.)
4. **Start a lunch session** — everyone going today joins in
5. **Get suggestions** — the algorithm picks the best candidates based on everyone's preferences and recent visit history
6. **Vote** — ranked choice voting (instant runoff) to pick the winner
7. **Go eat!** — optionally rate it afterward to fine-tune future suggestions

## Tech stack

- **Next.js 15** (App Router) with TypeScript
- **Tailwind CSS v4** for styling
- **Supabase** for auth, PostgreSQL database, and realtime
- **Foursquare Places API** for restaurant discovery
- **PWA** support via web manifest

## Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a free project.

### 2. Run the database schema

Open the SQL Editor in your Supabase dashboard and run the contents of `supabase/schema.sql`. This creates all tables, RLS policies, and triggers.

### 3. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
FOURSQUARE_API_KEY=your-foursquare-key
```

Get your Supabase credentials from **Project Settings > API** in the Supabase dashboard.

Get a Foursquare API key (free) at [developer.foursquare.com](https://developer.foursquare.com).

### 4. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploying

Deploy to [Vercel](https://vercel.com) for free:

1. Push to GitHub
2. Import in Vercel
3. Set the environment variables in Vercel's project settings
4. Deploy

## Project structure

```
src/
  app/                    # Next.js App Router pages
    api/                  # API routes (restaurant search, session suggest/tally)
    auth/callback/        # OAuth callback handler
    dashboard/            # User's groups dashboard
    groups/[groupId]/     # Group detail, restaurants, preferences, sessions, history
    join/[code]/          # Invite link join page
    login/ & signup/      # Auth pages
  components/             # React components
    auth/                 # Sign out button
    groups/               # Group management (create, join, invite, leave)
    restaurants/          # Search, manual add, list, preferences
    session/              # Session panel, voting, ratings
  lib/
    algorithm.ts          # Recommendation scoring engine
    ranked-choice.ts      # Instant runoff voting implementation
    foursquare.ts         # Foursquare Places API wrapper
    supabase/             # Supabase client (browser, server, middleware)
  types/
    database.ts           # TypeScript types
supabase/
  schema.sql              # Complete database schema with RLS policies
```
