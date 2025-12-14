const axios = require('axios');
const { RateLimiter } = require('limiter');

// Load API key from environment variable (SECURE)
const SERP_API_KEY = process.env.SERP_API_KEY;
const BASE_URL = 'https://serpapi.com/search';

// Validate API key exists
if (!SERP_API_KEY) {
  console.warn('⚠️ WARNING: SERP_API_KEY environment variable is not set. SerpApi calls will fail.');
}

// Rate limiter: 250 calls per month = 8 calls per day
// FIXED: Was 1/hour (720/month) - now correctly 8/day (240/month)
const limiter = new RateLimiter({
  tokensPerInterval: 8,
  interval: 'day'
});

class SerpApiService {
  constructor() {
    this.apiKey = SERP_API_KEY;
    this.baseUrl = BASE_URL;
  }

  /**
   * Generic API call with rate limiting
   */
  async makeAPICall(params) {
    if (!this.apiKey) {
      throw new Error('SERP_API_KEY environment variable is not configured');
    }
    
    try {
      await limiter.removeTokens(1);
      
      const response = await axios.get(this.baseUrl, {
        params: {
          ...params,
          api_key: this.apiKey
        },
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      console.error('SerpApi call failed:', error.message);
      throw new Error(`SerpApi error: ${error.message}`);
    }
  }

  /**
   * Search for hotels using Google Hotels API
   * @param {Object} options - Search parameters
   * @param {string} options.q - Search query (e.g., "hotels in Orlando, FL")
   * @param {string} options.checkInDate - Check-in date (YYYY-MM-DD)
   * @param {string} options.checkOutDate - Check-out date (YYYY-MM-DD)
   * @param {number} options.adults - Number of adults (default: 2)
   * @param {number} options.children - Number of children (default: 0)
   * @param {string} options.childrenAges - Children's ages (comma-separated)
   * @param {number} options.minPrice - Minimum price filter
   * @param {number} options.maxPrice - Maximum price filter
   * @param {string} options.propertyTypes - Property types (comma-separated IDs)
   * @param {string} options.amenities - Amenities (comma-separated IDs)
   * @param {number} options.rating - Rating filter (7=3.5+, 8=4.0+, 9=4.5+)
   * @param {string} options.brands - Brand IDs (comma-separated)
   * @param {number} options.hotelClass - Hotel class filter
   * @param {number} options.sortBy - Sort by (3=lowest price, 8=highest rating, 13=most reviewed)
   * @param {string} options.gl - Country code (default: 'us')
   * @param {string} options.hl - Language code (default: 'en')
   * @param {string} options.currency - Currency (default: 'USD')
   */
  async searchHotels(options = {}) {
    const params = {
      engine: 'google_hotels',
      q: options.q || 'hotels in Orlando, FL',
      check_in_date: options.checkInDate || this.getDefaultCheckInDate(),
      check_out_date: options.checkOutDate || this.getDefaultCheckOutDate(),
      adults: options.adults || 2,
      children: options.children || 0,
      gl: options.gl || 'us',
      hl: options.hl || 'en',
      currency: options.currency || 'USD'
    };

    // Add optional parameters
    if (options.childrenAges) params.children_ages = options.childrenAges;
    if (options.minPrice) params.min_price = options.minPrice;
    if (options.maxPrice) params.max_price = options.maxPrice;
    if (options.propertyTypes) params.property_types = options.propertyTypes;
    if (options.amenities) params.amenities = options.amenities;
    if (options.rating) params.rating = options.rating;
    if (options.brands) params.brands = options.brands;
    if (options.hotelClass) params.hotel_class = options.hotelClass;
    if (options.sortBy) params.sort_by = options.sortBy;

    return await this.makeAPICall(params);
  }

  /**
   * Search using Google AI Mode API
   * @param {Object} options - Search parameters
   * @param {string} options.q - Search query
   * @param {string} options.gl - Country code (default: 'us')
   * @param {string} options.hl - Language code (default: 'en')
   */
  async searchAIMode(options = {}) {
    const params = {
      engine: 'google_ai_mode',
      q: options.q || 'best travel deals Orlando Florida',
      gl: options.gl || 'us',
      hl: options.hl || 'en'
    };

    return await this.makeAPICall(params);
  }

  /**
   * Search for Orlando-specific hotels
   */
  async searchOrlandoHotels(options = {}) {
    const defaultOptions = {
      q: 'hotels in Orlando, FL near Disney World Universal Studios',
      checkInDate: this.getDefaultCheckInDate(),
      checkOutDate: this.getDefaultCheckOutDate(),
      sortBy: 3, // Lowest price
      rating: 7, // 3.5+ rating
      ...options
    };

    return await this.searchHotels(defaultOptions);
  }

  /**
   * Search for travel deals and insights using AI Mode
   */
  async searchTravelInsights(query) {
    const searchQueries = [
      `Orlando Florida travel deals discounts ${query}`,
      `Disney World Universal Studios secret discounts ${query}`,
      `Orlando hotel promo codes ${query}`,
      `Florida theme park ticket hacks ${query}`,
      `Orlando vacation rental deals ${query}`
    ];

    const results = [];
    for (const q of searchQueries) {
      try {
        const result = await this.searchAIMode({ q });
        results.push({
          query: q,
          data: result
        });
      } catch (error) {
        console.error(`Failed to search for: ${q}`, error.message);
      }
    }

    return results;
  }

  /**
   * Get default check-in date (tomorrow)
   */
  getDefaultCheckInDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  /**
   * Get default check-out date (3 days from now)
   */
  getDefaultCheckOutDate() {
    const checkout = new Date();
    checkout.setDate(checkout.getDate() + 4);
    return checkout.toISOString().split('T')[0];
  }

  /**
   * Process hotel results to standard format
   */
  processHotelResults(serpApiData) {
    if (!serpApiData.properties) {
      return [];
    }

    return serpApiData.properties.map(hotel => ({
      id: hotel.property_token,
      name: hotel.name,
      description: hotel.description,
      price: hotel.rate_per_night ? {
        amount: hotel.rate_per_night.lowest,
        currency: hotel.rate_per_night.currency || 'USD'
      } : null,
      rating: hotel.overall_rating,
      reviewCount: hotel.review_count,
      location: {
        latitude: hotel.latitude,
        longitude: hotel.longitude,
        address: hotel.location,
        neighborhood: hotel.neighborhood
      },
      amenities: hotel.amenities,
      images: hotel.images,
      propertyType: hotel.property_type,
      class: hotel.hotel_class,
      checkInTime: hotel.check_in_time,
      checkOutTime: hotel.check_out_time,
      contact: hotel.contact,
      source: 'serpapi_google_hotels',
      confidence: this.calculateHotelConfidence(hotel),
      lastUpdated: new Date().toISOString()
    }));
  }

  /**
   * Calculate dynamic confidence score for hotel data
   * FIXED: Replaced hardcoded 0.95 with intelligent scoring
   */
  calculateHotelConfidence(hotel) {
    let confidence = 0.70; // Base confidence
    
    // Price availability (+15%)
    if (hotel.rate_per_night && hotel.rate_per_night.lowest > 0) {
      confidence += 0.15;
    }
    
    // Rating quality (+10% for 4.5+, +5% for 4.0+)
    if (hotel.overall_rating >= 4.5) {
      confidence += 0.10;
    } else if (hotel.overall_rating >= 4.0) {
      confidence += 0.05;
    }
    
    // Review count (+5% for 500+)
    if (hotel.review_count >= 500) {
      confidence += 0.05;
    }
    
    // Image availability (+3% for 3+ images)
    if (hotel.images && hotel.images.length >= 3) {
      confidence += 0.03;
    }
    
    // Location data (+2% for coordinates)
    if (hotel.latitude && hotel.longitude) {
      confidence += 0.02;
    }
    
    // Cap at 95%
    return Math.min(confidence, 0.95);
  }

  /**
   * Search using Google Light Search API for fast results
   * @param {Object} options - Search parameters
   * @param {string} options.q - Search query
   * @param {string} options.location - Location for search (e.g., "Orlando, Florida, United States")
   * @param {string} options.googleDomain - Google domain (default: 'google.com')
   * @param {string} options.hl - Language code (default: 'en')
   * @param {string} options.gl - Country code (default: 'us')
   */
  async searchLight(options = {}) {
    const params = {
      engine: 'google_light',
      q: options.q || 'Orlando travel deals',
      location: options.location || 'Orlando, Florida, United States',
      google_domain: options.googleDomain || 'google.com',
      hl: options.hl || 'en',
      gl: options.gl || 'us'
    };

    return await this.makeAPICall(params);
  }

  /**
   * Search for travel deals and promo codes using Google Light
   * @param {string} query - Search query
   */
  async searchTravelDealsLight(query) {
    const searchQueries = [
      `Orlando ${query} promo codes discounts`,
      `Universal Studios secret corporate codes ${query}`,
      `Disney World employee discounts ${query}`,
      `Orlando hotel secret deals ${query}`,
      `Florida theme park ticket hacks ${query}`,
      `Orlando car rental discount codes ${query}`,
      `Disney World military discounts ${query}`,
      `Universal Studios annual pass discounts ${query}`
    ];

    const results = [];
    for (const q of searchQueries) {
      try {
        const result = await this.searchLight({ q });
        results.push({
          query: q,
          data: result
        });
      } catch (error) {
        console.error(`Failed to search for: ${q}`, error.message);
      }
    }

    return results;
  }

  /**
   * Process Google Light Search results for travel deals
   */
  processLightResults(results) {
    const deals = [];
    
    results.forEach(result => {
      if (result.data && result.data.organic_results) {
        result.data.organic_results.forEach(item => {
          if (item.snippet && item.snippet.length > 30) {
            deals.push({
              title: item.title,
              snippet: item.snippet,
              link: item.link,
              position: item.position,
              query: result.query,
              source: 'serpapi_google_light',
              timestamp: new Date().toISOString(),
              confidence: 0.85
            });
          }
        });
      }
    });

    return deals;
  }

  /**
   * Process AI Mode results for travel insights
   */
  processAIModeResults(results) {
    const insights = [];
    
    results.forEach(result => {
      if (result.data && result.data.text_blocks) {
        result.data.text_blocks.forEach(block => {
          if (block.snippet && block.snippet.length > 50) {
            insights.push({
              type: block.type,
              content: block.snippet,
              references: block.reference_indexes || [],
              query: result.query,
              source: 'serpapi_google_ai_mode',
              timestamp: new Date().toISOString()
            });
          }
        });
      }
    });

    return insights;
  }
}

module.exports = SerpApiService;
