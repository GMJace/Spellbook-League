# First-login welcome

New email registrations and new Google/Discord accounts create an `AccountWelcome`
row inside the same database write as the account. Existing accounts have no row
and do not see the welcome. OAuth accounts become eligible after choosing a
Player or DM role.

The signed-in page claims the welcome through an authenticated server action
after the component mounts. A single conditional update records `shownAt`, so
prefetching cannot consume it and concurrent tabs/devices cannot show it twice.
The message stays available in that first visit until dismissed or refreshed.

Before running a release containing this feature on the live droplet, explicitly
load its production database settings (Node.js 20+):

```sh
node --env-file=.env.production node_modules/tsx/dist/cli.mjs prisma/migrate-account-welcome.ts
node --env-file=.env.production node_modules/prisma/build/index.js generate
npm run build
pm2 restart spellbook --update-env
```

The migration only creates the new table if missing. It is safe to rerun and
does not mark existing accounts as new or modify their records.

For local development using `.env`, run `npm run db:migrate:account-welcome`
and `npm run db:generate` instead.

Verify the persistent once-per-account behavior with:

```sh
npm run test:account-welcome
```
