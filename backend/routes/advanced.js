/**
 * Advanced AI Features API Routes
 * 
 * Endpoints for:
 * - Price error detection
 * - Historical price analysis
 * - Predictive booking optimization
 * - Stochastic modeling
 */

const express = require('express');
const router = express.Router();
const PriceErrorDetector = require('../services/PriceErrorDetector');
const HistoricalPriceAnalyzer = require('../services/HistoricalPriceAnalyzer');
const PredictiveBookingOptimizer = require('../services/PredictiveBookingOptimizer');

// Initialize services
const priceErrorDetector = new PriceErrorDetector();
const historicalAnalyzer = new HistoricalPriceAnalyzer();
const bookingOptimizer = new PredictiveBookingOptimizer();

/**
 * POST /api/advanced/detect-price-errors
 * Detect pricing errors in real-time
 */
router.post('/detect-price-errors', async (req, res) => {
  try {
    const { offers, historicalData } = req.body;

    if (!offers || !Array.isArray(offers)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'offers array is required'
      });
    }

    const result = priceErrorDetector.batchAnalyze(offers, historicalData || {});

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Price error detection failed:', error);
    res.status(500).json({
      success: false,
      error: 'Detection failed',
      message: error.message
    });
  }
});

/**
 * POST /api/advanced/analyze-single-price
 * Analyze a single price for errors
 */
router.post('/analyze-single-price', async (req, res) => {
  try {
    const { offer, competitorPrices, historicalPrices } = req.body;

    if (!offer || !offer.price) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'offer with price is required'
      });
    }

    const result = priceErrorDetector.detectPriceError(
      offer,
      competitorPrices || [],
      historicalPrices || []
    );

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Single price analysis failed:', error);
    res.status(500).json({
      success: false,
      error: 'Analysis failed',
      message: error.message
    });
  }
});

/**
 * POST /api/advanced/historical-analysis
 * Analyze historical pricing patterns
 */
router.post('/historical-analysis', async (req, res) => {
  try {
    const { propertyId, historicalPrices, options } = req.body;

    if (!propertyId || !historicalPrices || !Array.isArray(historicalPrices)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'propertyId and historicalPrices array are required'
      });
    }

    if (historicalPrices.length < 30) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient data',
        message: 'At least 30 historical data points required for accurate analysis'
      });
    }

    const result = historicalAnalyzer.analyzeHistoricalPrices(
      propertyId,
      historicalPrices,
      options || {}
    );

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Historical analysis failed:', error);
    res.status(500).json({
      success: false,
      error: 'Analysis failed',
      message: error.message
    });
  }
});

/**
 * POST /api/advanced/optimize-booking
 * Get optimal booking recommendations using AI
 */
router.post('/optimize-booking', async (req, res) => {
  try {
    const { 
      propertyId, 
      checkInDate, 
      checkOutDate, 
      historicalPrices, 
      currentPrice,
      flexibility 
    } = req.body;

    if (!propertyId || !checkInDate || !checkOutDate || !currentPrice) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'propertyId, checkInDate, checkOutDate, and currentPrice are required'
      });
    }

    if (!historicalPrices || historicalPrices.length < 30) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient data',
        message: 'At least 30 historical data points required for optimization'
      });
    }

    const result = await bookingOptimizer.optimizeBooking({
      propertyId,
      checkInDate,
      checkOutDate,
      historicalPrices,
      currentPrice,
      flexibility: flexibility || 7
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Booking optimization failed:', error);
    res.status(500).json({
      success: false,
      error: 'Optimization failed',
      message: error.message
    });
  }
});

/**
 * POST /api/advanced/comprehensive-analysis
 * Run all analyses on a property
 */
router.post('/comprehensive-analysis', async (req, res) => {
  try {
    const {
      propertyId,
      currentOffer,
      competitorOffers,
      historicalPrices,
      checkInDate,
      checkOutDate,
      flexibility
    } = req.body;

    if (!propertyId || !currentOffer || !historicalPrices) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'propertyId, currentOffer, and historicalPrices are required'
      });
    }

    // 1. Price Error Detection
    const competitorPrices = competitorOffers ? competitorOffers.map(o => o.price) : [];
    const priceErrorAnalysis = priceErrorDetector.detectPriceError(
      currentOffer,
      competitorPrices,
      historicalPrices.map(p => p.price)
    );

    // 2. Historical Analysis
    const historicalAnalysis = historicalAnalyzer.analyzeHistoricalPrices(
      propertyId,
      historicalPrices,
      { includeWeather: true, includeEvents: true }
    );

    // 3. Booking Optimization (if dates provided)
    let bookingOptimization = null;
    if (checkInDate && checkOutDate) {
      bookingOptimization = await bookingOptimizer.optimizeBooking({
        propertyId,
        checkInDate,
        checkOutDate,
        historicalPrices,
        currentPrice: currentOffer.price,
        flexibility: flexibility || 7
      });
    }

    // 4. Generate comprehensive recommendations
    const allRecommendations = [];
    
    if (priceErrorAnalysis.isPriceError) {
      allRecommendations.push({
        source: 'PRICE_ERROR_DETECTION',
        priority: 'CRITICAL',
        ...priceErrorAnalysis.recommendation
      });
    }

    if (historicalAnalysis.recommendations) {
      historicalAnalysis.recommendations.forEach(rec => {
        allRecommendations.push({
          source: 'HISTORICAL_ANALYSIS',
          ...rec
        });
      });
    }

    if (bookingOptimization && bookingOptimization.recommendations) {
      bookingOptimization.recommendations.forEach(rec => {
        allRecommendations.push({
          source: 'BOOKING_OPTIMIZATION',
          ...rec
        });
      });
    }

    // Sort by priority
    const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    allRecommendations.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return (b.confidence || 0) - (a.confidence || 0);
    });

    // Calculate total potential savings
    const totalPotentialSavings = allRecommendations.reduce((sum, rec) => {
      const savings = parseFloat(rec.potentialSavings || rec.expectedSavings || rec.savings || 0);
      return sum + savings;
    }, 0);

    res.json({
      success: true,
      data: {
        propertyId,
        currentPrice: currentOffer.price,
        analysisDate: new Date().toISOString(),
        priceErrorAnalysis,
        historicalAnalysis,
        bookingOptimization,
        recommendations: allRecommendations,
        summary: {
          totalRecommendations: allRecommendations.length,
          criticalAlerts: allRecommendations.filter(r => r.priority === 'CRITICAL').length,
          highPriority: allRecommendations.filter(r => r.priority === 'HIGH').length,
          totalPotentialSavings: totalPotentialSavings.toFixed(2),
          overallConfidence: this.calculateOverallConfidence(
            priceErrorAnalysis,
            historicalAnalysis,
            bookingOptimization
          )
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Comprehensive analysis failed:', error);
    res.status(500).json({
      success: false,
      error: 'Analysis failed',
      message: error.message
    });
  }
});

/**
 * GET /api/advanced/demo-analysis
 * Demo endpoint with sample data
 */
router.get('/demo-analysis', async (req, res) => {
  try {
    // Generate sample historical data
    const historicalPrices = [];
    const basePrice = 200;
    const today = new Date();
    
    for (let i = 365; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Add seasonal variation
      const month = date.getMonth();
      let seasonalFactor = 1.0;
      if ([5, 6, 7].includes(month)) seasonalFactor = 1.4; // Summer peak
      if ([11, 0].includes(month)) seasonalFactor = 1.5; // Holiday peak
      if ([1, 8].includes(month)) seasonalFactor = 0.7; // Low season
      
      // Add day of week variation
      const dow = date.getDay();
      const dowFactor = [0, 6].includes(dow) ? 1.1 : 1.0;
      
      // Add random noise
      const noise = (Math.random() - 0.5) * 20;
      
      const price = basePrice * seasonalFactor * dowFactor + noise;
      
      historicalPrices.push({
        date: date.toISOString().split('T')[0],
        price: Math.round(price * 100) / 100
      });
    }

    // Sample current offer
    const currentOffer = {
      id: 'demo-hotel-1',
      name: 'Demo Orlando Resort',
      price: 89.99, // Suspiciously low
      originalPrice: 249.99,
      rating: 4.5,
      class: 4,
      propertyType: 'hotel'
    };

    // Sample competitor offers
    const competitorOffers = [
      { id: 'comp-1', price: 215.00 },
      { id: 'comp-2', price: 229.00 },
      { id: 'comp-3', price: 208.50 },
      { id: 'comp-4', price: 235.00 },
      { id: 'comp-5', price: 219.99 }
    ];

    // Run comprehensive analysis
    const competitorPrices = competitorOffers.map(o => o.price);
    
    const priceErrorAnalysis = priceErrorDetector.detectPriceError(
      currentOffer,
      competitorPrices,
      historicalPrices.map(p => p.price)
    );

    const historicalAnalysis = historicalAnalyzer.analyzeHistoricalPrices(
      'demo-hotel-1',
      historicalPrices,
      { includeWeather: true, includeEvents: true }
    );

    const checkInDate = new Date();
    checkInDate.setDate(checkInDate.getDate() + 30);
    
    const bookingOptimization = await bookingOptimizer.optimizeBooking({
      propertyId: 'demo-hotel-1',
      checkInDate: checkInDate.toISOString().split('T')[0],
      checkOutDate: new Date(checkInDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      historicalPrices,
      currentPrice: currentOffer.price,
      flexibility: 7
    });

    res.json({
      success: true,
      data: {
        note: 'This is a demo with simulated data',
        currentOffer,
        competitorOffers,
        dataPoints: historicalPrices.length,
        priceErrorAnalysis,
        historicalAnalysis,
        bookingOptimization
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Demo analysis failed:', error);
    res.status(500).json({
      success: false,
      error: 'Demo failed',
      message: error.message
    });
  }
});

/**
 * Helper function to calculate overall confidence
 */
function calculateOverallConfidence(priceError, historical, booking) {
  let totalConfidence = 0;
  let count = 0;

  if (priceError && priceError.confidence) {
    totalConfidence += priceError.confidence;
    count++;
  }

  if (historical && historical.confidence) {
    totalConfidence += historical.confidence;
    count++;
  }

  if (booking && booking.confidence) {
    totalConfidence += booking.confidence;
    count++;
  }

  return count > 0 ? (totalConfidence / count).toFixed(2) : 0;
}

module.exports = router;
