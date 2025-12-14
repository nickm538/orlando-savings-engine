/**
 * Hotel Search API Routes
 * 
 * Comprehensive hotel search endpoints combining:
 * - SerpAPI (Google Hotels - consumer rates)
 * - Amadeus (GDS - professional rates)
 * - Advanced ranking algorithms
 * - Price error detection
 * - Historical analysis
 */

const express = require('express');
const router = express.Router();
const DualSourceHotelAggregator = require('../services/DualSourceHotelAggregator');
const AdvancedHotelRanker = require('../services/AdvancedHotelRanker');
const AmadeusHotelService = require('../services/AmadeusHotelService');

const aggregator = new DualSourceHotelAggregator();
const ranker = new AdvancedHotelRanker();
const amadeusService = new AmadeusHotelService();

/**
 * POST /api/hotels/search
 * 
 * Comprehensive hotel search across multiple sources
 * 
 * Body:
 * {
 *   "location": "Orlando, FL",
 *   "checkInDate": "2025-12-15",
 *   "checkOutDate": "2025-12-22",
 *   "adults": 2,
 *   "rooms": 1,
 *   "currency": "USD",
 *   "priceRange": "100-300",
 *   "sortBy": "savings" | "price" | "rating"
 * }
 */
router.post('/search', async (req, res) => {
  try {
    const {
      location = 'Orlando, FL',
      checkInDate,
      checkOutDate,
      adults = 2,
      rooms = 1,
      currency = 'USD',
      priceRange,
      sortBy = 'savings'
    } = req.body;

    // Validate dates
    if (!checkInDate || !checkOutDate) {
      return res.status(400).json({
        success: false,
        error: 'Check-in and check-out dates are required'
      });
    }

    // Search both sources
    const results = await aggregator.searchHotels({
      location,
      checkInDate,
      checkOutDate,
      adults,
      rooms,
      currency
    });

    // Apply advanced ranking
    const rankedHotels = await ranker.rankHotels(results.hotels, {
      checkInDate,
      checkOutDate
    });

    // Apply sorting
    let sortedHotels = rankedHotels;
    if (sortBy === 'price') {
      sortedHotels = rankedHotels.sort((a, b) => (a.price || a.totalPrice) - (b.price || b.totalPrice));
    } else if (sortBy === 'rating') {
      sortedHotels = rankedHotels.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }
    // Default is already sorted by savings (compositeScore)

    // Apply price range filter if specified
    if (priceRange) {
      const [min, max] = priceRange.split('-').map(Number);
      sortedHotels = sortedHotels.filter(hotel => {
        const price = hotel.price || hotel.totalPrice;
        return price >= min && price <= max;
      });
    }

    res.json({
      success: true,
      data: {
        hotels: sortedHotels,
        summary: {
          ...results.summary,
          totalResults: sortedHotels.length,
          searchParams: req.body,
          sortedBy: sortBy
        }
      }
    });
  } catch (error) {
    console.error('Hotel search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/hotels/price-errors
 * 
 * Find hotels with pricing errors (potential mistakes)
 * 
 * Query params:
 * - checkInDate (required)
 * - checkOutDate (required)
 * - adults (default: 2)
 * - rooms (default: 1)
 */
router.get('/price-errors', async (req, res) => {
  try {
    const {
      checkInDate,
      checkOutDate,
      adults = 2,
      rooms = 1
    } = req.query;

    if (!checkInDate || !checkOutDate) {
      return res.status(400).json({
        success: false,
        error: 'Check-in and check-out dates are required'
      });
    }

    const priceErrors = await aggregator.findPriceErrors({
      location: 'Orlando, FL',
      checkInDate,
      checkOutDate,
      adults: parseInt(adults),
      rooms: parseInt(rooms)
    });

    res.json({
      success: true,
      data: {
        priceErrors,
        count: priceErrors.length,
        message: priceErrors.length > 0 
          ? `Found ${priceErrors.length} potential pricing error(s)!` 
          : 'No pricing errors detected at this time.'
      }
    });
  } catch (error) {
    console.error('Price error detection failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/hotels/exclusive-rates
 * 
 * Get exclusive rates from Amadeus (not available on consumer sites)
 * 
 * Query params:
 * - checkInDate (required)
 * - checkOutDate (required)
 * - adults (default: 2)
 * - rooms (default: 1)
 */
router.get('/exclusive-rates', async (req, res) => {
  try {
    const {
      checkInDate,
      checkOutDate,
      adults = 2,
      rooms = 1,
      currency = 'USD'
    } = req.query;

    if (!checkInDate || !checkOutDate) {
      return res.status(400).json({
        success: false,
        error: 'Check-in and check-out dates are required'
      });
    }

    const exclusiveRates = await aggregator.getExclusiveRates({
      checkInDate,
      checkOutDate,
      adults: parseInt(adults),
      rooms: parseInt(rooms),
      currency
    });

    res.json({
      success: true,
      data: {
        exclusiveRates,
        count: exclusiveRates.length,
        message: `Found ${exclusiveRates.length} exclusive rate(s) not available on consumer sites!`
      }
    });
  } catch (error) {
    console.error('Exclusive rates search failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/hotels/compare
 * 
 * Compare specific hotel across all sources
 * 
 * Body:
 * {
 *   "hotelName": "Hilton Orlando",
 *   "checkInDate": "2025-12-15",
 *   "checkOutDate": "2025-12-22",
 *   "adults": 2,
 *   "rooms": 1
 * }
 */
router.post('/compare', async (req, res) => {
  try {
    const {
      hotelName,
      checkInDate,
      checkOutDate,
      adults = 2,
      rooms = 1
    } = req.body;

    if (!hotelName) {
      return res.status(400).json({
        success: false,
        error: 'Hotel name is required'
      });
    }

    if (!checkInDate || !checkOutDate) {
      return res.status(400).json({
        success: false,
        error: 'Check-in and check-out dates are required'
      });
    }

    const comparison = await aggregator.compareHotel(hotelName, {
      location: 'Orlando, FL',
      checkInDate,
      checkOutDate,
      adults,
      rooms
    });

    if (!comparison) {
      return res.status(404).json({
        success: false,
        error: `Hotel "${hotelName}" not found`
      });
    }

    res.json({
      success: true,
      data: comparison
    });
  } catch (error) {
    console.error('Hotel comparison failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/hotels/orlando-ids
 * 
 * Get all Orlando hotel IDs from Amadeus
 * 
 * Query params:
 * - radius (default: 50 km)
 */
router.get('/orlando-ids', async (req, res) => {
  try {
    const { radius = 50 } = req.query;

    const hotelIds = await amadeusService.getOrlandoHotelIds(parseInt(radius));

    res.json({
      success: true,
      data: {
        hotels: hotelIds,
        count: hotelIds.length,
        radius: `${radius} km from Orlando city center`
      }
    });
  } catch (error) {
    console.error('Failed to get Orlando hotel IDs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/hotels/best-deals
 * 
 * Get top 10 best deals for Orlando hotels
 * 
 * Query params:
 * - checkInDate (required)
 * - checkOutDate (required)
 * - adults (default: 2)
 * - rooms (default: 1)
 * - limit (default: 10)
 */
router.get('/best-deals', async (req, res) => {
  try {
    const {
      checkInDate,
      checkOutDate,
      adults = 2,
      rooms = 1,
      limit = 10
    } = req.query;

    if (!checkInDate || !checkOutDate) {
      return res.status(400).json({
        success: false,
        error: 'Check-in and check-out dates are required'
      });
    }

    // Search and rank hotels
    const results = await aggregator.searchHotels({
      location: 'Orlando, FL',
      checkInDate,
      checkOutDate,
      adults: parseInt(adults),
      rooms: parseInt(rooms)
    });

    const rankedHotels = await ranker.rankHotels(results.hotels, {
      checkInDate,
      checkOutDate
    });

    // Get top deals
    const topDeals = rankedHotels.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: {
        bestDeals: topDeals,
        summary: {
          totalHotelsAnalyzed: results.hotels.length,
          topDealsReturned: topDeals.length,
          averageSavings: results.summary.averageSavings,
          bestDeal: topDeals[0] || null
        }
      }
    });
  } catch (error) {
    console.error('Best deals search failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/hotels/health
 * 
 * Health check for hotel search services
 */
router.get('/health', async (req, res) => {
  try {
    const health = await aggregator.healthCheck();

    const allHealthy = 
      health.serpApi.status === 'healthy' &&
      health.amadeus.status === 'healthy' &&
      health.aggregator.status === 'healthy';

    res.status(allHealthy ? 200 : 503).json({
      success: allHealthy,
      data: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/hotels/rank-comparison
 * 
 * Compare two hotels head-to-head with detailed scoring
 * 
 * Body:
 * {
 *   "hotel1": { ... hotel object ... },
 *   "hotel2": { ... hotel object ... },
 *   "checkInDate": "2025-12-15",
 *   "checkOutDate": "2025-12-22"
 * }
 */
router.post('/rank-comparison', async (req, res) => {
  try {
    const { hotel1, hotel2, checkInDate, checkOutDate } = req.body;

    if (!hotel1 || !hotel2) {
      return res.status(400).json({
        success: false,
        error: 'Both hotel1 and hotel2 are required'
      });
    }

    const comparison = await ranker.compareHotels(hotel1, hotel2, {
      checkInDate,
      checkOutDate
    });

    res.json({
      success: true,
      data: comparison
    });
  } catch (error) {
    console.error('Hotel ranking comparison failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Import intelligent guidance engine
const IntelligentGuidanceEngine = require('../services/IntelligentGuidanceEngine');
const DiscountCodeValidator = require('../services/DiscountCodeValidator');

const guidanceEngine = new IntelligentGuidanceEngine();
const discountValidator = new DiscountCodeValidator();

/**
 * Get intelligent guidance for a specific hotel
 * POST /api/hotels/guidance
 */
router.post('/guidance', async (req, res) => {
  try {
    const { hotel, context, marketData } = req.body;
    
    if (!hotel || !context) {
      return res.status(400).json({
        success: false,
        error: 'Hotel data and context required'
      });
    }
    
    // Generate comprehensive guidance
    const guidance = await guidanceEngine.generateGuidance(hotel, context, marketData);
    
    res.json({
      success: true,
      guidance
    });
  } catch (error) {
    console.error('Error generating guidance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Discover and validate discount codes
 * POST /api/hotels/discounts
 */
router.post('/discounts', async (req, res) => {
  try {
    const { hotel, searchParams } = req.body;
    
    if (!hotel || !searchParams) {
      return res.status(400).json({
        success: false,
        error: 'Hotel data and search parameters required'
      });
    }
    
    // Discover all available discounts
    const discounts = await discountValidator.discoverDiscounts(hotel, searchParams);
    
    res.json(discounts);
  } catch (error) {
    console.error('Error discovering discounts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Validate eligibility for a discount code
 * POST /api/hotels/validate-code
 */
router.post('/validate-code', async (req, res) => {
  try {
    const { code, userProfile } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Discount code required'
      });
    }
    
    const validation = discountValidator.validateEligibility(code, userProfile);
    
    res.json({
      success: true,
      code,
      ...validation
    });
  } catch (error) {
    console.error('Error validating code:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get usage instructions for a discount code
 * GET /api/hotels/code-instructions/:code
 */
router.get('/code-instructions/:code', (req, res) => {
  try {
    const { code } = req.params;
    
    const instructions = discountValidator.getUsageInstructions(code);
    
    res.json({
      success: true,
      ...instructions
    });
  } catch (error) {
    console.error('Error getting instructions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
