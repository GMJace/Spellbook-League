# D&D Beyond character sync

Save a public D&D Beyond character share link in **Edit Character → Character sheet link**, or use **Import from D&D Beyond link** on character creation. Opening the saved log requests a refresh. The inventory panel also has a **Refresh now** button and a last-successful-sync time.

## Imported information

- Name, up to three classes and subclasses, levels, feats, skill proficiencies/expertise, tools and languages.
- All standard and custom inventory entries, with source IDs, quantities, names/custom names, notes, item descriptions, containers, equipped/attuned flags, type, rarity and weight.
- Species, background, currency balances and a spell list in the D&D Beyond panel.
- Final maximum HP, AC, passive Perception and spell save DC only when the response explicitly supplies them. The service often supplies components instead of final combat totals. The importer does not use base HP or armor values inside inventory as character totals. Missing totals and senses remain manually maintained; the panel identifies unsupported combat totals.

SPELLBOOK gold, league item slots, notes, backstory, awards, game logs, downtime and trades are not overwritten. The imported inventory is a current snapshot, not a league reward or trade ledger. Removing an item on D&D Beyond removes it from the snapshot on the next successful sync. Items with identical names remain distinct by source ID.

## Reliability and access

The app reads the public character-service v5 JSON endpoint; no D&D Beyond login cookies or private access are used. This is an external integration and may need updates if the service changes. Private characters, malformed/partial data, failures, and timeouts preserve the previous snapshot. Changing the saved link hides the previous character's inventory until the new source syncs.

Authorized log viewers can request a refresh. The server uses the saved link and checks the same visibility rules as the log page. HTTPS hosts and redirects are restricted to D&D Beyond; the data endpoint has a 15-second deadline and 10 MiB response limit. A reverse proxy must preserve the request `Host` and overwrite `X-Forwarded-Proto` with its connection scheme. Set `APP_BASE_URL` to the public HTTPS app URL. These allow same-origin sync requests behind TLS termination while rejecting cross-site requests.

A database claim limits each character to one fetch per 30 seconds across app processes. A compare-and-set write preserves edits made while a refresh is in progress. Network requests run outside database transactions. This cooldown is not a replacement for deployment-level rate limiting if abuse or very high traffic develops.

## Existing SQLite deployment

Before starting the updated application, run from the app directory with its existing database configuration:

```sh
npm run db:migrate:ddb-sync
npm run db:generate
npm run build
```

The migration locates the actual SQLite database, creates a consistent timestamped backup using `VACUUM INTO`, then adds five nullable columns in a transaction. It is safe to rerun. It does not use a destructive schema reset or reseed users. Stop the local Windows development server before regenerating Prisma if its DLL is locked, then restart it. Restart the deployment's application process after building.

Run `npm run test:ddb-sync` for isolated SQLite tests. An optional `DDB_TEST_FIXTURE` environment variable can point to a locally saved response for character 157125295; real character payloads are not committed to the repository. `npm run build` also checks TypeScript and route compilation.

## DigitalOcean and PostgreSQL

The production deployment uses a DigitalOcean Droplet and PM2. Confirm the process name, app directory, actual live database path and backups on the server before applying changes. The console environment may differ from the PM2 application's environment; migration commands must explicitly target the database used by the application. No PostgreSQL migration is included in this feature.

PostgreSQL is a reasonable next step if concurrent writes or multiple application processes become a deployment requirement. The sync feature itself works with SQLite. Do not change only `DATABASE_URL` to a PostgreSQL URL: Prisma's provider, schema initialization, data transfer and deployment configuration must change together.

Before a live cutover: inspect the actual server, choose the PostgreSQL service and cost, take a verified backup, rehearse data transfer into a separate database, verify record counts/relationships and authentication, then schedule a brief write pause for the final transfer. Retain the SQLite backup and old deployment for rollback. Provisioning and switching the production database remain separate deployment work requiring server access.
