const express = require('express');
const items = require('../services/items');
const locations = require('../services/locations');
const qr = require('../services/qr');
const config = require('../config');

const router = express.Router();

router.get('/i/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const item = items.byShortcode(code);
  if (item) return res.redirect(`/items/${item.id}`);
  // Cross-check locations in case the wrong prefix was typed
  const loc = locations.byShortcode(code);
  if (loc) return res.redirect(`/locations/${loc.id}`);
  res.status(404).render('scan-miss', { title: 'Code not found', code });
});

router.get('/l/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const loc = locations.byShortcode(code);
  if (loc) return res.redirect(`/locations/${loc.id}`);
  const item = items.byShortcode(code);
  if (item) return res.redirect(`/items/${item.id}`);
  res.status(404).render('scan-miss', { title: 'Code not found', code });
});

router.get('/qr/:code.svg', async (req, res, next) => {
  try {
    const code = req.params.code.toUpperCase();
    const cfg = config.load();
    const isLocation = !!locations.byShortcode(code);
    const url = qr.urlFor(cfg.baseUrl || `http://localhost:${cfg.port}`,
                          isLocation ? 'location' : 'item', code);
    const svg = await qr.svgForUrl(url);
    res.type('image/svg+xml').send(svg);
  } catch (err) { next(err); }
});

module.exports = router;
