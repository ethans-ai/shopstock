# Deploying ShopStock to the work PC

## Prerequisites
1. **Node.js 22 LTS** — install from https://nodejs.org (MSI, default options).
2. **NSSM** — download from https://nssm.cc, put `nssm.exe` somewhere permanent
   (e.g. `C:\tools\nssm\nssm.exe`). It wraps the app as a real Windows service.
3. **A stable address for the PC.** Ask IT for a **static IP or DHCP reservation**
   before printing any labels — the printed QR codes contain this address forever.

## Install
```powershell
# 1. Copy the project folder to the work PC (e.g. C:\shopstock), then:
cd C:\shopstock
npm ci

# 2. First run, by hand, to check it works:
node server.js
# → browse http://localhost:8340
```

## Configure
- Open `http://localhost:8340/admin` and set the **Base URL** to the PC's LAN
  address, e.g. `http://192.168.1.50:8340`. This is what QR codes encode.
- Port/data directory can be overridden in `config.json` (copy `config.example.json`).

## Install as a service + firewall rule
Run **elevated** PowerShell:
```powershell
cd C:\shopstock
.\scripts\install-service.ps1 -NssmPath C:\tools\nssm\nssm.exe
```
This installs a `ShopStock` service (delayed auto-start, restart-on-crash, logs to
`data\service.log`) and opens inbound TCP 8340 on the Domain/Private firewall profiles.

## Day-one reachability test (do this BEFORE printing labels)
1. From another PC: browse `http://<work-pc-ip>:8340` — should load.
2. From a phone on the shop Wi-Fi: same URL — should load.
   - If the PC works but the phone doesn't: the phone is probably on a guest VLAN
     or the Wi-Fi has client isolation. Talk to IT — **this must work** or the
     whole QR workflow is dead on arrival.
   - Also check the PC's network profile is Domain or Private (Public blocks
     inbound): `Get-NetConnectionProfile`.

## Label printing calibration
1. Open `/admin` → "Open ruler test page" → print at **100% scale**.
2. Check with a real ruler. If dimensions are off, fix the print dialog scaling
   (turn off "fit to page") before printing labels.
3. Avery 5160 sheets work on any office laser printer — good starting point.
   Dymo/Zebra roll templates are in the Labels page dropdown once you know the printer.

## Backups
Schedule the backup script daily in Task Scheduler:
```
Program:  powershell
Arguments: -NoProfile -ExecutionPolicy Bypass -File C:\shopstock\scripts\backup.ps1 -Dest "\\fileserver\share\shopstock-backups"
```
- The script snapshots the DB through the SQLite backup API (safe while the
  service runs — never just copy `shopstock.db` while live) and zips the photos.
- Keeps 30 days by default (`-KeepDays`).

**Restore:** stop the service (`nssm stop ShopStock`), unzip the backup over the
`data\` folder, start the service.

## Maintenance notes
- **Don't upgrade Node casually** — `better-sqlite3` and `sharp` are native
  modules built for the installed Node version. If you must upgrade Node, run
  `npm rebuild` afterwards.
- Logs: `data\service.log` / `data\service-error.log` (rotated at 1 MB).
- The whole system state is the `data\` folder. Everything else is code.

## Reset to empty (fresh start after testing)
Stop the server, delete `data\shopstock.db*` and `data\photos\*`, start again —
migrations recreate an empty database. `node scripts/seed-demo.js` loads demo data.
