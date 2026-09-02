# ShopStock — project context

Parts inventory + barcode/QR labeling for a powertrain test-engineering lab.
Runs on **one Windows PC** in the shop, no accounts, no cloud, no build step. A
USB barcode scanner is the primary input device: scan any printed label from any
page and the app jumps to that item or location.

## You are in the source repo — develop here

| Repo | Role |
|---|---|
| `ethans-ai/shopstock` (this repo) | **Source of truth.** All development happens here. |
| [`ethans-ai/shopstockpriv`](https://github.com/ethans-ai/shopstockpriv) | **Derived build.** This repo's code + `node_modules` + a bundled `node.exe`, committed so a locked-down shop PC can download a ZIP and run it with no installs, no admin rights, no internet. |

`src/`, `public/`, `server.js`, `package.json` and `docs/DEPLOY.md` are copied
verbatim into the build repo — they are currently byte-identical. Edits made
directly in `shopstockpriv` are undone by the next bundle rebuild, so they always
belong here instead.

### Shipping a new version to the shop PC

On a Windows x64 machine with `npm install` done and the app working:

1. Bump `version` in `package.json`.
2. `powershell -ExecutionPolicy Bypass -File scripts\make-portable.ps1`
   → writes `shopstock-portable.zip` next to the project folder.
3. Unzip it over a `shopstockpriv` checkout and commit there, tagging the commit
   message with the version (that repo's history is `v1.1`, `v1.2`, … per release).
4. **Restore `shopstockpriv`'s own `README.md` before committing** — it is
   hand-maintained and documents the Download-ZIP install path, but
   `make-portable.ps1` copies *this* repo's README over it.

The script stages `server.js`, `package.json`, `package-lock.json`,
`config.example.json`, `README.md`, `src/`, `public/`, `scripts/`, `docs/`,
`node_modules/`; adds `node.exe`, `NODE_VERSION.txt`, `start.cmd`,
`seed-demo.cmd`, `README-PORTABLE.txt`; and deliberately drops
`start-shopstock.cmd` and `make-portable.ps1`, which assume Node on PATH and
would be a silent-failure trap on a machine with no Node.

## Stack

Node 24 · Express 5 · EJS server-rendered views · htmx for partial updates ·
better-sqlite3 (WAL) · bwip-js + qrcode for labels · sharp for photo thumbs ·
multer for uploads. **No frontend framework and no build step** —
`public/js/app.js` is plain JS, `public/css/app.css` is hand-written (Fluent /
Windows 11 look, with dark mode). Keep it that way: the whole point is that the
shop PC runs the app straight from a ZIP.

## Layout

```
server.js              app wiring, static mounts, error handler, listen
src/config.js          config.json load/save; only non-default keys are persisted
src/db.js              opens SQLite, runs src/migrations/*.sql in order
src/routes/
  pages.js             GET page renders (htmx-aware: returns a partial when HX-Request)
  mutations.js         POST handlers
  api.js  labels.js  qr.js
src/services/          business logic, one module per domain
  items locations checkouts search shortcodes activity
  photos barcode qr vendorLinks backup auth
src/views/             EJS pages + partials/
src/labels/templates/  label sheet layouts (Avery 5160, Dymo 30252/30334, Zebra 2x1, ruler)
src/migrations/        001_init, 002_vendor_links, 003_backup_runs
scripts/               make-portable.ps1, backup.ps1, restore.ps1,
                       install-service.ps1, start-shopstock.cmd, seed-demo.js
spfx/                  SharePoint Framework solution -> shopstock.sppkg
                       (a web part that embeds/links the running app; nothing
                       of the server can run on SharePoint - docs/SHAREPOINT.md)
```

## Conventions

- **Routes stay thin**; logic lives in `src/services/*`. Routers are mounted at
  `/` (except `api.js` at `/api`) and are order-sensitive in `server.js`.
- **htmx**: a handler checks `req.headers['hx-request']` and renders a partial
  (`src/views/partials/...`) instead of a full page. The error handler does the
  same — fragment for htmx, full error page otherwise.
- **Express 5 quirk**: `req.body` is `undefined` when nothing was parsed; a
  middleware in `server.js` normalizes it to `{}`. Don't remove it.
- **Migrations are append-only.** Add `NNN_name.sql`; never edit an applied one.
  They run automatically on start, inside a transaction, tracked in
  `schema_migrations`. Use AUTOINCREMENT ids where stale forms could otherwise
  hit a reused rowid.
- **No accounts.** Actions are attributed by a person name kept in
  `localStorage` (`shopstock_person`) and posted in hidden `.person-hidden` fields.
- **Comments carry decisions, not narration** — see `src/services/auth.js`, which
  records the actual product decisions and their dates. Follow that style.
- **Walk-up zero-friction is a product rule.** Scanning, quantities, checkouts,
  adding items and printing must never sit behind a prompt. Only server config
  and backup settings are gated (see the admin PIN below).

## State and configuration

- All state is `data/` (`shopstock.db` + `-wal`/`-shm`, and `photos/`). Code is
  stateless. `data/` and `config.json` are gitignored and absent from the ZIP, so
  upgrading in place never touches the shop's inventory.
- `config.json` is written from the `/admin` page, never hand-edited.
  `src/config.js` persists only keys that differ from defaults, so a copied
  project folder doesn't drag another machine's absolute `dataDir` with it.
- Defaults: port `8340`, `bindHost` `127.0.0.1` (localhost-only), 24 h backups,
  30-day retention.

## Gotchas

- **Never copy `shopstock.db` alone.** A stale `data/shopstock.db-wal` next to a
  restored database gets replayed into it and corrupts it. Move `data/` as a
  whole, or use `scripts/restore.ps1`, which handles this.
- **`spfx/` is a separate toolchain.** It pins Node 22 (SPFx 1.23.2's supported
  range) while the app runs on Node 24, has its own `node_modules`, and is not
  staged by `make-portable.ps1` — so it never reaches the shop PC. Its
  `.gitignore` re-includes `config/config.json`, which the repo root ignores for
  the app's own runtime config.
- **`better-sqlite3` and `sharp` are native modules** built per Node version.
  After a Node upgrade, `npm rebuild`. The portable bundle is immune — its
  runtime is pinned inside the zip.
- **QR label URLs are permanent once printed.** Fix `baseUrl` and the machine's
  IP *before* printing QR labels in LAN mode.
- **Set the admin PIN before enabling LAN mode.** Setting the *first* PIN is open
  to whoever reaches `/admin` first — fine on a locked single PC, not once the
  network can reach the app. Lost PIN: stop the server, delete the
  `adminPinHash` line from `config.json`, restart.
- **Never put secrets in backup zips.** Backups live on a multi-reader share; the
  admin PIN hash was deliberately removed from the manifest in v1.4 because a
  short PIN's scrypt hash cracks offline in minutes.

## Running it

- `npm install`, then `npm run dev` (`node --watch server.js`) or
  `scripts\start-shopstock.cmd`. App at http://localhost:8340.
- Demo data into an empty DB: `npm run seed`.
- Reset to empty: stop the server, delete `data/shopstock.db*` and
  `data/photos/*`, start again.
- There is **no test suite** and no linter configured. Verify changes by running
  the app and exercising the affected page.

Deployment, backup/restore, LAN mode and the admin PIN are documented in
`docs/DEPLOY.md`. Version-by-version history is in `docs/PROJECT-LOG.md`.
