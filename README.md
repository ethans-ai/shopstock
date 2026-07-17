# ShopStock

Parts inventory + labeling system for a powertrain test engineering team.
Runs entirely on **one PC** — no accounts, no cloud, no network exposure, no
build step. Pair it with a cheap USB barcode scanner and every bin, tool, and
part is one scan away.

## The core idea

Every item and storage location gets a printed **Code 128 barcode label**.
A USB barcode scanner (which acts as a keyboard) is plugged into the inventory
PC; scanning any label from anywhere in the app jumps straight to that item —
where quantity +/- or tool check-out is one click.

The server binds to `127.0.0.1` by default: nothing is reachable from the
network, so there is nothing for corporate IT to worry about. (LAN mode with
phone-scannable QR labels is still available behind a config flag — see below.)

## Features

- **Nested locations** — Room → Cabinet → Shelf → Bin, any depth, each with its own label
- **Stock items** — quantity tracking with low-stock alerts and a reorder dashboard (`/low-stock`)
- **Asset items** — check-out/check-in with who-has-it and takeover handling (`/checkouts`)
- **Barcode-first workflow** — scan from any page; works with any USB HID scanner (1D or 2D)
- **Photos** — upload images; auto-resized with thumbnails
- **Search** — full-text, as-you-type, over names/part numbers/manufacturers/attributes
- **Label printing** — Code 128 or QR, browser-print templates: Avery 5160 sheets
  (any office printer), Dymo 30252/30334 and Zebra 2"×1" rolls, plus a
  print-scaling calibration page
- **Activity log** — every quantity change, move, and checkout with self-reported names

## Quick start

```powershell
git clone https://github.com/ethans-ai/shopstock
cd shopstock            # <- don't skip this; npm must run inside the project folder
npm install
node scripts/seed-demo.js   # optional demo data
node server.js              # → http://localhost:8340
```

Or double-click `scripts\start-shopstock.cmd` — it starts the server and opens
the browser. Put a shortcut to it in `shell:startup` to auto-start at login.
No admin rights required.

## Locked-down PC? Use the portable bundle

On any machine where the app runs, build a fully self-contained zip — app +
dependencies + the Node runtime itself:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\make-portable.ps1
```

Carry `shopstock-portable.zip` to the target PC (USB stick is fine), unzip
anywhere — even a user folder — and double-click `start.cmd`. **No Node
install, no npm, no internet needed.**

## Barcode scanner setup

Any USB "keyboard wedge" scanner works out of the box (this is the default mode
for virtually all of them — Zebra, Honeywell, Netum, Tera, etc.). Most are
configured to send Enter after the code by default; if yours doesn't, enable
the "CR suffix" option from its manual. 2D scanners also read the QR labels.

## LAN mode (optional, off by default)

To let phones/other PCs use the app: set `"bindHost": "0.0.0.0"` in
`config.json`, open the firewall port, set the Base URL in `/admin`, and print
QR labels (code type dropdown on the Labels page). See
[docs/DEPLOY.md](docs/DEPLOY.md) for the full LAN/service setup.

## Stack

Node 22+ / Express 5 / better-sqlite3 (WAL) / EJS / htmx (vendored). Everything
degrades to plain form POSTs; there is no build pipeline. All state lives in the
`data/` folder (SQLite DB + photo files) — back that folder up and you have
everything.

## Layout

```
server.js              entry point
src/db.js              SQLite init + migration runner
src/migrations/        numbered .sql migrations
src/services/          all SQL lives here
src/routes/            pages, mutations, JSON api, labels, code redirects
src/views/             EJS pages
src/labels/templates/  label print templates (@page-sized, barcode + QR layouts)
public/                static css/js (htmx vendored)
scripts/               seed, launcher, portable bundle, backup, service install
data/                  THE state: shopstock.db + photos/   (gitignored)
```
