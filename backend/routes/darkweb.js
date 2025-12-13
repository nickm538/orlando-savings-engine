const express = require('express');
const router = express.Router();

// Mock Dark Web routes for now
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Dark Web scanner routes working',
    endpoints: [
      'GET /api/darkweb/test',
      'POST /api/darkweb/scan',
      'GET /api/darkweb/findings'
    ]
  });
});

module.exports = router;