# ShopStock on SharePoint (`.sppkg`)

The `spfx/` folder builds **`shopstock.sppkg`**, a SharePoint Framework
package you can upload to a tenant App Catalog and install on a site. This
document covers what that package can and cannot do, how to build it, and how
to install it.

---

## Read this first: what a `.sppkg` actually holds

A `.sppkg` is a zip of **browser-side JavaScript, CSS and XML manifests**.
SharePoint serves those files to the visitor's browser and runs nothing else —
there is no Node process, no filesystem, and no SQLite on a SharePoint site.

ShopStock is an Express server with a SQLite database, `sharp` image
processing and server-rendered EJS views. **None of that can be lifted into a
`.sppkg`.** Packaging ShopStock "as an app" for SharePoint would mean rewriting
it against SharePoint Lists — a different product, not a build step.

So what this package does instead: it adds a **ShopStock web part** that puts
the already-running app on a SharePoint page — embedded in a frame where the
browser allows it, and as a link out where it doesn't. The app still runs on
the shop PC exactly as it does today; SharePoint becomes a place people find
it from.

That is enough to genuinely exercise the packaging and install path — building
the `.sppkg`, uploading it, deploying it, adding it to a site, dropping the web
part on a page — which is what this branch is for.

---

## Build the package

Requires **Node 22.14–22.x** (SPFx 1.23.2 pins that range) and network access
to npm. Node 24, which the app itself uses, will be rejected by the SPFx
toolchain.

```powershell
cd spfx
npm install          # ~2000 packages, a few minutes
npm run package      # gulp clean && gulp bundle --ship && gulp package-solution --ship
```

Output: **`spfx/sharepoint/solution/shopstock.sppkg`**.

(The nested `spfx/sharepoint/` folder is SPFx's own convention for where
packaged output lands — it is not the app's `sharepoint` anything.)

A prebuilt copy is committed at **`spfx/prebuilt/shopstock.sppkg`** so the
package can be installed without running the toolchain at all. It is a build
artifact: rebuild it whenever `spfx/src` or `spfx/config` changes, and copy the
fresh one over it.

## Install it on a site

1. **App Catalog** — open your tenant App Catalog
   (`https://<tenant>.sharepoint.com/sites/appcatalog`) → *Apps for SharePoint*.
   You need to be a SharePoint administrator; if there is no App Catalog yet,
   one has to be created in the SharePoint admin center first.
2. **Upload** `shopstock.sppkg`. SharePoint shows a trust dialog listing the
   solution. Click **Deploy**.
   *This package requests no tenant permissions and no Graph scopes* — the
   dialog will not ask you to approve any API access.
3. **Add it to the site** — on the site you want it on: *Settings* → *Site
   contents* → *New* → *App* → pick **ShopStock**.
   This step exists because `skipFeatureDeployment` is `false` in
   `spfx/config/package-solution.json`. Flip it to `true` and rebuild if you'd
   rather have the web part available on every site in the tenant with no
   per-site install.
4. **Put it on a page** — edit a page, `+`, find **ShopStock** under the
   *Advanced* group.
5. **Configure it** — in the web part property pane set:
   - **ShopStock address** — e.g. `http://localhost:8340`, or
     `http://SHOP-PC:8340` in LAN mode
   - **Start page** — `/`, or `/low-stock`, `/checkouts`, any app path
   - **Height** and **Show a link instead of embedding**

### Upgrading a deployed package

Bump `solution.version` in `spfx/config/package-solution.json`, rebuild, and
upload the new `.sppkg` over the old one in the App Catalog (*Replace*). Sites
pick up the new bundle on next load; the site-level app may need *Site
contents* → *ShopStock* → *Get it* / update prompt.

---

## What each viewer's browser will and won't load

The frame is fetched by **the browser of whoever is looking at the page**, not
by SharePoint's servers. That single fact decides everything below.

| ShopStock address | Who sees the embedded app |
|---|---|
| `http://localhost:8340` (default, `bindHost` `127.0.0.1`) | Only someone sitting at the shop PC. Everyone else gets an empty frame — nothing is listening on *their* localhost. |
| `http://SHOP-PC:8340` (LAN mode) | **Nobody, embedded.** SharePoint pages are HTTPS, and browsers refuse to frame a plain-HTTP address from another host. The web part detects this and shows a link instead. Clicking through works fine. |
| `https://shopstock.example.com` (LAN mode behind an HTTPS reverse proxy) | Everyone on the network. This is the only configuration where the embed works for the whole shop. |

Loopback is the exception to mixed-content blocking: browsers treat
`http://localhost` as a trustworthy origin, so the embed does work on the shop
PC itself. `http://127.0.0.1` and `http://[::1]` are treated the same way.

**The link always works**, in every row of that table — navigating to an HTTP
address from an HTTPS page is not mixed content. If you only want the shop's
SharePoint hub to have a working entry point to ShopStock, turn on *Show a
link instead of embedding* and stop there.

## Gotchas

- **LAN mode has its own prerequisites.** Before setting `bindHost` to
  `0.0.0.0`, set the admin PIN (`/admin`) and fix `baseUrl` — QR label URLs are
  permanent once printed. See `docs/DEPLOY.md`.
- **The frame is not sandboxed.** ShopStock needs scripts, forms and its own
  cookies; every `sandbox` flag that would allow those back is the whole of
  what sandboxing would have withheld. The web part frames only the address a
  page author typed, and injects no script into the SharePoint page — which is
  why its manifest sets `requiresCustomScript: false`.
- **A barcode scanner types into the focused element.** Inside a frame that is
  the app, as long as the user has clicked into the frame once. On a page with
  other web parts this is a worse experience than a full-width page or a plain
  link — a scan aimed at ShopStock can land in a SharePoint search box instead.
  For scanning stations, keep using the app directly.
- **Node version.** `spfx/package.json` pins Node 22.x for the SPFx toolchain.
  The app itself runs on Node 24. They are separate installs of separate
  toolchains that never run at the same time; nothing in `spfx/` ships to the
  shop PC.
- **`spfx/` is not part of the portable bundle.** `scripts\make-portable.ps1`
  stages a fixed list of folders and `spfx/` is not on it, so the shop PC's ZIP
  is unchanged by any of this.

## Files

```
spfx/
  config/
    config.json              bundle + localized-resource wiring
    package-solution.json    solution id, version, feature, sppkg path
    serve.json               gulp serve → hosted workbench
  src/webparts/shopStock/
    ShopStockWebPart.ts      the web part: validate URL, embed or link
    ShopStockWebPart.manifest.json
    ShopStockWebPart.module.scss
    loc/en-us.js             all user-visible strings
  prebuilt/shopstock.sppkg   committed build output, for installing directly
  sharepoint/solution/       gulp output (gitignored)
```
