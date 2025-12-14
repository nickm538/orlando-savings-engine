const express = require('express');
const router = express.Router();
const HotelDealAnalyzer = require('../services/HotelDealAnalyzer');
const analyzer = new HotelDealAnalyzer();

/**
 * @route   POST /api/analyzer/find-best-deal
 * @desc    Find the best hotel deal based on search parameters
 * @access  Public
 */
router.post('/find-best-deal', async (req, res) => {
  try {
    const { hotelName, checkInDate, checkOutDate, duration } = req.body;

    // Validate required parameters
    if (!hotelName || !checkInDate || !checkOutDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: hotelName, checkInDate, checkOutDate'
      });
    }

    // Calculate duration if not provided
    const calculatedDuration = duration || calculateDuration(checkInDate, checkOutDate);

    const analysis = await analyzer.findBestDeal({
      hotelName,
      checkInDate,
      checkOutDate,
      duration: calculatedDuration
    });

    res.json({
      success: true,
      data: analysis,
      searchParameters: {
        hotelName,
        checkInDate,
        checkOutDate,
        duration: calculatedDuration
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Find best deal error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze hotel deals',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/analyzer/sample-deals
 * @desc    Get sample hotel deals for demonstration
 * @access  Public
 */
router.get('/sample-deals', (req, res) => {
  try {
    const sampleDeals = [
      {
        id: '1',
        hotelName: 'Disney All-Star Resort',
        promoText: 'Save 35% on 5+ night stays + Free Dining Plan',
        originalPrice: 289,
        discountedPrice: 189,
        savings: 100,
        dealType: 'Package Deal',
        confidence: 0.95,
        source: 'Disney Official',
        applicableDays: 7,
        totalDays: 7
      },
      {
        id: '2',
        hotelName: 'Disney All-Star Resort',
        promoText: 'Annual Passholder Discount - 25% off',
        originalPrice: 289,
        discountedPrice: 217,
        savings: 72,
        dealType: 'Passholder Discount',
        confidence: 0.90,
        source: 'Disney Official',
        applicableDays: 7,
        totalDays: 7
      },
      {
        id: '3',
        hotelName: 'Universal Loews Royal Pacific',
        promoText: 'Stay More Save More - 4th Night Free',
        originalPrice: 350,
        discountedPrice: 280,
        savings: 70,
        dealType: 'Stay More Save More',
        confidence: 0.88,
        source: 'Universal Official',
        applicableDays: 7,
        totalDays: 7
      },
      {
        id: '4',
        hotelName: 'Hilton Orlando',
        promoText: 'Corporate Code - SAVE25',
        originalPrice: 220,
        discountedPrice: 165,
        savings: 55,
        dealType: 'Corporate Discount',
        confidence: 0.75,
        source: 'Corporate Partnership',
        applicableDays: 7,
        totalDays: 7
      }
    ];

    // Analyze sample deals
    let bestDeal = null;
    let maxSavings = 0;

    sampleDeals.forEach(deal => {
      if (deal.savings > maxSavings) {
        maxSavings = deal.savings;
        bestDeal = deal;
      }
    });

    if (bestDeal) {
      bestDeal.isBestDeal = true;
    }

    const analysis = {
      bestDeal,
      allDeals: sampleDeals,
      savingsSummary: {
        totalSavings: sampleDeals.reduce((sum, deal) => sum + deal.savings, 0),
        bestSavings: bestDeal?.savings || 0,
        averageSavings: sampleDeals.length > 0 
          ? sampleDeals.reduce((sum, deal) => sum + deal.savings, 0) / sampleDeals.length 
          : 0
      }
    };

    res.json({
      success: true,
      data: analysis,
      type: 'sample',
      message: 'Sample deals for demonstration purposes'
    });
  } catch (error) {
    console.error('Sample deals error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get sample deals',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/analyzer/algorithm-info
 * @desc    Get information about the deal analysis algorithm
 * @access  Public
 */
router.get('/algorithm-info', (req, res) => {
  try {
    const algorithmInfo = {
      name: 'Hotel Deal Analyzer',
      description: 'Finds the best possible hotel deals based on check-in and check-out dates',
      features: [
        'Real-time hotel pricing from Google Hotels API',
        'Deal discovery via Google Light Search API',
        'Original algorithm logic from Java implementation',
        'Confidence scoring for deal reliability',
        'Savings calculation and comparison'
      ],
      methodology: [
        'Data Collection: Gathers real-time pricing from multiple sources',
        'Deal Discovery: Searches for promo codes and special offers',
        'Cost Analysis: Applies deal logic to find most cost-effective option',
        'Result Optimization: Calculates applicable days and total savings'
      ],
      timeComplexity: 'O(N) + O(n) where N is total deals and n is hotel-specific deals',
      spaceComplexity: 'O(N) for storing deal information',
      basedOn: 'https://github.com/darshann25/Find-The-Best-Hotel-Deal.git'
    };

    res.json({
      success: true,
      data: algorithmInfo
    });
  } catch (error) {
    console.error('Algorithm info error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get algorithm information',
      message: error.message
    });
  }
});

/**
 * Helper function to calculate duration between two dates
 * FIXED: Removed Math.abs() and added proper validation
 */
function calculateDuration(checkInDate, checkOutDate) {
  const start = new Date(checkInDate);
  const end = new Date(checkOutDate);
  
  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date format');
  }
  
  if (end <= start) {
    throw new Error('Check-out date must be after check-in date');
  }
  
  const diffTime = end.getTime() - start.getTime();
  const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (nights === 0) {
    throw new Error('Minimum stay is 1 night');
  }
  
  return nights;
}

module.exports = router;