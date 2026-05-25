const express = require('express');
const router = express.Router();
const { getLogs } = require('../storageService');

// GET /api/logs
router.get('/', async (req, res) => {
  try {
    const logs = await getLogs();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tracking logs' });
  }
});

module.exports = router;
