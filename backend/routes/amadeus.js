const express = require('express');
const router = express.Router();
const AmadeusService = require('../services/AmadeusService');
const amadeusService = new AmadeusService();

/**
 * @route   GET /api/amadeus/status
 * @desc    Check Amadeus API configuration status
 * @access  Public
 */
router.get('/status', (req, res) => {
  const isConfigured = amadeusService.isConfigured();
  
  res.json({
    success: true,
    configured: isConfigured,
    message: isConfigured 
      ? 'Amadeus API is configured and ready' 
      : 'Amadeus API credentials not configured. Set AMADEUS_API_KEY and AMADEUS_API_SECRET environment variables.',
    endpoints: [
      'GET /api/amadeus/flights/search - Search for flights',
      'GET /api/amadeus/flights/to-orlando - Search flights to Orlando',
      'GET /api/amadeus/flights/cheapest-dates - Find cheapest travel dates',
      'GET /api/amadeus/flights/multi-origin - Search from multiple origins',
      'POST /api/amadeus/flights/price - Confirm flight price',
      'GET /api/amadeus/airports/search - Search airports',
      'GET /api/amadeus/airlines - Get airline information',
      'GET /api/amadeus/sample-flights - Sample flight data'
    ]
  });
});

/**
 * @route   GET /api/amadeus/flights/search
 * @desc    Search for flights
 * @access  Public
 */
router.get('/flights/search', async (req, res) => {
  try {
    const {
      origin,
      destination,
      departure_date,
      return_date,
      adults,
      children,
      travel_class,
      non_stop,
      currency,
      max_price,
      max_results
    } = req.query;

    if (!origin || !departure_date) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        required: ['origin', 'departure_date'],
        example: '/api/amadeus/flights/search?origin=JFK&departure_date=2025-01-15'
      });
    }

    const searchOptions = {
      origin,
      destination: destination || 'MCO',
      departureDate: departure_date,
      returnDate: return_date,
      adults: adults ? parseInt(adults) : 1,
      children: children ? parseInt(children) : 0,
      travelClass: travel_class || 'ECONOMY',
      nonStop: non_stop === 'true',
      currencyCode: currency || 'USD',
      maxPrice: max_price ? parseInt(max_price) : undefined,
      max: max_results ? parseInt(max_results) : 50
    };

    const results = await amadeusService.searchFlights(searchOptions);

    res.json({
      success: true,
      data: results.data,
      meta: results.meta,
      dictionaries: results.dictionaries,
      count: results.data.length,
      searchParameters: searchOptions,
      source: 'amadeus_api',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Flight search error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to search flights',
      message: error.message,
      hint: !amadeusService.isConfigured() 
        ? 'Amadeus API credentials may not be configured' 
        : undefined
    });
  }
});

/**
 * @route   GET /api/amadeus/flights/to-orlando
 * @desc    Search for flights to Orlando from a specific origin
 * @access  Public
 */
router.get('/flights/to-orlando', async (req, res) => {
  try {
    const {
      origin,
      departure_date,
      return_date,
      adults,
      travel_class,
      non_stop
    } = req.query;

    if (!origin || !departure_date) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        required: ['origin', 'departure_date'],
        example: '/api/amadeus/flights/to-orlando?origin=JFK&departure_date=2025-01-15'
      });
    }

    const searchOptions = {
      origin,
      destination: 'MCO',
      departureDate: departure_date,
      returnDate: return_date,
      adults: adults ? parseInt(adults) : 1,
      travelClass: travel_class || 'ECONOMY',
      nonStop: non_stop === 'true'
    };

    const results = await amadeusService.searchFlights(searchOptions);

    // Find best deal (lowest price)
    const sortedByPrice = [...results.data].sort((a, b) => 
      a.price.total - b.price.total
    );
    const bestDeal = sortedByPrice[0] || null;

    // Find fastest flight
    const sortedByDuration = [...results.data].sort((a, b) => {
      const aDuration = a.outbound?.duration || 'PT999H';
      const bDuration = b.outbound?.duration || 'PT999H';
      return aDuration.localeCompare(bDuration);
    });
    const fastestFlight = sortedByDuration[0] || null;

    res.json({
      success: true,
      data: {
        bestDeal,
        fastestFlight,
        allFlights: results.data
      },
      summary: {
        totalFlights: results.data.length,
        lowestPrice: bestDeal?.price?.total || null,
        highestPrice: sortedByPrice[sortedByPrice.length - 1]?.price?.total || null,
        directFlights: results.data.filter(f => f.outbound?.numberOfStops === 0).length
      },
      meta: results.meta,
      searchParameters: searchOptions,
      source: 'amadeus_api_orlando',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Orlando flight search error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to search Orlando flights',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/amadeus/flights/multi-origin
 * @desc    Search for flights from multiple origin airports
 * @access  Public
 */
router.get('/flights/multi-origin', async (req, res) => {
  try {
    const {
      origins,
      departure_date,
      return_date,
      adults,
      travel_class
    } = req.query;

    if (!origins || !departure_date) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        required: ['origins (comma-separated)', 'departure_date'],
        example: '/api/amadeus/flights/multi-origin?origins=JFK,LAX,ORD&departure_date=2025-01-15'
      });
    }

    const originList = origins.split(',').map(o => o.trim().toUpperCase());

    const searchOptions = {
      destination: 'MCO',
      departureDate: departure_date,
      returnDate: return_date,
      adults: adults ? parseInt(adults) : 1,
      travelClass: travel_class || 'ECONOMY'
    };

    const results = await amadeusService.searchFlightsFromMultipleOrigins(originList, searchOptions);

    // Find overall best deal across all origins
    let overallBestDeal = null;
    results.data.forEach(originResult => {
      if (originResult.flights && originResult.flights.length > 0) {
        const cheapest = originResult.flights.reduce((min, flight) => 
          flight.price.total < min.price.total ? flight : min
        , originResult.flights[0]);
        
        if (!overallBestDeal || cheapest.price.total < overallBestDeal.price.total) {
          overallBestDeal = { ...cheapest, origin: originResult.origin };
        }
      }
    });

    res.json({
      success: true,
      data: results.data,
      overallBestDeal,
      summary: {
        originsSearched: originList.length,
        totalFlightsFound: results.totalResults,
        cheapestOrigin: overallBestDeal?.origin || null,
        cheapestPrice: overallBestDeal?.price?.total || null
      },
      searchParameters: { ...searchOptions, origins: originList },
      source: 'amadeus_api_multi',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Multi-origin search error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to search multiple origins',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/amadeus/flights/cheapest-dates
 * @desc    Find cheapest dates to fly to Orlando
 * @access  Public
 */
router.get('/flights/cheapest-dates', async (req, res) => {
  try {
    const {
      origin,
      departure_date,
      one_way,
      duration,
      non_stop
    } = req.query;

    if (!origin) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: origin',
        example: '/api/amadeus/flights/cheapest-dates?origin=JFK'
      });
    }

    const searchOptions = {
      origin,
      destination: 'MCO',
      departureDate: departure_date,
      oneWay: one_way === 'true',
      duration: duration ? parseInt(duration) : undefined,
      nonStop: non_stop === 'true'
    };

    const results = await amadeusService.searchCheapestDates(searchOptions);

    res.json({
      success: true,
      data: results.data,
      cheapestDate: results.cheapestDate,
      meta: results.meta,
      searchParameters: searchOptions,
      source: 'amadeus_api_dates',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cheapest dates search error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to search cheapest dates',
      message: error.message,
      note: 'This endpoint may not be available in Amadeus test environment'
    });
  }
});

/**
 * @route   POST /api/amadeus/flights/price
 * @desc    Confirm flight price and availability
 * @access  Public
 */
router.post('/flights/price', async (req, res) => {
  try {
    const { flightOffer } = req.body;

    if (!flightOffer) {
      return res.status(400).json({
        success: false,
        error: 'Missing flight offer in request body',
        example: '{ "flightOffer": { ...flight offer object from search... } }'
      });
    }

    const results = await amadeusService.confirmFlightPrice(flightOffer);

    res.json({
      success: true,
      data: results,
      source: 'amadeus_api_pricing',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Flight price confirmation error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to confirm flight price',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/amadeus/airports/search
 * @desc    Search for airports by keyword
 * @access  Public
 */
router.get('/airports/search', async (req, res) => {
  try {
    const { keyword } = req.query;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: keyword',
        example: '/api/amadeus/airports/search?keyword=new york'
      });
    }

    const results = await amadeusService.searchAirports(keyword);

    res.json({
      success: true,
      data: results.data || [],
      count: results.data?.length || 0,
      source: 'amadeus_api_airports',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Airport search error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to search airports',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/amadeus/airlines
 * @desc    Get airline information by codes
 * @access  Public
 */
router.get('/airlines', async (req, res) => {
  try {
    const { codes } = req.query;

    if (!codes) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: codes',
        example: '/api/amadeus/airlines?codes=DL,AA,UA'
      });
    }

    const results = await amadeusService.getAirlineInfo(codes);

    res.json({
      success: true,
      data: results.data || [],
      count: results.data?.length || 0,
      source: 'amadeus_api_airlines',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Airline info error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get airline information',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/amadeus/sample-flights
 * @desc    Get sample flight data for demonstration
 * @access  Public
 */
router.get('/sample-flights', (req, res) => {
  const sampleFlights = amadeusService.getSampleFlights();

  res.json({
    success: true,
    data: sampleFlights,
    count: sampleFlights.length,
    type: 'sample',
    message: 'Sample flight data for demonstration purposes',
    note: 'Configure AMADEUS_API_KEY and AMADEUS_API_SECRET for live data'
  });
});

/**
 * @route   GET /api/amadeus/orlando-airports
 * @desc    Get Orlando area airports
 * @access  Public
 */
router.get('/orlando-airports', (req, res) => {
  res.json({
    success: true,
    data: amadeusService.orlandoAirports,
    primary: 'MCO',
    message: 'Orlando area airports'
  });
});

module.exports = router;
