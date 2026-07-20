# SPELLBOOK

A full-stack Next.js app for a tabletop league where one account can be a Player, a Dungeon Master, or both.

## Stack

- Next.js App Router with TypeScript
- Auth.js credentials login
- Prisma ORM
- SQLite for local development

## Features

- Public homepage with register/login buttons
- Top 10 character leaderboard by total games played
- Handbook tabs for Player's Guide, DM's Guide, and Publisher's Guide
- Multi-role registration
- Player dashboard and character creation
- Character detail pages with full game logs
- DM dashboard and game creation
- Searchable participant workflow by player, then character
- GameParticipant linkage that drives character logs automatically

## Setup

1. Install Node.js 20+ and npm.
2. Copy `.env.example` to `.env`.
3. Set `AUTH_SECRET` in `.env` to a long random string.
4. Set `APP_BASE_URL` to your local or deployed app URL so password reset
   emails can link back to the app.
5. Optional: configure Resend for password reset and password-changed emails:

```bash
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM="SPELLBOOK <noreply@yourdomain.com>"
EMAIL_REPLY_TO="support@yourdomain.com"
```

6. Optional: add Google OAuth credentials to `.env` if you want Google sign-in:

```bash
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
```
7. Install dependencies:

```bash
npm install
```

8. Generate Prisma client and create the local database:

```bash
npm run db:generate
npm run db:migrate -- --name init
```

If `db:migrate` fails on your machine, use this verified fallback:

```bash
npm run db:push
```

9. Seed demo data:

```bash
npm run db:seed
```

10. Start the app:

```bash
npm run dev
```

11. Open `http://localhost:3000`.

## Demo accounts

- Admin: `cornerstonednd@gmail.com` / `password123`
- Player only: `player@example.com` / `password123`
- DM only: `dm@example.com` / `password123`
- Player + DM: `dual@example.com` / `password123`
- Test account (Player + DM): `testy@example.com` / `password123`

## Main routes

- `/`
- `/register`
- `/login`
- `/handbooks`
- `/player`
- `/player/characters/new`
- `/player/characters/[id]`
- `/dm`
- `/dm/games/new`
- `/dm/games/[id]`

## Notes

- Player count is derived from participant count and is not stored on `Game`.
- Duplicate characters in the same game are blocked in the UI and by a database uniqueness constraint.
- Google sign-in routes users through a role-selection step the first time so the app can assign Player and/or DM access.
- Password reset emails and password-change notifications are delivered through Resend when the email environment variables are configured.
- On some Windows setups, you may need to prepend `C:\Program Files\nodejs` to `PATH` before running `npm` commands.
