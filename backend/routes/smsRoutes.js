const express = require('express');
const router = express.Router();
const { sendSms } = require('../smsService');

// POST /api/sms/send
router.post('/send', async (req, res) => {
  try {
    const { message, toNumber } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message body is required' });
    }

    const result = await sendSms(message, toNumber);
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

module.exports = router;
