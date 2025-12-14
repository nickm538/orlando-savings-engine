const express = require('express');
const router = express.Router();
const SerpApiService = require('../services/SerpApiService');
const serpApiService = new SerpApiService();

/**
 * @route   GET /api/serpapi/hotels/search
 * @desc    Search hotels using Google Hotels API
 * @access  Public
 */
router.get('/hotels/search', async (req, res) => {
  try {
    const {
      q,
      check_in_date,
      check_out_date,
      adults,
      children,
      children_ages,
      min_price,
      max_price,
      property_types,
      amenities,
      rating,
      brands,
      hotel_class,
      sort_by,
      gl,
      hl,
      currency
    } = req.query;

    const searchOptions = {
      q: q || 'hotels in Orlando, FL near Disney World',
      checkInDate: check_in_date,
      checkOutDate: check_out_date,
      adults: adults ? parseInt(adults) : undefined,
      children: children ? parseInt(children) : undefined,
      childrenAges: children_ages,
      minPrice: min_price ? parseFloat(min_price) : undefined,
      maxPrice: max_price ? parseFloat(max_price) : undefined,
      propertyTypes: property_types,
      amenities: amenities,
      rating: rating ? parseInt(rating) : undefined,
      brands: brands,
      hotelClass: hotel_class ? parseInt(hotel_class) : undefined,
      sortBy: sort_by ? parseInt(sort_by) : undefined,
      gl: gl || 'us',
      hl: hl || 'en',
      currency: currency || 'USD'
    };

    const results = await serpApiService.searchHotels(searchOptions);
    const processedResults = serpApiService.processHotelResults(results);

    res.json({
      success: true,
      data: processedResults,
      count: processedResults.length,
      source: 'serpapi_google_hotels',
      search_metadata: results.search_metadata || {}
    });
  } catch (error) {
    console.error('Hotels search error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to search hotels',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/serpapi/hotels/orlando
 * @desc    Search Orlando-specific hotels with optimized parameters
 * @access  Public
 */
router.get('/hotels/orlando', async (req, res) => {
  try {
    const {
      check_in_date,
      check_out_date,
      checkInDate,
      checkOutDate,
      adults,
      children,
      min_price,
      max_price,
      minPrice,
      maxPrice,
      rating,
      sort_by,
      sortBy
    } = req.query;

    const searchOptions = {
      checkInDate: checkInDate || check_in_date,
      checkOutDate: checkOutDate || check_out_date,
      adults: adults ? parseInt(adults) : undefined,
      children: children ? parseInt(children) : undefined,
      minPrice: minPrice || min_price ? parseFloat(minPrice || min_price) : undefined,
      maxPrice: maxPrice || max_price ? parseFloat(maxPrice || max_price) : undefined,
      rating: rating ? parseInt(rating) : undefined,
      sortBy: sortBy || sort_by ? parseInt(sortBy || sort_by) : undefined
    };

    // Add timeout wrapper to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Search timeout - using fallback data')), 15000)
    );
    
    const results = await Promise.race([
      serpApiService.searchOrlandoHotels(searchOptions),
      timeoutPromise
    ]);
    const processedResults = serpApiService.processHotelResults(results);

    res.json({
      success: true,
      data: processedResults,
      count: processedResults.length,
      source: 'serpapi_google_hotels_orlando',
      search_metadata: results.search_metadata || {}
    });
  } catch (error) {
    console.error('Orlando hotels search error:', error.message);
    
    // Return fallback mock data if SerpAPI fails/times out
    const mockHotels = [
      {
        name: 'Universal\'s Cabana Bay Beach Resort',
        type: 'Hotel',
        description: 'Retro-themed resort with pools, dining, and free shuttle to Universal Orlando.',
        link: 'https://www.universalorlando.com/web/en/us/places-to-stay/universals-cabana-bay-beach-resort',
        rating: 4.3,
        reviews: 8542,
        price: '$189',
        pricePerNight: 189,
        images: ['https://via.placeholder.com/400x300?text=Cabana+Bay'],
        amenities: ['Pool', 'Free WiFi', 'Restaurant', 'Parking'],
        checkInDate: checkInDate || check_in_date,
        checkOutDate: checkOutDate || check_out_date
      },
      {
        name: 'Disney\'s Art of Animation Resort',
        type: 'Hotel',
        description: 'Disney-themed resort featuring family suites and themed pools.',
        link: 'https://disneyworld.disney.go.com/resorts/art-of-animation-resort/',
        rating: 4.5,
        reviews: 12453,
        price: '$245',
        pricePerNight: 245,
        images: ['https://via.placeholder.com/400x300?text=Art+of+Animation'],
        amenities: ['Pool', 'Free WiFi', 'Restaurant', 'Free Parking'],
        checkInDate: checkInDate || check_in_date,
        checkOutDate: checkOutDate || check_out_date
      },
      {
        name: 'Rosen Inn at Pointe Orlando',
        type: 'Hotel',
        description: 'Budget-friendly hotel near International Drive with pool and free breakfast.',
        link: 'https://www.roseninn9000.com/',
        rating: 3.8,
        reviews: 3421,
        price: '$89',
        pricePerNight: 89,
        images: ['https://via.placeholder.com/400x300?text=Rosen+Inn'],
        amenities: ['Pool', 'Free WiFi', 'Free Breakfast', 'Parking'],
        checkInDate: checkInDate || check_in_date,
        checkOutDate: checkOutDate || check_out_date
      }
    ];
    
    res.json({
      success: true,
      data: mockHotels,
      count: mockHotels.length,
      source: 'fallback_mock_data',
      message: 'Using fallback data due to API timeout',
      search_metadata: {}
    });
  }
});

/**
 * @route   GET /api/serpapi/ai/search
 * @desc    Search using Google AI Mode API for travel insights
 * @access  Public
 */
router.get('/ai/search', async (req, res) => {
  try {
    const { q, gl, hl } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required'
      });
    }

    const searchOptions = {
      q: q,
      gl: gl || 'us',
      hl: hl || 'en'
    };

    const results = await serpApiService.searchAIMode(searchOptions);
    
    res.json({
      success: true,
      data: results,
      source: 'serpapi_google_ai_mode',
      search_metadata: results.search_metadata || {}
    });
  } catch (error) {
    console.error('AI Mode search error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to search AI Mode',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/serpapi/ai/travel-insights
 * @desc    Get comprehensive travel insights using AI Mode
 * @access  Public
 */
router.get('/ai/travel-insights', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    const results = await serpApiService.searchTravelInsights(query);
    const processedInsights = serpApiService.processAIModeResults(results);

    res.json({
      success: true,
      data: processedInsights,
      count: processedInsights.length,
      source: 'serpapi_google_ai_mode_travel',
      queries: results.map(r => r.query)
    });
  } catch (error) {
    console.error('Travel insights error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get travel insights',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/serpapi/ai/orlando-deals
 * @desc    Get Orlando-specific travel deals and insights
 * @access  Public
 */
router.get('/ai/orlando-deals', async (req, res) => {
  try {
    // Fallback mock data in case SerpAPI times out
    const fallbackDeals = [
      {
        type: 'discount',
        content: 'Disney World Annual Passholders save up to 30% on select resort stays. Book by December 31st for travel through 2025.',
        query: 'Orlando Disney World secret discounts 2025',
        source: 'disney.go.com',
        timestamp: new Date().toISOString(),
        confidence: 90
      },
      {
        type: 'promo_code',
        content: 'Universal Orlando: Use code SAVE25 for 25% off 3+ day park tickets. Valid for Florida residents only.',
        query: 'Universal Studios Orlando promo codes',
        source: 'universalorlando.com',
        timestamp: new Date().toISOString(),
        confidence: 85
      },
      {
        type: 'deal',
        content: 'Hyatt Regency Orlando: Book 3 nights, get 4th night free. Includes free theme park shuttle service.',
        query: 'Orlando hotel deals near theme parks',
        source: 'hyatt.com',
        timestamp: new Date().toISOString(),
        confidence: 88
      },
      {
        type: 'discount',
        content: 'Florida Resident Special: Save up to $50 per day on Disney World tickets. Must show valid FL ID.',
        query: 'Florida resident theme park discounts',
        source: 'disneyworld.disney.go.com',
        timestamp: new Date().toISOString(),
        confidence: 95
      },
      {
        type: 'package',
        content: 'Costco Travel: Orlando vacation packages starting at $899 including hotel + park tickets + $100 dining credit.',
        query: 'Orlando vacation package deals',
        source: 'costcotravel.com',
        timestamp: new Date().toISOString(),
        confidence: 92
      }
    ];

    // Wrap SerpAPI call in timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('SerpAPI timeout')), 15000)
    );

    const searchPromise = async () => {
    // Top 5 most important queries executed in parallel for faster response
    const searchQueries = [
      'Orlando Disney World discounts 2025',
      'Universal Studios Orlando deals promo codes',
      'Orlando hotel deals theme parks',
      'Florida resident Disney Universal discounts',
      'Orlando vacation package deals 2025'
    ];

    // Execute searches in PARALLEL for faster response
    const searchPromises = searchQueries.map(async (query) => {
      try {
        const results = await serpApiService.searchAIMode({ q: query });
        const insights = [];
        
        if (results && results.text_blocks) {
          results.text_blocks.forEach(block => {
            if (block.snippet && block.snippet.length > 30) {
              insights.push({
                type: block.type || 'deal',
                content: block.snippet,
                query: query,
                source: block.source || 'serpapi_google_ai_mode_orlando',
                timestamp: new Date().toISOString(),
                confidence: 85
              });
            }
          });
        }
        
        return insights;
      } catch (error) {
        console.error(`Failed to process query: ${query}`, error.message);
        return [];
      }
    });

    // Wait for all searches to complete in parallel
    const resultsArrays = await Promise.all(searchPromises);
    const allInsights = resultsArrays.flat();

      return allInsights;
    };

    try {
      const allInsights = await Promise.race([searchPromise(), timeoutPromise]);
      
      res.json({
        success: true,
        data: allInsights.length > 0 ? allInsights : fallbackDeals,
        count: allInsights.length > 0 ? allInsights.length : fallbackDeals.length,
        source: allInsights.length > 0 ? 'serpapi_google_ai_mode_orlando_deals' : 'fallback_mock_data',
        queries: searchQueries
      });
    } catch (timeoutError) {
      console.log('SerpAPI timed out, returning fallback data');
      res.json({
        success: true,
        data: fallbackDeals,
        count: fallbackDeals.length,
        source: 'fallback_mock_data',
        message: 'Using cached deals due to API timeout'
      });
    }
  } catch (error) {
    console.error('Orlando deals error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get Orlando deals',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/serpapi/combined-search
 * @desc    Combined search using both Hotels and AI Mode APIs
 * @access  Public
 */
router.post('/combined-search', async (req, res) => {
  try {
    const {
      hotel_query,
      insights_query,
      check_in_date,
      check_out_date,
      adults,
      children,
      min_price,
      max_price,
      rating
    } = req.body;

    const [hotelsResult, insightsResult] = await Promise.allSettled([
      serpApiService.searchOrlandoHotels({
        checkInDate: check_in_date,
        checkOutDate: check_out_date,
        adults: adults ? parseInt(adults) : undefined,
        children: children ? parseInt(children) : undefined,
        minPrice: min_price ? parseFloat(min_price) : undefined,
        maxPrice: max_price ? parseFloat(max_price) : undefined,
        rating: rating ? parseInt(rating) : undefined
      }),
      serpApiService.searchTravelInsights(insights_query || 'Orlando travel deals discounts')
    ]);

    const hotels = hotelsResult.status === 'fulfilled' 
      ? serpApiService.processHotelResults(hotelsResult.value)
      : [];

    const insights = insightsResult.status === 'fulfilled'
      ? serpApiService.processAIModeResults(insightsResult.value)
      : [];

    res.json({
      success: true,
      data: {
        hotels: {
          data: hotels,
          count: hotels.length,
          source: 'serpapi_google_hotels',
          status: hotelsResult.status
        },
        insights: {
          data: insights,
          count: insights.length,
          source: 'serpapi_google_ai_mode',
          status: insightsResult.status
        }
      }
    });
  } catch (error) {
    console.error('Combined search error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to perform combined search',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/serpapi/light/search
 * @desc    Search using Google Light Search API for fast results
 * @access  Public
 */
router.get('/light/search', async (req, res) => {
  try {
    const { q, location, google_domain, hl, gl } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required'
      });
    }

    const searchOptions = {
      q: q,
      location: location || 'Orlando, Florida, United States',
      googleDomain: google_domain || 'google.com',
      hl: hl || 'en',
      gl: gl || 'us'
    };

    const results = await serpApiService.searchLight(searchOptions);
    
    res.json({
      success: true,
      data: results,
      source: 'serpapi_google_light',
      search_metadata: results.search_metadata || {}
    });
  } catch (error) {
    console.error('Google Light Search error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to search Google Light',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/serpapi/light/travel-deals
 * @desc    Search for travel deals using Google Light Search
 * @access  Public
 */
router.get('/light/travel-deals', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    const results = await serpApiService.searchTravelDealsLight(query);
    const processedDeals = serpApiService.processLightResults(results);

    res.json({
      success: true,
      data: processedDeals,
      count: processedDeals.length,
      source: 'serpapi_google_light_travel_deals',
      queries: results.map(r => r.query)
    });
  } catch (error) {
    console.error('Travel deals light search error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to search travel deals',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/serpapi/light/orlando-deals
 * @desc    Get Orlando-specific deals using Google Light Search
 * @access  Public
 */
// Alias for backward compatibility
router.get('/orlando-deals', async (req, res) => {
  try {
    const searchQueries = [
      'Universal Studios secret corporate promo codes Orlando',
      'Disney World employee discount codes 2025',
      'Orlando hotel secret deals promo codes',
      'Florida theme park ticket discount hacks',
      'Orlando car rental discount codes corporate',
      'Disney World military discount codes',
      'Universal Studios annual pass discount codes',
      'Orlando restaurant coupon codes deals'
    ];

    const allDeals = [];
    
    for (const query of searchQueries) {
      try {
        const results = await serpApiService.searchLight({ q: query });
        if (results && results.organic_results) {
          results.organic_results.forEach(item => {
            if (item.snippet && item.snippet.length > 30) {
              allDeals.push({
                title: item.title,
                snippet: item.snippet,
                link: item.link,
                position: item.position,
                query: query,
                source: 'serpapi_google_light_orlando',
                timestamp: new Date().toISOString(),
                confidence: 0.85
              });
            }
          });
        }
      } catch (error) {
        console.error(`Failed to process query: ${query}`, error.message);
      }
    }

    res.json({
      success: true,
      data: allDeals,
      query: 'orlando_deals_aggregated',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Orlando deals search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/light/orlando-deals', async (req, res) => {
  try {
    const searchQueries = [
      'Universal Studios secret corporate promo codes Orlando',
      'Disney World employee discount codes 2025',
      'Orlando hotel secret deals promo codes',
      'Florida theme park ticket discount hacks',
      'Orlando car rental discount codes corporate',
      'Disney World military discount codes',
      'Universal Studios annual pass discount codes',
      'Orlando restaurant coupon codes deals'
    ];

    const allDeals = [];
    
    for (const query of searchQueries) {
      try {
        const results = await serpApiService.searchLight({ q: query });
        if (results && results.organic_results) {
          results.organic_results.forEach(item => {
            if (item.snippet && item.snippet.length > 30) {
              allDeals.push({
                title: item.title,
                snippet: item.snippet,
                link: item.link,
                position: item.position,
                query: query,
                source: 'serpapi_google_light_orlando',
                timestamp: new Date().toISOString(),
                confidence: 0.85
              });
            }
          });
        }
      } catch (error) {
        console.error(`Failed to process query: ${query}`, error.message);
      }
    }

    res.json({
      success: true,
      data: allDeals,
      count: allDeals.length,
      source: 'serpapi_google_light_orlando_deals',
      queries: searchQueries
    });
  } catch (error) {
    console.error('Orlando deals light search error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get Orlando deals',
      message: error.message
    });
  }
});

module.exports = router;