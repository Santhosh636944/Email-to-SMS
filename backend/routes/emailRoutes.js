const express = require('express');
const router = express.Router();
const { getEmails } = require('../storageService');

// GET /api/emails
router.get('/', async (req, res) => {
  try {
    const emails = await getEmails();
    res.json(emails);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

module.exports = router;
