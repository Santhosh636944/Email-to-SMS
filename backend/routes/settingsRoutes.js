const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../storageService');

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/settings
router.put('/', async (req, res) => {
  try {
    const settings = await updateSettings(req.body);
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
