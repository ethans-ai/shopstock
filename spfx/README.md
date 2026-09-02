# ShopStock SPFx package

Builds `shopstock.sppkg` — a SharePoint web part that embeds, or links to, the
ShopStock app running on the shop PC.

**A `.sppkg` holds browser-side files only.** The ShopStock server (Express,
SQLite, sharp) cannot run on SharePoint; this package puts the running app on a
SharePoint page, it does not host it.

```powershell
cd spfx
npm install       # needs Node 22.14-22.x, not the Node 24 the app uses
npm run package   # -> sharepoint/solution/shopstock.sppkg
```

A prebuilt copy is committed at `prebuilt/shopstock.sppkg` for installing
without the toolchain. Full build, install and troubleshooting notes:
[`../docs/SHAREPOINT.md`](../docs/SHAREPOINT.md).
