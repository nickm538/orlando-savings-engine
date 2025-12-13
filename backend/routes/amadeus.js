const express = require('express');
const router = express.Router();

// Mock Amadeus routes for now - will integrate with real Amadeus API
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Amadeus API routes working',
    endpoints: [
      'GET /api/amadeus/test',
      'POST /api/amadeus/flights/search',
      'GET /api/amadeus/hotels/search',
      'GET /api/amadeus/hotels/offers'
    ]
  });
});

module.exports = router;