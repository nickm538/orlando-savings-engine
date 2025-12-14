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
// Cache for Orlando deals (30 minutes TTL)
let orlandoDealsCache = null;
let orlandoDealsCacheTime = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes in milliseconds

router.get('/ai/orlando-deals', async (req, res) => {
  try {
    // Check cache first
    const now = Date.now();
    if (orlandoDealsCache && orlandoDealsCacheTime && (now - orlandoDealsCacheTime) < CACHE_TTL) {
      console.log('Returning cached orlando-deals data');
      return res.json({
        success: true,
        data: orlandoDealsCache,
        count: orlandoDealsCache.length,
        source: 'cached_serpapi_data',
        cached_at: new Date(orlandoDealsCacheTime).toISOString(),
        cache_expires_in: Math.round((CACHE_TTL - (now - orlandoDealsCacheTime)) / 1000) + ' seconds'
      });
    }
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

    // Top 5 most important queries executed in parallel for faster response
    const searchQueries = [
      'Orlando Disney World discounts 2025',
      'Universal Studios Orlando deals promo codes',
      'Orlando hotel deals theme parks',
      'Florida resident Disney Universal discounts',
      'Orlando vacation package deals 2025'
    ];

    // Wrap SerpAPI call in timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('SerpAPI timeout')), 15000)
    );

    const searchPromise = async () => {
    // Execute searches in PARALLEL using regular Google Search (faster than AI Mode)
    const searchPromises = searchQueries.map(async (query) => {

      try {
        // Use regular Google Search instead of AI Mode for faster results
        const params = {
          engine: 'google',
          q: query,
          gl: 'us',
          hl: 'en',
          num: 5 // Get top 5 results per query
        };
        
        const results = await serpApiService.makeAPICall(params);
        const insights = [];
        
        // Parse organic results from regular Google Search
        if (results && results.organic_results) {
          results.organic_results.slice(0, 3).forEach((result, index) => {
            if (result.snippet && result.snippet.length > 30) {
              // Determine deal type based on content
              let dealType = 'deal';
              const snippet = result.snippet.toLowerCase();
              if (snippet.includes('discount') || snippet.includes('save')) dealType = 'discount';
              if (snippet.includes('promo') || snippet.includes('code')) dealType = 'promo_code';
              if (snippet.includes('package')) dealType = 'package';
              
              insights.push({
                type: dealType,
                content: result.snippet,
                query: query,
                source: result.link || 'google_search',
                timestamp: new Date().toISOString(),
                confidence: 90 - (index * 5) // Higher confidence for top results
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
      
      // Cache the results
      if (allInsights.length > 0) {
        orlandoDealsCache = allInsights;
        orlandoDealsCacheTime = Date.now();
      }
      
      res.json({
        success: true,
        data: allInsights.length > 0 ? allInsights : fallbackDeals,
        count: allInsights.length > 0 ? allInsights.length : fallbackDeals.length,
        source: allInsights.length > 0 ? 'serpapi_google_search_orlando' : 'fallback_mock_data',
        queries: searchQueries
      });
    } catch (timeoutError) {
      console.error('SerpAPI error:', timeoutError.message);
      console.error('Error stack:', timeoutError.stack);
      res.json({
        success: true,
        data: fallbackDeals,
        count: fallbackDeals.length,
        source: 'fallback_mock_data',
        message: 'Using cached deals due to API timeout',
        error_details: timeoutError.message // Include error for debugging
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

/**
 * @route   GET /api/serpapi/bing/travel-insights
 * @desc    Get Orlando travel insights using Bing Search API
 * @access  Public
 */
// Cache for Bing travel insights (30 minutes TTL)
let bingInsightsCache = null;
let bingInsightsCacheTime = null;
const BING_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

router.get('/bing/travel-insights', async (req, res) => {
  try {
    // Check cache first
    const now = Date.now();
    if (bingInsightsCache && bingInsightsCacheTime && (now - bingInsightsCacheTime) < BING_CACHE_TTL) {
      console.log('Returning cached Bing travel insights');
      return res.json({
        success: true,
        data: bingInsightsCache,
        count: bingInsightsCache.length,
        source: 'cached_bing_data',
        cached_at: new Date(bingInsightsCacheTime).toISOString(),
        cache_expires_in: Math.round((BING_CACHE_TTL - (now - bingInsightsCacheTime)) / 1000) + ' seconds'
      });
    }

    // Fallback mock data
    const fallbackInsights = [
      {
        type: 'tip',
        content: 'Visit Orlando theme parks during weekdays (Tuesday-Thursday) for shorter wait times and better deals on hotels.',
        query: 'Orlando travel tips best time to visit',
        source: 'bing_search',
        timestamp: new Date().toISOString(),
        confidence: 90
      },
      {
        type: 'recommendation',
        content: 'Book Disney World tickets 60-90 days in advance to secure the best prices and park reservations.',
        query: 'Disney World booking tips',
        source: 'bing_search',
        timestamp: new Date().toISOString(),
        confidence: 85
      }
    ];

    // Top 5 Bing search queries for travel insights
    const searchQueries = [
      'Orlando travel tips 2025',
      'best time visit Disney World Universal Studios',
      'Orlando hidden gems attractions',
      'Orlando food recommendations restaurants',
      'Orlando weather seasonal guide'
    ];

    // Timeout wrapper
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Bing Search timeout')), 15000)
    );

    const searchPromise = async () => {
      // Execute Bing searches in parallel
      const searchPromises = searchQueries.map(async (query) => {
        try {
          const params = {
            engine: 'bing',
            q: query,
            cc: 'US',
            num: 5
          };
          
          const results = await serpApiService.makeAPICall(params);
          const insights = [];
          
          // Parse Bing organic results
          if (results && results.organic_results) {
            results.organic_results.slice(0, 3).forEach((result, index) => {
              if (result.snippet && result.snippet.length > 30) {
                // Determine insight type based on content
                let insightType = 'tip';
                const snippet = result.snippet.toLowerCase();
                if (snippet.includes('recommend') || snippet.includes('best')) insightType = 'recommendation';
                if (snippet.includes('guide') || snippet.includes('how to')) insightType = 'guide';
                if (snippet.includes('warning') || snippet.includes('avoid')) insightType = 'warning';
                if (snippet.includes('secret') || snippet.includes('hidden')) insightType = 'secret';
                
                insights.push({
                  type: insightType,
                  content: result.snippet,
                  query: query,
                  source: result.link || 'bing_search',
                  timestamp: new Date().toISOString(),
                  confidence: 90 - (index * 5)
                });
              }
            });
          }
          
          return insights;
        } catch (error) {
          console.error(`Failed to process Bing query: ${query}`, error.message);
          return [];
        }
      });

      const resultsArrays = await Promise.all(searchPromises);
      const allInsights = resultsArrays.flat();
      return allInsights;
    };

    try {
      const allInsights = await Promise.race([searchPromise(), timeoutPromise]);
      
      // Cache the results
      if (allInsights.length > 0) {
        bingInsightsCache = allInsights;
        bingInsightsCacheTime = Date.now();
      }
      
      res.json({
        success: true,
        data: allInsights.length > 0 ? allInsights : fallbackInsights,
        count: allInsights.length > 0 ? allInsights.length : fallbackInsights.length,
        source: allInsights.length > 0 ? 'bing_search_orlando' : 'fallback_mock_data',
        queries: searchQueries
      });
    } catch (timeoutError) {
      console.error('Bing Search error:', timeoutError.message);
      res.json({
        success: true,
        data: fallbackInsights,
        count: fallbackInsights.length,
        source: 'fallback_mock_data',
        message: 'Using cached insights due to API timeout',
        error_details: timeoutError.message
      });
    }
  } catch (error) {
    console.error('Bing travel insights error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get travel insights',
      message: error.message
    });
  }
});

module.exports = router;