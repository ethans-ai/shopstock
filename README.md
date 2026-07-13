# ShopStock

Parts inventory + QR labeling system for a powertrain test engineering team.
Runs as a small web server on one Windows PC; the whole team uses it from
phone/desktop browsers on the company LAN. No accounts, no cloud, no build step.

## The core idea

Every item and storage location gets a QR label. The QR encodes a short URL
(`http://<server>/i/K7M2Q`), so anyone can scan it with their **phone's normal
camera app** and land straight on that item's page — where quantity +/- or
check-out is one tap.

## Features

- **Nested locations** — Room → Cabinet → Shelf → Bin, any depth, each with its own QR label
- **Stock items** — quantity tracking with low-stock alerts and a reorder dashboard (`/low-stock`)
- **Asset items** — check-out/check-in with who-has-it and takeover handling (`/checkouts`)
- **Photos** — snap from the phone camera on upload; auto-resized with thumbnails
- **Search** — full-text, as-you-type, over names/part numbers/manufacturers/attributes
- **Label printing** — browser-print templates: Avery 5160 sheets (any office printer),
  Dymo 30252/30334 and Zebra 2"×1" rolls, plus a print-scaling calibration page
- **Activity log** — every quantity change, move, and checkout with self-reported names

## Quick start (development)

```powershell
npm install
node scripts/seed-demo.js   # optional demo data
npm run dev                 # http://localhost:8340
```

Browse from a phone on the same network via this machine's IP to try the mobile UX.

## Deployment

See [docs/DEPLOY.md](docs/DEPLOY.md) — Node + NSSM service + firewall rule +
nightly backups. **Set the Base URL in `/admin` and get a static IP before
printing labels** (printed URLs are permanent).

## Stack

Node 22 + Express 5 + better-sqlite3 (WAL) + EJS + htmx (vendored). Everything
degrades to plain form POSTs; there is no build pipeline. All state lives in the
`data/` folder (SQLite DB + photo files) — back that folder up and you have
everything.

## Layout

```
server.js              entry point
src/db.js              SQLite init + migration runner
src/migrations/        numbered .sql migrations
src/services/          all SQL lives here
src/routes/            pages, mutations, JSON api, labels, QR redirects
src/views/             EJS pages (mobile-first)
src/labels/templates/  label print templates (@page-sized)
public/                static css/js (htmx vendored)
scripts/               seed, backup, service install
data/                  THE state: shopstock.db + photos/   (gitignored)
```
